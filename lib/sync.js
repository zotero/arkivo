var debug = require('debug')('arkivo:sync');

var zotero = require('zotero');
var q = require('./q');
var defaults = require('./defaults');

var client = new zotero.Client();

q.jobs.process('sync', defaults.sync.workers, function (job, done) {
  debug('updating library %s...', job.data.library);

  var lib = zotero({ user: job.data.library, client: client });

  lib.items(function () {
    zotero.print.call(arguments);
    done();
  });
});

