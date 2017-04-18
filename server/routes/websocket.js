

var cookie = require("cookie")
,   request = require('request')
,   session = require("express-session")
,   fs = require('fs')
,   os = require('os')
,   path = require('path')
,   moment = require('moment')
,   extend = require('util')._extend
,   config = global.config
,   io = global.io
;

var sockets = {};

exports.handshake = function(handshake, accept){
    var headers = handshake.headers
    ,   host = headers.host
    ,   cookie = headers.cookie||""
    ;

    if(!host || !cookie) accept('Authentication Failed.', false);

    var auth_url = config.auth_map[host] || config.auth_url;
    var options = {
        url: 'http://{#0}{#1}'.format(host, auth_url),
        headers: {
            "User-Agent": "Webjet Auth",
            "Cookie": cookie
        }
    };
    request(options, function(error, response, body){
        if(!error){
            var accepted = (response.headers['jet-accepted']||"null").toLowerCase()=="true"
            ,   jetid = response.headers['jet-id'] || null
            ,   channel = response.headers['jet-channel'] || null
            ;
            console.log(accepted, jetid, channel);
            if(accepted && jetid){
                handshake.authData = body;
                handshake.jetid = jetid;
                handshake.channel = channel;
                return accept(null, true)
            }
        }
        accept('Authentication Failed.', false)
    });
  
};


/**
 * All socket IO events that can be emitted by the client
 * @param {[type]} socket [description]
 */
exports.connect = function(socket) {

    console.log("connected:"+socket.id);

	var handshake = socket.handshake;

    // parse cookies
    handshake.cookies = cookie.parse(handshake.headers.cookie||"");
    var jetid = handshake.jetid
    ,   host = handshake.headers.host
    ,   channel = handshake.channel || config.channel_map[host] || host
    ;

    if(sockets[jetid]){
        try{ sockets[jetid].disconnect(); }
        catch(e){}
    }
    sockets[jetid] = socket;
    socket.join( channel );

    socket.emit('connect', "hello");
    /** 断开来连接 */
    socket.on('disconnect', function () {
        console.log('disconnect');
        delete sockets[jetid];
    });
  
};


exports.emit = function(jetid, action, data){
    var socket = sockets[jetid];
    if(!socket) return false;
    socket.emit(action, data);
}

exports.publish = function(channel, action, data){
    io.to(channel).emit(action, data);
}
