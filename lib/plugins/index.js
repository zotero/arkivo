'use strict';

// --- Dependencies ---
var assert = require('assert');

var debug = require('debug')('arkivo:plugin');
var trace = require('debug')('arkivo:trace');

var config = require('../config');
var common = require('../common');
var extend = common.extend;

var properties = Object.defineProperties;
var keys = Object.keys;


function Plugin(desc) {
  debug('[%s] instance created', desc.name);
  extend(this, desc);
}

Plugin.prototype.configure = function (options) {
  if (!this.parameters) return this;

  debug('[%s] configured with %j', this.name, keys(options));

  var param, configuration, value;

  options = options || {};
  this.options = {};

  for (param in this.parameters) {
    configuration = this.parameters[param];

    if (configuration.mandatory) {
      if (!options.hasOwnProperty(param))
        throw new Error('mandatory parameter missing: ' + param);

      value = options[param];

    } else {

      value = options.hasOwnProperty(param) ?
        options[param] : configuration.default;

    }

    if (value && configuration.validate && !configuration.validate.test(value))
      throw new Error('invalid parameter value: ' + value);

    this.options[param] = value;
  }

  return this;
};

properties(Plugin.prototype, {
  summary: {
    get: function () {
      if (!this.description) return undefined;
      return this.description.replace(/\.\s.*$/, '');
    }
  },
  configurable: {
    get: function () {
      return this.parameters && Object.keys(this.parameters).length > 0;
    }
  }
});



function Plugins() {
  this.reset();
}

properties(Plugins.prototype, {
  count: {
    get: function () {
      return this.names.length;
    }
  },

  names: {
    get: function () {
      return Object.keys(this.available);
    }
  }
});

Plugins.prototype.reset = function () {
  this.available = {};
};

Plugins.prototype.add = function (desc) {
  assert(desc.name, 'plugins must have a name');

  assert(typeof desc.process === 'function',
    'plugins must have process function');

  if (this.available[desc.name])
    debug('warning: redefining plugin "%s"', desc.name);

  this.available[desc.name] = desc;

  return this;
};

Plugins.prototype.update = function () {
  var i, ii, plugin;

  debug('updating available plugins...');

  this.reset();

  if (config.plugins) {
    for (i = 0, ii = config.plugins.length; i < ii; ++i) {
      try {
        plugin = config.plugins[i];

        debug('loading "%s"...', plugin);
        this.add(require(plugin));

      } catch (error) {
        debug('failed to load "%s": %s', plugin, error.message);
        trace(error.stack);
      }
    }
  }

  return this;
};

Plugins.prototype.remove = function (name) {
  delete this.available[name];
  return this;
};

Plugins.prototype.process = function () {
  throw new Error('plugin process not implemented');
};

Plugins.prototype.use = function (name, options) {
  var plugin = new Plugin(this.available[name]);

  if (options)
    plugin.configure(options);

  return plugin;
};

Plugins.prototype.each = function (fn) {
  var names = this.names, plugin, i, ii;

  for (i = 0, ii = names.length; i < ii; ++i) {
    plugin = this.use(names[i]);
    fn.apply(plugin, [plugin, i, ii]);
  }

  return this;
};

// --- Exports ---
module.exports = new Plugins();
module.exports.Plugin = Plugin;
