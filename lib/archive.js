var debug = require('debug')('arkivo:archive');

var defaults = require('./defaults');
var db = require('./db')(defaults.archive.prefix);

function Archive() {
}


Archive.all = function () {
};

Archive.ids = function () {

};

Archive.load = function () {
};


Archive.prototype.save = function () {
  db.sadd(this.id);

};

Archive.prototype.destroy = function () {

};

Archive.prototype.serialize = function () {

};

module.exports = Archive;
