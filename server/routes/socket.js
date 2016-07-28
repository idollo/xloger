"use strict";
const readline = require('readline');
const Stream = require('stream');
var  uuid = require('node-uuid');

class SocketReader extends Stream.Readable {
	_read(size) {
    	this.push('')
  	}
}


function writeSocket(socket, data, callback){
	socket.write( JSON.stringify(data)+"\n", "utf-8", callback );
}


function threadCheckin(socket, data){
	writeSocket(socket, {name:"hello"});
}

function serverRegister(){
	
}

// 消息调度
function messageDispatcher(socket, message){
	var action = message.action
	,	data = message.data || {};
	if(!action) return;
	switch(action.toLowerCase()){
		case "checkin":
			return threadCheckin(socket, data);
		case "register":
			return serverRegister(socket, data);
		case "trace":
		default:
			return;
	}
}

// 缓存sockets连接
var socketQueue = [];
var sockets = {};


function unisockid(){
	var sockid = uuid.v4();
	if(sockets[sockid]) return unisockid();
	return sockid;
}

// 缓存socket
function cachesocket(socket, sockid){
	if(socketQueue.length > 10000){ // 最大缓存1万个socket
		var rmid = socketQueue.shift();
		delete sockets[rmid];
	}
	sockets[sockid] = socket;
	socketQueue.push(sockid);
}

// 移除socket缓存
function rmsocket(sockid){
	var index = socketQueue.indexOf(sockid);
	if(index>=0){
		socketQueue.splice(index, 1);
	}
	delete sockets[sockid];
}

// 订阅socket通道
function subscribe(){
	// 创建一个TCP服务器实例，调用listen函数开始监听指定端口
	// 传入net.createServer()的回调函数将作为”connection“事件的处理函数
	// 在每一个“connection”事件中，该回调函数接收到的socket对象是唯一的
	var net = require("net");
	net.createServer(function(socket) {
	    var stream = new SocketReader;
	    // socket id 标记
	    var sockid = unisockid();
	    // 缓存socket
	    cachesocket(socket, sockid);

	    stream.on("error", function(err){
	    	console.log(err)
	    });
	    var rl = readline.createInterface({ input: stream });
	    rl.on("line", function(buffer){
	    	try{
				var message = JSON.parse(buffer.toString());
				messageDispatcher(socket, message);
			}catch(e){
				console.log(e);
			}
	    });
	    // 为这个socket实例添加一个"data"事件处理函数
	    socket.on('data', function(buffer) {
	    	stream.push(buffer);
	    });
	    // 为这个socket实例添加一个"close"事件处理函数
	    socket.on('close', function(data) {
	    	rmsocket(sockid);
	    });

	}).listen(global.config.socketPort, "0.0.0.0");
}


module.exports.subscribe = subscribe;
module.exports.socketMessage = function(sockid, msgstr){
	var socket = sockets[sockid];
	if(socket){
		sockets[sockid].write(msgstr);
	}
};