'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var net = require('net');
var Parser = require("redis-parser");

/**
 * establishes an open socket to the Tile38 server for live geofences
 */

var LiveGeofence = function () {
    function LiveGeofence() {
        var debug = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

        _classCallCheck(this, LiveGeofence);

        this.debug = debug;
    }

    /**
     * opens a socket to the server, submits a command, then continuously processes data that is returned
     * from the Tile38 server
     * @param host
     * @param port
     * @param password
     * @param command Command string to send to Tile38
     * @param callback callback method with parameters (err, results)
     */


    _createClass(LiveGeofence, [{
        key: 'open',
        value: function open(host, port, password, command, callback) {
            var _this = this;

            var socket = new net.Socket();
            this.socket = socket;
            socket.connect(port, host, function () {
                if (password) {
                    // authenticate if necessary
                    socket.write('AUTH ' + password + '\r\n');
                }
                socket.write(command + "\r\n");
            });

            var self = this;
            socket.on('close', function () {
                //console.log("Socket is being closed!");
                if (_this.onCloseCb) _this.onCloseCb();
            });

            var parser = new Parser({
                returnReply: function returnReply(reply) {
                    if (self.debug) console.log(reply);
                    if (reply == 'OK') return; // we're not invoking a callback for the 'OK' response that comes first

                    var response = reply;
                    var f = reply.charAt(0);
                    if (f == '{' || f == '[') {
                        // this smells like json, so try to parse it
                        try {
                            response = JSON.parse(reply);
                        } catch (err) {
                            console.warn("Unable to parse server response: " + reply);
                            // we'll return the reply as-is.
                        }
                    }
                    callback(null, response);
                },
                returnError: function returnError(err) {
                    console.error('live socket error: ' + err);
                    callback(err, null);
                },
                returnFatalError: function returnFatalError(err) {
                    console.error('fatal live socket error: ' + err);
                    self.socket.destroy();
                    callback(err, null);
                }
            });

            socket.on('data', function (buffer) {
                //console.log(JSON.stringify(buffer.toString()));
                parser.execute(buffer);
            });
            return this;
        }

        // allows clients to register an 'on closed' handler to be notified if the socket unexpectedly gets closed

    }, {
        key: 'onClose',
        value: function onClose(callback) {
            this.onCloseCb = callback;
        }

        // Forces the geofence to be closed

    }, {
        key: 'close',
        value: function close() {
            if (this.socket) this.socket.destroy();
        }
    }]);

    return LiveGeofence;
}();

module.exports = LiveGeofence;