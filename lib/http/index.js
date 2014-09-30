'use strict';

// --- Dependencies ---

var assert = require('assert');
var http = require('http');

var debug = require('debug')('arkivo:server');
var express = require('express');

var B = require('bluebird');
//var co = B.coroutine.bind(B);

var properties = Object.defineProperties;

var config = require('../config').ui;
var common = require('../common');
var extend = common.extend;

var q = require('../q');


/** @module arkivo */

function Server(options) {
  this.options = extend({}, config, options);
}

properties(Server.prototype, {
  started: {
    get: function () {
      return this.app && this.instance;
    }
  }
});

Server.prototype.start = function (port) {
  assert(!this.started);

  port = port || this.options.port;

  debug('starting up...');

  return new B(function (resolve, reject) {

    this.app = express();
    this.app.use('/q', q.app);

    this.app.set('title', this.options.title);
    q.app.set('title', [this.options.title, 'Message Queue'].join(':'));

    this.instance = http.createServer(this.app);

    this.instance.listen(port, function (error) {
      if (error) return reject(error);

      debug('listening on port %d', port);
      resolve(this);

    }.bind(this));
  }.bind(this));
};

Server.prototype.stop = function () {
  assert(this.started);

  debug('shutting down...');

  return new B(function (resolve, reject) {
    this.instance.close(function (error) {
      if (error) return reject(error);

      delete this.app;
      delete this.instance;

      debug('shutdown complete');

      resolve(this);

    }.bind(this));
  }.bind(this));
};


// --- Singleton ---
Server.singleton = new Server();

// --- Exports ---

module.exports = Server;
