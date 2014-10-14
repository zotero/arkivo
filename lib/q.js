'use strict';

// --- Module Dependencies ---
var assert = require('assert');

var debug = require('debug')('q');
var B     = require('bluebird');
var kue   = require('kue');

var config = require('./config');

var property   = Object.defineProperty;
var properties = Object.defineProperties;

/** @module arkivo */

/**
 * A MessageQueue is a thin wrapper around Kue.
 *
 * @class MessageQueue
 * @param {Object} [options]
 */
function MessageQueue(options) {
  this.options = options;

  /**
   * @property jobs
   * @type {Kue.Queue}
   */
  var jobs;

  property(this, 'jobs', {
    get: function () {
      if (!jobs) {
        debug('create new queue...');

        jobs = kue.createQueue({
          prefix: this.options.q.prefix,
          redis: this.options.redis
        });
      }

      return jobs;
    }
  });
}

properties(MessageQueue.prototype, {

  /**
   * @property app
   * @type {Express.Application}
   */
  app: {
    get: function () {
      assert(this.jobs);
      return kue.app;
    }
  }

});


MessageQueue.prototype.state = function (state) {
  assert(this.jobs);

  return new B(function (resolve, reject) {
    this.jobs.state(state, function (err, ids) {
      if (err) return reject(err);
      resolve(ids);
    });
  }.bind(this));
};

MessageQueue.prototype.shutdown = function (timeout) {
  if (timeout == null) timeout = 500;

  debug('shutting down queue (with %dms grace period)...', timeout);

  return new B(function (resolve, reject) {
    this.jobs.shutdown(function (error) {

      if (error) return reject(error);

      debug('shutdown complete');
      resolve();

    }, timeout);

  }.bind(this));
};

// --- Singleton ---
MessageQueue.singleton = new MessageQueue(config);

// --- Exports ---
module.exports = MessageQueue;
