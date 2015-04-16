arkivo
======
[![Build Status](https://travis-ci.org/inukshuk/arkivo.svg?branch=master)](https://travis-ci.org/inukshuk/arkivo)
[![Coverage Status](https://img.shields.io/coveralls/inukshuk/arkivo.svg)](https://coveralls.io/r/inukshuk/arkivo?branch=master)

Requirements
------------
* Node.js (0.10+, ideally 0.12)
* Redis

Quickstart
----------
Install `arkivo` using NPM:

    $ npm install arkivo

This will install the `arkivo` executable  locally (or globally if
you use the `-g` switch).

    $ $(npm bin)/arkivo -h
    # Prints out the list of command-line options

    $ $(npm bin)/arkivo up
    # Starts the Arkivo service

    $ $(npm bin)/arkivo sync [subscriptions]
    # Manually triggers synchronization of given (or all) subscriptions

    $ $(npm bin)/arkivo --redis localhost:4242 up
    # Starts the Arkivo service using a different Redis connection

    $ $(npm bin)/arkivo-subscriptions -h
    # Prints out the list of subscription managemend
    # command-line options

    $ $(npm bin)/arkivo-subscriptions list
    # Prints out a list of all subscriptions

    $ $(npm bin)/arkivo-subscriptions --redis localhost:4242 list
    # Prints out a list of subscriptions using
    # a different Redis connection

To enable debug output you can set a filter for each component in the
`DEBUG` environment variable:

    $ DEBUG=arkivo:* arkivo up
    # Enables debug output of all arkivo components

    $ DEBUG=arkivo:http arkivo up
    # Enables debug output of only the arkivo http component

    $ DEBUG=arkivo:*,zotero:* arkivo up
    # Enables debug output of all arkivo and zotero components

The available components for which debug output can be enabled individually
include: `controller`, `db`, `http`, `listener`, `q` `subscription`, and
`sync`.

By running `arkivo up` you start all arkivo services, including
the web monitor and API at http://localhost:8888/api.

Configuration
-------------
Arkivo uses the Node module [config](https://github.com/lorenwest/node-config)
to load configuration files. You can use the command line option
`--NODE_CONFIG` or environment variable `NODE_CONFIG` to override the
configuration, or use the environment variable `NODE_CONFIG_DIR` to specify
from where Arkivo should load additional configuration files. By default
Arkivo will look for a `config` folder in your current working directory,
i.e., the directory where you started the Arkivo process; in your config
folder you can place configuration files for different Node environments.

To see which configuration options are available, consult the
[default configuration](https://github.com/inukshuk/arkivo/blob/master/config/default.json).

