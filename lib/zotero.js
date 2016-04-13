'use strict';

// --- Module Dependencies ---
var B      = require('bluebird');
var zotero = require('zotero');
var common = require('./common');

var pkg    = require('../package.json');
var extend = common.extend;
var pick   = common.pick;

zotero.promisify(B.promisify.bind(B));

zotero.Client.defaults
  .headers['User-Agent'] = [pkg.name, pkg.version].join('/');

var client = new zotero.Client();

client.stream = function (options) {
  var stream = new zotero.Stream();

  if (options) {
    extend(stream.idle, pick(options, 'ping', 'pong'));
  }

  return stream;
};

// --- Exports ---
module.exports = client;
