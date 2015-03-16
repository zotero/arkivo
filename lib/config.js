'use strict';
process.env.SUPPRESS_NO_CONFIG_WARNING = 'y';

// --- Dependencies ---
var debug  = require('debug')('arkivo:config');
var join   = require('path').join;
var each   = require('./common').each;
var config = require('config');
var extend = config.util.extendDeep;

var slice  = Array.prototype.slice;

// --- Local Defaults ---
config.util.setModuleDefaults('arkivo', extend(local(), config.arkivo));


/** @module arkivo */


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
    extend.apply(null, [{}].concat(slice.apply(arguments))));

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

// --- Exports ---
module.exports = proxy;
