'use strict';

// --- Dependencies ---

var assert = require('assert');
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;

var debug = require('debug')('arkivo:controller');
var trace = require('debug')('arkivo:trace');

var B = require('bluebird');

var config = require('./config').controller;
var common = require('./common');

var extend = common.extend;
var noop   = common.noop;

var db     = require('./db');
var q      = require('./q').instance;

var sync   = require('./sync').instance;

var Subscription = require('./subscription');
var Listener = require('./listener');


/** @module arkivo */


/**
 * @class Controller
 * @extends EventEmtitter
 * @constructor
 */
function Controller(options) {
  EventEmitter.call(this);

  this.options = extend({}, config, options);

  /**
   * @property listener
   * @type Listener
   */
  this.listener = new Listener()

    .on('updated', function (subscription) {
      this.notify('sync', {
        id: subscription.id,
        title: 'Zotero Stream-issued Synchronization Request'
      }, this.options.delay, this.options.attempts);
    }.bind(this))

    .on('error', fail('uncaught listener error'));


  /**
   * The default job types to process.
   *
   * @property jobs
   * @type Array<String>
   */
  this.jobs = ['subscribe', 'unsubscribe', 'sync'];

  /**
   * Subscription locks used for synchronization.
   *
   * @property lock
   * @type Object
   */
  this.lock = {};

}
inherits(Controller, EventEmitter);


// --- Controller Prototype ---

/**
 * Creates a new `Subscription` for the passed-in data
 * and saves it.
 *
 * @method subscribe
 *
 * @param {Object|Subscription} data
 *   The subscription's values (url, key, etc.).
 *
 * @param {Object} [job]
 *   The Kue.Job object (used for status reporting).
 *
 * @return {Promise<Subscription>}
 *   A promise for the saved subscription.
 */
Controller.prototype.subscribe = function (data, job) {
  assert(data);

  var subscription = (data instanceof Subscription) ?
    data : new Subscription(Subscription.restrict(data));

  report(job, ['subscribing to "%s"...', subscription.url]);

  return subscription
    .save()

    .tap(function (s) {
      this.notify('sync', {
        id: s.id,
        skip: data.skip
      }, 0, this.options.attempts);

      if (this.options.listen)
        return this.listener.add(s);

    }.bind(this));
};

/**
 * Loads the `Subscription` for the passed-in id
 * and removes it from the database; returns the
 * subscription object.
 *
 * @method unsubscribe
 *
 * @param {Object|Subscription} data
 *   The subscription or id of the subscription to remove.
 *
 * @param {Object} [job]
 *   The Kue job object (used for status reporting).
 *
 * @return {Promise<Subscription>}
 *   A promise for the removed subscription.
 */
Controller.prototype.unsubscribe = function (data, job) {
  assert(data);
  assert(data.id);

  report(job, ['unsubscribing from "%s"...', data.id]);

  var subscription = (data instanceof Subscription) ?
    B.resolve(data) : Subscription.load(data.id);

  return subscription
    .call('destroy')

    .tap(function (s) {
      if (this.options.listen) return this.listener.remove(s);
    }.bind(this));
};


/**
 * Synchronizes the subscriptions matching
 * the passed-in id or ids.
 *
 * @method synchronize
 *
 * @param {String} data.id
 *   The id of subscriptions to synchronize.
 * @param {Boolean} data.all
 *   If set, synchronize all subscriptions.
 * @param {Boolean} data.skip
 *   If set, synchronizes only version numbers
 *   and skips item download and plugin processing.
 *   This effectively fast-forwards the subscription
 *   to the latest library version.
 *
 * @param {Object} [job]
 *   The Kue.Job object (used for status reporting).
 *
 * @return {Promise<Array>}
 *   A promise for the synchronized subscriptions.
 */
Controller.prototype.synchronize = function (data, job) {
  var progress;
  var subscriptions;

  var lock = this.lock;

  if (data.all) {
    report(job, ['loading all subscriptions...']);
    subscriptions = Subscription.all();

  } else {
    assert(data.id);

    // Return early if the subscription is locked!
    if (lock[data.id]) {
      report(job, [
        'synchronization of "%s" in progress, skipping...', data.id
      ]);

      return B.resolve([]);
    }

    report(job, ['loading subscription "%s"...', data.id]);

    subscriptions = Subscription
      .load(data.id)
      .then(listify);
  }

  return subscriptions
    .tap(function (ss) {
      progress = progressor(job, ss.length);
    })

    .filter(function (s) {

      if (lock[s.id]) {
        report(job, [
          '[%s] synchronization in progress, skipping...', s.id
        ]);

        return false;
      }

      lock[s.id] = 1;

      report(job, ['[%s] synchronizing subscription...', s.id]);

      return sync
        .synchronize(s, data.skip)

        .tap(function () { return s.save(); })
        .tap(progress)

        .catch(Subscription.UpdateError, function () {
          report(job, [
            '[%s] subscription has been removed, skipping...',
            s.id
          ]);

          return false;
        })

        .catch(function (error) {
          report(job, [
            '[%s] failed to sync subscription: %s',
            s.id,
            error.message
          ]);

          trace(error.stack);

          return false;
        })

        .finally(function () { delete lock[s.id]; });

    }, { concurrency: this.options.workers });
};

Controller.prototype.sync = Controller.prototype.synchronize;

/**
 * Saves a new job description in the message queue.
 *
 * @method notify
 *
 * @param {String} name The job name.
 * @param {Object} data The data to be passed on to the worker.
 * @param {Number|Date} [delay = 0]
 * @param {Number} [attempts = 1]
 *
 * @return {Promise<Kue.Job>}
 */
Controller.prototype.notify = function (name, data, delay, attempts) {
  return new B(function (resolve, reject) {
    var job = q.jobs.create(name, data);

    job
      .removeOnComplete(this.options.autoclean)

      .delay(delay)
      .attempts(attempts || 1)
      .backoff({ delay: delay, type: this.options.backoff })

      .save(function (err) {
        if (err) {
          debug('failed to save job "%s": %s', name, err.message);
          reject(err);

        } else {
          debug('saved job "%s"', name);
          resolve(job);
        }
      });

  }.bind(this));
};



// --- MQ Job Handlers ---

/**
 * Processes incoming jobs coming from the message
 * queue by calling the appropriate handler in the
 * controller.
 *
 * @method process
 * @private
 *
 * @return {Promise}
 *   The Promise returned by respective job handler.
 */
Controller.prototype.process = function (job, done) {
  try {

    assert(job);
    assert(typeof this[job.type] === 'function');

    report(job, ['processing "%s" job #%d...', job.type, job.id]);

    return this[job.type](job.data, job)
      .tap(function () {
        report(job, [
          'finished processing "%s" job #%d', job.type, job.id
        ]);

        done();
      })

      .catch(function (e) {
        report(job, [
          'failed processing "%s" job #%d: %s', job.type, job.id, e.message
        ]);

        trace(e.stack);
        done(e);
      });

  } catch (e) { done(e); }
};


/**
 * Starts listening for un/subscribe and sync jobs;
 * Loads all subscriptions and synchronizes them;
 * starts listening to the Zotero Stream API for
 * updates of all subscriptions.
 */
Controller.prototype.start = function (jobs) {
  jobs = jobs || this.jobs;

  var options  = this.options;
  var handler  = this.process.bind(this);
  var workers  = this.options.workers;
  var listener = this.listener;

  // Initially sync all subscriptions;
  // then start processing new or interrupted jobs!
  var subscriptions = this
    .sync({ all: true })
    .catch(fail('initial synchronization failed'));

  subscriptions
    .finally(function resume() {

      jobs.forEach(function (type) {
        debug('listening for "%s" requests...', type);
        q.jobs.process(type, workers, handler);
      });

      q.interrupted().each(function (job) {
        debug('re-sheduling interrupted job %s#%d...', job.type, job.id);
        job.inactive();
      });
    });


  // Connect to Zotero Stream API and start
  // listening when initial sync is done.
  if (this.options.listen) {
    listener
      .start()
      .once('connected', function () {
        debug('listener connected successfully');

        subscriptions
          .then(function (s) { if (s.length) return listener.add(s); });
      });

  }

  return this;
};

/**
 * Shuts down the MessageQueue and resets all
 * DB/Redis connections. This method will wait
 * `config.timeout` milliseconds for currently
 * active jobs to complete; if they do not, the
 * jobs will be marked as failed.
 *
 * @method stop
 * @return {Promise<this>}
 */
Controller.prototype.stop = function () {
  debug('shutting down...');

  return B.all([
    q.shutdown(config.timeout),
    this.listener.stop(config.timeout)
  ])

    .tap(function () { db.reset(); })
    .tap(function () { debug('shut down complete'); })

    .return(this);
};

// --- Controller Singleton ---
Controller.instance = new Controller();

// --- Private Helpers ---

// Convenience helper to log messages to debug and UI
function report(job, args) {
  try {
    if (!job) return debug.apply(null, args);

    var msg = args.shift();

    debug.apply(null,
      ['[%s#%d] ' + msg, job.type, job.id].concat(args));

    job.log.apply(job, [capitalize(msg)].concat(args));

  } catch (error) {
    /* eslint-disable no-console */
    console.error(error);
    console.error(error.stack);
    /* eslint-enable no-console */
  }
}

function capitalize(string) {
  if (string.length)
    return string[0].toUpperCase() + string.slice(1);

  return string;
}

function progressor(job, total) {
  if (!job) return noop;

  var completed = 0;

  return function progress() {
    job.progress(++completed, total);
  };
}

function fail(message) {
  return function failed(error) {
    debug('%s: %s', message, error.message);
    trace(error.stack);

    throw error;
  };
}

function listify(i) { return [i]; }

// --- Exports ---
module.exports = Controller;
