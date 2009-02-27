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
	resolveURL: function(src, base) { return (URIParser.parseUri(src, base)).toString(); }
}

DOM.Document = {
	addEventListener: function(doc, type, handler, useCapture) {
		return base2.DOM.Document.addEventListener(doc, type, handler, useCapture);
	}
}

// NOTE these prototype method overrides are needed for Safari-3
// FIXME should we use them for all platforms??
if (NodeList) NodeList.prototype.item = function(index) { return base2.DOM.bind(this[index]); }
if (HTMLCollection) HTMLCollection.prototype.item = function(index) { return base2.DOM.bind(this[index]); }

DOM.Element = {
	matchesSelector: function(elt, selector) {
		return base2.DOM.Element.matchesSelector(elt, selector);
	},
	bind: function(elt) {
		if (elt.base2ID) return elt; // FIXME orthogonality
		var bind = arguments.callee;
		base2.DOM.bind(elt);
		function item(index) { return bind(this[index]); }
		if (elt.children) elt.children.item = item;
		else {
			elt.children = {
				boundElement: elt,
				item: function(index) {
					var i = -1, node = this.boundElement.firstChild;
					while (node) {
						if (node.nodeType == 1) i++; // Node.ELEMENT_NODE
						if (index == i) return bind(node);
						node = node.nextSibling;
					}
					return null;
				},
				length: {
					boundElement: elt,
					valueOf: function() {
						var i = 0, node = this.boundElement.firstChild;
						while (node) {
							if (node.nodeType == 1) i++; // Node.ELEMENT_NODE
							node = node.nextSibling;
						}
						return i;						
					},
					toString: function() { return this.valueOf() }
				}
			}
		}
		switch(elt.tagName.toLowerCase()) {
			case "table":
				if (elt.tHead) bind(elt.tHead);
				if (elt.tFoot) bind(elt.tFoot);
				elt.tBodies.item = item;
			case "thead": case "tbody": case "tfoot":
				elt.rows.item = item;
				break;
			case "tr":
				elt.cells.item = item;
				break;
			case "select":
				elt.options.item = item;
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
Meeko.stuff.xblSystem.initialize(DOM);

})();
