var defaultOptions = {
  url: 'http://localhost:8080/now',
  use_tcp: false
}

// if node
var util = require('./util');
var BridgeSerialize = require('./bridgeserialize.js');
var createTCPConn = require('./tcp').createTCPConn
var Connection = require('./connection');
var defaultOptions = {
  host: 'localhost',
  port: 8090,
  use_tcp: true
}
// end node


function WebConnection(onReady, onMessage, options) {
  var self = this;

  this.onMessage = onMessage;
  
  // Merge passed in options into default options
  this.options = util.extend(defaultOptions, options);

  if (this.options.use_tcp) {
    console.log('TCP CONN', this.options.host, this.options.port);
    this.sock = createTCPConn(this.options);
  } else {
    this.sock = new SockJS(this.options.url, this.options.protocols, this.options.sockjs); 
  }
  this.sock.onopen = function() {
    self.clientId = self.sock._connid;
    console.log("CLIENT ID:", self.clientId);
    onReady();
  };
  this.sock.onmessage = self.onData.bind(self);
  this.sock.onclose = function() {
    util.warn("WebConnection closed");
  };
}

util.inherit(WebConnection, Connection);

WebConnection.prototype.onData = function(message) {
  var self = this;
  try {
    util.info('hi', message, message.data);
    var message = util.parse(message.data);    
    self.onMessage(message);
  } catch (e) {
    util.error("Message parsing failed: ", e.message, e.stack);
  }
}

WebConnection.prototype.send = function(bridgeobj, message) {
  // Adding links that need to be established to headers
  // var headers = {};
  // for (x in links) {
  //   headers['link_' + x] = links[x];
  // }
  // Push message
  // this.sock.send(util.stringify({message: message, routingKey: routingKey, headers: headers}));
  var msg = BridgeSerialize.serialize(bridgeobj, {command: 'SEND', data: message});
  msg = util.stringify(msg);
  this.sock.send( msg );
}

WebConnection.prototype.joinWorkerPool = function(bridgeobj, name, callback) {
  util.info('Joining worker pool', name, callback);
  var msg = {command: 'JOINWORKERPOOL', data: {name: name, handler: bridgeobj.getRootRef(), callback: callback} };
  msg = BridgeSerialize.serialize(bridgeobj, msg);
  msg = util.stringify(msg);
  // util.info('msg', msg);
  this.sock.send(msg);
}

WebConnection.prototype.joinChannel = function(nowobj, name, clientId, handler, callback) {
  // Adding other client is not supported
  var msg = {command: 'JOINCHANNEL', data: {name: name, handler: handler, callback: callback} };
  msg = BridgeSerialize.serialize(nowobj, msg);
  msg = util.stringify(msg);
  // util.info('msg', msg);
  this.sock.send(msg);
}

var BridgeConnection = WebConnection;

// if node
exports.BridgeConnection = BridgeConnection;
// end node