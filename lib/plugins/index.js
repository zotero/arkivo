
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

  var param, config;
  this.options = {};

  for (param in this.parameters) {
    config = this.parameters[param];

    if (config.mandatory) {
      if (!options.hasOwnProperty(param))
        throw new Error('mandatory parameter missing: ' + param);

      this.options[param] = options[param];

    } else {

      this.options[param] = options.hasOwnProperty(param) ?
        options[param] : config.default;

    }

  }

  return this;
};

function Plugins() {
  this.reset();
}



Object.defineProperties(Plugins.prototype, {
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

Plugins.prototype.use = function (name) {
  return new Plugin(this.available[name]);
};

module.exports = new Plugins();
