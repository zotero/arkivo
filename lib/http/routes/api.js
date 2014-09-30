
'use strict';

// --- Dependencies ---
//var debug = require('debug')('arkivo:server:api');
var express = require('express');

var Subscription = require('../../subscription');

var api = express.Router();

api.param('sid', function (req, res, next, id) {
  Subscription
    .load(id)
    .then(function (s) {
      req.subscription = s;
      next();
    })
    .catch(next);
});

api.route('/:sid')

  .get(function (req, res, next) {
    res.send(req.subscription.json);
  })

  .delete(function (req, res, next) {
  });

// --- Exports ---
module.exports = api;
