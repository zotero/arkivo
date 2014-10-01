'user strict';

var properties = Object.defineProperties;

/** @module arkivo */

/**
 * @class Range
 * @extends Array
 */
function Range(total, start, limit) {
  this.total = total || 0;
  this.start = start || 0;
  this.limit = limit || null;
}

properties(Range.prototype, {
  valid: {
    get: function () {
      if (isNaN(this.total) || this.total < 0) return false;
      if (isNaN(this.start)) return false;

      return true;
    }
  }
});

// --- Exports ---
module.exports = Range;
