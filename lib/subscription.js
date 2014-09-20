'use strict';

// --- Dependencies ---

var assert = require('assert');
var qs = require('querystring');

var debug = require('debug')('arkivo:subscription');

var B = require('bluebird');
var co = B.coroutine.bind(B);

var property = Object.defineProperty;
var properties = Object.defineProperties;

var common = require('./common');

var config = require('./config').subscription;
var db = require('./db');



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
   * Timestamp that is updated after every synchronization
   * process (even if the library version is not updated
   * as a result of the process).
   *
   * The timestamp is returned as an ISO formatted string.
   *
   * @property timestamp
   * @type String
   */
  var timestamp = null;

  property(this, 'timestamp', {
    enumerable: true,

    get: function () {
      return timestamp && timestamp.toISOString();
    },
    set: function (value) {
      if (value instanceof Date)
        return timestamp = value;

      var date = new Date(value);
      timestamp = isNaN(date.getTime()) ? null : date;
    }
  });

  /**
   * The pathname component of subscription's URL.
   *
   * @property path
   * @type String
   */
  this.path = null;

  /**
   * The query parameters of the subscription's URL.
   *
   * @property params
   * @type Object
   */
  this.params = {};

  /**
   * The subscription's plugin configurations.
   *
   * @property plugins
   * @type Array
   */
  this.plugins = [];

  /**
   * The versions from the last time the subscription
   * was synchronized using Zotero's `versions` format.
   *
   * @property versions
   * @type Object
   */
  this.versions = {};

  this.update(values);
}

properties(Subscription, {
  keys: {
    value: [
      'id', 'url', 'key', 'version',
      'timestamp', 'plugins_json', 'versions_json'
    ]
  },

  db: {
    get: function () { return db(config.prefix); }
  }
});


Subscription.ids = function () {
  return this.db.smembers('ids');
};

Subscription.all = function () {
  return this.ids().map(function (id) {
    return Subscription.load(id);
  });
};

Subscription.find = function (query) {
  if (typeof query === 'string')
    query = new RegExp('^' + query, 'i');

  assert(query instanceof RegExp);

  function matches(id) { return query.test(id); }

  return this.ids()
    .then(function (ids) {
      return ids.filter(matches);
    })

    .map(function (id) {
      return Subscription.load(id);
    });
};

Subscription.load = co(function* (id) {
  debug('trying to load "%s"...', id);

  var data = yield this.db.hgetall(id);

  if (!data || !data.id) {
    debug('id "%s" does not exist!', id);

    throw new Error('Subscription not found: ' + id);
  }

  return new Subscription(data);
});

Subscription.exists = co(function* (id) {
  return yield this.db.sismember('ids', id);
});

properties(Subscription.prototype, {

  db: {
    get: function () { return Subscription.db; }
  },

  values: {
    get: function () {
      return common.pluck(this, Subscription.keys);
    }
  },

  /**
   * The subscription's target as a full Zotero API URL.
   *
   * Note: setting this property automatically updates
   * the `path` and `params` properties!
   *
   * @property url
   * @type String
   */
  url: {
    enumerable: true,

    get: function () {
      return [this.path, this.search].join('');
    },

    set: function (url) {
      if (url) {
        var parts = url.split('?');

        this.path = parts[0];
        this.params = qs.parse(parts[1]);

      } else {
        this.path = null;
        this.params = {};
      }
    }
  },

  /**
   * The library part of the URL.
   *
   * @property library
   * @type String
   */
  library: {
    get: function () {
      var m = (/^(\/(users|groups)\/\d+)/).exec(this.path);
      return m && m[1];
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
  },

  /**
   * The HTTP headers to use when synchronizing
   * this subscription.
   *
   * @property headers
   * @type Object
   */
  headers: {
    get: function () {
      var headers = {};

      if (this.key) {
        headers.Authorization = ['Bearer', this.key].join(' ');
      }

      if (this.version) {
        headers['If-Modified-Since-Version'] = this.version;
      }

      return headers;
    }
  },

  plugins_json: {
    enumerable: false,

    get: function () {
      return JSON.stringify(this.plugins);
    },
    set: function (value) {
      this.plugins = JSON.parse(value || '[]');
    }
  },

  versions_json: {
    enumerable: false,

    get: function () {
      return JSON.stringify(this.versions);
    },
    set: function (value) {
      this.versions = JSON.parse(value || '{}');
    }
  }
});

Subscription.prototype.reset = function () {
  this.version = 0;
  this.versions = {};
  this.touch();

  return this;
};

// TODO validate that URL is a library URL before saving!

Subscription.prototype.save = co(function* () {
  if (!this.id)
    yield this.identify();

  yield this.db.transaction()
    .sadd('ids', this.id)
    .hmset(this.id, this.serialize())
    .commit();

  debug('"%s" saved successfully', this.id);

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
  yield this.db.transaction()
    .srem('ids', this.id)
    .del(this.id)
    .commit();

  debug('"%s" destroyed successfully', this.id);

  return this;
});


/**
 * Updates the subscription's `timestamp`.
 *
 * @method touch
 * @chainable
 */
Subscription.prototype.touch = function () {
  this.timestamp = Date.now();
  return this;
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

// --- Exports ---
module.exports = Subscription;
