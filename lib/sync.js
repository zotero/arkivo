var debug = require('debug')('arkivo:sync');

var zotero = require('zotero');
var q = require('./q');
var defaults = require('./defaults');
var Subscription = require('subscription');

var z = new zotero.Client();

function synchronize(subscription, callback) {
  z.get(subscription.id, {}, {
    Authorization: ['Bearer', subscription.key].join(' ')
  }, zotero.print);

  callback();
}

q.jobs.process('sync', defaults.sync.workers,
  function (job, done) {
    debug('job for "%s" received', job.data.url);

    Subscription.load(job.data.url, function (error, subscription) {
      if (error)
        return debug('failed: %m', error.message);

      synchronize(subscription, done);
    });
  }
);

