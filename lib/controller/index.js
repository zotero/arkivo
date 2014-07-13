
var q = require('../q');
var defaults = require('../defaults');

q.app.listen(defaults.controller.port);

q.jobs.create('sync', {
  library: '475425'
}).save();

