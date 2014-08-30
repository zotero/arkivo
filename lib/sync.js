'use strict';

// --- Dependencies ---
var assert = require('assert');
var debug = require('debug')('arkivo:sync');

var B = require('bluebird');
var co = B.coroutine.bind(B);

var zotero = require('zotero');
zotero.promisify(B.promisify.bind(B));

var properties = Object.defineProperties;

var common = require('./common');
var extend = common.extend;
var flatten = common.flatten;

var defaults = require('./defaults').sync;
var q = require('./q');

var plugins = require('./plugins');
var Subscription = require('./subscription');


/** @module arkivio */


/**
 * @class Synchronization
 * @constructor
 */
function Synchronization(subscription, synchronizer) {
  this.subscription = subscription;
  this.synchronizer = synchronizer || Synchronizer.singleton;

  this.items = {};

  this.created = [];
  this.updated = [];
  this.deleted = [];
}

properties(Synchronization.prototype, {
  zotero: {
    get: function () {
      return this.synchronizer.zotero;
    }
  },

  notmodified: {
    get: function () {
      return this.version === undefined;
    }
  }
});


Synchronization.prototype.diff = function (versions, earlier) {
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

Synchronization.prototype.update = co(function* () {
  var s = this.subscription;
  this.version = undefined;

  debug('%s: requesting versions of "%s"...', s.id, s.path);

  // Touch subscription to mark sync start!
  s.touch();

  // TODO page versions request!

  var options = extend({}, s.params, { format: 'versions' });
  var message = yield this.zotero.get(s.path, options, s.headers);

  if (message.notmodified) {
    debug('%s: not modified', s.id);
    return this;
  }

  debug('%s: keys received for version %d (was %d)',
    s.id, message.version, s.version);

  this.version = message.version;
  this.versions = message.data;

  this.diff();

  debug('%s: versions received: %d created, %d updated, %d deleted',
      s.id, this.created.length, this.updated.length, this.deleted.length);

  return this;
});


Synchronization.prototype.check = function (version) {
  if (this.version === version) return true;

  debug('%s: version mismatch detected: %d (was %d)!',
    this.subscription.id, version, this.version);

  this.incomplete = true;

  return false;
};

Synchronization.prototype.download = co(function* () {
  var s    = this.subscription;
  var keys = this.updated.concat(this.created);

  if (!keys.length) return this;

  var max = 50;
  var path = [s.library, 'items'].join('/');

  var i, ii, j, jj, batch, item, key, options, message;

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

    options = extend({}, s.params, {
      format: 'json', include: 'data', itemKey: batch.join(',')
    });

    message =
      yield this.zotero.get(path, options, s.headers);

    debug('%s: %d items received...', s.id, message.data.length);

    assert.equal('json', message.type);

    if (!this.incomplete)
      this.check(message.version);

    for (j = 0, jj = message.data.length; j < jj; ++j) {
      item = message.data[j];
      this.items[item.key] = item;
    }
  }

  debug('%s: download complete', s.id);

  return this;
});


Synchronization.prototype.process = co(function* () {
  var self = this;

  debug('%s: processing plugins...', this.subscription.id);

  yield B
    .map(this.subscription.plugins, function (plugin) {

      if (!plugins.available[plugin.name]) {
        debug('%s: plugin %s not available, skipping...',
          self.subscription.id, plugin.name);

        return null;
      }

      debug('%s: processing data with "%s" plugin...',
        self.subscription.id, plugin.name);

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
          .process(self, callback);

        if (done.then)
          done.then(resolve, reject);

      });
    });

  debug('%s: processed all plugins', this.subscription.id);

  return this;
});

Synchronization.prototype.finalize = co(function* () {
  if (!this.notmodified) {
    this.subscription.update({
      version: this.version,
      versions: this.versions
    });
  }

  yield this.subscription.save();

  return this;
});

/**
 * @class Synchronizer
 * @constructor
 */
function Synchronizer() {
  this.zotero = new zotero.Client();
}


Synchronizer.prototype.synchronize = co(function* (subscription) {
  var synchronization =
    new Synchronization(subscription, this);

  debug('processing subscription "%s"...', subscription.id);

  yield synchronization.update();
  yield synchronization.download();

  // if incomplete, delay and try again!

  yield synchronization.process();

  yield synchronization.finalize(); // move this out of sync object!

  return synchronization;
});

Synchronizer.prototype.process = function (ids) {
  var self = this, subscriptions;

  ids = flatten.apply(null, arguments);

  if (ids.length) {
    subscriptions = B.map(ids, function (id) {
      debug('loading subscription "%s" for syncing...', id);
      return Subscription.load(id);
    });

  } else {
    debug('loading all subscriptions for syncing...');
    subscriptions = Subscription.all();
  }

  return subscriptions
    .spread(function (subscription) {
      return self.synchronize(subscription);
    });
};


Synchronizer.prototype.start = function () {
  q.jobs
    .process('sync', defaults.workers, this.process.bind(this));

  return this;
};

// --- MQ Job Handlers ---

Synchronizer.prototype.onSync = function (job, done) {
  debug('processing sync request for %j...', job.data);

  this
    .synchronize(job.data.id)

    .then(function () {
      report(job, ['sync complete']);

      done();
    })

    .catch(function (error) {
      report(job, ['sync failed: %s', error.message]);
      debug(error.stack);

      done(error);
    });
};

// --- Singleton ---
Synchronizer.singleton = new Synchronizer();

// --- Private Helpers ---

// Convenience helper to log messages to debug and UI
function report(job, args) {
  debug.apply(null, args);
  job.log.apply(job, args);
}

// --- Exports ---
module.exports = Synchronizer;
module.exports.Synchronization = Synchronization;
