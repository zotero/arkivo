'use strict';

// --- Dependencies ---

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

var debug = require('debug')('arkivo:controller');

var B = require('bluebird');
var co = B.coroutine.bind(B);

var config = require('./config').controller;
var common = require('./common');

var extend = common.extend;
var noop = common.noop;

var q = require('./q');
var db = require('./db');

var sync = require('./sync').singleton;

var Subscription = require('./subscription');

/** @module arkivo */


/**
 * @class Controller
 * @extends events.EventEmtitter
 * @constructor
 */
function Controller(options) {
  EventEmitter.call(this);

  this.options = extend({}, config, options);
}
inherits(Controller, EventEmitter);


// --- Controller Prototype ---

/**
 * Creates a new `Subscription` for the passed-in data
 * and saves it.
 *
 * @method subscribe
 *
 * @param {Object} values
 *   The subscription's values (url, key, etc.).
 *
 * @returns {Promise<Subscription>}
 *   A promise for the saved subscription.
 */
Controller.prototype.subscribe = function (values, job) {
  var self = this;

  report(job, ['subscribing to "%s"...', values.url]);

  return (new Subscription(values))
    .save()
    .tap(function (s) { self.notify('sync', { id: s.id }); });
};

/**
 * Loads the `Subscription` for the passed-in id
 * and removes it from the database; returns the
 * subscription object.
 *
 * @method unsubscribe
 *
 * @param {String} id
 *   The id of the subscription to remove.
 *
 * @returns {Promise<Subscription>}
 *   A promise for the removed subscription.
 */
Controller.prototype.unsubscribe = co(function* (id, job) {
  report(job, ['unsubscribing from "%s"...', id]);
  return (yield Subscription.load(id)).destroy();
});


Controller.prototype.synchronize = function (id, job) {
  var progress;

  report(job, ['loading subscription(s) "%s"...', id]);

  return Subscription
    .find(id)

    .map(function (subscription, _, total) {

      if (!progress)
        progress = progressor(job, total);

      report(job, [
        'synchronizing subscription "%s"...', subscription.id
      ]);

      return sync
        .synchronize(subscription)
        .tap(progress);
    });
};

/**
 * Saves a new job description in the message queue.
 *
 * @method notify
 *
 * @param {String} name The job name.
 * @param {Object} data The data to be passed on to the worker.
 *
 * @returns {Promise}
 */
Controller.prototype.notify = function (name, data) {
  return new B(function (resolve, reject) {
    q.jobs
      .create(name, data)

      .save(function (error) {
        if (error) {
          debug('failed to save job "%s": %s', name, error.message);
          reject(error);

        } else {
          debug('saved job "%s" with data %j', name, data);
          resolve();
        }
      });
  });
};



// --- MQ Job Handlers ---

Controller.prototype.onSubscribe = function (job, done) {
  debug('processing subscribe request for %j...', job.data);

  this
    .subscribe(job.data)
    .bind(this)

    .then(function (subscription) {
      report(job, ['subscription saved as "%s"', subscription.id]);
      done();

      return subscription;
    })

    .tap(function (subscription) {
      return this.notify('sync', { id: subscription.id });
    })

    .catch(function (error) {
      report(job, ['subscription failed: %s', error.message]);
      debug(error.stack);

      done(error);
    });
};

Controller.prototype.onUnsubscribe = function (job, done) {
  debug('processing unsubscribe request for "%s"...', job.data.id);

  this
    .unsubscribe(job.data.id)

    .then(function (subscription) {
      report(job, ['deleted subscription "%s"', subscription.id]);
      done();
    })

    .catch(function (error) {
      report(job, ['failed to unsubscribe: %s', error.message]);
      debug(error.stack);

      done(error);
    });
};

Controller.prototype.onSync = function (job, done) {
  debug('processing sync request for %j...', job.data);

  this
    .synchronize([job.data.id], job)

    .then(function () {
      report(job, ['synchronization complete']);

      done();
    })

    .catch(function (error) {
      report(job, ['synchronization failed: %s', error.message]);
      debug(error.stack);

      done(error);
    });
};

Controller.prototype.start = function () {
  q.jobs
    .process('subscribe', config.workers, this.onSubscribe.bind(this));
  q.jobs
    .process('unsubscribe', config.workers, this.onUnsubscribe.bind(this));
  q.jobs
    .process('sync', config.workers, this.onSync.bind(this));

  debug('listening for job requests...');

  return this;
};


Controller.prototype.stop = function () {
  debug('shutting down...');

  db.reset();

  return new B(function (resolve, reject) {
    q.jobs.shutdown(function (error) {
      if (error) return reject(error);

      debug('shut down complete');
      resolve();

    }, 5000);
  });
};

// --- Controller Singleton ---
Controller.singleton = new Controller();

// --- Private Helpers ---

// Convenience helper to log messages to debug and UI
function report(job, args) {
  debug.apply(null, args);

  if (job) {
    args[0] = capitalize(args[0]);
    job.log.apply(job, args);
  }
}

function capitalize(string) {
  if (string.length)
    return string[0].toUpperCase() + string.slice(1);

  return string;
}

function progressor(job, total) {
  if (!job) return noop;

  var completed = 0;

  return function progress() {
    job.progress(++completed, total);
  };
}

// --- Exports ---
module.exports = Controller;
