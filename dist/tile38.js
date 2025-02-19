"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// const Redis = require('ioredis');
var redis = require("redis");
var Query = require("./tile38_query");
var LiveGeofence = require("./live_geofence");

var DEFAULT_HASH_PRECISION = 6;

var Tile38 = function () {
  function Tile38() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        port = _ref.port,
        host = _ref.host,
        password = _ref.password,
        _ref$debug = _ref.debug,
        debug = _ref$debug === undefined ? false : _ref$debug;

    _classCallCheck(this, Tile38);

    this.port = port ? port : process.env.TILE38_PORT || 9851;
    this.host = host ? host : process.env.TILE38_HOST || "localhost";
    this.password = password ? password : process.env.TILE38_PASSWD;

    var conn = { port: this.port, host: this.host };
    if (this.password) {
      conn.password = this.password;
    }
    this.client = redis.createClient(conn);
    this.client.on("error", function (err) {
      console.error("Tile38 connection error: " + err);
    });
    // put the OUTPUT in json mode
    this.sendCommand("OUTPUT", null, "json");
    this.debug = debug;
  }

  /*
   * send a command with optional arguments to the Redis driver, and return the response in a Promise.
   * If returnProp is set, it will assume that the response is a JSON string, then parse and return
   * the given property from that string.
   */


  _createClass(Tile38, [{
    key: "sendCommand",
    value: function sendCommand(cmd, returnProp, args) {
      var _this = this;

      // make args an array if it's not already one
      if (!args) {
        args = [];
      } else if (!Array.isArray(args)) {
        args = [args];
      }
      return new Promise(function (resolve, reject) {
        if (_this.debug) {
          console.log("sending command \"" + cmd + " " + args.join(" ") + "\"");
        }
        _this.client.send_command(cmd, args, function (err, result) {
          if (err) {
            if (_this.debug) console.log(err);
            reject(err);
          } else {
            if (_this.debug) console.log(result);
            try {
              if (!returnProp) {
                // return the raw response
                resolve(result);
              } else {
                var res = JSON.parse(result);
                if (!res.ok) {
                  if (res.err) {
                    reject(res.err);
                  } else {
                    reject("unexpected response: " + result);
                  }
                } else {
                  if (returnProp == 1) {
                    // 1 has a special meaning. Return the entire response minus
                    // 'ok' and 'elapsed' properties
                    delete res.ok;
                    delete res.elapsed;
                    resolve(res);
                  } else {
                    resolve(res[returnProp]);
                  }
                }
              }
            } catch (error) {
              reject("unable to parse response: " + result);
            }
          }
        });
      });
    }

    // calls the PING command and returns a promise to the expected PONG response

  }, {
    key: "ping",
    value: function ping() {
      return this.sendCommand("PING", "ping");
    }
  }, {
    key: "quit",
    value: function quit() {
      return this.sendCommand("QUIT");
    }
  }, {
    key: "server",
    value: function server() {
      return this.sendCommand("SERVER", "stats");
    }

    // force the garbage collector

  }, {
    key: "gc",
    value: function gc() {
      return this.sendCommand("GC", "ok");
    }
  }, {
    key: "configGet",
    value: function configGet(prop) {
      return this.sendCommand("CONFIG GET", "properties", prop);
    }

    // sets a configuration value in the database. Will return true if successful.
    // Note that the value does not get persisted until configRewrite is called.

  }, {
    key: "configSet",
    value: function configSet(prop, value) {
      return this.sendCommand("CONFIG SET", "ok", [prop, value]);
    }

    // persists changes made by configSet command. Will return true if successful

  }, {
    key: "configRewrite",
    value: function configRewrite() {
      return this.sendCommand("CONFIG REWRITE", "ok");
    }

    // flushes all data from the db. Will return true value if successful

  }, {
    key: "flushdb",
    value: function flushdb() {
      return this.sendCommand("FLUSHDB", "ok");
    }

    // turns on or off readonly mode. (Pass true value to turn on)

  }, {
    key: "readOnly",
    value: function readOnly(val) {
      return this.sendCommand("READONLY", "ok", val ? "yes" : "no");
    }

    // Returns the minimum bounding rectangle for all objects in a key.

  }, {
    key: "bounds",
    value: function bounds(key) {
      return this.sendCommand("BOUNDS", "bounds", key);
    }

    // Set a timeout on an id.

  }, {
    key: "expire",
    value: function expire(key, id, seconds) {
      return this.sendCommand("EXPIRE", "ok", [key, id, seconds]);
    }

    // Get a timeout on an id

  }, {
    key: "ttl",
    value: function ttl(key, id) {
      return this.sendCommand("TTL", "ttl", [key, id]);
    }
  }, {
    key: "persist",
    value: function persist(key, id) {
      return this.sendCommand("PERSIST", "ok", [key, id]);
    }

    // Returns all keys matching pattern.

  }, {
    key: "keys",
    value: function keys(pattern) {
      return this.sendCommand("KEYS", "keys", pattern);
    }

    // authenticate with server

  }, {
    key: "auth",
    value: function auth(password) {
      return this.sendCommand("AUTH", "ok", password);
    }

    /* obj can be one of the following:
     *   - an array with lat, lng and optional z coordinate, representing a point.
     *   - an array of 4 coordinates, representing a bounding box.
     *   - a string representing a Geohash
     *   - a GeoJson object.
     * fields should be a simple object with key value pairs
     * opts can be used to set additional options, such as:
     *   - expire: 3600          // to set expiration date of object
     *   - onlyIfExists: true    // only set object if the id already exists
     *   - onlyIfNotExists: true // only set object if id does not exist yet
     *   - type: 'string'        // to set string values (otherwise interpreted as geohash)
     * Examples:
     *
     * // set a simple lat/lng coordinate
     * set('fleet', 'truck1', [33.5123, -112.2693])
     * // set with additional fields
     * set('fleet', 'truck1', [33.5123, -112.2693], { field1: 10, field2: 20});
     * // set lat/lon/alt coordinates, and expire in 120 secs
     * set('fleet', 'truck1', [33.5123, -112.2693, 120.0], {}, {expire: 120})
     * // set bounds
     * set('props', 'house1', [33.7840, -112.1520, 33.7848, -112.1512])
     * // set an ID by geohash
     * set('props', 'area1', '9tbnwg')   // assumes HASH by default if only one extra parameter
     * // set a String value
     * set('props', 'area2', 'my string value', {}, {type: 'string'}) # or force to String type
     * // set with geoJson object
     * set('cities', 'tempe', geoJsonObject)
     *
     */

  }, {
    key: "set",
    value: function set(key, id, obj) {
      var fields = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
      var opts = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

      var cmd = [key, id];
      for (var f in fields) {
        cmd = cmd.concat(["FIELD", f, fields[f]]);
      }
      var expire = opts["expire"];
      if (expire > 0) {
        cmd.push("EX");
        cmd.push(expire);
      }
      if (opts["onlyIfNotExists"]) {
        cmd.push("NX");
      }
      if (opts["onlyIfExists"]) {
        cmd.push("XX");
      }
      if (Array.isArray(obj)) {
        // if obj is an array, it must be either POINT or BOUNDS
        if (obj.length < 4) {
          cmd.push("POINT");
          cmd = cmd.concat(obj);
        } else if (obj.length == 4) {
          cmd.push("BOUNDS");
          cmd = cmd.concat(obj);
        } else {
          throw Error("incorrect number of values");
        }
      } else if (typeof obj == "string") {
        // if obj is a string, it must be String or geohash
        if (opts["type"] == "string") {
          cmd.push("STRING");
          cmd.push(obj);
        } else {
          cmd.push("HASH");
          cmd.push(obj);
        }
      } else {
        // must be a Geojson object
        cmd.push("OBJECT");
        cmd.push(JSON.stringify(obj));
      }
      return this.sendCommand("SET", "ok", cmd);
    }

    // convenience method for set() with options.type = 'string'

  }, {
    key: "setString",
    value: function setString(key, id, obj) {
      var fields = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
      var opts = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

      opts.type = "string";
      return this.set(key, id, obj, fields, opts);
    }

    // Set the value for a single field of an id.

  }, {
    key: "fset",
    value: function fset(key, id, field, value) {
      return this.sendCommand("FSET", "ok", [key, id, field, value]);
    }

    // Delete an id from a key

  }, {
    key: "del",
    value: function del(key, id) {
      return this.sendCommand("DEL", "ok", [key, id]);
    }

    // Removes objects that match a specified pattern.

  }, {
    key: "pdel",
    value: function pdel(key, pattern) {
      return this.sendCommand("PDEL", "ok", [key, pattern]);
    }

    //
    /*
     * Get the object of an id. The default output format is a GeoJSON object.
     *
     *   The options hash supports 2 properties:
     *   type: (POINT, BOUNDS, HASH, OBJECT)  the type in which to return the ID. Defaults to OBJECT
     *   withfields:  boolean to indicate whether or not fields should be returned. Defaults to false
     *
     * examples:
     *   get('fleet', 'truck1')                    // returns geojson point
     *   get('fleet', 'truck1', {withfields: true} // include FIELDS
     *   get('fleet', 'truck1', {type: 'POINT'})   // same as above
     *   get('fleet', 'truck1', {type: 'BOUNDS'})  // return bounds
     *   get('fleet', 'truck1', {type: 'HASH 6'}) // return geohash with precision 6
     */

  }, {
    key: "get",
    value: function get(key, id) {
      var _ref2 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
          _ref2$withfields = _ref2.withfields,
          withfields = _ref2$withfields === undefined ? false : _ref2$withfields,
          _ref2$type = _ref2.type,
          type = _ref2$type === undefined ? null : _ref2$type;

      var params = [key, id];
      if (withfields) params.push("WITHFIELDS");
      // TODO: check if startswith HASH and remove separate 'precision' property
      // it could just be passed as 'HASH 6'
      if (type != null && type.startsWith("HASH")) {
        // geohash requested, add precision if set
        params.push("HASH");
        var s = type.split(" ");
        if (s.length > 1 && parseInt(s[1]) > 0) params.push(s[1]);else throw new Error('missing precision. Please set like this: "HASH 6"');
      } else if (type != null) {
        params.push(type);
      }
      return this.sendCommand("GET", 1, params);
    }

    // shortcut for GET method with output POINT

  }, {
    key: "getPoint",
    value: function getPoint(key, id) {
      var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      opts.type = "POINT";
      return this.get(key, id, opts);
    }

    // shortcut for GET method with output BOUNDS

  }, {
    key: "getBounds",
    value: function getBounds(key, id) {
      var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      opts.type = "BOUNDS";
      return this.get(key, id, opts);
    }

    // shortcut for GET method with output HASH

  }, {
    key: "getHash",
    value: function getHash(key, id) {
      var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var precision = opts.precision || DEFAULT_HASH_PRECISION;
      opts.type = "HASH " + precision;
      return this.get(key, id, opts);
    }

    // Remove all objects from specified key.

  }, {
    key: "drop",
    value: function drop(key) {
      return this.sendCommand("DROP", "ok", key);
    }

    // Return stats for one or more keys.

  }, {
    key: "stats",
    value: function stats() {
      for (var _len = arguments.length, keys = Array(_len), _key = 0; _key < _len; _key++) {
        keys[_key] = arguments[_key];
      }

      return this.sendCommand("STATS", "stats", keys);
    }

    // Set a value in a JSON document

  }, {
    key: "jset",
    value: function jset(key, id, jKey, jVal) {
      return this.sendCommand("JSET", "ok", [key, id, jKey, jVal]);
    }

    // Get a value from a json document

  }, {
    key: "jget",
    value: function jget(key, id) {
      var params = [key, id];

      for (var _len2 = arguments.length, other = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
        other[_key2 - 2] = arguments[_key2];
      }

      params = params.concat(other);
      return this.sendCommand("JGET", "value", params);
    }

    // Delete a json value

  }, {
    key: "jdel",
    value: function jdel(key, id, jKey) {
      return this.sendCommand("JDEL", "ok", [key, id, jKey]);
    }

    // returns a Tile38Query object that can be used to further construct an INTERSECTS query

  }, {
    key: "intersectsQuery",
    value: function intersectsQuery(key) {
      return new Query("INTERSECTS", key, this);
    }

    // returns a Tile38Query object that can be used to further construct an SEARCH query

  }, {
    key: "searchQuery",
    value: function searchQuery(key) {
      return new Query("SEARCH", key, this);
    }

    // returns a Tile38Query object that can be used to further construct an NEARBY query

  }, {
    key: "nearbyQuery",
    value: function nearbyQuery(key) {
      return new Query("NEARBY", key, this);
    }

    // returns a Tile38Query object that can be used to further construct an SCAN query

  }, {
    key: "scanQuery",
    value: function scanQuery(key) {
      return new Query("SCAN", key, this);
    }

    // returns a Tile38Query object that can be used to further construct an WITHIN query

  }, {
    key: "withinQuery",
    value: function withinQuery(key) {
      return new Query("WITHIN", key, this);
    }

    // Returns all hooks matching pattern.

  }, {
    key: "hooks",
    value: function hooks(pattern) {
      return this.sendCommand("HOOKS", null, pattern);
    }

    /*
     * name:       webhook name
     * endpoint:   endpoint url for http/grpc/redis etc
     * meta:       object with key/value pairs for meta data
     * searchType: nearby/within/intersects
     * key:        the key to monitor
     * opts:       object for additional options:
     *   command:    del/drop/set
     *   detect:     inside/outside/enter/exit/cross
     *   get:        [key, id]   - to fetch an existing object from given key collection
     *   bounds:     [minlat, minlon, maxlat, maxlon]  - bounds coordinates
     *   object:     geojson object
     *   tile:       [x,y,z] - tile coordinates
     *   quadkey:    quadkey coordinates
     *   hash:       geohash coordinate
     *   radius:     radius/distance to apply
     *
     * command and detect may both exist but only one of the following get/bounds/object/tile/quadkey/hash
     * may be specified at a time.
     *
     * TODO: This command should be rewritten to use the same chaining form that the search commands use.
     */

  }, {
    key: "setHook",
    value: function setHook(name, endpoint, meta, searchType, key, opts) {
      var cmd = [name, endpoint];
      if (meta) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = Object.keys(meta)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var m = _step.value;

            cmd.push("META");
            cmd.push(m);
            cmd.push(meta[m]);
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
      }
      cmd.push(searchType.toUpperCase());
      cmd.push(key);
      cmd.push("FENCE");
      cmd = cmd.concat(processOpts(opts, ["detect", "commands", "get", "point", "bounds", "object", "tile", "quadkey", "hash", "radius", "roam"]));
      return this.sendCommand("SETHOOK", "ok", cmd);
    }

    // Returns all hooks matching pattern

  }, {
    key: "hooks",
    value: function hooks(pattern) {
      return this.sendCommand("HOOKS", "hooks", pattern);
    }

    // Remove a specified hook

  }, {
    key: "delhook",
    value: function delhook(name) {
      return this.sendCommand("DELHOOK", "ok", name);
    }

    // Removes all hooks that match the specified pattern

  }, {
    key: "pdelhook",
    value: function pdelhook(pattern) {
      return this.sendCommand("PDELHOOK", "ok", pattern);
    }

    // opens a live geofence and returns an instance of LiveGeofence (that can be used to later on close it).

  }, {
    key: "openLiveFence",
    value: function openLiveFence(command, commandArr, callback) {
      if (this.debug) {
        console.log("sending live fence command \"" + command + " " + commandArr.join(" ") + "\"");
      }
      var cmd = this.redisEncodeCommand(command, commandArr);
      return new LiveGeofence(this.debug).open(this.host, this.port, this.password, cmd, callback);
    }

    // encodes the tile38_query.commandArr() output to be sent to Redis. This is only necessary for the live geofence,
    // since the sendCommand() function uses the node_redis library, which handles this for us.

  }, {
    key: "redisEncodeCommand",
    value: function redisEncodeCommand(command, arr) {
      // this is a greatly simplified version of the internal_send_command() functionality in
      // https://github.com/NodeRedis/node_redis/blob/master/index.js
      var cmdStr = "*" + (arr.length + 1) + "\r\n$" + command.length + "\r\n" + command + "\r\n";
      var str = void 0;
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = arr[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var c = _step2.value;

          if (typeof c === "string") str = c;else str = c.toString();
          cmdStr += "$" + Buffer.byteLength(str) + "\r\n" + str + "\r\n";
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

      return cmdStr;
    }
  }]);

  return Tile38;
}();

// processes all options that may be used by any of the search commands


var processOpts = function processOpts(opts, names) {
  var cmd = [];
  if (opts === undefined) return cmd; // no options

  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = names[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var name = _step3.value;

      if (!opts[name]) continue; // an option with this name was not passed in.

      switch (name) {
        case "cursor":
          cmd.push("CURSOR");
          cmd.push(opts.cursor);
          break;
        case "limit":
          cmd.push("LIMIT");
          cmd.push(opts.limit);
          break;
        case "sparse":
          cmd.push("SPARSE");
          cmd.push(opts.sparse);
          break;
        case "match":
          cmd.push("MATCH");
          cmd.push(opts.match);
          break;
        case "where":
          var w = opts.where;
          cmd.push("WHERE");
          for (var k in Object.keys(w)) {
            cmd.push(k);
            cmd.push(w[k][0]);
            cmd.push(w[k][1]);
          }
          break;
        case "nofields":
          if (opts.nofields == true) cmd.push("NOFIELDS");
          break;
        case "fence":
          if (opts.fence == true) cmd.push("FENCE");
          break;
        case "detect":
          cmd.push("DETECT");
          cmd.push(opts.detect);
          break;
        case "commands":
          cmd.push("COMMANDS");
          cmd.push(opts.commands); // should be comma separated list
          break;
        case "select":
          // COUNT, IDS, OBJECTS, POINTS, BOUNDS, HASHES
          cmd.push(ops.select.toUpperCase());
          break;
        case "roam":
          // roam: [key, pattern, meters]
          cmd.push("ROAM");
          cmd = cmd.concat(opts.roam);
          break;
        case "order":
          cmd.push(opts.order.toUpperCase());
          break;
      }
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

  return cmd.concat(areaOpts(opts, names));
};

// processes all area options for within/intersects and sethook commands, then
// constructs an array with commands.
var areaOpts = function areaOpts(opts, names) {
  var cmd = [];
  // iterate over all keys in the opts object and process any known options
  var _iteratorNormalCompletion4 = true;
  var _didIteratorError4 = false;
  var _iteratorError4 = undefined;

  try {
    for (var _iterator4 = names[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
      var name = _step4.value;

      if (!opts[name]) continue; // an option with this name was not passed in.

      switch (name) {
        case "point":
          // point: [lat, lon, meters]
          cmd.push("POINT");
          cmd = cmd.concat(opts.point);
          break;
        case "get":
          // passed like this:  'get: [key,id]'
          cmd.push("GET");
          cmd.push(opts.get[0]);
          cmd.push(opts.get[1]);
          break;
        case "bounds":
          // bounds: [minlat, minlon, maxlat, maxlon]
          cmd.push("BOUNDS");
          cmd.push(opts.bounds[0]);
          cmd.push(opts.bounds[1]);
          cmd.push(opts.bounds[2]);
          cmd.push(opts.bounds[3]);
          break;
        case "object":
          // geojson object
          cmd.push("OBJECT");
          cmd.push(JSON.stringify(opts.object));
          break;
        case "tile":
          cmd.push("TILE");
          cmd.push(opts.tile[0]);
          cmd.push(opts.tile[1]);
          cmd.push(opts.tile[2]);
          break;
        case "quadkey":
          cmd.push("QUADKEY");
          cmd.push(opts.quadkey);
          break;
        case "hash":
          cmd.push("HASH");
          cmd.push(opts.hash);
          break;
        case "radius":
          // radius, used ie with POINT or geohash
          cmd.push(opts.radius);
          break;
      }
    }
  } catch (err) {
    _didIteratorError4 = true;
    _iteratorError4 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion4 && _iterator4.return) {
        _iterator4.return();
      }
    } finally {
      if (_didIteratorError4) {
        throw _iteratorError4;
      }
    }
  }

  return cmd;
};

module.exports = Tile38;