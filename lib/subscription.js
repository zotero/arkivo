//var debug = require('debug')('arkivo:subscription');

var B = require('bluebird');
var co = B.coroutine.bind(B);

var property = Object.defineProperty;
var properties = Object.defineProperties;

var common = require('./common');

var defaults = require('./defaults');
var db = require('./db')(defaults.subscription.prefix);

Subscription.keys = [
  'id', 'key', 'version'
];

function Subscription(values) {
  var version = 0;

  property(this, 'version', {
    enumerable: true,
    get: function () { return version; },
    set: function (value) {
      version = parseInt(value, 10) || 0;
    }
  });

  this.update(values);
}



Subscription.quit = function () {
  db.client.quit();
  return this;
};

Subscription.all = function () {
  return db.smembers('ids').map(function (id) {
    return Subscription.load(id);
  });
};

Subscription.load = co(function* (id) {
  return new Subscription(yield db.hmget([id].concat(Subscription.keys)));
});


properties(Subscription.prototype, {
  values: {
    get: function () {
      return common.pick(this, Subscription.keys);
    }
  }
});

Subscription.prototype.save = function () {
  return B.all([
    db.sadd('ids', this.id),
    db.hmset(this.id, this.serialize()),
  ]);
};

Subscription.prototype.destroy = function () {
  return B.all([
    db.srem('ids', this.id),
    db.del(this.id)
  ]);
};


Subscription.prototype.serialize = function () {
  return common.zip(Subscription.keys, this.values);
};

Subscription.prototype.deserialize = function (data) {
  return this.update(common.unzip(data)[1]);
};

Subscription.prototype.update = function (values) {
  if (Array.isArray(values))
    for (var i = 0, ii = Subscription.keys.length; i < ii; ++i)
      this[Subscription.keys[i]] = values[i];
  else
    common.extend(this, values);

  return this;
};

module.exports = Subscription;
