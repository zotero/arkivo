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

/* eslint-disable no-redeclare */

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

  /**
   * Keeps all current subscriptions.
   * I.e.:
   * [{id:'zrfa0lo2rv', topic:'/users/1', key:'rGWO8xlHCtkEeShmrpDFlzfJ'}]
   *
   * @type {Array}
   */
  this.subscriptions = [];

  /**
   * Keeps all unique topics we are currently subscribing.
   * I.e.:
   * {'zrfa0lo2rv':true, 'btgpbmth56':true}
   *
   * This is necessary because stream-server doesn't return newly created
   * subscriptions, instead it returns all subscriptions of the connection,
   * so we are doing the diff between subscriptionsCreated topics and this.topics.
   *
   * The idea is that a topic to this.topics is added when subscriptionsCreated
   * sends us a topic that doesn't exist in this.topics. And the topic is deleted,
   * only when all subscriptions in this.subscriptions having that topic are removed.
   *
   * @type {Object}
   */
  this.topics = [];
}

inherits(Listener, EventEmitter);

/**
 * Handles stream-server 'connected' response.
 *
 * This function is called each time when zotero.stream (re)connects
 * to stream-server. And each time we resubscribe to all subscriptions
 * we currently have in the listener.
 *
 * zotero.stream has a resubscribe logic too, but it's currently disabled,
 * because doesn't work as it should. Moreover it's better to have one
 * subscriptions source here, than keep two separate subscriptions list:
 * one here and another in zotero.stream.
 */
Listener.prototype.connected = function () {
  // If we just connected, it means nothing is subscribed.
  this.topics = [];

  // Transform all subscriptions to stream-server suitable format.
  var subscriptions = this.subscriptions.map(function (subscription) {
    return {
      topics: [subscription.topic],
      apiKey: subscription.key
    };
  });

  // Todo: 'zotero.stream' should accept empty subscriptions array and ignore it.
  if (subscriptions.length) {
    this.stream.subscribe(subscriptions);
  }
};
/**
 * Handles stream-server 'subscriptionsCreated' response.
 *
 * subscriptionsCreated also triggers 'update' event, because we want to
 * synchronize subscriptions only when started listening
 * for the updates. Otherwise we could miss updates.
 *
 * @param subscriptions
 */
Listener.prototype.subscribed = function (subscriptions) {
  // We always get all existing subscribed topic here, instead,
  // maybe we should only receive what was actually subscribed
  // in this stream-server response?

  // Collect all newly created topics.
  var topics = [];
  for (var i = 0; i < subscriptions.length; i++) {
    var subscription = subscriptions[i];
    for (var j = 0; j < subscription.topics.length; j++) {
      var topic = subscription.topics[j];
      // Checking if topic is totally new for us.
      if (this.topics.indexOf(topic) < 0 && topics.indexOf(topic) < 0) {
        debug('new topic %s subscribed', topic);
        topics.push(topic);
      }
    }
  }

  // Inform each subscription that is listening for one of the new topics.
  for (var i = 0; i < this.subscriptions.length; i++) {
    var subscription = this.subscriptions[i];
    if (topics.indexOf(subscription.topic) >= 0) {
      this.emit('updated', subscription);
    }
  }
};

/**
 * Handles stream-server 'topicUpdate' response.
 *
 * Notice: stream-server sends only one topicUpdate,
 * no matter how many subscriptions stream server has
 * for the same topic but different keys.
 *
 * @param data
 */
Listener.prototype.updated = function (data) {
  debug('topic %s updated...', data.topic);
  for (var i = 0; i < this.subscriptions.length; i++) {
    var subscription = this.subscriptions[i];
    if (subscription.topic === data.topic) {
      this.emit('updated', subscription);
    }
  }
};

/**
 * Adds subscriptions to this.subscriptions.
 * Subscribes to stream-server if this topic and key pair doesn't exist
 * in this.subscriptions.
 *
 * @param subscriptions
 */
Listener.prototype.add = function (subscriptions) {
  assert(subscriptions);
  assert(this.stream);

  if (!Array.isArray(subscriptions)) {
    subscriptions = [subscriptions];
  }

  assert(subscriptions.length);
  debug('adding %d subscription(s)', subscriptions.length);

  var streamSubscriptions = [];

  for (var i = 0; i < subscriptions.length; i++) {
    var subscription = subscriptions[i];

    // Checks if the topic and key pair exists in this.subscriptions.
    var exists = false;
    for (var j = 0; j < this.subscriptions.length; j++) {
      var s = this.subscriptions[j];
      if (s.topic === subscription.topic && s.key === subscription.key) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      debug('subscribing to %s %s', subscription.topic, subscription.key);
      streamSubscriptions.push({
        topics: [subscription.topic],
        apiKey: subscription.key
      });
    }

    // Add the subscription to the listener.
    this.subscriptions.push({
      id: subscription.id,
      topic: subscription.topic,
      key: subscription.key
    });
  }

  if (streamSubscriptions.length) {
    this.stream.subscribe(streamSubscriptions);
  }
};

/**
 * Removes subscription by id.
 * Unsubscribes from stream-server if no one else is using that topic and key pair.
 * If the topic totally disappears from this.subscriptions, we also remove it
 * from this.topics.
 *
 * @param id
 */
Listener.prototype.remove = function (id) {
  assert(this.stream);

  var data = null;
  // Get the subscription by id, and remove it.
  for (var i = 0; i < this.subscriptions.length; i++) {
    var subscription = this.subscriptions[i];
    if (subscription.id === id) {
      data = subscription;
      this.subscriptions.splice(i, 1);
      break;
    }
  }

  if (!data) {
    debug('failed to remove %s: not registered', id);
    return;
  }

  // Check if more subscriptions exist with the same topic and key.
  var exists = false;
  for (var i = 0; i < this.subscriptions.length; i++) {
    var subscription = this.subscriptions[i];
    if (subscription.topic === data.topic && subscription.key === data.key) {
      exists = true;
      break;
    }
  }
  if (!exists) {
    // If that was the last subscription with this topic and key,
    // unsubscribe it form stream-server.
    // We are doing this because stream-server manages subscriptions
    // by topic and key pairs.
    this.stream.unsubscribe({
      topic: data.topic,
      apiKey: data.key
    });
  }

  // Check if more subscriptions exist with this topic (key doesn't matter).
  exists = false;
  for (var i = 0; i < this.subscriptions.length; i++) {
    var subscription = this.subscriptions[i];
    if (subscription.topic === data.topic) {
      exists = true;
      break;
    }
  }
  if (!exists) {
    // If no more subscriptions exist for this topic, it means
    // we are no longer subscribed to this topic. So let's remove it.
    this.topics.splice(this.topics.indexOf(data.topic), 1);
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
    .on('error', function (err) {
      // Handle all zotero.stream errors.
      // zotero.stream will reconnect automatically if errors are handled.
      debug('stream error: %s', err.message);
    });

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

// --- Exports ---
module.exports = Listener;
