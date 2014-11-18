'use strict';

// --- Dependencies ---
var debug = require('debug')('arkivo:plugins:rest');

var B       = require('bluebird');
var co      = B.coroutine.bind(B);

var RESTClient = require('../rest-client');

module.exports = {
  name: 'rest',

  description:
    'Forwards synchronized data from Zotero to a RESTful ' +
    'web service. The plugin can be configured with the  ' +
    'names of the service endpoints.'                      ,

  parameters: {
    create: {
      mandatory: true
    },
    update: {
      mandatory: true
    },
    delete: {
      mandatory: true
    }
  },

  process: co(function* (sync) {
    var id = sync.subscription.id;

    debug('[%s] processing subscription...', id);

    var client = new RESTClient(this.options);

    yield B.each(sync.deleted.map(extend), client.delete.bind(client));

    debug('[%s] processed %d deleted item(s)', id, sync.deleted.length);

    yield B.each(sync.created.map(lookup), client.create.bind(client));

    debug('[%s] processed %d created item(s)', id, sync.created.length);

    yield B.each(sync.updated.map(lookup), client.update.bind(client));

    debug('[%s] processed %d updated item(s)', id, sync.updated.length);

    function lookup(key) { return sync.items[key]; }
    function extend(key) { return { key: key };    }
  })
};
