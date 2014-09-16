'use strict';

// --- Dependencies ---

var assert = require('assert');
var http = require('http');

var debug = require('debug')('arkivo:ui');
var express = require('express');

var B = require('bluebird');
//var co = B.coroutine.bind(B);

var defaults = require('../defaults').ui;
var common = require('../common');
var extend = common.extend;

var q = require('../q');


/** @module arkivo */

function UI(options) {
  this.options = extend({}, defaults, options);
}

UI.prototype.start = function (port) {
  assert(!this.app && !this.server);

  var self = this;
  port = port || this.options.port;

  this.app = express();
  this.app.use('/q', q.app);

  this.app.set('title', this.options.title);
  q.app.set('title', [this.options.title, 'Message Queue'].join(':'));

  this.server = http.createServer(this.app);

  return new B(function (resolve, reject) {
    self.server.listen(port, function (error) {
      if (error) return reject(error);

      debug('listening on port %d', port);
      resolve(self);
    });
  });
};

UI.prototype.stop = function () {
  assert(this.app && this.server);

  var self = this;

  debug('shutting down...');

  return new B(function (resolve, reject) {
    self.server.close(function (error) {

      if (error) return reject(error);

      delete self.app;
      delete self.server;

      debug('shutdown complete');

      resolve(self);
    });
  });
};

// --- Singleton ---
UI.singleton = new UI();

// --- Exports ---

module.exports = UI;
