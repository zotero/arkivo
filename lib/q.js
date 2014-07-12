var kue = require('kue');
var defaults = require('./defaults');
var q = {};
var jobs;

Object.defineProperty(q, 'config', {
  get: function () {
    return {
      prefix: defaults.q.prefix,
      redis: defaults.redis
    };
  }
});

Object.defineProperty(q, 'jobs', {
  enumerable: true,

  get: function () {
    if (!jobs) {
      jobs = kue.createQueue(q.config);
    }

    return jobs;
  }
});

Object.defineProperty(q, 'app', {
  get: function () {
    // make sure the queue has been created
    q.jobs;

    return kue.app;
  }
});

module.exports = q;
