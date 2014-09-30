
'use strict';

// --- Dependencies ---
var join    = require('path').join;

var debug   = require('debug')('arkivo:server:api');
var express = require('express');

var common = require('../../common');
var pick = common.pick;

var Subscription = require('../../subscription');
var NotFoundError = Subscription.NotFoundError;

var api = express.Router();

api.param('sid', function (req, res, next, id) {
  Subscription
    .load(id)

    .then(function (s) {
      req.subscription = s;
      next();
    })

    .catch(NotFoundError, function () {
      res.status(404).end();
    })

    .catch(next);
});

api.route('/subscription/:sid')
  .get(function (req, res, next) {
    res
      .set({
        'Last-Modified': req.subscription.timestamp
      })

      .send(req.subscription.json);
  })

  .post(function (req, res, next) {
    var subscription =
      new Subscription(pick(req.query, Subscription.accessible));

    var address =
      join(req.baseUrl, 'subscription', subscription.id);

    subscription
      .save()

      .then(function () {
        res
          .status(201)

          .set({
            'Location': address, 'Content-Location': address
          })

          .send(subscription.json);
      })

      .catch(next);
  })

  .delete(function (req, res, next) {
    req.subscription
      .destroy()

      .then(function () {
        res.status(200).end();
      })

      .catch(next);
  });


api.all('*', function (req, _, next) {
  debug('%s %s', req.method, req.path);
  next();
});

// --- Exports ---
module.exports = api;
