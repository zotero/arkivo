#!/usr/bin/env node
'use strict';

require('gnode');

var program = require('commander');
var arkivo  = require('..');


program
  .version(arkivo.version);

program
  .command('list')
  .description('List all available plugins by name')

  .action(function list() {
    var names = arkivo.plugins.names;

    console.log('%d plugin(s) available.', names.length);

    names.forEach(function (name) {
      var p = arkivo.plugins.use(name);
      console.log('  %s: %s', p.name, p.summary);
    });
  });

program
  .command('show <name>')
  .description('Prints the full plugin details')

  .action(function show(name) {
    // TODO
  });

program.parse(process.argv);
