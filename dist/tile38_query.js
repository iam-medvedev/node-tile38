"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// adds elements from arr2 to arr1. If arr1 doesn't exist, it will
// simply return arr2
function addToArray(arr1, arr2) {
  if (arr1) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = arr2[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        a = _step.value;

        arr1.push(a);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    return arr1;
  } else {
    return arr2;
  }
}

var Tile38Query = function () {
  function Tile38Query(type, key, client) {
    _classCallCheck(this, Tile38Query);

    this.type = type;
    this.key = key;
    this.client = client;
    this.options = {};
  }

  _createClass(Tile38Query, [{
    key: "cursor",
    value: function cursor(start) {
      this.options.cursor = ["CURSOR", start];
      return this;
    }
  }, {
    key: "limit",
    value: function limit(count) {
      this.options.limit = ["LIMIT", count];
      return this;
    }
  }, {
    key: "sparse",
    value: function sparse(spread) {
      this.options.sparse = ["SPARSE", spread];
      return this;
    }

    /*
     * set a matching query on the object ID. The value is a glob pattern.
     * Unlike other query methods in this class, match() may be called multiple times
     */

  }, {
    key: "match",
    value: function match(value) {
      var m = ["MATCH", value];
      this.options.matches = addToArray(this.options.matches, m);
      return this;
    }

    // sort order for SCAN query, must be 'asc' or 'desc'

  }, {
    key: "order",
    value: function order(val) {
      this.options.order = val.toUpperCase();
      return this;
    }

    // equivalent of order('asc')

  }, {
    key: "asc",
    value: function asc() {
      return this.order("asc");
    }
    // equivalent of order('desc');

  }, {
    key: "desc",
    value: function desc() {
      return this.order("desc");
    }

    // adds DISTANCE argument for nearby query.

  }, {
    key: "distance",
    value: function distance() {
      this.options.distance = "DISTANCE";
      return this;
    }

    /*
     * set a where search pattern. Like match, this method may be chained multiple times
     * as well. For example:
     * query.where('speed', 70, '+inf').where('age', '-inf', 24)
     */

  }, {
    key: "where",
    value: function where(field) {
      for (var _len = arguments.length, criteria = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        criteria[_key - 1] = arguments[_key];
      }

      var arr = ["WHERE", field].concat(criteria);
      this.options.where = addToArray(this.options.where, arr);
      return this;
    }

    /*
     * set a wherein search pattern. Like match, this method may be chained multiple times
     * as well. For example:
     *   query.wherein('doors', 2, 5).wherein('wheels', 14, 18, 22)
     * Would generate the command:
     *   WHEREIN doors 2 2 5 WHEREIN wheels 3 14 18 22
     * (note that the command to the server includes the argument count, while the
     * js api doesn't need this)
     */

  }, {
    key: "whereIn",
    value: function whereIn(field) {
      for (var _len2 = arguments.length, values = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        values[_key2 - 1] = arguments[_key2];
      }

      var arr = ["WHEREIN", field, values.length].concat(values);
      this.options.whereIn = addToArray(this.options.whereIn, arr);
      return this;
    }
  }, {
    key: "whereEval",
    value: function whereEval(script) {
      for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        args[_key3 - 1] = arguments[_key3];
      }

      var arr = ["WHEREEVAL", "\"" + script + "\"", args.length].concat(args);
      this.options.whereEval = addToArray(this.options.whereEval, arr);
      return this;
    }
  }, {
    key: "whereEvalSha",
    value: function whereEvalSha(sha) {
      for (var _len4 = arguments.length, args = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
        args[_key4 - 1] = arguments[_key4];
      }

      var arr = ["WHEREEVALSHA", sha, args.length].concat(args);
      this.options.whereEvalSha = addToArray(this.options.whereEvalSha, arr);
      return this;
    }

    /*
     * clip intersecting objects
     */

  }, {
    key: "clip",
    value: function clip() {
      this.options.clip = "CLIP";
      return this;
    }

    /*
     * call nofields to exclude field values from search results
     */

  }, {
    key: "nofields",
    value: function nofields() {
      this.options.nofields = "NOFIELDS";
      return this;
    }

    /*
     * sets one or more detect values. For example:
     * query.detect('inside', 'outside');
     *   or
     * query.detect('inside,outside');
     *
     * whichever you prefer
     */

  }, {
    key: "detect",
    value: function detect() {
      for (var _len5 = arguments.length, values = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
        values[_key5] = arguments[_key5];
      }

      this.options.detect = ["DETECT"].concat(values.join(","));
      return this;
    }

    /**
     * sets commands to listen for. Expected values: del, drop and set
     * You may pass these as separate parameters,
     *   query.commands('del', 'drop', 'set');
     *
     * or as a single comma separated parameter
     *   query.commands('del,drop,set');
     */

  }, {
    key: "commands",
    value: function commands() {
      for (var _len6 = arguments.length, values = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
        values[_key6] = arguments[_key6];
      }

      this.options.commands = ["COMMANDS"].concat(values.join(","));
      return this;
    }

    /**
     * set output type. Allowed values:
     * count
     * ids
     * objects
     * points
     * bounds
     * hashes
     *
     * If 'hashes' is used a second parameter should specify the precision, ie
     *   query.output('hashes', 6);
     *
     * Note that all of these types, except for 'bounds' can be called using convenience methods as well,
     * so
     *   objects() instead of output('objects')
     * and
     *   hashes(6) instead of output('hashes', 6)
     *
     */

  }, {
    key: "output",
    value: function output(type, precision) {
      type = type.toUpperCase();
      if (type == "HASHES" && precision != undefined) {
        console.log("setting precision");
        this.options.output = [type, precision];
      } else {
        this.options.output = [type];
      }
      return this;
    }

    // shortcut for .output('ids')

  }, {
    key: "ids",
    value: function ids() {
      return this.output("ids");
    }
    // shortcut for .output('count')

  }, {
    key: "count",
    value: function count() {
      return this.output("count");
    }
    // shortcut for .output('objects')

  }, {
    key: "objects",
    value: function objects() {
      return this.output("objects");
    }
    // shortcut for .output('points')

  }, {
    key: "points",
    value: function points() {
      return this.output("points");
    }
    // shortcut for .output('points')

  }, {
    key: "hashes",
    value: function hashes(precision) {
      return this.output("hashes", precision);
    }

    /**
     * conducts search with an object that's already in the database
     */

  }, {
    key: "getObject",
    value: function getObject(key, id) {
      this.options.getObject = ["GET", key, id];
      return this;
    }

    /**
     * conducts search with bounds coordinates
     */

  }, {
    key: "bounds",
    value: function bounds(minlat, minlon, maxlat, maxlon) {
      this.options.bounds = ["BOUNDS", minlat, minlon, maxlat, maxlon];
      return this;
    }

    /**
     * conducts search with geojson object
     */

  }, {
    key: "object",
    value: function object(geojson) {
      this.options.geojson = ["OBJECT", JSON.stringify(geojson)];
      return this;
    }
  }, {
    key: "tile",
    value: function tile(x, y, z) {
      this.options.tile = ["TILE", x, y, z];
      return this;
    }
  }, {
    key: "quadKey",
    value: function quadKey(key) {
      this.options.quadKey = ["QUADKEY", key];
      return this;
    }
  }, {
    key: "hash",
    value: function hash(geohash) {
      this.options.hash = ["HASH", geohash];
      return this;
    }

    // adds CIRCLE arguments to WITHIN / INTERSECTS queries

  }, {
    key: "circle",
    value: function circle(lat, lon, meters) {
      this.options.circle = ["CIRCLE", lat, lon, meters];
      return this;
    }

    // adds POINT arguments to NEARBY query.

  }, {
    key: "point",
    value: function point(lat, lon, meters) {
      this.options.point = ["POINT", lat, lon];
      if (meters !== undefined) {
        this.options.point.push(meters);
      }
      return this;
    }

    // adds ROAM arguments to NEARBY query

  }, {
    key: "roam",
    value: function roam(key, pattern, meters) {
      // TODO throw error if type != 'NEARBY'
      this.options.roam = ["ROAM", key, pattern, meters];
      return this;
    }

    // return all the commands of the query chain, as a string, the way it will
    // be sent to Tile38

  }, {
    key: "commandStr",
    value: function commandStr() {
      return this.type + " " + this.commandArr().join(" ");
    }

    // constructs the full array for all arguments of the query.

  }, {
    key: "commandArr",
    value: function commandArr() {
      var cmd = [this.key];
      var o = this.options;

      // construct an array of commands in this order
      var commands = ["cursor", "limit", "sparse", "matches", "order", "distance", "where", "whereIn", "whereEval", "whereEvalSha", "clip", "nofields", "fence", "detect", "commands", "output", "getObject", "bounds", "geojson", "tile", "quadKey", "hash", "point", "circle", "roam"];
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = commands[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var c = _step2.value;

          var opt = o[c];
          if (opt !== undefined) {
            if (opt instanceof Array) {
              // array of objects
              var _iteratorNormalCompletion3 = true;
              var _didIteratorError3 = false;
              var _iteratorError3 = undefined;

              try {
                for (var _iterator3 = o[c][Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                  var i = _step3.value;

                  cmd.push(i);
                }
              } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion3 && _iterator3.return) {
                    _iterator3.return();
                  }
                } finally {
                  if (_didIteratorError3) {
                    throw _iteratorError3;
                  }
                }
              }
            } else {
              // simple string
              cmd.push(opt);
            }
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return cmd;
    }

    /**
     * will execute the query and return a Promise to the result.
     * To use the live fence with streaming results, use fence() instead.
     */

  }, {
    key: "execute",
    value: function execute() {
      return this.client.sendCommand(this.type, 1, this.commandArr());
    }

    /**
     * returns streaming results for a live geofence. This function will repeatedly call the specified callback
     * method when results are received.
     * This method returns an instance of LiveGeofence, which can be used to close the fence if necessary by calling
     * its close() method.
     */

  }, {
    key: "executeFence",
    value: function executeFence(callback) {
      this.options.fence = "FENCE";
      return this.client.openLiveFence(this.type, this.commandArr(), callback);
    }

    /*
     * factory method to create a new Tile38Query object for an INTERSECTS search.
     * These factory methods are used in the test suite, but since these don't have
     * access to a Tile38 client object, they cannot be used to actually execute
     * a query on the server.
     * Use the Tile38.intersectsQuery() method instead.
     */

  }], [{
    key: "intersects",
    value: function intersects(key) {
      return new Tile38Query("INTERSECTS", key);
    }

    // Use Tile38.searchQuery() method instead

  }, {
    key: "search",
    value: function search(key) {
      return new Tile38Query("SEARCH", key);
    }

    // Use Tile38.nearbyQuery() method instead

  }, {
    key: "nearby",
    value: function nearby(key) {
      return new Tile38Query("NEARBY", key);
    }

    // Use Tile38.scanQuery() method instead

  }, {
    key: "scan",
    value: function scan(key) {
      return new Tile38Query("SCAN", key);
    }

    // Use Tile38.withinQuery() method instead

  }, {
    key: "within",
    value: function within(key) {
      return new Tile38Query("WITHIN", key);
    }
  }]);

  return Tile38Query;
}();

module.exports = Tile38Query;