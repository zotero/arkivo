'use strict';

// --- Module Dependencies ---
var debug  = require('debug')('arkivo:listener');
var B = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

var zotero = require('./zotero');
var config = require('./config');
var common = require('./common');

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
function Listener() {
  EventEmitter.call(this);

  this.current = [];
  this.pending = [];

  this.stream = zotero
    .stream()
    .on('topicUpdated', this.updated.bind(this))
    .on('subscriptionsCreated', this.subscribed.bind(this))
    .on('error', this.emit.bind(this, 'error'));
}

inherits(Listener, EventEmitter);

Listener.prototype.subscribed = function (subscriptions, errors) {
  var i, ii, j, jj, key, subscription;

  if (subscriptions) {

    for (i = 0, ii = subscriptions.length; i < ii; ++i) {
      subscription = subscriptions[i];
      key = subscription.apiKey;

      for (j = 0, jj = subscription.topics.length; j < jj; ++j)
        this.resolve(key, subscription.topics[j]);
    }

  }

  if (errors) {

    for (i = 0, ii = errors.length; i < ii; ++i)
      this.reject.apply(this, pluck(errors[i], 'apiKey', 'topic', 'error'));

  }
};

Listener.prototype.updated = function (data) {
  debug('topic "%s" updated (%d)', data.topic, data.version);

  var subscription;

  // resolve subscription from topic/key

  this.emit('updated', subscription);
  return this;
};

Listener.prototype.resolve = function (key, topic) {
  var s, data;

  while ((s = remove(this.pending, key, topic))) {
    debug('[%s] listening for updates of %s...', s.id, topic);

    data = pick(s, 'id', 'key', 'path');

    s.resolve(data);

    this.current.push(data);
    this.emit('added', data);
  }

  return this;
};

Listener.prototype.reject = function (key, topic, reason) {
  var s, data;

  while ((s = remove(this.pending, key, topic))) {
    debug('[%s] failed to subscribe %s: %s', s.id, topic, reason);

    data = pick(s, 'id', 'key', 'path');

    s.reject(data);

    this.emit('error', data, reason);
  }

  return this;
};

Listener.prototype.register = function (subscription, resolve, reject) {
  var data = pick(subscription, 'id', 'key', 'path');

  data.resolve = resolve;
  data.reject  = reject;

  this.pending.push(data);

  return this;
};

Listener.prototype.add = function (subscription) {
  return new B(function (resolve, reject) {

    // todo bulk add many subscriptions/single message

    var self = this;
    var data = { topics: [subscription.path] };

    if (subscription.key)
      data.apiKey = subscription.key;

    this.stream.subscribe(data, function (error) {
      if (error) return reject(error);

      self.register(subscription, resolve, reject);
    });
  });
};

Listener.prototype.remove = function (subscription) {
};

// --- Private Helpers ---

function remove(list, key, topic) {
  var idx = index(list, by(key, topic));

  return (idx !== -1) ? list.splice(idx, 1)[0] : null;
}

function by(key, topic) {
  return function (s) {
    return s.key === key && s.path === topic;
  };
}

// --- Exports ---
module.exports = Listener;
