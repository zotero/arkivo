'use strict';

// --- Dependencies ---

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

var debug = require('debug')('arkivo:controller');

var B = require('bluebird');
var co = B.coroutine.bind(B);

var defaults = require('../defaults').controller;
var common = require('../common');

var q = require('../q');
var db = require('../db');
var Subscription = require('../subscription');

/** @module arkivo */


/**
 * @class Controller
 * @extends events.EventEmtitter
 * @constructor
 */
function Controller(options) {
  EventEmitter.call(this);

  this.options = common.extend({}, defaults, options);
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
Controller.prototype.subscribe = function (values) {
  return (new Subscription(values)).save();
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
 *   A promise for the remove subscription.
 */
Controller.prototype.unsubscribe = co(function* (id) {
  return (yield Subscription.load(id)).destroy();
});


// --- MQ Job Handlers ---

Controller.prototype.onSubscribe = function (job, done) {
  debug('processing subscribe request for %j...', job.data);

  this
    .subscribe(job.data)

    .then(function (subscription) {
      report(job, ['subscription saved as "%s"', subscription.id]);
      done();
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


Controller.prototype.start = function (port) {
  var self = this;

  this.process();

  port = port || this.options.port;

  return new B(function (resolve, reject) {
    q.app.listen(port, function (error) {
      if (error) return reject(error);

      debug('ui up and running on port %d', port);
      resolve(self);
    });
  });
};

Controller.prototype.process = function () {
  q.jobs
    .process('subscribe', defaults.workers, this.onSubscribe.bind(this));

  q.jobs
    .process('unsubscribe', defaults.workers, this.onUnsubscribe.bind(this));

  return this;
};


Controller.prototype.shutdown = function () {
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
var controller = Controller.singleton = new Controller();


// --- Signal Handlers ---

process.once('SIGTERM', function () {
  debug('sigterm received: shutting down...');

  controller.shutdown()
    .then(function () { process.exit(0); })

    .catch(function (error) {
      debug('failed to shut down gracefully: %s', error.message);
      debug(error.stack);

      process.exit(1);
    });
});

// --- Private Helpers ---

// Convenience helper to log messages to debug and UI
function report(job, args) {
  debug.apply(null, args);
  job.log.apply(job, args);
}

// --- Exports ---
module.exports = Controller;
