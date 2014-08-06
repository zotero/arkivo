var debug = require('debug')('arkivo:subscription');

var B = require('bluebird');
var co = B.coroutine.bind(B);

var defaults = require('./defaults');
var db = require('./db')(defaults.subscription.prefix);


function Subscription(id, key, version) {
  debug('initializing for "%s"', id);

  this.id = id;
  this.key = key;
  this.version = version;
}


Subscription.quit = function () {
  db.client.quit();

  return this;
};

Subscription.all = co(function* () {
  var subscriptions = [];
  var ids = yield db.smembers('ids');

  for (var i = 0; i < ids.length; ++i)
    subscriptions.push(Subscription.load(ids[i]));

  return subscriptions;
});

Subscription.exists = co(function* (id) {
  return yield db.sismember('ids', id);
});

Subscription.load = co(function* (id, strict) {
  if (strict && !Subscription.exists(id))
    throw new Error('subscription not found');

  var data = yield db.hmget(id, 'id', 'key', 'version');

  return new Subscription(data[0], data[1], data[2]);
});


Subscription.prototype.save = co(function* () {
  yield db.sadd('ids', this.id);
  yield db.hmset(this.id, this.serialize());

  return this;
});

Subscription.prototype.destroy = co(function* () {
  yield db.srem('ids', this.id);
  yield db.del(this.id);

  return this;
});

Subscription.prototype.serialize = function () {
  return ['id', this.id, 'key', this.key, 'version', this.version];
};

module.exports = Subscription;
