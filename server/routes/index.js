/*!
 * 页面路由配置
 * 
 */


exports.watcher =  function(req, res, next){
	res.render("index", { "title":"XLoger", "port": global.config.port });
};

exports.clientip = function(req, res, next){
	res.send( req.ip );
};

/**
 * 信息采集
*/
exports.gather =  function(req, res, next){
	// req.body.timestamp = req.body.timestamp || (+new Date()/1000),
	// req.body.serverIP = req.body.serverIP || req.ip;
	// req.body.fire = JSON.parse(req.body.fire||"null");
	// socketAction.webPublish("log",  req.body);
	// res.send("gather");
};



