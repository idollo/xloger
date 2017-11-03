var pwd = __dirname
,	os = require('os')
,	fs = require("fs")
,	jsonfile = require('jsonfile')
,	defs = require("../../defaults.json")
,	pkg	 = require("../../package.json")
,	appname = pkg.name
;

// detect the default config file: xloger.json
// POSIX: /etc/xloger.json
// Win32: SysDriver:\windows\system32\xloger.json
var uconf = null;
switch(os.platform().toLowerCase()){
	case "win32":
		var sysdriver = path.parse(os.os.homedir())['root'];
		uconf = path.join(path.parse(os.os.homedir())['root'], "windows", "system32", appname+".json");
		break;
	default:
		uconf = "/etc/"+appname+".json";
}

exports.load = function(cfile){
	cfile = cfile || uconf;
	var config = defs;
	// load the user config file which exists.
	if(fs.existsSync(cfile)){
		config = Object.assign(defs, require(cfile));
	}
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
	config.port = listen_args[0] || null;
	config.host = listen_args[1] || null;
	return config;
}