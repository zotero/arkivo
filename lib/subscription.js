'use strict';

// --- Dependencies ---

var assert   = require('assert');
var inherits = require('util').inherits;
var qs       = require('querystring');

var debug = require('debug')('arkivo:subscription');

var B = require('bluebird');
var co = B.coroutine.bind(B);

var property = Object.defineProperty;
var properties = Object.defineProperties;

var common = require('./common');
var extend = common.extend;
var pick   = common.pick;

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

  /**
   * The subscription's score (used for sorting).
   * By default, based on the creation date.
   *
   * @property score
   * @type Number
   */
  this.path = null;

  this.update(values);
}

properties(Subscription, {
  keys: {
    value: [
      'id', 'url', 'key', 'version', 'timestamp',
      'score', 'plugins_json', 'versions_json'
    ]
  },

  accessible: {
    value: [ 'url', 'key', 'version' ]
  },

  db: {
    get: function () { return db(config.prefix); }
  }
});

Subscription.create = function (values) {
  return (new Subscription(this.restrict(values))).save();
};

Subscription.restrict = function (values) {
  return pick(values, this.accessible);
};

Subscription.count = co(function* () {
  return (yield this.db.zcard('ids')) || 0;
});

Subscription.ids = function (options) {
  return this.db.zrange(['ids'].concat(range(options)));
};

Subscription.all = function (options) {
  return this.ids(options).map(function (id) {
    return Subscription.load(id);
  });
};

Subscription.find = function (query) {
  if (!query) return this.all();

  if (typeof query === 'string')
    query = new RegExp('^(' + query.replace(/,\s*/g, '|') + ')', 'i');

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
    throw new NotFoundError('Subscription not found: ' + id);
  }

  return new Subscription(data);
});

Subscription.exists = co(function* (id) {
  return (yield this.db.zscore('ids', id)) !== null;
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
  },

  /**
   * A simpler representation of the Subscription.
   * Used for JSON export.
   *
   * @property json
   * @type Object
   */
  json: {
    get: function () {
      return pick(this, [
        'id', 'url', 'key', 'version', 'timestamp'
      ]);
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

  if (!this.score)
    this.score = (new Date()).getTime();

  yield this.db.transaction()
    .zadd('ids', this.score, this.id)
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
    .zrem('ids', this.id)
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
    extend(this, values);

  return this;
};

// --- Helpers ---

function range(options) {
  var from = 0, to = -1;

  if (options) {

    if (options.start)
      from = integer(options.start);

    if (options.limit)
      to = from + integer(options.limit);
  }

  return [from, to];
}

function integer(number) {
  var k = parseInt(number, 10);

  if (isNaN(k) || k < 0)
    throw new RangeError('Not a positive integer: ' + number);

  return k;
}

// --- Errors ---

/**
 * Error thrown when a requested resource
 * does not exist.
 *
 * @class NotFoundError
 * @extends Error
 */
function NotFoundError(message) {
  this.message = message;
  this.name = 'NotFoundError';

  Error.captureStackTrace(this, NotFoundError);
}

inherits(NotFoundError, Error);

/**
 * Error thrown when start/limit options cannot
 * be converted to a valid range.
 *
 * @class RangeError
 * @extends Error
 */
function RangeError(message) {
  this.message = message;
  this.name = 'RangeError';

  Error.captureStackTrace(this, RangeError);
}

inherits(RangeError, Error);

// --- Exports ---
Subscription.NotFoundError = NotFoundError;
Subscription.RangeError    = RangeError;

module.exports = Subscription;
