/*!
 * filter manager
 */
var cookie = require('cookie');
var ncache = global.ncache;
var filterids = [];
var filters = {};

function updateAll(){
    filterids = []; // 全局filter
    // 遍历客户端, 合并filter
    io.to("web").sockets.forEach(function(websocket, i){
    	update(websocket);
        filterids.push(websocket.id);
    });
}

/**
 * update and apply the filter which a web-socket client seted.
 */
function update(websocket, filter){
	var sid 	= websocket.id
	,	filter 	= websocket.handshake.filter;
	ncache.set("filter:"+sid, filter, 600);
	if(filterids.indexOf(sid) < 0 ){
		filterids.push(sid);
	}
	global.socket.broadcastFilter()
}


function list(){
	var nkeys = [];
	filterids.forEach(function(sid, i){
		nkeys.push("filter:"+sid);
	})
	return ncache.mget(nkeys);
}


/**
 * get a web-socket's filter with socketid
 */
function get(socketid){
	return ncache.get("filter:"+socketid);
}

/**
 * remove the filter from stack as an web-socket disconnected.
 */
function remove(socketid){
	var index = filterids.indexOf(socketid);
	if(index>=0){
		filterids.splice(index, 1);
	}
}

/**
 * to detect whether a thread need to log
 */
function detect(data){
	var thread = data.thread;
	if(!thread) return false;

	var threadParts = thread.split("_");
	var threads = [];
	threadParts.forEach(function(t, i){
		threads.push( threadParts.slice(0, i+1).join("_") );
	});
	for (var l=threads.length; threads[l--];){
		if( threadmgr.exists(threads[l]) ){ // current thread or parent thread are checkin.
			return true;
		}
	}

	// detect filters
	var watched = false;
	if(!filterids.length){ return false; } // no watcher client connect

	filterids.forEach(function(sid){
		var filter = get(sid);
		if(!filter) return true; // next loop

		if(detect_with_filter(filter, data)){
			watched = true;
			return false;  // break the loop
		}
	});

	return watched;
}

function detect_with_filter(filter, data){
	var matched = true;
	var key, exp, re, cookies, keynum=0;
	for(key in filter){
		exp = filter[key];
		exp = exp.replace(".", '\.').replace("*", ".*").replace("/", "\/");
		re = new RegExp(exp, "i");
		switch( key.toLowerCase() ){
			case "serverip":
				keynum++;
				if( !re.test( data.serverIP) ) matched = false;
				break;

			case "clientip":
				keynum++;
				if( !re.test( data.clientIP) ) matched = false;
				break;

			case "host":
				keynum++;
				if( !re.test( data.host) ) matched = false;
				break;

			case "cookies": // cookie 筛选
				keynum++;
				var cn, cv, cre;
				if(!data.cookie) { matched=false; break; }
				cookies = cookie.parse(data.cookie);
				for(cn in filter.cookies){
					cv = filter.cookies[cn];
					if(!cv) continue;
					if(!cookies[cn]){ matched=false; break; }
					cre = new RegExp(cv.replace(".", '\.').replace("*", ".*").replace("/", "\/"),"i");
					if(!cre.test(cookies[cn])){ matched=false; break; }
				}
				break;

			case "useragent":
				keynum++;
				if( !re.test( data.userAgent) ) matched = false;
				break;

			case "httpmethod":
				keynum++;
				if( !re.test( data.httpMethod) ) matched = false;
				break;

			case "requesturi":
				keynum++;
				if( !re.test( data.requestURI) ) matched = false;
				break;
		}
		if(!matched) break;
	}
	if(!keynum) return false; // not a valid filter
	return matched;
}


module.exports = {
	updateAll: updateAll,
	update: update,
	get: get,
	detect: detect,
	remove: remove,
	list: list
};
