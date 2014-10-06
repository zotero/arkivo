
'use strict';

// --- Dependencies ---
var join    = require('path').join;

var debug   = require('debug')('arkivo:server:api');
var express = require('express');
var body    = require('body-parser');

var log      = require('../middleware/log');
var provides = require('../middleware/provides');

var common = require('../../common');
var extend = common.extend;

var Subscription = require('../../subscription');
var NotFoundError = Subscription.NotFoundError;

var api = express.Router();


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
  .get(function (req, res, next) {
    Subscription
      .range(extend({ limit: 50 }, req.query))

      .then(function (range) {
        // set total header
        // set next, previous, first, last links
      })

      .catch(next);
  })

  .post(body.json(), function (req, res, next) {
    Subscription
      .create(req.body)

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
  .get(function (req, res, next) {
    res
      .set({
        'Last-Modified': req.subscription.timestamp
      })

      .send(req.subscription.json);
  })

  .post(body.json(), function (req, res, next) {
    // check if currently being synced!
    req.subscription
      .update(Subscription.restrict(req.body))
      .save()

      .then(function () {
        res.send(req.subscription.json);
      })

      .catch(next);
  })

  .delete(function (req, res, next) {
    // check if currently being synced!
    req.subscription
      .destroy()

      .then(function () {
        res.status(200).end();
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

// Returns an HTTP status code for error.
function code(error) {
  if (error instanceof NotFoundError) return 404;
  if (error instanceof RangeError)    return 400;
  return 500;
}

// --- Exports ---
module.exports = api;
