'use strict';

// --- Dependencies ---
var debug = require('debug')('arkivo:plugins:hydra');

var joins    = require('path').joins;
var util     = require('util');
var inherits = util.inherits;

var B        = require('bluebird');
var co       = B.coroutine.bind(B);

var RESTClient  = require('../rest-client');
var URL_PATTERN = /^https?:\/\//i;

function HydraClient(host, token) {
  RESTClient.call(this, {
    create: joins(host, '/api/items'),
    update: joins(host, '/api/items/:id'),
    delete: joins(host, '/api/items/:id')
  });

  this.token = token;
}

inherits(HydraClient, RESTClient);

// Zotero <=> Hydra Item Types
HydraClient.type = {
  'journalArticle':   'Article',
  'magazineArticle':  'Article',
  'newspaperArticle': 'Article',
  'audioRecording':   'Audio',
  'radioBroadcast':   'Audio',
  'podcast':          'Audio',
  'book':             'Book',
  'bookSection':      'Part of Book',
  'thesis':           'Thesis',
  'videoRecording':   'Video',
  'film':             'Video',
  'tvBroadcast':      'Video',
  'conferencePaper':  'Conference Proceeding',
  'computerProgram':  'Software or Program Code',
  'artwork':          'Image',
  'map':              'Map or Cartographic Material',
  'presentation':     'Presentation'
};

HydraClient.prototype.transform = function (item) {
  var src  = item.data;
  var data = {};
  var file = {};

  data.resourceType =
    HydraClient.type[src.itemType] || 'Other';

  data.title       = src.title;

  data.creators    = src.creators;

  data.description = src.abstractNode;
  data.date        = src.date;
  data.publisher   = src.publisher;
  data.dateCreated = src.dateAdded;
  data.basedNear   = src.place;
  data.url         = src.URL;
  data.language    = src.language;
  data.rights      = src.rights;
  data.tags        = src.tags;

  data.identifier =
    src.DOI || src.ISBN || src.PMID || src.arXiv;

  return B.fulfilled({
    token: this.token, metadata: data, file: file
  });
};

module.exports = {
  constructor: HydraClient,

  name: 'hydra',

  description:
    'Forwards synchronized data to Hydra/ScholarSphere.',

  parameters: {
    host: {
      mandatory: true,
      validate: URL_PATTERN
    }
  },

  process: co(function* (sync) {
    var id = sync.subscription.id;

    debug('[%s] processing subscription...', id);

    var client = new HydraClient(this.options);

    yield B.each(sync.deleted.map(expand), client.delete.bind(client));

    debug('[%s] processed %d deleted item(s)', id, sync.deleted.length);

    yield B.each(sync.created.map(lookup), client.create.bind(client));

    debug('[%s] processed %d created item(s)', id, sync.created.length);

    yield B.each(sync.updated.map(lookup), client.update.bind(client));

    debug('[%s] processed %d updated item(s)', id, sync.updated.length);

    function lookup(key) { return sync.items[key]; }
    function expand(key) { return { key: key };    }
  })
};
