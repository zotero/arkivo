var kue = require('kue');

var config = require('./config');

var jobs = kue.createQueue(config.q);

kue.app.listen(8888);

