'use strict';

/*
 * Creates a request or error logger.
 *
 * @param {string} [type = 'requests']
 *   Whether to log 'requests' or 'errors'.
 *
 * @param {Function} [debug = console.log]
 *
 * @return {Function}
 *
 * @private
 */
function log(type, debug) {
  debug = debug || console.log.bind(console); // eslint-disable-line no-console

  if (type === 'errors')
    return function (e, req, _, next) {
      debug('%s %s failed: %s', req.method, req.path, e.message);
      next(e);
    };

  return function (req, _, next) {
    debug('%s %s', req.method, req.path);
    next();
  };
}

// --- Exports ---
module.exports = log;
