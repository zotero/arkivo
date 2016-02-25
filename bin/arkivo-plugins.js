#!/usr/bin/env node
'use strict';

var program = require('commander');

var arkivo  = require('..');
var plugins = arkivo.plugins;

program
  .version(arkivo.version);

program
  .command('list')
  .description('List all available plugins by name')

  .action(function list() {
    console.log('%d plugin(s) available.', plugins.count);

    plugins.each(function (p) {
      console.log('  %s: %s', p.name, p.summary);
    });
  });

program
  .command('params <name>')
  .description('Prints the plugin\'s parameters')

  .action(function params(name) {
    var plugin = plugins.use(name), p, pn, s;


    if (plugin.configurable) {
      console.log('Available parameters for %s:', name);

      for (pn in plugin.parameters) {
        p = plugin.parameters[pn];

        s = pn;

        if (p.mandatory) s += '*';
        if (p.default) s += ' [' + p.default + ']';

        console.log('  %s', [s, p.description].join(': '));
      }
    } else {
      console.log('No parameters available for %s', name);
    }

  });

program.parse(process.argv);
