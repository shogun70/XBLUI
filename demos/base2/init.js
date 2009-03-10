(function() {


var DOM = {};
/*
DOM.logger = {
	log: function fbug_log() { return console.log.apply(console, arguments); },
	debug: function fbug_debug() { return console.debug.apply(console, arguments); },
	info: function fbug_info() { return console.info.apply(console, arguments); },
	warn: function fbug_warn() { return console.warn.apply(console, arguments); },
	error: function fbug_error() { return console.error.apply(console, arguments); }
}
*/
DOM.utils = {
	resolveURL: function(src, base) { return (URIParser.parseUri(src, base)).toString(); },
	loadURL: function(uri) {
		var rq = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
		rq.open("GET", uri, false);
		rq.send("");
		if (rq.status != 200) throw "Error loading " + uri;
		return rq.responseText;		
	}
}

DOM.XMLDocument = {
	load: function(uri) {
		var rq = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP"); 
		rq.open("GET", uri, false);
		rq.send("");
		if (rq.status != 200) throw "Error loading " + uri;
		if (!rq.responseXML) throw "Document is not XML: " + uri;
		return rq.responseXML;
	},
	loadXML: function(data) {
		if (window.DOMParser) return (new DOMParser).parseFromString(data, "application/xml"); // TODO catch errors
		var xmlDom = new ActiveXObject("Microsoft.XMLDOM");
		xmlDom.async = "false";
		xmlDom.loadXML(data);
		return xmlDom;

	}
}

DOM.Document = {
	addEventListener: function(doc, type, handler, useCapture) {
		return base2.DOM.Document.addEventListener(doc, type, handler, useCapture);
	}
}

if (!Function.prototype.bind) Function.prototype.bind = function(target) {
	var callee = this;
	return function() { return callee.apply(target, arguments); }
}

if (!Object.defineProperty) {
if (Object.prototype.__defineGetter__) {
Object.defineProperty = function(object, field, desc) {
	if ((desc.get || desc.set) && desc.value != null) throw "value is incompatible with get, set";
	if (desc.value != null) {
		if (delete object[field] && object[field] == null) object[field] = desc.value; 
		else object.__defineGetter__(field, function() { return desc.value; });
	}
	if (desc.get) object.__defineGetter__(field, desc.get);
	if (desc.set) object.__defineSetter__(field, desc.set);
	return object;
}
}
else {
Object.defineProperty = function(object, field, desc) { 
	if ((desc.get || desc.set) && undefined != desc.value) throw "value is incompatible with get, set";
	var value = (desc.get) ? {
			valueOf: desc.get.bind(object),
			toString: desc.get.bind(object)
		} : desc.value;
	try {
		if (desc.value) object[field] = desc.value;
		if (desc.get) object[field] = {
			valueOf: desc.get.bind(object),
			toString: desc.get.bind(object)
		}
		if (desc.set) throw "setters not implemented";
	}
	catch (error) {
		if (object.nodeType != 1) throw "Object.defineProperty not valid for non-Element nodes";
		var attr = document.createAttribute(field);
		attr.nodeValue = value;
		object.setAttributeNode(attr);
	}
	return object;
}
}
}
	
/*
 HTMLCollection fixes
 Ideally we want to remove the whole native HTMLCollection interface 
 and provide access through the programmed iface.
 This allows us to prevent access via array ([]) notation. 
 Unfortunately this approach doesn't work on Safari-3, 
 so we override the prototype methods as well. 
*/
if (window.NodeList) NodeList.prototype.item = function(index) { 
	NodeList.prototype._item = NodeList.prototype.item;
	return DOM.Element.bind(this[index]); 
}
if (window.HTMLCollection) {
	HTMLCollection.prototype._item = HTMLCollection.prototype.item;
	HTMLCollection.prototype.item = function(index) { return DOM.Element.bind(this[index]); }
	HTMLCollection.prototype._namedItem = HTMLCollection.prototype.namedItem;
	HTMLCollection.prototype.namedItem = function(name) { return DOM.Element.bind(this[name]); }
}

DOM.HTMLCollection = { 
fixInterface: function(target, field) {
	var base = target[field]; // base points to the native interface
	target["_"+field] = base; 
	var coll = {};
	coll._base = base;
	coll.item = function(index) { 
		var item = this._base[index]; 
		if (item) DOM.Element.bind(item);
		return item;
	}
	coll.namedItem = function(name) { 
		var item = this._base[name]; 
		if (item) DOM.Element.bind(item);
		return item;
	}
	Object.defineProperty(coll, "length", { get: function() { return this._base.length; } });
	Object.defineProperty(target, field, { value: coll });
},
addInterface: function(target, field, filter) {
	var coll = {};
	coll._target = target,
	coll.item = function(index) {
		var i = -1, node = this._target.firstChild;
		while (node) {
			if (node.nodeType == 1) { // Node.ELEMENT_NODE
				if (!filter || filter(node) == 1) i++; // NodeFilter.FILTER_ACCEPT
				if (index == i) return DOM.Element.bind(node);
			}
			node = node.nextSibling;
		}
		return null;
	}
	Object.defineProperty(coll, "length", { get: function() {
		var i = 0, node = this._target.firstChild;
		while (node) {
			if (node.nodeType == 1) { // Node.ELEMENT_NODE
				if (!filter || filter(node) == 1) i++; // NodeFilter.FILTER_ACCEPT
			}
			node = node.nextSibling;
		}
		return i;						
	} });
	Object.defineProperty(target, field, { value: coll });
}
}

DOM.Element = {
	matchesSelector: function(elt, selector) {
		return base2.DOM.Element.matchesSelector(elt, selector);
	},
	bind: function(elt) {
		if (elt.base2ID) return elt; // FIXME orthogonality
		var bind = arguments.callee;
		base2.DOM.bind(elt);
		if (elt.children) DOM.HTMLCollection.fixInterface(elt, "children");
		else DOM.HTMLCollection.addInterface(elt, "children");

		switch(elt.tagName.toLowerCase()) {
			case "table":
				if (elt.tHead) bind(elt.tHead);
				if (elt.tFoot) bind(elt.tFoot);
				DOM.HTMLCollection.fixInterface(elt, "tBodies");
			case "thead": case "tbody": case "tfoot":
				DOM.HTMLCollection.fixInterface(elt, "rows");
				break;
			case "tr":
				DOM.HTMLCollection.fixInterface(elt, "cells");
				break;
			case "select":
				DOM.HTMLCollection.fixInterface(elt, "options");
				break;
		}
		return elt;
	}
}

/*
	URIParser (a wrapper class for parseUri), MIT License
	URIParser by Sean Hogan <http://www.meekostuff.net>
	parseUri by Steven Levithan <http://stevenlevithan.com>
*/
var URIParser = (function() {
	
var parseUri = function (source) {
	var o = parseUri.options,
		value = o.parser[o.strictMode ? "strict" : "loose"].exec(source);
	
	for (var i = 0, uri = {}; i < 14; i++) {
		uri[o.key[i]] = value[i] || "";
	}
	
	uri[o.q.name] = {};
	uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
		if ($1) uri[o.q.name][$1] = $2;
	});
	
	return uri;
};

parseUri.options = {
	strictMode: true,
	key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
	q: {
		name: "queryKey",
		parser: /(?=.)&?([^&=]*)=?([^&]*)/g
	},
	parser: {
		strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
		loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
	}
};

var URIParser = function(base) {
	this.base = base;
}

URIParser.parseUri = function(src, base) {
	if (null != src && "string" != typeof src) src = src.toString(); // NOTE IE String.match doesn't handle duck-typing
	if (null != base && "string" != typeof base) base = base.toString();
	var m = src.match(/^([^:\/?#]+):/);
	var scheme = (m && m.length > 1) ? m[1] : "";
	switch (scheme) {
		case "http":
		case "https":
		case "ftp":
		case "file":
		case "":
			var uri = parseUri(src);
			var baseURI = parseUri(base);
			if (!uri.protocol) {
				uri.protocol = baseURI.protocol;
				uri.authority = baseURI.authority;
				uri.userInfo = baseURI.userInfo;
				uri.user = baseURI.user;
				uri.password = baseURI.password;
				uri.host = baseURI.host;
				uri.port = baseURI.port;
				var directory = (uri.path.match(/^\//)) ? uri.directory : baseURI.directory + uri.directory;
				var file = (uri.file) ? uri.file : (uri.anchor || uri.query) ? baseURI.file : "";
				uri.directory = directory;
				uri.file = file;
				uri.path = directory + file;
				var query = (uri.query) ? "?" + uri.query : "";
				var anchor = (uri.anchor) ? "#" + uri.anchor : "";
				uri.relative = directory + file + query + anchor;
				uri.source = src;
			}
			uri.href = uri.protocol + "://" + uri.authority + uri.path;
			if (uri.query) uri.href += "?" + uri.query;
			uri.toString = function() { return this.protocol + "://" + this.authority + this.relative; }
			return uri;
			break;
	
		default:
			return {
				protocol: scheme,
				source: src,
				href: src,
				toString: function() { return this.source; }
			}
			break;
	}

}

URIParser.prototype.parseUri = function(src) {
	return URIParser.parseURI(src, this.base);
}

return URIParser;

})();

base2.JavaScript.bind(window);
base2.DOM.bind(document);
document._getElementById = document.getElementById;
document.getElementById = function(id) {
	var elt = this._getElementById(id);
	if (elt) DOM.Element.bind(elt);
	return elt;
}

Meeko.stuff.xblSystem.initialize(DOM);

})();
