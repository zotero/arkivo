var kue = require('kue');
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
    if (!jobs)
      jobs = kue.createQueue(q.config);

    return jobs;
  }
});

property(q, 'app', {
  get: function () {
    // make sure the queue has been created
    q.jobs;

    return kue.app;
  }
});

module.exports = q;
