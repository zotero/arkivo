'use strict';

// --- Module Dependencies ---
var assert = require('assert');
var debug  = require('debug')('arkivo:listener');
var B = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

var config = require('./config').listener;
var zotero = require('./zotero');
var common = require('./common');

var extend = common.extend;
var index = common.findIndex;
var pick  = common.pick;
var pluck = common.pluck;

/** @module arkivo */

/**
 * Connects to the Zotero Stream API and listens
 * for notifications.
 *
 * @class Listener
 * @constructor
 * @extends EventEmitter
 */
function Listener(options) {
  EventEmitter.call(this);

  this.options = extend({}, config, options);

  this.current = [];
  this.pending = [];
}

inherits(Listener, EventEmitter);

Listener.prototype.updated = function (data) {
  var i, ii, s;
  var predicate = by(pick(data, 'apiKey', 'topic'));

  debug('topic %s updated...', data.topic);

  for (i = 0, ii = this.current.length; i < ii; ++i) {
    s = this.current[i];

    if (predicate(s))
      this.emit('updated', s);
  }

  return this;
};

Listener.prototype.add = function (subscriptions) {
  var self = this;

  assert(subscriptions);

  return new B(function (resolve, reject) {
    assert(self.stream);

    if (!Array.isArray(subscriptions))
      subscriptions = [subscriptions];

    assert(subscriptions.length);
    debug('adding %d subscription(s)...', subscriptions.length);

    var data = subscriptions.map(toData);

    self.stream.subscribe(data, function (error) {
      if (error) return reject(error);

      for (var i = 0; i < subscriptions.length; i++) {
        var subscription = subscriptions[i];
        var data = pick(subscription, 'id', 'key', 'topic');
        self.current.push(data);
      }

      resolve(subscriptions);
    });
  });
};


Listener.prototype.remove = function (subscription) {
  var self = this;

  return new B(function (resolve, reject) {
    assert(self.stream);

    var data = remove(self.current, { id: subscription.id });

    if (!data) {
      debug('failed to remove %s: not registered', subscription.id);
      return reject(new Error('not registered'));
    }

    self.stream.unsubscribe({
      apiKey: data.key, topic: data.topic

    }, function (error) {
      if (error) {
        debug('failed to remove %s: %s', subscription.id, error);
        return reject(error);
      }

      debug('successfully removed %s from stream', subscription.id);
      resolve(data);
    });
  });
};


Listener.prototype.start = function () {
  assert(!this.stream);

  debug('starting...');

  this.stream = zotero
    .stream(this.options)
    .on('topicUpdated', this.updated.bind(this))
    .on('connected', this.emit.bind(this, 'connected'))
    .on('error', this.emit.bind(this, 'error'));

  return this;
};


/**
 * @method stop
 * @param {Number} [timeout]
 * @return {Promise<this>}
 */
Listener.prototype.stop = function (timeout) {
  var self = this;
  timeout = timeout || 0;

  debug('shutting down (with %dms grace period)...', timeout);

  return new B(function (done) {
    if (self.stream)
      self.stream.on('close', done).close();
    else
      done();

  }).timeout(timeout, 'shutdown timed out')
    .return(self)

    .finally(function () {
      debug('shut down complete');

      if (self.stream) self.stream.removeAllListeners();
      delete self.stream;
    });
};


// --- Private Helpers ---

function remove(list, properties) {
  var idx = index(list, by(properties));

  return (idx !== -1) ? list.splice(idx, 1)[0] : null;
}

function by(properties) {
  properties.key = properties.apiKey;
  delete properties.apiKey;

  return function match(s) {

    for (var key in properties)
      if (properties[key] != null && properties[key] !== s[key])
        return false;

    return true;
  };
}

function toData(subscription) {
  var data = { topics: [subscription.topic] };

  if (subscription.key)
    data.apiKey = subscription.key;

  return data;
}

// --- Exports ---
module.exports = Listener;
