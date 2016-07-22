"use strict";

//! string.format.js
!function(undefined){

// dectect an object type. 
// detectO([1,2,3]); >> Array
function detectO(obj){ return ({}).toString.call(obj).slice(8,-1) }
function isFun(fun){ return detectO(fun)==="Function" }
function _chain(obj,chains){
	if(obj===undefined) return undefined;
	if(chains.length){
		var pro = chains.shift();
		if(obj[pro]===undefined) return undefined;
		return _chain(obj[pro], chains);
	}
	return obj;
}

String.prototype.format = function() {
	// convert [object Arguments] into Array for safe iteration
    var args = [].slice.call(arguments,0);

    return args.length? this.replace(/\{(.+?)\}/g, function () {
		var match = arguments[0]
		,	metas = /^\{(#?)([\d\_\.a-z]+?)(\((.*?)\))?\s*(\[([\d\_a-z]+)\])?(\|(.+))?\}$/i.exec(match)
		,	ai = metas[1]		// use {#n} to fetch argument
		,	ns = metas[2]		// name space
		,	calls = metas[4] 	// calls
		,	pi = metas[6]		// property or index
		,	ms = metas[8]		// modifiers 
		,	result = undefined;


		// {#n[properties]}
		if(ai && /\d+/.test(ns)){ result = args[ns]}
			// {name.property}
			else { result = _chain(args[0], ns.split(/\s*?\.\s*?/)) }

		// calls
		if(isFun(result) && calls) { result =  result.apply(null, calls.split(/\s*?\,\s*?/))}
		// [properties]
		if(pi) result = _chain(result, pi.split(/\s*?\.\s*?/));
		// when parsed undefined, skips the modifiers
		if(result===undefined) return match;

		// modifiers {property|modifier}
		if(ms){
			ms = ms.split(/\s*?\|\s*?/);
			for(var i=0,l=ms.length; i<l; i++){
				var params = ms[i].split(/\s*?\:\s*?/)
				,	cname = params.shift()
				,	kall = null;

				// try customize modifier
				for(var x=0,l=args.length,m=args[0]; m=args[i++];){
					if(detectO(m)=="Object"){ kall = isFun(m[cname])?m[cname]:kall; }
				}
				if( isFun(kall) ){ result = kall.apply(null,[result].concat(params));  continue; }
				// try extenal modifiers
				kall = String.prototype.format_modifiers[cname];
				if( isFun(kall)){ result = kall.apply(result, params); continue; }

				// try String.prototype
				kall = String.prototype[cname];
				if( detectO(result)=="String" && isFun(kall) ){
					result = kall.apply(result.toString(), params); continue;
				}
				// try Number.prototype
				if((0+result)==result){
					result = +result; // convert to number
					kall = Number.prototype[cname];
					if( isFun(kall)){
						result = kall.apply(result, params).toString(); continue;
					}
				}
				// try the window context
				kall = window[cname];
				if(isFun(kall)){
					params.unshift(result);
					result = kall.apply(null, params); continue;
				}
			}

		}

		// if no parser found, return the {block}.
		return ( result===undefined?match:result===null?"null":result).toString();
	// if no arguments, return string instead [object String]
	}): String(this);
};

// A namespace for modifier extensions;
String.prototype.format_modifiers = {};

// AMD registration happens at the end for compatibility with AMD loaders
// that may not enforce next-turn semantics on modules. Even though general
// practice for AMD registration is to be anonymous, underscore registers
// as a named module because, like jQuery, it is a base library that is
// popular enough to be bundled in a third party lib, but not be part of
// an AMD load request. Those cases could generate an error when an
// anonymous define() is called outside of a loader request.
if (typeof define === 'function' && define.amd) {
	define('string-format', [], function() {
	 	return String.prototype.format;
	});
}

module.exports = function(tpl){
	return String.format.apply(tpl, [].slice.call(arguments,1) );
};

}();