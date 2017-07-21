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
,	NodeCache = require( "node-cache" )
;
    
// 全局变量
var	sformat = global.sformat = require("./server/lib/string-format")
,	ncache = global.ncache = new NodeCache()
,	config = global.config || require('./server/lib/configloader').load()
;

global.config = config;

var	websocket = global.websocket = require("./server/routes/websocket")
;


// 清除重置nodecache
ncache.flushAll();

require('console-stamp')(console, {
	pattern: 'dd/mm/yyyy HH:MM:ss.l',
	level: config.logLevel || "log"
});

// 创建socket接口, 订阅socket消息通道
global.socket = require("./server/routes/socket");
global.socket.subscribe();


// 设置视图目录
app.set('views', __dirname + '/server/views');
// 设置模板引擎
var vash = require("vash");
vash.config.modelName  = "t";
vash.config.debug = true;
// 模板文件后缀使用.html
app.engine(".html", vash.__express );
app.set('view engine', 'html');

app.set("trust proxy", true);

// APP 挂件
// ---------
// 设置表态目录
// static 为关键字, 故使用 express['static']
app.use( express.static( __dirname + '/server/public') );

// parse application/x-www-form-urlencoded 
app.use(bodyParser.urlencoded({ extended: false }))
 
// parse application/json 
app.use(bodyParser.json());
 
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

app.get("/", router.watcher);

app.get("/clientip", router.clientip);

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
	console.log('XLoger Web Monitor listening at http://%s:%s', host, port);
}])
var server = app.listen.apply(app, listen_args)


// globals
io  = require("socket.io").listen(server);
io.gather = {
	threads:{}
};

// When someone connects to the websocket. Includes all the SocketIO events.
io.sockets.on('connection', websocket.SocketOnConnection);

module.exports = app;