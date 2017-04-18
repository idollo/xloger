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
,	jsonfile = require("jsonfile")
;


// 全局变量
var	sformat = global.sformat = require("./server/lib/string-format")
,	config = global.config = jsonfile.readFileSync( path.join(__dirname, "./runtime.json"))
,	io = global.io = require("socket.io")()
,	websocket = global.websocket = require("./server/routes/websocket")
,   router = require("./server/routes")
;

require('console-stamp')(console, {
	pattern: 'dd/mm/yyyy HH:MM:ss.l',
	level: config.logLevel || "log"
});

// APP 挂件
// ---------

app.use(bodyParser.json());
// parse application/x-www-form-urlencoded 
app.use(bodyParser.urlencoded({ extended: true }));
// override with the X-HTTP-Method-Override header in the request 
app.use( methodOverride('X-HTTP-Method-Override') );
app.use( cookieParser() );

app.set("trust proxy", true);

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
io.listen(server);
io.gather = {
	threads:{}
};

io.use(websocket.handshake);
// When someone connects to the websocket. Includes all the SocketIO events.
io.sockets.on('connection', websocket.connect);

module.exports = app;