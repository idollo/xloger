/*! string.format.js */
!function(t){function n(t){return{}.toString.call(t).slice(8,-1)}function r(t){return"Function"===n(t)}function i(n,r){if(n===t)return t;if(r.length){var l=r.shift();return n[l]===t?t:i(n[l],r)}return n}String.prototype.format=function(){var l=[].slice.call(arguments,0);return l.length?this.replace(/\{(.+?)\}/g,function(){var e=arguments[0],o=/^\{(#?)([\d\_\.a-z]+?)(\((.*?)\))?\s*(\[([\d\_a-z]+)\])?(\|(.+))?\}$/i.exec(e),p=o[1],s=o[2],u=o[4],a=o[6],f=o[8],g=t;if(g=p&&/\d+/.test(s)?l[s]:i(l[0],s.split(/\s*?\.\s*?/)),r(g)&&u&&(g=g.apply(null,u.split(/\s*?\,\s*?/))),a&&(g=i(g,a.split(/\s*?\.\s*?/))),g===t)return e;if(f){f=f.split(/\s*?\|\s*?/);for(var c=0,y=f.length;y>c;c++){for(var S=f[c].split(/\s*?\:\s*?/),h=S.shift(),m=null,y=l.length,d=l[0];d=l[c++];)"Object"==n(d)&&(m=r(d[h])?d[h]:m);r(m)?g=m.apply(null,[g].concat(S)):(m=String.prototype.format_modifiers[h],r(m)?g=m.apply(g,S):(m=String.prototype[h],"String"==n(g)&&r(m)?g=m.apply(g.toString(),S):0+g==g&&(g=+g,m=Number.prototype[h],r(m))?g=m.apply(g,S).toString():(m=window[h],r(m)&&(S.unshift(g),g=m.apply(null,S)))))}}return(g===t?e:null===g?"null":g).toString()}):String(this)},String.prototype.format_modifiers={}}();

!(function($){
	String.prototype.truncate = function(length, truncation){
	    length = length || 30;
	    truncation = truncation==null?'...':truncation;
	    return this.length > length ?
	        this.slice(0, length - Math.ceil(truncation.length/3))+truncation :
	        this.toString();
	};
	String.prototype.sqlHighlight = function(){
		var keywords  = [
			"DD,EXCEPT,PERCENT,ALL,EXEC,PLAN,ALTER,EXECUTE,PRECISION,AND,EXISTS,PRIMARY,ANY,EXIT,PRINT,AS,FETCH,PROC,ASC,FILE,PROCEDURE,AUTHORIZATION,FILLFACTOR,PUBLIC,BACKUP",
			"FOR,RAISERROR,BEGIN,FOREIGN,READ,BETWEEN,FREETEXT,READTEXT,BREAK,FREETEXTTABLE,RECONFIGURE,BROWSE,FROM,REFERENCES,BULK,FULL,REPLICATION,BY,FUNCTION,RESTORE,CASCADE",
			"GOTO,RESTRICT,CASE,GRANT,RETURN,CHECK,GROUP,REVOKE,CHECKPOINT,HAVING,RIGHT,CLOSE,HOLDLOCK,ROLLBACK,CLUSTERED,IDENTITY,ROWCOUNT,COALESCE,IDENTITY_INSERT,ROWGUIDCOL",
			"COLLATE,IDENTITYCOL,RULE,COLUMN,IF,SAVE,COMMIT,IN,SCHEMA,COMPUTE,INDEX,SELECT,CONSTRAINT,INNER,SESSION_USER,CONTAINS,INSERT,SET,CONTAINSTABLE,INTERSECT,SETUSER",
			"CONTINUE,INTO,SHUTDOWN,CONVERT,IS,SOME,CREATE,JOIN,STATISTICS,CROSS,KEY,SYSTEM_USER,CURRENT,KILL,TABLE,CURRENT_DATE,LEFT,TEXTSIZE,CURRENT_TIME,LIKE,THEN,CURRENT_TIMESTAMP",
			"LINENO,TO,CURRENT_USER,LOAD,TOP,CURSOR,NATIONAL,TRAN,DATABASE,NOCHECK,TRANSACTION,DBCC,NONCLUSTERED,TRIGGER,DEALLOCATE,NOT,TRUNCATE,DECLARE,NULL,TSEQUAL,DEFAULT,NULLIF,UNION",
			"DELETE,OF,UNIQUE,DENY,OFF,UPDATE,DESC,OFFSETS,UPDATETEXT,DISK,ON,USE,DISTINCT,OPEN,USER,DISTRIBUTED,OPENDATASOURCE,VALUES,DOUBLE,OPENQUERY,VARYING,DROP,OPENROWSET,VIEW,DUMMY",
			"OPENXML,WAITFOR,DUMP,OPTION,WHEN,ELSE,OR,WHERE,END,ORDER,WHILE,ERRLVL,OUTER,WITH,ESCAPE,OVER,WRITETEXT,COUNT,SUM,LIMIT"
			].join(",").split(",");
		return this
		// 匹配关键字
		.replace(/\b([\w\_]+)\b/mg,function(m, word){
			if( keywords.indexOf(word.toUpperCase()) >=0 ){
				return '<span class=sql-kw>'+word.initial()+'</span>';
			}
			return word;
		})
		// 匹配字符串
		.replace(/([\"\'])(.*?)\1/mg,function(m,q, str){
			return '<span class=sql-string>{#0}{#1}{#0}</span>'.format(q, str);
		}).toString();
	};

	String.prototype.initial = function(){
		if(!this.toString()) return "";
		return this.substr(0,1).toUpperCase()+this.substr(1).toLowerCase();
	}
	// 回车事件
	$.fn.enter = function (fn) {
		return this.keydown(function (e) {
			if (e.which == 13) {
				(fn||$.k).call(this, e);
			}
		});
	};

	var sp = window.Inspector = function(){ return this.init.apply(this, arguments) };

	sp.prototype = {
		$log_list:null,
		$filter:null,
		socket:null,
		filters:{},
		thread_end_queue:[],
		init:function(socket){
			var that = this;
			this.socket = socket;
			var $list = this.$log_list = $("#log_list");
			this.$filter = $("#filter");
			this.$filter.find("input[name=fkw]").enter(function(e){
				var val = this.value;
				that.subFilter( val );
				this.value = "";
			});

			this.$filter.find("button").click(function(){
				that.clear();
			})

			$list.on("click", ".thread-title", function(){
				$(this).parent().toggleClass("expand");
			});
		},
		push:function(data){
			switch(data.type.toLowerCase()){
				case "threadstart":
					return this.renderThead(data);
				case "threadend":
					return this.threadEnd(data);
				default:
					return this.renderTrace(data);
			}
		},
		renderThead:function(th){
			console.log("--renderThead")
			var $convert = $("<div/>");
			th.requestURI = this.htmlEntity(th.requestURI);
			var html = [
			'<dl id="{thread}" class="thread" thread="{thread}">',
				'<dt class=thread-title><i class="icon-prefix"></i><span class=uri title="{host}{requestURI}">{httpMethod|toUpperCase()} {host}{requestURI}</span> <span class=duration></span></dt>',
				'<dd class=params><sub></sub><div class=param-list></div><sup></sup></dd>',
				'<dd class=thread-subs></dd>',
			'</dl>'
			].join('').format(th);
			$convert.html(html).find(".param-list").html(this.parseParams(th));
			
			this.appendToThread(th.thread, $convert.html() );
		},
		threadEnd:function(th){
			this.thread_end_queue.push(th);
			this._tickThreadEnd();
		},
		_tick_tm:null,
		_tickThreadEnd:function(){
			var s = this;
			var $t, thread;
			clearTimeout(s._tick_tm);
			for(var i=0,l=this.thread_end_queue.length;i<l; i++){
				thread = this.thread_end_queue[i];
				$t = $("#"+thread.thread);
				if($t.size()){
					$t.addClass("complete").find(".duration").eq(0).html((thread.duration*1000).toFixed(3) + " ms");
					this.thread_end_queue.splice(i,1);
					i--;
					l--;
				}
			}
			s._tick_tm = setTimeout(function(){
				s._tickThreadEnd();
			},50);
		},

		parseParams:function(data){
			var s = this;
			var type = ({}).toString.apply(data);
			switch(type){
				case "[object String]":
					return '<span class=string>'+s.htmlEntity(data)+'</span>';
				case "[object Number]":
					return '<span class=number>'+data+'</span>';
				case "[object Null]":
					return '<span class=null>null</span>';

			}
			var html = [];
			$.each(data,function(k,v){
				html.push('<dl class=param><dt>{#0}</dt><dl>{#1}</dl></dl>'.format(k,s.parseParams(v)) );
			});
			return html.join('');
		},
		htmlEntity:function(str){
			return $("<div></div>").text(str).html()
		},

		appendToThread:function(thread, html){
			var threads = thread.split("_");
			var master = true;
			for(var $thread, l=threads.length; l ; l--){
				$thread = $( "#"+threads.slice(0,l).join("_"));
				if( $thread.size() ){
					$thread.find(".thread-subs").eq(0).append(html);
					master = false;
					return true;
				}
			}
			this.$log_list.append(html);
		},



		renderTrace:function(log){
			var html = [
			'<dl class="log log-{type}" type={type}>',
				'<dt>',
					(function(){
						switch (log.type){
							case "filelog":
								return '<label>{type|initial}: {logfile}</label><pre>{fire.message}</pre>';
							case "log": return '<label>{type|initial}: </label>{parsedArgs}';
							case "sqlquery":
								log.msduration = (log.fire.duration*1000).toFixed(3)+" ms";
								return  [
								'<label>[{type|initial}] ( {msduration} ) </label>',
								'<span class=message>{fire.query|sqlHighlight}</span>'].join('');
							default:
								return [
								'<label>{type|initial}: </label>',
								'<span class=message>{fire.message}</span>'].join('');
						}
					})(),
				'</dt>',
				'<dt class=file>{fire.file}<i>(第{fire.line}行)</i></dt>',
			'</dl>'
			].join('').format({parsedArgs:this.argsToStr(log.fire.args)}).format(log);
			this.appendToThread(log.thread, html);
		},
		argsToStr:function(args){
			if(!args) return "";
			var s = this;
			var args =  $.map(args,function(arg,i){
				var type = ({}).toString.apply(arg);
				switch(type){
					case "[object String]":
						return '<span class=string>'+$("<div></div>").text(arg).html()+'</span>';
					case "[object Number]":
						return '<span class=number>'+arg+'</span>';
					default:
						return '<span class=object>'+type+'</span>'+s.argsToStr([JSON.stringify(arg)]);
				}
			});
			return args.join(", ");
		},
		clear:function(){
			this.$log_list.html("");
		},
		subFilter:function(filter){
			this.socket.emit("filter", filter );
		},
		updateFilter:function(filters){
			var s= this, has = 0;
			for(var x in filters){ has =1; break; }
			if(has){ s.$express && s.$express.remove(); }
			s.filters = filters;
		},
		renderExpress:function(data){
			var s = this;
			var $express = $("#express");
			s.$express = $express;
			$express.html([
				'<h1>暂无任何监控筛选条件, 快速筛选:</h1>',
				'<h5>只监控我的请求:</h5>',
				'<dl><dt>',
					'<h2 filter="clientIP:{address}">clientIP:{address}</h2>',
					'<p class=note>局域网内他人的IP和你的是一样的哦<br/>添加其它筛选如cookie:uid=5219,即可只报告自己产生请求</p>',
				'</dt></dl>',
				'<h5>监控以下产生报告的服务:</h5>',
				'<p class=note>注: 直接监控主服务器IP会产生大量记录, 请适当添加其它具化筛选.</p>',
				(function(rts, html){
					$.each(rts, function(i,r){
						html.push([
							'<dl>',
								'<dt><h2 filter="serverIP:{serverip}">serverIP:{serverip}</h2></dt>',
								'<dd>具体某个服务:</dd>',
								$.map(r.hosts,function(h){
									return '<dd><h3 filter="serverIP:{serverip},host:{#0}">host:{#0}</h3></dd>'.format(h);
								}).join(''),
							'</dl>'
						].join('').format(r));
					});
					return html.join('');
				})(data.reportors,[])
			].join('').format(data));

			$express.on("click", "[filter]", function(){
				var filter = this.getAttribute("filter");
				$.each(filter.split(","),function(i,f){
					s.subFilter(f);
				})
			})
		}
	};
})(jQuery)