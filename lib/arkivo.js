'use strict';

// --- Dependencies ---
var db           = require('./db');
var Controller   = require('./controller');
var Subscription = require('./subscription');
var Synchronizer = require('./sync');
var UI           = require('./ui');


/** @module arkivo */

function arkivo() {}

arkivo.Subscription = Subscription;

arkivo.db         = db;
arkivo.controller = Controller.singleton;
arkivo.sync       = Synchronizer.singleton;
arkivo.ui         = UI.singleton;

// --- Exports ---
module.exports = arkivo;
