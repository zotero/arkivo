'use strict';

// --- Dependencies ---
var debug = require('debug')('arkivo:sync');

var B = require('bluebird');
var co = B.coroutine.bind(B);

var zotero = require('zotero');
zotero.promisify(B.promisify.bind(B));

var properties = Object.defineProperties;

var common = require('./common');
var defaults = require('./defaults').sync;
var q = require('./q');

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

  current: {
    get: function () {
      return this.subscription.version === this.version;
    }
  }
});

Synchronization.prototype.request = co(function* () {
  var message, s = this.subscription;

  debug('requesting "%s"...', s.path);

  this.version = undefined;
  this.data = undefined;

  s.touch();

  message = yield this.zotero.get(s.path, s.params, s.headers);

  this.version = message.version;

  debug('initial response received for "%s" version %d (was %d)',
    s.path, message.version, s.version);

  // Return early if no update is necessary!
  if (this.current) return this;

  this.data = message.data;

  // Fetch remaining objects if this is a multi-object request
  if (message.multi) {
    while (!message.done) {
      message = yield message.next();

      debug('additional data received for "%s"', s.path);

      if (this.version !== message.version) {
        debug('version mismatch detected (%d): restarting...',
          message.version);

        return this.request();
      }

      this.data += message.data;
    }
  }

  return this;
});


Synchronization.prototype.process = co(function* () {

  // TODO Send data to plugins

  return this;
});

Synchronization.prototype.finalize = co(function* () {
  yield this.subscription
    .update({ version: this.version })
    .save();

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

  if (!synchronization.current) {
    yield synchronization.process();

  } else {
    debug('subscription "%s" is up-to-date: nothing to do',
      subscription.id);
  }

  yield synchronization.finalize();

  return synchronization;
});

Synchronizer.prototype.process = function (ids) {
  var self = this, subscriptions;

  ids = common.flatten.apply(null, arguments);

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
