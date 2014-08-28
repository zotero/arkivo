
var assert = require('assert');

var debug = require('debug')('plugin');

var common = require('../common');
var extend = common.extend;

function Plugin(desc) {
  debug('new "%s" instance created', desc.name);
  extend(this, desc);
}

Plugin.prototype.initialize = function (options) {
  debug('%s: initialized with %j', this.name, options);

  this.options = extend(this.defaults || {}, options);

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


module.exports = new Plugins();
