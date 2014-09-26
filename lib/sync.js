'use strict';

// --- Dependencies ---
var assert = require('assert');
var inherits = require('util').inherits;

var debug = require('debug')('arkivo:sync');

var B = require('bluebird');
var co = B.coroutine.bind(B);

var zotero = require('zotero');
zotero.promisify(B.promisify.bind(B));

var properties = Object.defineProperties;

var common = require('./common');
var extend = common.extend;

var plugins = require('./plugins');


/** @module arkivio */


/**
 * A synchronization session; it keeps track
 * of the state of synchronization session for
 * a single Subscription and is created by the
 * associated Synchronizer instance.
 *
 * @class Session
 * @constructor
 */
function Session(subscription, synchronizer) {

  /**
   * The subscription to be synchronized.
   *
   * @property subscription
   * @type Subscription
   */
  this.subscription = subscription;

  /**
   * This session's Synchronizer instance.
   *
   * @property synchronizer
   * @type Synchronizer
   */
  this.synchronizer = synchronizer || Synchronizer.singleton;

  /**
   * Changed items downloaded during synchronization
   * indexed by their Zotero keys.
   *
   * @property items
   * @type Object
   */
  this.items = {};

  /**
   * The keys of all newly created items.
   *
   * @property created
   * @type {Array<String>}
   */
  this.created = [];

  /**
   * The keys of all updated items.
   *
   * @property updated
   * @type {Array<String>}
   */
  this.updated = [];

  /**
   * The keys of all deleted items.
   *
   * @property deleted
   * @type {Array<String>}
   */
  this.deleted = [];

  /**
   * The subscription's remote version. If this
   * version differs from the subscription's
   * current version, this means that updated
   * data is available.
   *
   * @see .modified
   *
   * @property version
   * @type Number
   */
  this.version = undefined;
}

properties(Session.prototype, {
  /**
   * Whether or not the session's subscription has
   * been modified on the remote side; if true, this
   * means that new or updated items can be downloaded.
   *
   * Note: this property is false by default; its value
   * is meaningful only after `.update` has finished.
   *
   * @property modified
   * @type Boolean
   */
  modified: {
    get: function () {
      return this.version !== undefined &&
        this.version > this.subscription.version;
    }
  }

});

/**
 * Connect to the Zotero API using the Zotero client
 * instance of the Synchronizer of the current Session;
 * by using the Zotero client you can be sure that your
 * requests have the same credentials that were used
 * by synchronization session.
 *
 * @method get
 *
 * @param {String} [path] The path to get (defaults to
 *   the associated subscription's URL).
 * @param {Object} [options] Additional URL parameters.
 * @param {Object} [headers] Additional HTTP headers.
 *
 * @return {Zotero.Message} The Zotero API response.
 */
Session.prototype.get = function (path, options, headers) {
  var z = this.synchronizer.zotero;
  var s = this.subscription;

  path    = path || s.path;
  options = extend({}, s.params, options);
  headers = extend({}, s.headers, headers);

  return z.get(path, options, headers);
};

/**
 * Executes the synchronization session by first
 * fetching the subscription's versions from Zotero
 * and downloading the associated items if necessary.
 *
 * Note: if the session is interrupted in process
 * because the Zotero library has been updated remotely,
 * the session will pause and retry to synchronize
 * `retry` times.
 *
 * @param {Boolean} [skip = false] Set this to true
 *   to skip downloading items.
 * @param {Number} [retry = 3]
 *   The maximum number of retries.
 *
 * @returns {Promise<this>}
 *   Eventually returns this Session instance.
 */
Session.prototype.execute = co(function* (skip, retry) {
  if (retry == null) retry = 3;

  try {
    yield this.update();

    if (!skip) yield this.download();

  } catch (error) {
    if (!retry || !(error instanceof InterruptedError)) throw error;

    debug('%s: synchronization interrupted, resuming in %ds...',
      this.subscription.id, error.resume / 1000);

    yield B.delay(error.resume);
    yield this.execute(skip, --retry);
  }

  return this;
});

Session.prototype.diff = function (versions, earlier) {
  versions = versions || this.versions;
  earlier  = earlier  || this.subscription.versions;

  assert(versions && earlier);

  this.created.length = 0;
  this.updated.length = 0;
  this.deleted.length = 0;

  var key;

  // Current items have either been created,
  // updated, or are unchanged.
  for (key in versions) {
    if (earlier.hasOwnProperty(key)) {

      if (versions[key] > earlier[key])
        this.updated.push(key);

    } else {
      this.created.push(key);
    }
  }

  // Check earlier items for deletions.
  for (key in earlier)
    if (!versions.hasOwnProperty(key))
      this.deleted.push(key);

  return this;
};

Session.prototype.update = co(function* () {
  var s = this.subscription;
  this.version = undefined;

  debug('%s: requesting "%s"...', s.id, s.path);

  var message = yield this.get(s.path, {
    limit: 50,
    format: 'versions'
  });

  if (!message.modified) {
    debug('%s: not modified', s.id);
    return this;
  }

  debug('%s: new version detected: %d (was %d)',
    s.id, message.version, s.version);

  this.version = message.version;
  this.versions = message.data;

  if (message.multi) {
    while (!message.done) {
      debug('%s: downloading additional versions...', s.id);

      message = yield message.next();

      this.check(message.version);
      assert.equal('json', message.type);

      extend(this.versions, message.data);
    }
  }

  this.diff();

  debug('%s: versions received: %d created, %d updated, %d deleted',
      s.id, this.created.length, this.updated.length, this.deleted.length);

  return this;
});


/**
 * Checks whether or not the passed-in version matches the
 * version of the current sync session. If the version
 * does not match, an InterruptedError is thrown. That is,
 * this method either returns true or throws an error.
 *
 * @method check
 * @private
 *
 * @param {Number} version The version to check.
 *
 * @throws {InterruptedError} If the the version does not match.
 * @returns {true} True if the version matches.
 */
Session.prototype.check = function (version) {
  if (this.version === version) return true;

  debug('%s: version mismatch detected: %d (was %d)!',
    this.subscription.id, version, this.version);

  throw new InterruptedError('version mismatch detected');
};

Session.prototype.download = co(function* () {
  var s    = this.subscription;
  var keys = this.updated.concat(this.created);

  if (!keys.length) return this;

  var max = 50;
  var path = [s.library, 'items'].join('/');

  var i, ii, j, jj, batch, item, key, message;

  debug('%s: %d items to download', s.id, keys.length);

  for (i = 0, ii = keys.length; i < ii; ++i) {
    batch = [];

    // Select a batch of items to download, skipping previously
    // downloaded items if they still have the same version.
    for (; i < ii; ++i) {
      key  = keys[i];
      item = this.items[key];

      if (!item || item.version !== this.versions[key]) {
        batch.push(key);

        if (batch.length >= max) break;
      }
    }

    // Break early if the selection is empty!
    if (!batch.length) continue;

    debug('%s: requesting %d items...', s.id, batch.length);

    message = yield this.get(path, {
      format: 'json', include: 'data', itemKey: batch.join(',')
    });

    // Throws InterruptedError if the version has changed.
    // This will abort the current download, but keep the
    // items that have been downloaded already.
    // When the synchronization resumes, these items will
    // only be downloaded again if their version changed.
    this.check(message.version);

    assert.equal('json', message.type);
    assert.equal(batch.length, message.data.length);

    debug('%s: %d items received...', s.id, message.data.length);

    for (j = 0, jj = message.data.length; j < jj; ++j) {
      item = message.data[j];
      this.items[item.key] = item;
    }
  }

  debug('%s: download complete', s.id);

  return this;
});




/**
 * @class Synchronizer
 * @constructor
 */
function Synchronizer() {
  this.zotero = new zotero.Client();
}


/**
 * Synchronizes the passed-in subscription. If the optional
 * `skip` parameter is set to true, only the item versions
 * will be updated, but not the data itself, and no plugins
 * will be called.
 *
 * @method synchronize
 *
 * @param {Subscription} sub The subscription to synchronize.
 * @param {Boolean} [skip = false] Whether or not to skip
 *   item download and plugin dispatch.
 *
 * @returns {Promise<Session>}
 *   A promise for the synchronizer Session.
 */
Synchronizer.prototype.synchronize = co(function* (sub, skip) {
  var session = new Session(sub, this);

  debug('processing subscription "%s"...', sub.id);

  sub.touch();

  yield session.execute(skip);

  if (session.modified) {
    if (!skip) yield this.dispatch(session);

    sub.update({
      version: session.version,
      versions: session.versions
    });
  }

  yield sub.save();

  return session;
});


/**
 * This is a short-hand method that simply calls
 * `synchronize` with the `skip` parameter set to true.
 *
 * @method update
 * @see Synchronizer.synchronize
 *
 * @param {Subscription} sub The subscription to update.
 *
 * @returns {Promise<Session>}
 *   A promise for synchronizer Session.
 */
Synchronizer.prototype.update = function (sub) {
  return this.synchronize(sub, true);
};


/**
 * @method dispatch
 * @private
 */
Synchronizer.prototype.dispatch = co(function* (session) {

  debug('%s: dispatching sync session data to plugins...',
    session.subscription.id);

  yield B
    .map(session.subscription.plugins, function (plugin) {

      if (!plugins.available[plugin.name]) {
        debug('%s: plugin %s not available, skipping...',
          session.subscription.id, plugin.name);

        return null;
      }

      debug('%s: processing data with "%s" plugin...',
        session.subscription.id, plugin.name);

      // Wrap plugin invocation in a promise; this is
      // necessary, because we want to allow plugin
      // authors to chose between promises and callbacks.
      return new B(function (resolve, reject) {

        function callback(error) {
          if (error) return reject(error);
          resolve();
        }

        var done = plugins
          .use(plugin.name, plugin.options)
          .process(session, callback);

        if (done.then)
          done.then(resolve, reject);
      });
    });

  return this;
});




// --- Singleton ---
Synchronizer.singleton = new Synchronizer();

// --- Errors ---

/**
 * Error thrown when the Zotero library version
 * changes during a synchronizater session.
 *
 * @class InterruptedError
 * @extends Error
 */
function InterruptedError(message) {
  this.message = message;
  this.name = 'InterruptedError';

  Error.captureStackTrache(this, InterruptedError);
}

inherits(InterruptedError, Error);

InterruptedError.prototype.resume = 5000;


// --- Exports ---
Synchronizer.Session          = Session;
Synchronizer.InterruptedError = InterruptedError;

module.exports = Synchronizer;
