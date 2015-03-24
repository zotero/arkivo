'use strict';
process.env.SUPPRESS_NO_CONFIG_WARNING = 'y';


// --- Dependencies ---
var debug  = require('debug')('arkivo:config');
var join   = require('path').join;
var each   = require('./common').each;
var config = require('config');

var extend   = config.util.extendDeep;
var env      = config.util.getEnv;
var override = config.util.setModuleDefaults;

var slice    = Array.prototype.slice;
var keys     = Object.keys;
var property = Object.defineProperty;


// --- Local Defaults ---
var LOCAL_CONFIG_DIR = join(__dirname, '../config');

if (env('NODE_CONFIG_DIR') !== LOCAL_CONFIG_DIR)
  override('arkivo', extend(load(LOCAL_CONFIG_DIR), config.arkivo));


/** @module arkivo */

/**
 * The Arkivo configuration object. This is mostly a proxy
 * for the NPM `config` object used by Arkivo. It exposes
 * the regular `get` and `has` methods and readers to all
 * properies in the `config.arkivo` namespace.
 *
 * @namespace config
 */
var proxy = {};

/**
 * @method get
 */

/**
 * @method has
 * @returns Boolean
 */

each(['get', 'has'], alias);
each(keys(config.arkivo), reader);

proxy.update = update;


// --- Helpers ---

function load(directory) {
  try {
    var NODE_CONFIG_DIR = process.env.NODE_CONFIG_DIR;

    debug('loading default configuration...');
    process.env.NODE_CONFIG_DIR = LOCAL_CONFIG_DIR;

    return config.util.loadFileConfigs().arkivo;

  } finally {
    process.env.NODE_CONFIG_DIR = NODE_CONFIG_DIR;
  }
}

function update() {
  debug('updating default configuration...');

  config.util.setModuleDefaults('arkivo',
    extend.apply(null, [{}].concat(slice.apply(arguments))));

  return config.arkivo;
}

function reader(name) {
  property(proxy, name, {
    get: function () {
      return config.get(ns(name));
    }
  });
}

function alias(method) {
  property(proxy, method, {
    writable: false,
    value: function (name) {
      return config[method](ns(name));
    }
  });
}

function ns(name) {
  return ['arkivo', name].join('.');
}

// --- Exports ---
module.exports = proxy;
