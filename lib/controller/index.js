'use strict';

// --- Dependencies ---

var debug = require('debug')('arkivo:controller');

var B = require('bluebird');
var co = B.coroutine.bind(B);

var defaults = require('../defaults');
var common = require('../common');

var q = require('../q');
var Subscription = require('../subscription');


/**
 * @class Controller
 * @constructor
 */
function Controller(options) {
  this.options = common.extend({}, defaults.controller, options);
}

Controller.prototype.subscribe = function (values) {
  return (new Subscription(values)).save();
};

Controller.prototype.unsubscribe = co(function* (id) {
  return (yield Subscription.load(id)).destroy();
});

Controller.prototype.start = function (port) {
  var self = this;

  port = port || this.options.port;

  return new B(function (resolve, reject) {
    q.app.listen(port, function (error) {
      if (error) return reject(error);

      debug('ui up and running on port %d', port);
      resolve(self);
    });
  });
};

Controller.prototype.shutdown = function () {
  debug('shutting down...');

  Subscription.disconnect();

  return new B(function (resolve, reject) {
    q.shutdown(function (error) {
      if (error) return reject(error);

      debug('shut down complete');
      resolve();
    }, 5000);
  });
};

// --- Controller Singleton ---
var controller = Controller.singleton = new Controller();


// --- MQ ---


q.jobs.process('susbscribe', function (job, done) {
  debug('processing subscribe request for %j...', job.data);

  controller
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
});

q.jobs.process('unsubscribe', function (job, done) {
  debug('processing unsubscribe request for "%s"...', job.data.id);

  controller
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
});

// Convenience helper to log messages to debug and UI
function report(job, args) {
  debug.apply(null, args);
  job.log.apply(job, args);
}

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

// --- Exports ---
module.exports = Controller.singleton;
