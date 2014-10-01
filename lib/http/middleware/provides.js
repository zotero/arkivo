'use strict';

/**
 * Specifies that the route provides `type`.
 *
 * See:
 * https://github.com/LearnBoost/kue/blob/master/lib/http/middleware/provides.js
 *
 * @param {string} type
 * @returns {Function}
 *
 * @private
 */
function provides(type) {
  return function (req, _, next) {
    if (req.accepts(type)) return next();
    next('route');
  };
}

// --- Exports ---
module.exports = provides;
