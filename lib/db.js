var debug = require('debug')('arkivo:db');

var redis = require('redis');
var defaults = require('./defaults').redis;

var COMMANDS = [
  ['del', -1],
  ['hmset', 1],
  ['hmget', 1],
  ['hgetall', 1],
  ['sadd', 1],
  ['smembers', 1],
  ['sismember', 1],
  ['srem', 1]
];

function Database(name) {
  debug('initialize "%s" namespace', name);

  this.name = name;
  this.client = redis
    .createClient(defaults.port, defaults.host, defaults.options);
}

Database.prototype.namespace = function (key) {
  if (typeof key !== 'string') return key;
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
    var limit = (arity < 0) ?
      (arguments.length + arity + 1) : arity;

    check(name, limit, arguments.length);

    for (var i = 0; i < limit; ++i)
      arguments[i] = this.namespace(arguments[i]);

    return this.send(name, arguments);
  };
});


module.exports = Database;
