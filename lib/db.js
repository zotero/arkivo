'use strict';

// --- Dependencies ---

var debug = require('debug')('arkivo:db');
var inherits = require('util').inherits;

var B = require('bluebird');
var redis = require('redis');

var common = require('./common');
var defaults = require('./defaults').redis;

var property = Object.defineProperty;

/**
 * The db module function can be used to create a new
 * namespaced database. By default redis will be used
 * as the database backend.
 *
 * @module db
 */


// List of Redis commands supported by the proxy. Each
// command is represented by an array containing the
// command's name and the number of arguments that will
// be prefixed with the database's namespace. If the number
// is negative, it will be interpreted as the number of
// arguments from the end of the argument list; thus, a
// value of -1 means that all arguments will be prefixed.
Proxy.COMMANDS = [
  ['exec', 0, 'Async'],
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

// Generate -Async methods returning promises for all Redis calls
B.promisifyAll(redis);

// Internal helper to setup a new Redis client instance
function connect() {
  debug('creating new redis connection...');

  var client = redis
    .createClient(defaults.port, defaults.host, defaults.options);

  client.on('error', function (error) {
    debug('%s redis error: %s', name, error.message);
  });

  return client;
}

/**
 * A Database is namespaced proxy for a Redis client.
 *
 * @class Database
 * @constructor
 * @extends Proxy
 *
 * @param {String} name The namespace.
 */
function Database(name) {
  debug('create proxy for "%s" namespace', name);

  Proxy.call(this, name, 'client', 'Async');

  /**
   * The database Redis client.
   *
   * @property client
   * @type RedisClient
   */
  var client;

  property(this, 'client', {
    get: function () {
      if (!client)
        client = connect();

      return client;
    }
  });

  /**
   * Resets the database's Redis client.
   *
   * @method reset
   * @chainable
   */
  this.reset = function () {
    debug('closing redis connection "%s"...', this.name);

    if (client) {
      client.quit();
      client.removeAllListeners();
      client = null;
    }

    return this;
  };
}

inherits(Database, Proxy);


/**
 * Starts a new transaction. Commands can be invoked on the
 * returned Transaction instance (arguments will be prefixed
 * with the Database's current namespace); finally, call
 * `commit` on the Transaction instance.
 *
 * @return {Transaction} The new transaction.
 */
Database.prototype.transaction = function () {
  return new Transaction(this);
};


/**
 * A Transaction is a namespaced proxy for a Redis
 * MULTI sequence.
 *
 * @class Transaction
 * @constructor
 * @extends Proxy
 *
 * @param {Database} db The transaction's database.
 */
function Transaction(db) {
  debug('new transaction for "%s" namespace', db.name);

  Proxy.call(this, db.name, 'multi');
  this.multi = db.client.multi();
}

inherits(Transaction, Proxy);


/**
 * Proxy implementation used by the Database
 * and Transaction classes.
 *
 * @class Proxy
 */
function Proxy(name, dest, dsuffix) {
  this.name = name;

  /**
   * The namespace method handles namespacing arguments and
   * passing them on to the proxy's target.
   *
   * @method namespace
   *
   * @param {String} cmd The command name.
   * @param {Number} arity The number of arguments to
   *   prefix with the namespace.
   * @param {Array} args The command's arguments.
   * @param {String} [suffix] Optional suffix to append
   *   to the command name.
   *
   *
   * @returns The return value of the proxy's target, or
   *   this, if the target returned itself.
   */
  this.namespace = function namespace(cmd, arity, args, suffix) {
    args = common.flatten.apply(null, args);
    suffix = suffix || dsuffix || '';

    var i, target = this[dest],
      min = (arity < 0) ? (args.length + arity + 1) : arity;

    if (!target || typeof target[cmd + suffix] !== 'function') {
      debug('proxy target missing: %s.%s', dest, cmd + suffix);
      throw new Error('proxy target missing');
    }

    if (args.length < min) {
      debug('%s missing arguments: %d, was %d', cmd, min, args.length);
      throw new Error('too few arguments');
    }

    for (i = 0; i < min; ++i)
      if (typeof args[i] === 'string')
        args[i] = [this.name, args[i]].join(':');

    debug('%s: %s %j', this.name, cmd.toUpperCase(), args);

    var result = target[cmd + suffix].apply(target, args);

    // Return the result unless it is the target; in this
    // case return the proxy to support chainable methods!
    return (result === target) ? this : result;
  };
}

// Generate all proxy methods
Proxy.COMMANDS.forEach(function (c) {
  var cmd = c[0], arity = c[1], suffix = c[2];

  Proxy.prototype[cmd] = function () {
    return this.namespace(cmd, arity, arguments, suffix);
  };
});

// Alias commit/exec methods
Proxy.prototype.commit = Proxy.prototype.exec;


// --- DB proxy repository ---
var instances = Database.instances = {};

function db(name) {
  instances[name] = instances[name] || new Database(name);
  return instances[name];
}

function reset() {
  var count = 0, name;

  debug('resetting all db instances...');

  for (name in instances) {
    instances[name].reset();
    count++;
  }

  return count;
}

// --- Exports ---
module.exports = db;

module.exports.Database    = Database;
module.exports.Proxy       = Proxy;
module.exports.Transaction = Transaction;
module.exports.reset       = reset;
