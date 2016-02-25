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
var db     = require('./db');
var zotero = require('./zotero');

var Range = require('./range');

/** @module arkivo */

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
  var timestamp;

  property(this, 'timestamp', {
    enumerable: true,

    get: function () {
      return timestamp && timestamp.toISOString();
    },
    set: function (value) {
      if (value instanceof Date) {
        timestamp = value;

      } else {
        var date = new Date(value);
        timestamp = isNaN(date.getTime()) ? undefined : date;
      }
    }
  });

  /**
   * @property key
   * @type String
   */
  var key = '';

  property(this, 'key', {
    enumerable: true,

    get: function () { return key; },

    set: function (value) {
      key = (value != null) ? value.toString() : '';
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

  this.data = {};

  /**
   * The subscription's score (used for sorting).
   * By default, based on the creation date.
   *
   * @property score
   * @type Number
   */
  this.score = null;

  this.update(values);
}

properties(Subscription, {
  keys: {
    value: [
      'id', 'url', 'key', 'version', 'timestamp', 'score',
      'plugins_json', 'versions_json', 'data_json'
    ]
  },

  accessible: {
    value: ['url', 'key', 'version', 'plugins']
  },

  db: {
    get: function () { return db(config.prefix); }
  }
});

/**
 * Creates a new Subscription from the passed-in
 * `values`. Note, that only values for `accessible`
 * properties will be picked.
 *
 * @method create
 * @static
 *
 * @param {Object} values The subscription values.
 * @throws ValidationError
 *
 * @return {Promise<Subscription>} The new subscription.
 */
Subscription.create = function (values) {
  return (new Subscription(this.restrict(values))).save();
};

/**
 * Picks all `accessible` properties from
 * the passed-in `values`.
 *
 * @method restrict
 * @static
 *
 * @param {Object} values
 * @return {Object} The filtered values.
 */
Subscription.restrict = function (values) {
  return pick(values, this.accessible);
};

/**
 * Eventually returns the total number of Subscriptions.
 *
 * @method count
 * @static
 *
 * @return {Promise<Number>} The number of Subscriptions.
 */
Subscription.count = co(function* () {
  return (yield this.db.zcard('ids')) || 0;
});

/**
 * Eventually returns a list of Subscription ids.
 *
 * Note: The returned array will have a special
 * property `range` with a Range instance!
 *
 * @method ids
 * @static
 *
 * @param {Object|Range} options
 * @return {Promise<Array>} The list of ids.
 */
Subscription.ids = co(function* (options) {
  options = extend({}, options, { total: yield this.count() });

  var range = Range.parse(options);

  debug('fetching ids for range %j...', range);

  var ids = yield this.db.zrange(['ids'].concat(range.bounds));

  // Add range object to array!
  ids.range = range;

  return ids;
});


/**
 * Eventually returns a list of all Subscriptions.
 *
 * @method all
 * @static
 *
 * @return {Promise<Array>} The list of Subscriptions.
 */
Subscription.all = function () {
  return this.range(new Range());
};

/**
 * Eventually returns a list of all Subscriptions
 * in the range defined by `options`.
 *
 * Note: The returned array will have a special
 * property `range` with a Range instance!
 *
 * @method range
 * @static
 *
 * @param {Object|Range} The range.
 *
 * @throws RangeError
 *
 * @return {Promise<Array>} The list of Subscriptions.
 */
Subscription.range = function (options) {
  var range;

  return Subscription
    .ids(options)
    .tap(function (id) { range = id.range; })

    .map(function (id) {
      return Subscription.load(id);
    })

    .then(function (subscriptions) {
      // Add range object to result array!
      subscriptions.range = range;

      return subscriptions;
    });
};


Subscription.find = function (query) {
  if (!query) return this.all();

  if (typeof query === 'string')
    query = new RegExp('^(' + query.replace(/,\s*/g, '|') + ')', 'i');

  assert(query instanceof RegExp);

  function matches(id) { return query.test(id); }

  return Subscription
    .ids()
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
      var m = (/^(\/?(users|groups)\/\d+(\/publications)?)/).exec(this.path);
      return m && m[1];
    }
  },

  /**
   * Alias for library. Used for topic subscriptions.
   *
   * @property topic
   * @type String
   */
  topic: { get: function () { return this.library; } },

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

  data_json: {
    enumerable: false,

    get: function () {
      return JSON.stringify(this.data);
    },
    set: function (value) {
      this.data = JSON.parse(value || '{}');
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
  this.version  = 0;
  this.versions = {};

  // Do not reset this.data!

  this.touch();

  return this;
};

/**
 * Saves the Subscription to the Redis database.
 *
 * When the promise returned by this method resolves,
 * new Subscriptions will have an id property.
 *
 * @method save
 *
 * @throws {ValidationError} If the Subscription does
 *   not have a valid URL.
 *
 * @throws {UpdateError} When saving an existing
 *   Subscription (with an id), that has been removed
 *   from the database.
 *
 * @return {Promise<this>}
 */
Subscription.prototype.save = co(function* () {
  if (!this.url)
    throw new ValidationError('no URL specified');

  if (!this.library)
    throw new ValidationError('not a valid Zotero library URL');

  if (this.id) {
    if (!(yield Subscription.exists(this.id)))
      throw new UpdateError('id does not exist: ' + this.id, this);

  } else yield this.identify();

  yield this.db.transaction()
    .zadd('ids', this.score, this.id)
    .hmset(this.id, this.serialize())
    .commit();

  debug('"%s" saved successfully', this.id);

  return this;
});


/**
 * Sets a unique id.
 *
 * @method identify
 * @private
 *
 * @return {Promise<this>}
 */
Subscription.prototype.identify = co(function* () {
  assert(!this.id, 'has already been identified');

  if (!this.score)
    this.score = +new Date();

  while (!this.id) {
    var id = common.id();

    if (!(yield Subscription.exists(id)))
      this.id = id;
  }

  debug('uniquely identified as "%s"', this.id);

  return this;
});


Subscription.prototype.destroy = co(function* (options) {
  yield this.db.transaction()
    .zrem('ids', this.id)
    .del(this.id)
    .commit();

  debug('"%s" destroyed successfully', this.id);

  if (options) {

    if (options['invalidate-key'] && this.key)
      yield this.invalidate();

  }

  return this;
});


/**
 * Invalidates this Subscription by deleting its key
 * from the Zotero API server.
 *
 * Note: The key will be removed from the Subscription!
 *
 * @method invalidate
 * @return {Promise<this>}
 */
Subscription.prototype.invalidate = co(function* () {
  if (!this.key) return this;

  debug('"%s" invalidating API key...', this.id);

  yield zotero.delete([this.library, 'keys', this.key].join('/'));
  this.key = undefined;

  debug('"%s" API key invalidated successfully', this.id);

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
 * Error thrown when a new or updated resource
 * is invalid.
 *
 * @class ValidationError
 * @extends Error
 */
function ValidationError(message) {
  this.message = message;
  this.name = 'ValidationError';

  Error.captureStackTrace(this, ValidationError);
}

inherits(ValidationError, Error);

/**
 * Error thrown when an existing Subscription
 * is saved, but does not exist in the DB anymore;
 * e.g., because the Subscription has been destroyed.
 *
 * @class UpdateError
 * @extends Error
 */
function UpdateError(message, subscription) {
  this.message = message;
  this.name = 'UpdateError';
  this.subscription = subscription;

  Error.captureStackTrace(this, UpdateError);
}

inherits(UpdateError, Error);

// --- Exports ---
Subscription.NotFoundError   = NotFoundError;
Subscription.UpdateError     = UpdateError;
Subscription.ValidationError = ValidationError;

module.exports = Subscription;
