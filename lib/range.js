'use strict';

var properties = Object.defineProperties;


/** @module arkivo */

/**
 * Represents a range in a sequence. The main purpose
 * of this class is to convert between a start/limit
 * and a from/to range notation.
 *
 * Ranges can be constructed by passing the `start`,
 * `limit`, and `total` (for finite ranges) parameters
 * as arguments to the constructor. Alternatively,
 * you can pass an `options` object containing these
 * values as properties as a single argument.
 *
 * @class Range
 *
 * @param {Object|Number} [options] The options object;
 *   or the start parameter (defaults to 0).
 * @param {Number} [limit] The range's page size.
 * @param {Number} [total] The total number of items.
 *
 * @returns {Range} The range.
 */
function Range(options, limit, total) {

  switch (arguments.length) {
  case 0:
    options = {};
    break;

  case 1:
    if (Array.isArray(options))
      options = { start: options[0], limit: options[1], total: options[2] };

    else if (typeof options !== 'object')
      options = { start: options };

    break;

  default:
    options = { start: options, limit: limit, total: total };
  }

  this.parse(options);
}

Range.parse = function (range) {
  if (!(range instanceof Range))
    range = new Range(range);

  assert(range.valid);

  return range;
};

Range.prototype.parse = function (options) {
  this.reset();

  if (options.total != null)
    this.total = integer(options.total, true);

  if (options.start != null)
    this.start = integer(options.start);

  if (options.limit != null)
    this.limit = integer(options.limit, true);

  return this;
};

Range.prototype.reset = function () {
  this.start =  0;
  delete this.limit;

  return this;
};


/**
 * Returns the first page. If the current range
 * is already the first page, returns this instance.
 *
 * @return {Range|this} The first page.
 */
Range.prototype.first = function () {
  if (this.start === 0) return this;

  return new Range(0, this.limit, this.total);
};

/**
 * Returns the last page. If the current range
 * is already the last page, returns this instance.
 *
 * @return {Range|this} The last page.
 */
Range.prototype.last = function () {
  if (this.done) return this;

  if (!this.finite)
    return new Range(-this.limit, this.limit);

  return new Range(this.total - this.limit, this.limit, this.total);
};

Range.prototype.next = function () {
  if (this.done) return null;

  return new Range(this.to + 1, this.limit, this.total);
};

Range.prototype.previous = function () {
  if (this.open) return null;

  var from = this.from;
  if (from === 0) return null;

  from = (from < 0) ?
    from - this.limit : Math.max(0, from - this.limit);

  return new Range(from, this.limit, this.total);
};

Range.prototype.prev = Range.prototype.previous;

properties(Range.prototype, {
  valid: {
    get: function () {

      if (isNaN(this.start)) return false;

      if (!this.open) {
        if (isNaN(this.limit) || this.limit < 0) return false;
      }

      if (this.finite) {
        if (isNaN(this.total)) return false;

        if (this.total < 0) return false;
        if (this.start > this.total) return false;
      }

      return true;
    }
  },

  from: {
    get: function () {
      return (this.start >= 0 || !this.finite) ?
        this.start :
        this.start + this.total;
    }
  },

  to: {
    get: function () {
      if (this.open)
        return this.finite ? this.total - 1 : -1;

      var to = this.from + (this.limit - 1);
      return this.finite ? Math.min(this.total - 1, to) : to;
    }
  },

  query: {
    get: function () {
      return this.open ?
        { start: this.start } :
        { start: this.start, limit: this.limit };
    }
  },

  bounds: {
    get: function () { return [this.from, this.to]; }
  },

  finite: {
    get: function () { return this.total != null; }
  },

  open: {
    get: function () { return this.limit == null; }
  },

  done: {
    get: function () {
      return this.open || this.finite && this.to >= (this.total - 1);
    }
  }
});


// --- Private Helpers ---

function assert(condition, message) {
  if (!condition)
    throw new RangeError(message || 'invalid range');

  return true;
}

function refute(condition, message) {
  return assert(!condition, message);
}

function integer(input, positive) {
  var number = parseInt(input, 10);

  refute(isNaN(number), 'not a number: ' + input);

  if (positive)
    assert(number >= 0, 'not positive: ' + input);

  return number;
}

// --- Exports ---
module.exports = Range;
