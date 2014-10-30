'use strict';

// --- Dependencies ---
var config       = require('./config');
var version      = require('../package.json').version;

var db           = require('./db');
var Controller   = require('./controller');
var plugins      = require('./plugins');
var MessageQueue = require('./q');
var Subscription = require('./subscription');
var Synchronizer = require('./sync');
var Server       = require('./http');
var zotero       = require('./zotero');

// --- Plugins ---
plugins.add(require('./plugins/logger'));

/** @module arkivo */

function arkivo(options) {
  config.update(options);
  return arkivo;
}

arkivo.Subscription = Subscription;

arkivo.db         = db;
arkivo.config     = config;
arkivo.controller = Controller.instance;
arkivo.plugins    = plugins;
arkivo.q          = MessageQueue.instance;
arkivo.sync       = Synchronizer.instance;
arkivo.server     = Server.instance;
arkivo.version    = version;
arkivo.zotero     = zotero;

// --- Exports ---
module.exports = arkivo;
