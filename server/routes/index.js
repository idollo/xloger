/*!
 * 页面路由配置
 * 
 */
var websocket = global.websocket;


function reserr(err){
	console.log(err);
	return err.message;
}

exports.index = function(req, res, next){
	res.send("hello");
}

exports.push =  function(req, res, next){
	var event = req.body.event || null
	,	jetid = req.body.jetid || null
	,	channel = req.body.channel || null
	,	data = req.body.data || ""
	;
	console.log(req.body);
	try{ data = JSON.parse(data); }
	catch(e){ return res.send(reserr(e)); }

	var ret = "";
	try{
		if(jetid){
			ret = websocket.emit(jetid, event, data);
		}else if(channel){
			ret = websocket.publish(channel, event, data);
		}
	}catch(e){
		return res.send(reserr(e));
	}
	res.send(ret);
};
