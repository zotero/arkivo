'use strict';

// --- Dependencies ---
var debug = require('debug')('arkivo:rest-client');

var assert  = require('assert');
var B       = require('bluebird');

var request = require('superagent');

function RESTClient(options) {
  this.options = options;
}

RESTClient.prototype.path = function (action, item) {
  var path = this.options[action];

  assert(typeof path === 'string');

  if (!item) return path;

  return path.replace(/:(\w+)/, function (m) {
    return item[m[1]];
  });
};

RESTClient.prototype.prepare = function (item) {
  return B.fulfilled(item);
};

RESTClient.prototype.send = function (method, action, options, item) {
  var path = this.path(action, options);

  debug('requesting %s', path);

  return this
    .prepare(item)

    .then(function (data) {
      return new B(function (resolve, reject) {
        request[method](path)
          .send(data)

          .end(function (error, result) {
            if (error) return reject(error);
            resolve(result);
          });
      });
    });
};

// --- Exports ---
module.exports = RESTClient;
