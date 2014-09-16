#!/usr/bin/env node

require('gnode');

var program = require('commander');
var arkivo = require('..');

program
  .version(require('../package.json').version)

  .option('-I, --include <path>', 'include path for extra plugins')
  .option('-d, --daemonize', 'daemonize on start')
  .option('-q, --quiet', 'do not start the web service')
  .option('-p, --port <port>', 'web service port', parseInt)

  .parse(process.argv);


if (program.include)
  require(program.include);

arkivo.controller.start();

if (!program.quiet)
  arkivo.ui.start(program.port);


//process.once('SIGTERM', function () {
//});
