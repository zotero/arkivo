var debug = require('debug')('arkivo:subscription');

var Promise = require('bluebird');

var defaults = require('./defaults');
var db = require('./db')(defaults.subscription.prefix);
var once = require('zotero/lib/utils').once;

function noop() {}


function Subscription(id, key, version) {
  this.id = id;
  this.key = key;
  this.version = version;
}


Subscription.quit = function () {
  db.client.quit();

  return this;
};

Subscription.all = function (callback) {
  callback = once(callback || noop);

  var subscriptions = [];

  db.smembers('ids', function (error, ids) {
    if (error) return callback(error, subscriptions);
    if (!ids.length) return callback(null, subscriptions);

    function done(e) {
      if (e) return callback(error, subscriptions);
      if (!--done.counter) callback(null, subscriptions);
    }

    done.counter = ids.length;

    for (var i = 0; i < ids.length; ++i)
      subscriptions.push(Subscription.load(ids[i], done));
  });

  return subscriptions;
};

Subscription.load = function (id, callback) {
  callback = callback || noop;

  var subscription = new Subscription(id);

  db.sismember('ids', id, function (error, exists) {
    if (error) return callback(error);
    if (!exists) return callback(new Error('subscription not found'));

    db.hmget(id, 'id', 'key', 'version', function (error, data) {
      if (error) return callback(error);

      subscription.key = data[1];
      subscription.version = data[2];

      callback(null, subscription);
    });
  });

  return subscription;
};


Subscription.prototype.save = Promise.coroutine(function* () {
  yield db.sadd('ids', this.id);
  yield db.hmset(this.id, this.serialize());
  
  return this;
};

Subscription.prototype.destroy = function (callback) {
  callback = callback || noop;

  var self = this;

  db.srem('ids', this.id, function (error, callback) {
    if (error) return callback(error);

    db.del(self.id, callback);
  });

  return this;
};

Subscription.prototype.serialize = function () {
  return ['id', this.id, 'key', this.key, 'version', this.version];
};

module.exports = Subscription;
