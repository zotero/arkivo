'use strict';

var assert = require('assert');

var debug = require('debug')('plugin');

var common = require('../common');
var extend = common.extend;

function Plugin(desc) {
  debug('new "%s" instance created', desc.name);

  extend(this, desc);
}

Plugin.prototype.configure = function (options) {
  if (!this.parameters) return this;

  debug('%s: configured with %j', this.name, options);

  var param, config, value;

  options = options || {};
  this.options = {};

  for (param in this.parameters) {
    config = this.parameters[param];

    if (config.mandatory) {
      if (!options.hasOwnProperty(param))
        throw new Error('mandatory parameter missing: ' + param);

      value = options[param];

    } else {

      value = options.hasOwnProperty(param) ?
        options[param] : config.default;

    }

    if (value && config.validate && !config.validate.test(value))
      throw new Error('invalid parameter value: ' + value);

    this.options[param] = value;
  }

  return this;
};

Object.defineProperties(Plugin.prototype, {
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
  },
});



function Plugins() {
  this.reset();
}



Object.defineProperties(Plugins.prototype, {
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

Plugins.prototype.process = function () {
  throw new Error('plugin process not implemented');
};

Plugins.prototype.use = function (name, options) {
  var plugin = new Plugin(this.available[name]);

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

module.exports = new Plugins();
