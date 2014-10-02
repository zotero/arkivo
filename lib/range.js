'user strict';

var properties = Object.defineProperties;


/** @module arkivo */

/**
 * @class Range
 */
function Range(options, to) {

  switch (arguments.length) {
  case 0:
    options = {};
    break;

  case 1:
    if (Array.isArray(options))
      options = { from: options[0], to: options[1] };

    else if (typeof options !== 'object')
      options = { from: options };

    break;

  default:
    options = { from: options, to: to };
  }

  if (!(this instanceof Range))
    return Range.parse(options);

  this.parse(options);

  assert(this.valid);
}

Range.parse = function (range) {
  if (range instanceof Range)
    return range;

  return new Range(range);
};

Range.prototype.parse = function (options) {
  var k;

  this.reset();

  if (options.hasOwnProperty('total'))
    this.total = integer(options.total);

  if (options.hasOwnProperty('start')) {
    k = integer(options.start);

    assert(k >= 0);

    this.from = k;
  }

  if (options.hasOwnProperty('from'))
    this.from = integer(options.from);

  if (options.hasOwnProperty('limit')) {
    k = integer(options.limit);

    assert(k >= 0);

    this.to = (this.from < 0) ?
      this.from - k : this.from + k;
  }

  if (options.hasOwnProperty('to'))
    this.to = integer(options.to);

  return this;
};

Range.prototype.reset = function () {
  this.from =  0;
  this.to   = -1;

  delete this.total;

  return this;
};

Range.prototype.next = function () {
};

Range.prototype.previous = function () {
};

Range.prototype.first = function () {
};

Range.prototype.last = function () {
};

properties(Range.prototype, {
  valid: {
    get: function () {

      if (isNaN(this.from)) return false;
      if (isNaN(this.to))   return false;

      if (this.to   < 0 && this.from < this.to) return false;
      if (this.from > 0 && this.from > this.to) return false;

      if (this.finite) {
        if (isNaN(this.total)) return false;

        if (this.total < 0) return false;
        if (this.limit < 0) return false;
        if (this.start < 0) return false;

        if (this.start > this.total) return false;
      }

      return true;
    }
  },

  start: {
    get: function () {
      return (this.from >= 0 || !this.finite) ?
        this.from :
        this.from + this.total;
    }
  },

  limit: {
    get: function () {
      var limit = this.from - this.to;

      if (!this.finite && limit < 0)
        return undefined;

      return Math.abs(limit);
    }
  },

  params: {
    get: function () {
      var params = { start: this.start };
      var limit = this.limit;

      if (limit != null) params.limit = limit;

      return params;
    }
  },

  current: {
  },

  pages: {
  },

  finite: {
    get: function () { return this.total != null; }
  },

  done: {
    get: function () {
      return this.to === -1 || this.finite && this.to >= this.total;
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

function integer(input) {
  var number = parseInt(input, 10);

  refute(isNaN(number), 'not a number: ' + input);

  return number;
}

// --- Exports ---
module.exports = Range;
