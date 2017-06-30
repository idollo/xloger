

var cookie = require("cookie")
,   session = require("express-session")
,   fs = require('fs')
,   os = require('os')
,   path = require('path')
,   moment = require('moment')
,   extend = require('util')._extend
,   config = global.config
,   ncache = global.ncache
,   redisConfig = global.redisConfig
,   filterMgr = require('../lib/filtermgr')
;




/**
 * All socket IO events that can be emitted by the client
 * @param {[type]} socket [description]
 */
exports.SocketOnConnection = function(socket) {

	var handshake = socket.handshake;

    // parse cookies
    handshake.cookies = cookie.parse(handshake.headers.cookie||"");
    var socketid = socket.id;
    handshake.filter = {};

    socket.join( "web" );

    filterMgr.update(socket);

    socket.emit('connected', { address: handshake.address, reportors: ncache.get("reportors")||{}, filter:handshake.filter } );

    // 筛选
    socket.on("filter",function(fltstr){
        var filter = fltstr.split(":");
        var field = '';
        switch(filter[0].toLowerCase())
        {
            case "serverip": field="serverIP"; break;
            case "clientip": field="clientIP"; break;
            case "useragent": field="userAgent"; break;
            case "host": field= "host"; break;
            case "httpmethod": field="httpMethod"; break;
            case "requesturi": field="requestURI";break;

            case "cookie":
                if(!handshake.filter.cookies) handshake.filter.cookies = {};
                var cookiesp = filter[1].split("=");
                handshake.filter.cookies[cookiesp[0]]=cookiesp[1];
                break;
        }

        if(field) handshake.filter[field] = filter[1];
        
        filterMgr.update(socket, handshake.filter );
        socket.emit("updateFilter", handshake.filter );
    });


    /** 断开来连接 */
    socket.on('disconnect', function () {
        filterMgr.remove(socketid);
    });
  
};



var tCache = {
    threads:{},
    dispose:function(data){
        switch(data.type.toLowerCase()){
            case "threadstart":
                this.threads[data.thread] = {
                    // 3分钟过期
                    expired: (+new Date)+(1000*60*3),
                    tid: data.thread,
                    data: data
                };
                break;
                // 结束
            case "threadend":
                this.threads[data.thread] && delete this.threads[data.thread];
                break;
        }
    },
    get:function(tid){
        if(this.threads[tid]){
            return this.threads[tid].data;
        }
        return null;
    },
    _tm:null,
    expiredCleaning:function(){
        var t = this, now = +new Date;
        var th;
        for(var tid in t.threads){
            th =  t.threads[tid];
            if(th.expired && th.expired< now){
                delete t.threads[th.tid];
            }
        }

        clearTimeout(t._tm);
        t._tm = setTimeout(function(){
            t.expiredCleaning();
        }, 1000*60*3 );
    }
};
// 启动定时清理
tCache.expiredCleaning();


function dispatchFilter(socket, data){
    var filter = socket.handshake.filter;
    // 保存线程记录
    if(!socket.handshake.threads) socket.handshake.threads = {};
    // 已筛选通过的线程
    var threads = data.thread.split("_"), thread_exists = false;
    // 结束进程或子进程
    threads.forEach(function(t, i){
        var tid = threads.slice(0,i+1).join("_");
        if( socket.handshake.threads[tid] ){ // 存在进程或父进程记录
            // 线程结束信号
            if(data.type.toLowerCase()=="threadend"){
                delete socket.handshake.threads[data.thread];
            } 
            thread_exists = true;
            return false;
        }
    });
    // 子进程, 无需筛选
    if(thread_exists) return true;

    var hasfilter = false;
    var dcookies = cookie.parse(typeof data.cookie=="string"?data.cookie:"");
    for(var p in filter){
        hasfilter = true;
        switch(p){
            case "cookies":
                for(var c in filter.cookies){
                    if( !(new RegExp(filter.cookies[c])).test(dcookies[c]) ) return false;
                }
                break;
            default:
                if( !(new RegExp(filter[p])).test(data[p]) ) return false;
        }
    }
    // 无筛选条件
    if(!hasfilter) return false;

    // 移除过期进程
    var thread, now = +new Date;
    for(var tid in socket.handshake.threads){
        thread =  socket.handshake.threads[tid];
        if(thread && thread.expired && thread.expired< now){
            delete socket.handshake.threads[tid];
        }
    }

    // 保存筛选通过的线程
    if(data.type.toLowerCase() == "threadstart"){
        socket.handshake.threads[data.thread] = {
            // 3分钟过期
            expired: (+new Date)+(1000*60*3)
        };
    }

    return true;
}

/**
 * 日志采集到文件
 */
var LOG_LEVEL_DEBUG = 2
,   LOG_LEVEL_INFO = 4
,   LOG_LEVEL_NOTICE = 8
,   LOG_LEVEL_WARNING = 16
,   LOG_LEVEL_ERROR = 32
,   level_map = {
    "error": LOG_LEVEL_ERROR,
    "warning": LOG_LEVEL_WARNING,
    "notice": LOG_LEVEL_NOTICE,
    "debug": LOG_LEVEL_DEBUG
};
function webPublish (action, data){
    data.timestamp = data.timestamp || (+new Date()/1000),
    data.fire = JSON.parse(data.fire||"null");

    // 写日志
    writeLog(action, data );

    // 遍历客户端, 根据filter发送消息
    io.to("web").sockets.forEach(function(socket, i){
        if( dispatchFilter(socket, data) ){
            socket.emit(action, data );
        }
    });

    // 缓存进程数据
    tCache.dispose(data);
    //io.to("web").emit( action, data );
}

exports.webPublish = webPublish;

function mkdirs(dir){
    if(!fs.existsSync(dir)){
        var pdir = path.dirname(dir);
        if(!fs.existsSync(pdir)){
            mkdirs(pdir);
        }
        fs.mkdirSync(dir);
    }
}

/**
 * 日志采集到文件
 */
function writeLog(action, data){

    if(action!="log") return;
    if(!data.fire) return;
    if(!data.serverIP){ // 无线程监控信息
        var th = tCache.get(data.thread);
        if(th){
            var o = extend({},th);
            data = extend(o, data);
        }
    }

    var now = new Date()
    ,   year = now.getFullYear()
    ,   month = now.getMonth()+1
    ,   day = now.getDate()
    ;
    month = month<10?("0"+month):(""+month);
    day = day<10?("0"+day):(""+day);

    var logdir = config.logdir || "/etc/log/xloger/{serverIP}";
    var logfile = config.logfile || "/etc/log/xloger/{serverIP}/{type}.log";
    var loglevel = level_map[config.loglevel || "debug"] || LOG_LEVEL_DEBUG;
    var level = 0;
    
    logdir = logdir.format({
        serverIP: data.serverIP||"",
        year: year,
        month: month,
        day: day
    });
    
    // 创建logdir目录
    mkdirs(logdir);


    // var filename = "", type="Unknown";
    // var date = moment().format('YYYYMMDD');
    // var dir  = data.serverIP ? path.join(config.logdir, data.serverIP, date):  path.join(config.logdir, date);
    // if(data.type.toLowerCase()=="filelog"){
    //     filename = path.join( config.logdir, data.fire.logfile.format({
    //         day: moment().format('DD'),
    //         month: moment().format('MM'),
    //         year: moment().format('YYYY')
    //     }));
    //     data.logfile = filename; // parse data.logfile
    //     dir = path.dirname(filename);
    // }

    // mkdirs(dir); // 创建目录

    var logconf = config.logger || {
            ignoreHosts:{
                all:[],
                error:[],
                warning:[],
                notice:[]
            }
        };

    // 日志过滤配置
    if(data.type.toLowerCase()!="filelog" && data.host && logconf.ignoreHosts.all.indexOf((data.host||"").toLowerCase())>=0) return;
    data.host = data.host || "Unknown";

    var type="Unknown";
    switch(data.type.toLowerCase()){
        case "filelog":
            type = "FileLog";
            logfile = path.join( config.logdir, data.fire.logfile.format({
                day: moment().format('DD'),
                month: moment().format('MM'),
                year: moment().format('YYYY')
            }));
            data.logfile = logfile; // parse data.logfile
            level = LOG_LEVEL_DEBUG;
            break;
        case "error":
        case "cerror":
            if(logconf.ignoreHosts.error.indexOf(data.host.toLowerCase())>=0) return;
            type = "Error";
            level = LOG_LEVEL_ERROR;
            break;
        case "sqlerror":
            type = "SqlError";
            level = LOG_LEVEL_ERROR;
            break;
        case "warning":
        case "cwarning":
            if(logconf.ignoreHosts.warning.indexOf(data.host.toLowerCase())>=0) return;
            type = "Warning";
            level = LOG_LEVEL_WARNING;
            break;
        case "notice":
        case "cnotice":
            if(logconf.ignoreHosts.notice.indexOf(data.host.toLowerCase())>=0) return;
            type = "Notice";
            level = LOG_LEVEL_NOTICE
            break;
        default:
            return;
    }

    if (level < loglevel) return;
    logfile = logfile.format({
        serverIP: data.serverIP||"",
        clientIP: data.clientIP||"",
        host: data.host,
        year: year, month:month, day: day,
        type: type.toLowerCase()

    });
    if(!path.isAbsolute(logfile)){
        logfile = path.join(logdir, logfile);
    }

    dir = path.dirname(logfile);
    // 创建logdir目录
    mkdirs(dir);

    // 日志格式
    var logstr = "";
    if(type=="FileLog"){
        logstr = data.fire.message+os.EOL+os.EOL;
    }else{
        logstr = [
                '[{datetime}] [{type}] {fire.message} on {fire.file} in line {fire.line} ',
                '-- {method} {host}{uri}{post} "{ua}" {cip}'
            ].join('').format({
            type: type,
            datetime: moment().format('DD/MMM/YYYY:HH:mm:ss ZZ'),
            fire: data.fire,
            sip: data.serverIP,
            cip: data.clientIP,
            method: data.httpMethod,
            host: data.host,
            ua: data.userAgent,
            uri: data.requestURI,
            post: (data.httpMethod.toLowerCase()=="post" && data.postData)?(["[POST_DATA[","]]"].join(data.postData)):''
        })+os.EOL+os.EOL;
    }

    fs.appendFileSync(logfile, logstr, {flags:"a+"});

}

