"use strict";

module.exports={
	"port":8999,
	"socketport":77998,

	"logdir":"/var/log/watcher",

	"redisHost":"ConsoleRedisServer",
	"redisPort":6379,
	"redisDatabase":8,
	"redisConfigName":"console_watcher_config",

	logger:{
		ignoreHosts:{
			all:[],
			error:[],
			warning:['manager.diandao.org'],
			notice:['manager.diandao.org']
		}
	}
};