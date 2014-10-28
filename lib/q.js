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
          disableSearch: true,
          prefix: this.options.q.prefix,
          redis: this.options.redis
        });

        jobs.on('error', function (error) {
          debug('unhandled error: %s', error.message);
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

MessageQueue.states = [
  'active', 'complete', 'failed', 'inactive', 'delayed'
];

MessageQueue.states.forEach(function (state) {
  MessageQueue.prototype[state] = function () {
    return this.state(state).map(this.get);
  };
});

MessageQueue.prototype.interrupted = function () {
  return this
    .failed()
    .filter(function (job) { return job._error === 'Shutdown'; });
};

MessageQueue.prototype.state = function (state, type) {
  assert(this.jobs);

  return new B(function (resolve, reject) {
    this.jobs.state(state, function (err, ids) {
      if (err) return reject(err);
      resolve(ids);
    });
  }.bind(this));
};

MessageQueue.prototype.get = function (id) {
  return new B(function (resolve, reject) {
    kue.Job.get(id, function (err, job) {
      if (err) return reject(err);
      resolve(job);
    });
  });
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
