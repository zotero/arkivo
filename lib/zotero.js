'use strict';

// --- Module Dependencies ---
var B      = require('bluebird');
var zotero = require('zotero');

var pkg     = require('../package.json');

zotero.promisify(B.promisify.bind(B));

var client = new zotero.Client({
  headers: {
    'User-Agent': [pkg.name, pkg.version].join('/')
  }
});

// --- Exports ---
module.exports = client;
