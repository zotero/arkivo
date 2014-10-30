'use strict';

// --- Dependencies ---

var assert   = require('assert');
var http     = require('http');

var debug    = require('debug')('arkivo:server');
var express  = require('express');
var graceful = require('http-close');

var B = require('bluebird');
//var co = B.coroutine.bind(B);

var properties = Object.defineProperties;

var config = require('../config').http;
var common = require('../common');
var extend = common.extend;

var q        = require('../q').instance;
var routes   = require('./routes');

/** @module arkivo */

function Server(options) {
  this.options = extend({}, config, options);
}

properties(Server.prototype, {
  started: {
    get: function () { return !!this.instance; }
  }
});

Server.prototype.initialize = function () {
  if (this.app) return this;

  this.app = express();

  this.app.use(this.options.api, q.app);
  this.app.use(this.options.api, routes.api);

  this.app.set('title', this.options.title);
  q.app.set('title', [this.options.title, 'Message Queue'].join(':'));

  return this;
};

Server.prototype.start = function (port) {
  assert(!this.started);

  this.initialize();
  port = port || this.options.port;

  debug('starting up...');

  return new B(function (resolve, reject) {
    this.instance = http.createServer(this.app);
    graceful({ timeout: this.options.timeout }, this.instance);

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

      this.reset();
      debug('shutdown complete');

      resolve(this);

    }.bind(this));
  }.bind(this));
};

Server.prototype.reset = function () {
  delete this.app;
  delete this.instance;

  return this;
};

// --- Singleton ---
Server.instance = new Server();

// --- Exports ---
module.exports = Server;
