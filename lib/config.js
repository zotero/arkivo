'use strict';

// --- Dependencies ---

var assert   = require('assert');
var common   = require('./common');
var debug    = require('debug')('arkivo:config');
var defaults = require('./defaults');

var extend = common.extend;

/** @module arkivo */

function Configuration(options) {
  debug('initialize');

  this.options = options;

  for (var section in options)
    this.alias(section);
}

Configuration.prototype.update = function (options) {
  debug('updating', options);

  for (var section in this.options) {
    if (options[section]) {
      debug('updating "%s" with %j', section, options[section]);
      assert(typeof options[section] === 'object');

      extend(this.options[section], options[section]);
    }
  }

  return this;
};

Configuration.prototype.alias = function (name) {
  Object.defineProperty(this, name, {
    get: function () {
      return this.options[name];
    }
  });

  return this;
};

module.exports = new Configuration(defaults);
