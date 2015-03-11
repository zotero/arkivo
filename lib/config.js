'use strict';

process.env.SUPPRESS_NO_CONFIG_WARNING = 'y';

var debug = require('debug')('arkivo:config');
var config = require('config');

var DEFAULTS = config.util.extendDeep({}, local(), config.arkivo);

config.util.setModuleDefaults('arkivo', DEFAULTS);


// --- Private Helpers ---

function local() {
  try {
    var NODE_CONFIG_DIR = process.env.NODE_CONFIG_DIR;

    process.env.NODE_CONFIG_DIR = __dirname + '../config';

    return config.util.loadFileConfigs();

  } finally {
    process.env.NODE_CONFIG_DIR = NODE_CONFIG_DIR;
  }
}


// --- Dependencies ---

var assert   = require('assert');
var common   = require('./common');

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

module.exports = new Configuration(require('./defaults'));
module.exports.config = config;
