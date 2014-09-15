'use strict';

// --- Dependencies ---


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

  this.app = express();
  this.app.use('/q', q.app);

}

UI.prototype.listen = function (port) {
  var self = this;

  port = port || this.options.port;

  this.app.set('title', this.options.title);
  q.app.set('title', [this.options.title, 'Message Queue'].join(':'));

  return new B(function (resolve, reject) {
    self.app.listen(port, function (error) {
      if (error) return reject(error);

      debug('listening on port %d', port);
      resolve(self);
    });
  });
};

// --- Singleton ---
UI.singleton = new UI();

// --- Exports ---

module.exports = UI;
