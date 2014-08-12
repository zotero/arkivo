'use strict';

// --- Dependencies ---

var debug = require('debug')('arkivo:controller');

var B = require('bluebird');
var co = B.coroutine.bind(B);

var defaults = require('../defaults');
var common = require('../common');

var q = require('../q');
var Subscription = require('../subscription');

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
      if (error) reject(error);

      debug('ui up and running on port %d', port);
      resolve(self);
    });
  });
};

Controller.prototype.stop = function () {
  Subscription.disconnect();
};

// --- Controller Singleton ---

var controller = new Controller();


q.jobs.process('susbscribe', function (job, done) {
  debug('subscribing to %j', job.data);

  controller
    .subscribe(job.data)

    .then(function (subscription) {
      debug('subscription saved as "%s"', subscription.id);
      done();
    })

    .catch(function (error) {
      debug('subscription failed: %s', error.message);
      debug(error.stack);

      done(error);
    });
});


// --- Exports ---
module.exports = controller;
