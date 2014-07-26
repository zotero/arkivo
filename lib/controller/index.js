
var debug = require('debug')('arkivo:controller');

var q = require('../q');
var defaults = require('../defaults');

q.app.listen(defaults.controller.port, function () {
  debug('ui up and running on port %d', defaults.controller.port);
});

q.jobs.create('sync', {
  library: '475425'
}).save();

