'use strict';

// --- Dependencies ---
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


Synchronization.prototype.diff = function (items, earlier) {
  earlier = earlier || this.subscription.items;

  this.items = items;

  this.created = [];
  this.updated = [];
  this.deleted = Object.keys(earlier);

  // Loop through all new items; each key has not been
  // deleted; it has been created if not present earlier;
  // and updated if its earlier version is less than the
  // current one.
  for (var key in items) {

    delete this.deleted[key];

    if (earlier.hasOwnProperty(key)) {

      if (items[key] > earlier[key])
        this.updated.push(key);

    } else {
      this.created.push(key);
    }
  }

  return this;
};

Synchronization.prototype.request = co(function* () {
  var s = this.subscription;

  debug('%s: requesting "%s"...', s.id, s.path);

  this.version = undefined;
  this.data = undefined;

  s.touch();

  var options = extend({}, s.params, { format: 'versions' });
  var message = yield this.zotero.get(s.path, options, s.headers);

  if (message.notmodified) {
    debug('%s: not modified', s.id);
    return this;
  }

  debug('%s: new keys received for version %d (was %d)',
    s.id, message.version, s.version);

  this.version = message.version;
  this.diff(message.data);

  this.data = message.data;

  // Fetch remaining objects if this is a multi-object request
  if (message.multi) {
    while (!message.done) {
      message = yield message.next();

      debug('%s: additional data received', s.id);

      if (this.version !== message.version) {
        debug('%s: version mismatch detected (%d): restarting...',
          s.id, message.version);

        return this.request();
      }

      if (Array.isArray(this.data)) {
        this.data = this.data.concat(message.data);
      } else {
        this.data += message.data;
      }
    }
  }

  debug('%s: full response received', s.id);

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
  if (!this.notmodified)
    this.subscription.update({ version: this.version, items: this.items });

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

  yield synchronization.request();

  yield synchronization.process();

  yield synchronization.finalize();

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
