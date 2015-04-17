Arkivo
======
[![Build Status](https://travis-ci.org/inukshuk/arkivo.svg?branch=master)](https://travis-ci.org/inukshuk/arkivo)
[![Coverage Status](https://img.shields.io/coveralls/inukshuk/arkivo.svg)](https://coveralls.io/r/inukshuk/arkivo?branch=master)

Arkivo is a Zotero subscription service. Whenever your Zotero library or
collection changes, Arkivo will fetch those changes from Zotero and dispatch
them to any number of Arkivo plugins for further processing.

Requirements
------------
* Node.js (>= 0.10, ideally 0.12), io.js (>= 1.7)
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
    # Enables debug output of all Arkivo components

    $ DEBUG=arkivo:http arkivo up
    # Enables debug output of only the Arkivo HTTP component

    $ DEBUG=arkivo:*,zotero:* arkivo up
    # Enables debug output of all Arkivo and Zotero components

The available components for which debug output can be enabled individually
include: `controller`, `db`, `http`, `listener`, `q` `subscription`, and
`sync`.

By running `arkivo up` you start all Arkivo services, including
the web monitor and API at http://localhost:8888/api.

Configuration
-------------
Arkivo uses the Node module [config](https://github.com/lorenwest/node-config)
to load configuration files. You can use the environment variable `NODE_CONFIG`
to override the configuration directly, or set `NODE_CONFIG_DIR` to specify
from where Arkivo should load additional configuration files.

By default Arkivo will look for a `config` folder in your current working
directory, i.e., the directory where you started the Arkivo process; in your
config folder you can place configuration files for different Node environments.

To see which configuration options are available, consult the
[default configuration](https://github.com/inukshuk/arkivo/blob/master/config/default.json).

Plugins
-------
Each Arkivo subscription defines a list of plugins to which all synchronized
data from Zotero will be passed. The list of available plugins is managed
via the `arkivo.plugins` configuration option.

For plugins installed via NPM, simply add the plugin's package name to the
list; for local plugins you need to specify the full path to the file exposing
you plugin description. For example, the following configuration would enable
the `arkivo-kindle` plugin (installed via NPM) and a local plugin:

    {
      "arkivo": {
        "plugins": ["arkivo-kindle", "/opt/arkivo/plugins/libnotify.js"]
      }
    }

