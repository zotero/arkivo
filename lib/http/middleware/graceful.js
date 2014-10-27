'use strict';

/**
 * Middleware to close keep-alive connections
 * gracefully.
 *
 * @returns {Function}
 * @private
 */
function graceful() {
  function shutdown(req, res, next) {
    if (!shutdown.inprogress) return next();

    res.set({
      'Connection': 'close'
    });

    res.send(502);
  }

  shutdown.inprogress = false;

  return shutdown;
}

// --- Exports ---
module.exports = graceful;
