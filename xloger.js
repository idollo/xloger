/*!
 * 服务启动脚本
 */

var express	= require("express")
,   app 	= express()
,   util	= require("util")
,	bodyParser = require("body-parser")
,	methodOverride = require('method-override')
,   errorhandler = require('errorhandler')
,	cookieParser = require("cookie-parser")
,	redis = require("redis")
    // 解释表单数据
,   multipart = require("connect-multiparty")
,	session = require("express-session")
,	RedisStore = require('connect-redis')(session)
,   router = require("./server/routes")
,	jsonfile = require("jsonfile")
;
    
// 全局变量
var	sformat = global.sformat = require("./server/lib/string-format")
,	socketAction = global.socketAction = require("./server/routes/socketio")
,	redisConfig = global.redisConfig =  {filters:[]} //redisClient.get("console_watcher_config")||{};
,	config = global.config = jsonfile.readFileSync("./runtime.json")
;

// Redis Client

redisClient = redis.createClient( config["redisPort"], config["redisHost"] );
redisClient.on('connect', function(){
	redisClient.select(config["redisDatabase"]||0);
});
redisClient.on('error', function(err){
	console.error(err);
});
// 订阅console消息
subscriber = redis.createClient( config["redisPort"], config["redisHost"] );
// subscriber.on('connect', function(){
// 	subscriber.select(config["redisDatabase"]||0);
// });
subscriber.on('error', function(err){
	console.error(err);
});
subscriber.on("message", socketAction.onConsoleMessage );
subscriber.subscribe( "console-log" );
subscriber.subscribe( "console-server-reg");


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

app.use(function(req, res, next){
	next();
});

//Redis
app.use(session({
  resave: true,
  secret:'keyboard cat',
  saveUninitialized: false,
	cookie: { secure: true },
	store: new RedisStore({
		host: "RedisServer",
		port: "6379",
		db: 2 // redis 数据库
	}),
	name: 'esid'
}));

app.use(errorhandler({ dumpExceptions: true, showStack: true }));

app.get("/",function(req,res){
	res.send("Access Forbidden!");
});

app.get("/clientip", router.clientip);

app.get("/watcher", router.watcher );
//app.post("/gather", multipart(), router.gather );
var server = app.listen(config.port,function(){
	var host = server.address().address
	var port = server.address().port
	console.log('WatcherServer listening at http://%s:%s', host, port)
})


// globals
io  = require("socket.io").listen(server);
io.gather = {
	threads:{}
};

// When someone connects to the websocket. Includes all the SocketIO events.
io.sockets.on('connection', socketAction.SocketOnConnection);

module.exports = app;