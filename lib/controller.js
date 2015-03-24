'use strict';

// --- Dependencies ---

var assert = require('assert');
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;

var debug = require('debug')('arkivo:controller');

var B = require('bluebird');

var config = require('./config').controller;
var common = require('./common');

var extend = common.extend;
var noop   = common.noop;

var db     = require('./db');
var q      = require('./q').instance;

var sync   = require('./sync').instance;

var Subscription = require('./subscription');

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
   * The default job types to process.
   *
   * @property jobs
   * @type Array<String>
   */
  this.jobs = ['subscribe', 'unsubscribe', 'sync'];
}
inherits(Controller, EventEmitter);




// --- Controller Prototype ---

/**
 * Creates a new `Subscription` for the passed-in data
 * and saves it.
 *
 * @method subscribe
 *
 * @param {Object} data
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
  assert(data.url);

  report(job, ['subscribing to "%s"...', data.url]);

  return (new Subscription(data))
    .save()

    .tap(function (s) {
      this.notify('sync', { id: s.id, skip: data.skip });
    }.bind(this));
};

/**
 * Loads the `Subscription` for the passed-in id
 * and removes it from the database; returns the
 * subscription object.
 *
 * @method unsubscribe
 *
 * @param {String} data.id
 *   The id of the subscription to remove.
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

  return Subscription
    .load(data.id)
    .call('destroy');
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
  var progress, subscriptions;

  if (data.all) {
    report(job, ['loading all subscriptions...']);
    subscriptions = Subscription.all();

  } else {
    assert(data.id);
    report(job, ['loading subscription "%s"...', data.id]);

    subscriptions = Subscription
      .load(data.id)
      .then(function (s) { return [s]; });
  }

  return subscriptions
    .tap(function (ss) {
      progress = progressor(job, ss.length);
    })

    .filter(function (s) {
      report(job, [
        'synchronizing subscription "%s"...', s.id
      ]);

      return sync
        .synchronize(s, data.skip)
        .tap(progress)

        .catch(Subscription.UpdateError, function (error) {
          report(job, [
              'subscription "%s" has been removed, skipping...',
              error.subscription.id
          ]);

          return false;
        });
    });
};

Controller.prototype.sync = Controller.prototype.synchronize;

/**
 * Saves a new job description in the message queue.
 *
 * @method notify
 *
 * @param {String} name The job name.
 * @param {Object} data The data to be passed on to the worker.
 *
 * @return {Promise<Kue.Job>}
 */
Controller.prototype.notify = function (name, data) {
  return new B(function (resolve, reject) {
    var job = q.jobs.create(name, data);

    job
      .removeOnComplete(this.options.autoclean)

      .save(function (err) {
        if (err) {
          debug('failed to save job "%s": %s', name, err.message);
          reject(err);

        } else {
          debug('saved job "%s" with data %j', name, data);
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
Controller.prototype.process = function (job, done, ctx) {
  try {

    assert(job);
    assert(typeof this[job.type] === 'function');

    report(job, [
      'processing "%s" job #%d with %s...',
      job.type, job.id, JSON.stringify(job.data)
    ]);

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

        debug(e.stack);
        done(e);
      });

  } catch (e) { done(e); }
};


Controller.prototype.start = function (jobs) {
  jobs = jobs || this.jobs;

  var handler = this.process.bind(this);
  var workers = this.options.workers;

  jobs.forEach(function (type) {
    q.jobs.process(type, workers, handler);
    debug('listening for "%s" requests...', type);
  });

  q.interrupted().each(function (job) {
    job.inactive();
    debug('re-sheduling interrupted job %s#%d...', job.type, job.id);
  });

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

  return q
    .shutdown(config.timeout)

    .tap(function () { db.reset(); })
    .tap(function () { debug('shut down complete'); })

    .return(this);
};

// --- Controller Singleton ---
Controller.instance = new Controller();

// --- Private Helpers ---

// Convenience helper to log messages to debug and UI
function report(job, args) {
  if (!job) return debug.apply(null, args);

  var msg = args.shift();

  debug.apply(null,
    ['[%s#%d] ' + msg, job.type, job.id].concat(args));

  job.log.apply(job, [capitalize(msg)].concat(args));
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

// --- Exports ---
module.exports = Controller;
