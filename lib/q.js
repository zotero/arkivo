'use strict';

var B = require('bluebird');
var kue = require('kue');

var debug = require('debug')('q');

var defaults = require('./defaults');

var property = Object.defineProperty;

var q = {};
var jobs;

property(q, 'config', {
  get: function () {
    return {
      prefix: defaults.q.prefix,
      redis: defaults.redis
    };
  }
});

property(q, 'jobs', {
  enumerable: true,

  get: function () {
    if (!jobs) {
      debug('create queue...');
      jobs = kue.createQueue(q.config);
    }

    return jobs;
  }
});

property(q, 'app', {
  get: function () {
    q.jobs; // makes sure the queue has been created
    return kue.app;
  }
});

q.shutdown = function (timeout) {
  if (timeout == null) timeout = 500;

  debug('shutting down queue (with %dms grace period)...', timeout);

  return new B(function (resolve, reject) {
    q.shutdown(function (error) {

      if (error) return reject(error);

      debug('shutdown complete');
      resolve();

    }, timeout);
  });
};

module.exports = q;
