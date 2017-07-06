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
  this.created = {};
}

inherits(Listener, EventEmitter);

Listener.prototype.connected = function () {
  this.created = {};
  var data = this.current.map(toData);
  if (data.length) {
    this.stream.subscribe(data);
  }
};

Listener.prototype.subscribed = function (subscriptions) {
  // We always get all existing subscribed topic here, instead,
  // maybe we should only receive what was actually subscribed
  // in this stream-server response.
  var i, j, k, s, key, subscription;

  for (i = 0; i < subscriptions.length; i++) {
    subscription = subscriptions[i];
    key = subscription.apiKey;

    for (j = 0; j < subscription.topics.length; j++) {
      var topic = subscription.topics[j];

      if (!this.created[topic]) {
        this.created[topic] = true;
        debug('topic %s created...', topic);

        for (k = 0; k < this.current.length; k++) {
          s = this.current[k];

          if (s.topic === topic && s.key === key) {
            this.emit('updated', s);
          }
        }
      } else {
        debug('topic %s already exists...', topic);
      }
    }
  }
};

Listener.prototype.updated = function (data) {
  debug('topic %s updated...', data.topic);
  for (var i = 0; i < this.current.length; i++) {
    var s = this.current[i];

    if (s.topic === data.topic) {
      this.emit('updated', s);
    }
  }
  return this;
};

Listener.prototype.error = function (error) {
  debug('stream error: %s', error.message);
};

Listener.prototype.add = function (subscriptions) {
  assert(subscriptions);
  assert(this.stream);

  if (!Array.isArray(subscriptions))
    subscriptions = [subscriptions];

  assert(subscriptions.length);
  debug('adding %d subscription(s)...', subscriptions.length);

  var data = [];

  for (var i = 0; i < subscriptions.length; i++) {
    var subscription = subscriptions[i];

    // This, already existing subscriptions' filtering logic,
    // can go to zotero-api-node.
    var found = false;
    for (var j = 0; j < this.current.length; j++) {
      var s = this.current[j];
      if (s.topic === subscription.topic && s.key === subscription.key) {
        found = true;
        break;
      }
    }

    if (!found) {
      debug('subscribing %s to stream', subscription.topic);
      data.push(toData(subscription));
    } else {
      debug('skipping subscribing %s to stream', subscription.topic);
    }

    this.current.push(pick(subscription, 'id', 'key', 'topic'));
  }

  if (data.length) {
    this.stream.subscribe(data);
  }
};


Listener.prototype.remove = function (subscription) {
  assert(this.stream);

  var data = remove(this.current, { id: subscription.id });

  if (!data) {
    debug('failed to remove %s: not registered', subscription.id);
  }

  var found = false;
  for (var i = 0; i < this.current.length; i++) {
    var s = this.current[i];
    if (s.topic === data.topic && s.key === data.key) {
      found = true;
      break;
    }
  }

  if (!found) {
    delete this.created[data.topic];
    this.stream.unsubscribe({
      apiKey: data.key, topic: data.topic
    });
  }
};


Listener.prototype.start = function () {
  assert(!this.stream);

  debug('starting...');

  this.stream = zotero
    .stream(this.options)
    .on('topicUpdated', this.updated.bind(this))
    .on('subscriptionsCreated', this.subscribed.bind(this))
    .on('connected', this.connected.bind(this))
    .on('error', this.error.bind(this));

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
