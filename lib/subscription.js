var debug = require('debug')('arkivo:subscription');

var defaults = require('./defaults');
var db = new (require('./db'))(defaults.subscription.prefix);

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

Subscription.load = function (id, callback) {
  callback = callback || noop;

  var subscription = new Subscription(id);

  db.sismember('subscriptions', id, function (error, exists) {
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


Subscription.prototype.save = function (callback) {
  callback = callback || noop;

  var self = this;

  db.sadd('subscriptions', this.id, function (error) {
    if (error) return callback(error);

    var data = self.serialize();

    data.unshift(self.id);
    data.push(callback);

    db.hmset.apply(db, data);
  });

  return this;
};

Subscription.prototype.destroy = function () {

};

Subscription.prototype.serialize = function () {
  return ['id', this.id, 'key', this.key, 'version', this.version];
};

module.exports = Subscription;
