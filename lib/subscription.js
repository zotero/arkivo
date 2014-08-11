'use strict';

// --- Dependencies ---

var qs = require('querystring');

var debug = require('debug')('arkivo:subscription');

var B = require('bluebird');
var co = B.coroutine.bind(B);

var property = Object.defineProperty;
var properties = Object.defineProperties;

var common = require('./common');

var defaults = require('./defaults');
var db = require('./db')(defaults.subscription.prefix);

Subscription.keys = [
  'id', 'url', 'key', 'version',
];

/**
 * @class Subscription
 */
function Subscription(values) {

  /**
   * The last modified version of the Zotero library;
   * this number is automatically updated every time the
   * subscription URL is synced.
   *
   * Setting the version number to 0 effectively resets
   * the subscription's synchronization state.
   *
   * @property version
   * @type Number
   */
  var version = 0;

  property(this, 'version', {
    enumerable: true,

    get: function () { return version; },
    set: function (value) {
      version = parseInt(value, 10) || 0;
    }
  });

  /**
   * The pathname component of subscription's URL.
   *
   * @property pathname
   * @type String
   */
  this.pathname = null;

  /**
   * The query parameters of the subscription's URL.
   *
   * @property params
   * @type Object
   */
  this.params = {};


  this.update(values);
}


Subscription.disconnect = function () {
  db.client.quit();
  return this;
};

Subscription.register = function (values) {
  return new Subscription(values).save();
};

Subscription.all = function () {
  return db.smembers('ids').map(function (id) {
    return Subscription.load(id);
  });
};

Subscription.load = co(function* (id) {
  debug('trying to load "%s"...', id);

  var data = yield db.hgetall(id);

  if (!data.id) {
    debug('id "%s" does not exist!', id);

    throw new Error('Subscription not found: ' + id);
  }

  return new Subscription(data);
});

Subscription.exists = co(function* (id) {
  return yield db.sismember('ids', id);
});

properties(Subscription.prototype, {

  values: {
    get: function () {
      return common.pluck(this, Subscription.keys);
    }
  },

  /**
   * The subscription's target as a full Zotero API URL.
   *
   * Note: setting this property automatically updates
   * the `pathname` and `params` properties!
   *
   * @property url
   * @type String
   */
  url: {
    enumerable: true,

    get: function () {
      return [this.pathname, this.search].join('');
    },

    set: function (url) {
      if (url) {
        var parts = url.split('?');

        this.pathname = parts[0];
        this.params = qs.parse(parts[1]);

      } else {
        this.pathname = null;
        this.params = {};
      }
    }
  },

  /**
   * The query string of the subscription's URL.
   *
   * Note: read-only. Based on `params`.
   *
   * @property search
   * @type String
   */
  search: {
    get: function () {
      if (!this.params || !Object.keys(this.params).length)
        return null;

      return '?' + qs.stringify(this.params);
    }
  }
});

Subscription.prototype.save = co(function* () {
  if (!this.id)
    yield this.identify();

  yield db.transaction()
    .sadd('ids', this.id)
    .hmset(this.id, this.serialize())
    .commit();

  debug('subscription %s saved successfully', this.id);

  return this;
});

Subscription.prototype.identify = co(function* () {
  while (!this.id) {
    var id = common.id();

    if (!(yield Subscription.exists(id)))
      this.id = id;
  }

  return this;
});

Subscription.prototype.destroy = co(function* () {
  yield db.transaction()
    .srem('ids', this.id)
    .del(this.id)
    .commit();

  debug('subscription %s destroyed successfully', this.id);

  return this;
});


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

// --- Exports ---
module.exports = Subscription;
module.exports.db = db;