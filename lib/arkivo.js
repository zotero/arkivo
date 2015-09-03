'use strict';

// --- Dependencies ---
var config       = require('./config');
var version      = require('../package.json').version;

var db           = require('./db');
var common       = require('./common');
var Controller   = require('./controller');
var plugins      = require('./plugins');
var MessageQueue = require('./q');
var Subscription = require('./subscription');
var Synchronizer = require('./sync');
var Server       = require('./http');
var zotero       = require('./zotero');

require('segfault-handler').registerHandler();

/**
 * @module arkivo
 * @main arkivo
 * @type Function
 */

function arkivo(options) {
  config.update(options);
  plugins.update();

  return arkivo;
}

arkivo.Subscription = Subscription;
arkivo.Synchronizer = Synchronizer;

arkivo.db         = db;
arkivo.config     = config;
arkivo.common     = common;
arkivo.controller = Controller.instance;
arkivo.plugins    = plugins;
arkivo.q          = MessageQueue.instance;
arkivo.sync       = Synchronizer.instance;
arkivo.server     = Server.instance;
arkivo.version    = version;
arkivo.zotero     = zotero;

// --- Plugins ---
plugins.update();

// --- Exports ---
module.exports = arkivo;
