'use strict';

// --- Dependencies ---
var debug = require('debug')('arkivo:sync');

var B = require('bluebird');
var co = B.coroutine.bind(B);

var zotero = require('zotero');
zotero.promisify(B.promisify.bind(B));

var common = require('./common');
var defaults = require('./defaults').sync;
var q = require('./q');

var Subscription = require('./subscription');


/**
 * @class Synchronizer
 * @constructor
 */
function Synchronizer() {
  this.zotero = new zotero.Client();
}

Synchronizer.prototype.request = function (s) {
  return this.zotero.get(s.pathname, s.params, s.headers);
};

Synchronizer.prototype.synchronize = co(function* (subscription) {
  var message = yield this.request(subscription);

  debug('headers received for %s: %j', subscription.id, message.headers);

  return subscription;
});

Synchronizer.prototype.process = function (ids) {
  var self = this, subscriptions;

  ids = common.flatten(arguments);

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
