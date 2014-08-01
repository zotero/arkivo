var debug = require('debug')('arkivo:archive');

var defaults = require('./defaults');
var db = new (require('./db'))(defaults.archive.prefix);

function noop() {}


function Archive(id, key, version) {
  this.id = id;
  this.key = key;
  this.version = version;
}


Archive.load = function (id, callback) {
  callback = callback || noop;

  var archive = new Archive(id);

  db.sismember('all', id, function (error, exists) {
    if (error) return callback(error);
    if (!exists) return callback(new Error('Archive not found'));

    db.hmget(id, 'id', 'key', 'version', function (error, data) {
      if (error) return callback(error);

      archive.key = data[1];
      archive.version = data[2];

      callback(null, archive);
    });
  });

  return archive;
};


Archive.prototype.save = function (callback) {
  callback = callback || noop;

  var self = this;

  db.sadd('all', this.id, function (error) {
    if (error) return callback(error);

    var data = self.serialize();

    data.unshift(self.id);
    data.push(callback);

    db.hmset.apply(db, data);
  });

  return this;
};

Archive.prototype.destroy = function () {

};

Archive.prototype.serialize = function () {
  return ['id', this.id, 'key', this.key, 'version', this.version]; 
};

module.exports = Archive;
