
var amqp = require('amqp');
var inspect = require('sys').inspect;
var nop = function () {};

// Return keys of an object as array.
var keys = function (object) {
  var keys = [];
  for (key in object) {
    if (object.hasOwnProperty(key)) {
      keys.push(key);
    };
  };
  return keys;
};

var connect = function (config, callbacks) {

  var log_debug = function (message) {
    (callbacks.debug || nop)(message);
  };

  // 'reconnect()' is 'connect()' initially.
  (function reconnect () {
    var connection = amqp.createConnection(config.connection);

    if (config.debug_connection_events === true) {
      [
        'connect', 'secure', 'data', 'end', 'timeout', 'drain', 'close',
        'error'
      ].forEach(function (event) {
        connection.on(event, function () {
          log_debug('event ' + inspect(event) + ' ' + inspect(arguments));
        });
      });
    }

    var capabilities = {
      end: function () {
        connection.end();
      }
    };
    connection.on('close', function (has_error) {
      (callbacks.end || nop)(has_error);
    });

    var ready_debit = 0;
    var ready = function () {
      if (--ready_debit === 0) {
        log_debug('ready, capabilities: ' + inspect(keys(capabilities)));
        (callbacks.ready || nop)(capabilities);
      }
    };

    connection.on('ready', function () {
      log_debug(
        'connected to '
        + connection.serverProperties.product
        + ' ' + connection.serverProperties.version
        + ' ' + connection.serverProperties.platform
      );
    });

    if (config.input) {
      ++ready_debit;
      connection.on('ready', function () {
        var name = config.input;
        var options = { exclusive: true };
        log_debug('input exchange: ' + inspect(name) + ' ' + inspect(options));
        var queue = connection.queue('', options,
            function (messageCount, consumerCount) {
          //log_debug('queue: ' + inspect(queue));
          //log_debug('messageCount: ' + messageCount);
          //log_debug('consumerCount: ' + consumerCount);
          //log_debug('bind ' + inspect(name));
          queue.bind(name, '').addCallback(function () {
            queue.subscribe(function (message) {
              (callbacks.message || nop)(message.data);
            });
            ready();
          });
        });
      });
    }

    if (config.output) {
      ++ready_debit;
      connection.on('ready', function () {
        var name = config.output;
        var options = { type: 'fanout' };
        log_debug('output exchange: ' + inspect(name) + ' ' + inspect(options));
        var exchange = connection.exchange(name, options);
        exchange.on('open', function () {
          capabilities.publish = function(message) {
            message = String(message);
            log_debug('publish ' + inspect(message));
            exchange.publish(name, message);
          };
          ready();
        });
      });
    }

    // Call ready() even if neither setup of input nor output was requested.
    if (ready_debit === 0) {
      ++ready_debit;
      connection.on('ready', ready);
    }

    connection.on('error', function (err) {
      if (config.reconnect_timeout) {
        log_debug(err + '; retrying in ' + config.reconnect_timeout + 'ms');
        // TODO only retry on ETIMEDOUT?
        // TODO do we have to clean up something here?
        setTimeout(reconnect, config.reconnect_timeout);
      }
      (callbacks.error || nop)(err);

      if (!config.reconnect_timeout || !callbacks.error) {
        // No one cares about us?  Well, node will...
        throw new Error(err.message);
      }
    });
  })();
};

exports.connect = connect;

