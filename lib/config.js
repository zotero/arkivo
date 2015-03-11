'use strict';

process.env.SUPPRESS_NO_CONFIG_WARNING = 'y';

// --- Dependencies ---
var debug  = require('debug')('arkivo:config');
var join   = require('path').join;
var each   = require('./common').each;
var config = require('config');
var extend = config.util.extendDeep;


// --- Local Defaults ---
config.util.setModuleDefaults('arkivo', extend(local(), config.arkivo));


// --- Proxy Object ---
var proxy = {};

each(['get', 'has'], alias);
each(Object.keys(config.arkivo), reader);

proxy.update = update;


// --- Helpers ---

function local() {
  try {
    var NODE_CONFIG_DIR = process.env.NODE_CONFIG_DIR;

    debug('loading default configuration...');
    process.env.NODE_CONFIG_DIR = join(__dirname, 'config');

    return config.util.loadFileConfigs();

  } finally {
    process.env.NODE_CONFIG_DIR = NODE_CONFIG_DIR;
  }
}

function update() {
  debug('updating default configuration...');

  config.util.setModuleDefaults('arkivo',
    extend.apply(null, [{}].concat(arguments)));

  return config.arkivo;
}

function reader(name) {
  Object.defineProperty(proxy, name, {
    get: function () {
      return config.get(ns(name));
    }
  });
}

function alias(method) {
  Object.defineProperty(proxy, method, {
    writable: false,
    value: function (name) {
      return config[method](ns(name));
    }
  });
}

function ns(name) {
  return ['arkivo', name].join('.');
}


// --- Dependencies ---

var assert   = require('assert');


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
module.exports.proxy = proxy;
