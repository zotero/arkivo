'user strict';

var properties = Object.defineProperties;


/** @module arkivo */

/**
 * @class Range
 */
function Range(options, limit, total) {

  switch (arguments.length) {
  case 0:
    options = {};
    break;

  case 1:
    if (Array.isArray(options))
      options = { start: options[0], limit: options[1] };

    else if (typeof options !== 'object')
      options = { start: options };

    break;

  default:
    options = { start: options, limit: limit, total: total };
  }

  if (!(this instanceof Range))
    return Range.parse(options);

  this.parse(options);
}

Range.parse = function (range) {
  if (range instanceof Range)
    return range;

  return new Range(range);
};

Range.prototype.parse = function (options) {
  this.reset();

  if (options.total != null)
    this.total = integer(options.total, true);

  if (options.start != null)
    this.start = integer(options.start);

  if (options.limit != null)
    this.limit = integer(options.limit, true);

  assert(this.valid);

  return this;
};

Range.prototype.reset = function () {
  this.start =  0;
  delete this.limit;

  return this;
};

Range.prototype.next = function () {
  if (this.done) return null;

  return new Range(++this.to, this.limit, this.total);
};

Range.prototype.previous = function () {
};

Range.prototype.prev = Range.prototype.previous;

Range.prototype.first = function () {
};

Range.prototype.last = function () {
};

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

  current: {
  },

  pages: {
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
