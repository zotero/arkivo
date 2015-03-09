'use strict';

// --- Module Dependencies ---
var B      = require('bluebird');
var zotero = require('zotero');

var pkg    = require('../package.json');

zotero.promisify(B.promisify.bind(B));

zotero.Client.defaults
  .headers['User-Agent'] = [pkg.name, pkg.version].join('/');

var client = new zotero.Client();

client.stream = function () {
  return new zotero.Stream();
};

// --- Exports ---
module.exports = client;
