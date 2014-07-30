var debug = require('debug')('arkivo:db');

var redis = require('redis');
var defaults = require('./defaults');

var COMMANDS = [
  ['sadd', 1],
  ['srem', 1] 
];

function Database(name) {
  debug('initialize "%s" namespace', name);

  this.name = name;
  this.client = redis.createClient(defaults.redis);
}

Database.prototype.namespace = function (key) {
  return [this.name, key].join(':');
};

Database.prototype.send = function (command, args) {
  debug('%s: %s %j', this.name, command, args);

  return this.client[command].apply(this.client, args);
};


function check(name, expected, actual) {
  if (actual < expected) {
    debug('%s called with too few arguments: %d expected, was %d.',
      name, expected, actual);

    throw new Error('too few arguments');
  }
}

COMMANDS.forEach(function (cmd) {
  var name = cmd[0], arity = cmd[1];

  Database.prototype[name] = function () {
    check(name, arity, arguments.length);

    for (var i = 0; i < arity; ++i) {
      arguments[i] = this.namespace(arguments[i]);
    }

    return this.send(name, arguments);
  };
});


module.exports = Database;
