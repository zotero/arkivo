
'use strict';

// --- Dependencies ---
//var debug = require('debug')('arkivo:server:api');
var express = require('express');

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
  })

  .delete(function (req, res, next) {
    req.subscription
      .destroy()

      .then(function () {
        res.status(200).end();
      })

      .catch(next);
  });

// --- Exports ---
module.exports = api;
