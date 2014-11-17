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

  return path.replace(/:(\w+)/, function (_, name) {
    return item[name] || '';
  });
};

RESTClient.prototype.prepare = function (item) {
  return B.fulfilled(item);
};

RESTClient.prototype.send = function (method, path, item) {
  debug('%s %s', method, path);

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

RESTClient.prototype.create = function (item) {
  return this.send('post', this.path('create', item), item);
};

RESTClient.prototype.update = function (item) {
  return this.send('put', this.path('update', item), item);
};

RESTClient.prototype.delete = function (item) {
  return this.send('del', this.path('delete', item));
};

// --- Exports ---
module.exports = RESTClient;
