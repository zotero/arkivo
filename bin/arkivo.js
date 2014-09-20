#!/usr/bin/env node
'use strict';

// --- Dependencies ---

require('gnode');

var debug    = require('debug')('arkivo');
//var B       = require('B');
var program = require('commander');
var tabtab  = require('tabtab');

var arkivo  = require('..');

var controller = arkivo.controller;

program
  .version(arkivo.version)

  .option('-r, --redis <host:port>', 'configure the Redis connection', redis);


// --- Command ---

program
  .command('up')
  .description('start the Arkivo service')

  .action(function up() {

    controller.start();

    process.once('SIGTERM', function () {
      debug('sigterm received: shutting down...');

      controller
        .stop()
        .then(shutdown)

        .catch(function (error) {
          debug('failed to shut down gracefully: %s', error.message);
          debug(error.stack);

          process.exit(1);
        });
    });
  });


program
  .command('plugins', 'Manage Arkivo plugins')
  .command('subscriptions', 'Manage Zotero URL subscriptions');


// --- Helpers ---

function shutdown() {
  arkivo.db.reset();
  process.stdin.destroy();
}

function redis(input) {
  var cfg = input.split(':');

  if (cfg[0]) arkivo.config.redis.host = cfg[0];
  if (cfg[1]) arkivo.config.redis.port = cfg[1];

  return cfg;
}

// --- Tab-Completion ---

if (process.argv[2] === 'completion') {
  return tabtab.complete('arkivo', function (error, data) {
    if (error || !data) return undefined;

    function to_long(o)  { return o.long;  }
    function to_short(o) { return o.short; }
    function to_name(o)  { return o._name; }

    if ((/^--/).test(data.last))
      return tabtab.log(program.options.map(to_long), data, '--');

    if ((/^-/).test(data.last))
      return tabtab.log(program.options.map(to_short), data, '-');

    tabtab.log(program.commands.map(to_name), data);
  });
}

program.parse(process.argv);
