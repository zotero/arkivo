'use strict';

// --- Module Dependencies ---
var debug  = require('debug')('arkivo:listener');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

var zotero = require('./zotero');
var config = require('./config');


/** @module arkivo */

/**
 * Connects to the Zotero Stream API and listens
 * for notifications.
 *
 * @class Listener
 * @constructor
 * @extends EventEmitter
 */
function Listener() {
  EventEmitter.call(this);

  this.stream = zotero
    .stream()
    .on('topicUpdated', this.updated.bind(this))
    .on('error', this.emit.bind(this, 'error'));
}

inherits(Listener, EventEmitter);

Listener.prototype.updated = function (data) {
};


// --- Exports ---
module.exports = Listener;
