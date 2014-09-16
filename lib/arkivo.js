var Controller = require('./controller');
var Synchronizer = require('./sync');
var UI = require('./ui');

function arkivo() {}

arkivo.controller = Controller.singleton;
arkivo.sync = Synchronizer.singleton;
arkivo.ui = UI.singleton;

module.exports = arkivo;
