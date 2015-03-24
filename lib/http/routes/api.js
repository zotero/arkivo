
'use strict';

// --- Dependencies ---
var join    = require('path').join;
var qs      = require('querystring');

var debug   = require('debug')('arkivo:server:api');
var express = require('express');
var body    = require('body-parser');

var log      = require('../middleware/log');
var provides = require('../middleware/provides');

var common = require('../../common');
var extend = common.extend;
var pick   = common.pick;

var Range        = require('../../range');
var Subscription = require('../../subscription');
var controller   = require('../../controller').instance;

var NotFoundError   = Subscription.NotFoundError;
var ValidationError = Subscription.ValidationError;

var api = express.Router();

var DEFAULT_RANGE = { start: 0, limit: 50 };

// --- Middleware ---

api.use(log('requests', debug));
api.use(provides('json'));


// --- Magic Parameters ---

api.param('subscription', function (req, res, next, id) {
  Subscription
    .load(id)

    .then(function (subscription) {
      req.subscription = subscription;
      next();
    })

    .catch(next);
});



// --- Routes ---

api.route('/subscription')

  /*
   * HEAD /api/subscription
   *
   * @param {Number} [start = 0]
   * @param {Number} [limit = 50]
   *
   * Returns the same headers as the corresponding
   * GET request but without a response body.
   *
   * This method can be used to check how many
   * Subscriptions currently exist.
   */
  .head(function (req, res, next) {
    Subscription
      .count()

      .then(function (count) {
        var range = Range
          .parse(extend({}, DEFAULT_RANGE, req.query, { total: count }));

        res
          .status(200)
          .set({
            'Total-Results': range.total
          })

          .links(link(join(req.baseUrl, req.path), range))

          .end();
      })

      .catch(next);
  })

  /*
   * GET /api/subscription
   *
   * @param {Number} [start = 0]
   * @param {Number} [limit = 50]
   *
   * Returns a range of Subscriptions.
   */
  .get(function (req, res, next) {
    Subscription
      .range(extend({}, DEFAULT_RANGE, req.query))

      .then(function (s) {
        res
          .status(200)
          .set({
            'Total-Results': s.range.total
          })

          .links(link(join(req.baseUrl, req.path), s.range))

          .send(s.map(to_json));
      })

      .catch(next);
  })

  /*
   * POST /api/subscription
   *
   * Creates a new Subscription from the JSON data
   * in the body and/or URL parameters.
   *
   * Returns the new Subscription.
   */
  .post(body.json(), function (req, res, next) {
    Subscription
      .create(extend(req.query, req.body))

      .then(function (subscription) {
        res
          .status(201)

          .set({
            'Location': join(req.baseUrl, req.path, subscription.id)
          })

          .send(subscription.json);
      })

      .catch(next);
  });


api.route('/subscription/:subscription')

  /*
   * GET /api/subscription/:id
   *
   * Returns a single Subscription.
   */
  .get(function (req, res, next) {
    res
      .status(200)

      .set({
        'Last-Modified': req.subscription.timestamp
      })

      .send(req.subscription.json);
  })


  /*
   * DELETE /api/subscription/:id
   *
   * Destroys the given Subscription.
   *
   * @param {Boolean} [invalidate-key = false] Whether or not to
   *   invalidate the Subscription's API key.
   */
  .delete(function (req, res, next) {
    req.subscription
      .destroy(req.query)

      .then(function () {
        res.status(204).end();
      })

      .catch(next);
  });

api.route('/sync')

  /*
   * POST /api/sync
   *
   * Schedules a new synchronization job.
   *
   * Returns the new synchronization job.
   */
  .post(body.json(), function (req, res, next) {
    var data = pick(req.body, 'id', 'skip');

    data.title  = 'REST API Synchronization Request';
    data.all    = (data.id == null);
    data.client = req.ip;

    controller
      .notify('sync', data)

      .then(function (job) {
        res
          .status(201)

          .set({
            'Location': join(req.baseUrl, 'job', job.id)
          })

          .send(job);
      })

      .catch(next);
  });

// --- Error Handlers ---

api.use(log('errors', debug));

api.use(function (error, req, res, next) {
  res
    .status(code(error))
    .json({ error: error.message });
});

// --- Private Helpers ---

/** @returns {Number} an HTTP status code for error. */
function code(error) {
  if (error instanceof NotFoundError)   return 404;
  if (error instanceof RangeError)      return 400;
  if (error instanceof ValidationError) return 400;

  return 500;
}

function to_json(o) { return o.json; }

/* @returns {Object} The link header object for the range. */
function link(url, range) {
  var links = {};

  if (!range.done) {
    links.next = [url, qs.stringify(range.next().query)].join('?');
    links.last = [url, qs.stringify(range.last().query)].join('?');
  }

  if (range.from !== 0)
    links.prev = [url, qs.stringify(range.prev().query)].join('?');

  return links;
}

// --- Exports ---
module.exports = api;
