'use strict';

// --- Dependencies ---
var db           = require('./db');
var Controller   = require('./controller');
var plugins      = require('./plugins');
var Subscription = require('./subscription');
var Synchronizer = require('./sync');
var UI           = require('./ui');

// --- Plugins ---
require('./plugins/logger');

/** @module arkivo */

function arkivo() {}

arkivo.Subscription = Subscription;

arkivo.db         = db;
arkivo.controller = Controller.singleton;
arkivo.plugins    = plugins;
arkivo.sync       = Synchronizer.singleton;
arkivo.ui         = UI.singleton;

// --- Exports ---
module.exports = arkivo;
