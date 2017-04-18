/*!
 * 服务启动脚本
 */

var express	= require("express")
,   app 	= express()
,	path	= require('path')
,   util	= require("util")
,	bodyParser = require("body-parser")
,	methodOverride = require('method-override')
,   errorhandler = require('errorhandler')
,	cookieParser = require("cookie-parser")
    // 解释表单数据
,   multipart = require("connect-multiparty")
,	session = require("express-session")
,   router = require("./server/routes")
,	jsonfile = require("jsonfile")
;
    
// 全局变量
var	sformat = global.sformat = require("./server/lib/string-format")
,	config = global.config = jsonfile.readFileSync( path.join(__dirname, "./runtime.json"))
,	websocket = global.websocket = require("./server/routes/websocket")
;

require('console-stamp')(console, {
	pattern: 'dd/mm/yyyy HH:MM:ss.l',
	level: config.logLevel || "log"
});

// APP 挂件
// ---------

// parse application/x-www-form-urlencoded 
app.use(bodyParser.urlencoded({ extended: false }))
 
// override with the X-HTTP-Method-Override header in the request 
app.use( methodOverride('X-HTTP-Method-Override') );
app.use( cookieParser() );



app.use(session({
	resave: false,
	secret:'keyboard cat',
	saveUninitialized: false,
	cookie: { secure: true },
	name: 'esid'
}));

app.use(errorhandler({ dumpExceptions: true, showStack: true }));

app.get("/", router.index);
app.post("/push", router.push);

var listen_args = config.listen;
switch(({}).toString.apply(listen_args)){
	case "[object Array]":
		break;
	case "[object String]":
		var m = /(.*?)\:(\d+)$/.exec(bind);
		if(m){
			listen_args = [m[2], m[1]];
			break;
		}
	default:
		listen_args = [listen_args];
}

listen_args = listen_args.concat([function(){
	var host = server.address().address
	var port = server.address().port
	console.log('webjet listening at http://%s:%s', host, port);
}])
var server = app.listen.apply(app, listen_args)


// globals
var io  = global.io = require("socket.io").listen(server);
io.gather = {
	threads:{}
};

io.set('authorization', websocket.handshake);
// When someone connects to the websocket. Includes all the SocketIO events.
io.sockets.on('connection', websocket.connect);

module.exports = app;