'use strict';

var debug = require('debug')('arkivo:db');
var inherits = require('util').inherits;

var B = require('bluebird');
var redis = require('redis');

var common = require('./common');
var defaults = require('./defaults').redis;


Proxy.COMMANDS = [
  ['exec', 0],
  ['del', -1],
  ['hgetall', 1],
  ['hmset', 1],
  ['hmget', 1],
  ['hgetall', 1],
  ['sadd', 1],
  ['smembers', 1],
  ['sismember', 1],
  ['srem', 1]
];


// error handling
// handle disconnects
// close connection on exit


B.promisifyAll(redis);

function Database(name) {
  debug('create proxy for "%s" namespace', name);

  Proxy.call(this, name, 'client');

  this.client = redis
    .createClient(defaults.port, defaults.host, defaults.options);

  this.client.on('error', function (error) {
    debug('%s redis error: %s', name, error.message);
  });
}

inherits(Database, Proxy);


Database.prototype.transaction = function () {
  return new Transaction(this);
};


function Transaction(db) {
  debug('new transaction for "%s" namespace', db.name);

  Proxy.call(this, db.name, 'multi');
  this.multi = db.client.multi();
}

inherits(Transaction, Proxy);

function Proxy(name, dest) {
  this.name = name;

  this.namespace = function namespace(cmd, arity, args) {
    args = common.flatten.apply(null, args);

    var i, target = this[dest],
      min = (arity < 0) ? (args.length + arity + 1) : arity;

    if (!target)
      throw new Error('proxy target missing: ' + dest);

    if (args.length < min) {
      debug('%s called with too few arguments: %d expected, was %d',
        cmd, min, args.length);

      throw new Error('too few arguments');
    }

    for (i = 0; i < min; ++i)
      if (typeof args[i] === 'string')
        args[i] = [this.name, args[i]].join(':');

    debug('%s: %s %j', this.name, cmd.toUpperCase(), args);

    var result = target[cmd + 'Async'].apply(target, args);

    // Return the result unless it is the target; in this
    // case return the proxy to support chainable methods!
    return (result === target) ? this : result;
  };
}


Proxy.COMMANDS.forEach(function (c) {
  var cmd = c[0], arity = c[1];

  Proxy.prototype[cmd] = function () {
    return this.namespace(cmd, arity, arguments);
  };
});

Proxy.prototype.commit = Proxy.prototype.exec;

module.exports = function db(name) {
  return new Database(name);
};

module.exports.Database    = Database;
module.exports.Proxy       = Proxy;
module.exports.Transaction = Transaction;
