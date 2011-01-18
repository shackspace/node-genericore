# node-genericore

This package contains an utility library for
[Genericore](https://shackspace.de/wiki/doku.php?id=project:genericore)
modules written for [node](http://nodejs.org/).

*Please note that this is early development software
 that lacks proper documentation, tests, and a lot of useful or even necessary features.*

## System requirements

- [node](http://nodejs.org/) v0.2.5 or compatible
- [node-amqp](https://github.com/ry/node-amqp) v0.0.2 or compatible

## API documentation

### genericore.connect(config, callbacks)

Connect to Genericore (using AMQP).
Possible config object properties:

* ``connection``:
  The options object of [node-amqp](https://github.com/ry/node-amqp)'s
  ``amqp.createConnection()``

* ``reconnect_timeout``:
  If set to a number then trigger a reconnect that number of milliseconds
  after a connection error occured.

* ``input``:
  If set to an AMQP exchange name then subscribe to that exchange
  (using an auto-generated, exclusive queue).

* ``output``:
  If set to an AMQP exchange name then publish to that exchange
  (using type = fanout).


Possible callbacks object properties
(if any of the properties is undefined when the event occurs,
then the default (*no op* if not specified else) gets called.
I. e. callbacks may be modified at any time):


* ``ready``:
  Called when the ``output`` exchange was opened successfully with an
  object parameter with following properties:

  * ``publish``:
    A function taking a single string parameter to publish to the
    ``output`` exchange.
    Undefined if no ``input`` exchange was named.
  * ``end``:
    A function taking no parameters to shutdown the connection to Genericore.

* ``message``:
  Called when a message gets published at the ``input`` exchange
  with the message as a string parameter.

* ``end``:
  Called when the connection to Genericore is closed.

* ``error``:
  (default: *reconnect* or, if ``reconnect_timeout`` is not set, *throw error*)
  Called when a connection error occurs.

* ``debug``:
  Called when a debug message occurs.
  Defaults to ``console.log``.

