// NOTE this depends on base2-dom and sizzle libraries

(function() {

if (!Function.prototype.bind) Function.prototype.bind = function(target) {
	if (arguments.length > 1) throw "This implementation of Function.prototype.bind() does not support arguments other than the bound target."
	var boundMethod = function() { return arguments.callee.__call__.apply(arguments.callee.__target__, arguments); }
	boundMethod.__target__ = target;
	boundMethod.__call__ = this;
	return boundMethod;
}

var DOMTokenList = function(getter, setter) { // TODO parameter checking
	this._getText = getter;
	this._setText = setter;
	this.valueOf = getter;
	this.toString = getter;
	var getLength = function() { return this._getTokens().length; }
	this.length = {
		toString: getLength.bind(this),
		valueOf: getLength.bind(this)
	}
};
DOMTokenList.prototype.item = function(index) {
	return this._getTokens()[index];
}
DOMTokenList.prototype.has = function(token) {
	var rex = /^\s*(\w+)\b/;
	var tmp = this._getText();
	var found = false;
	while (/\w/.test(tmp)) {
		tmp = tmp.replace(rex, function($0, $1) { if ($1 == token) found = true; return ""; });
		if (found) return true;
	}
	return false;
}
DOMTokenList.prototype.add = function(token) {
	if (this.has(token)) return;
	var text = this._getText();
	if (/^\s*$/.test(text)) text = "" + token;
	else text = text.replace(/\s*$/, " " + token);
	this._setText(text);
}
DOMTokenList.prototype.remove = function(token) {
	var text = this._getText(), tmp = text, final = "";
	var rex = /^(\s*)(\w+)\b(\s*)/;
	var i = 0;
	while (1) { // loop forever
		var m = tmp.match(rex);
		if (m[0] == tmp) { // at end
			if (m[2] != token) {
				i++;
				final += m[0];
			}
			tmp = "";
			break;
		}
		if (m[2] == token) {
			var offset = m[0].length - (i ? 1 : 0);
			tmp = tmp.substring(offset);
		}
		else {
			i++;
			final += m[1] + m[2];
			tmp = tmp.substring(m[1].length + m[2].length);
		}
	}
	if (final == text) return;
	this._setText(final);
}
DOMTokenList.prototype.toggle = function(token) {
	if (this.has(token)) this.remove(token);
	else this.add(token);		
}
DOMTokenList.prototype._getTokens = function() {
	var text = this._getText();
	if (!text) return [];
	var strings = text.split(/\s+/);
	var sorted = strings.sort();
	for (var i=sorted.length-1; i>0; i--) {
		if (sorted[i] == sorted[i-1]) sorted.splice(i);
	}
	return sorted;		
}



var conf = Meeko.stuff.xblSystem.getConfig();
	
/*
conf.logger = {
	log: function fbug_log() { return console.log.apply(console, arguments); },
	debug: function fbug_debug() { return console.debug.apply(console, arguments); },
	info: function fbug_info() { return console.info.apply(console, arguments); },
	warn: function fbug_warn() { return console.warn.apply(console, arguments); },
	error: function fbug_error() { return console.error.apply(console, arguments); }
}
*/
conf.URL.load = function(options) {
	var url = options.url
	var rq = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
	rq.open("GET", url, false);
	rq.send("");
	if (rq.status != 200) throw "Error loading " + url;
	return rq;		
}

conf.XMLDocument.load = function(uri) {
	var rq = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP"); 
	rq.open("GET", uri, false);
	rq.send("");
	if (rq.status != 200) throw "Error loading " + uri;
	if (!rq.responseXML) throw "Document is not XML: " + uri;
	return rq.responseXML;
}

conf.XMLDocument.loadXML = function(data) {
	if (window.DOMParser) return (new DOMParser).parseFromString(data, "application/xml"); // TODO catch errors
	var xmlDom = new ActiveXObject("Microsoft.XMLDOM");
	xmlDom.async = "false";
	xmlDom.loadXML(data);
	return xmlDom;
}

conf.Document.addEventListener = function(doc, type, handler, useCapture) {
	if (doc.addEventListener) return doc.addEventListener(type, handler, useCapture);
	else return NW.Event.appendListener(doc, type, handler, useCapture);
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
	return conf.Element.bind(this[index]); 
}
if (window.HTMLCollection) {
	HTMLCollection.prototype._item = HTMLCollection.prototype.item;
	HTMLCollection.prototype.item = function(index) { return conf.Element.bind(this[index]); }
	HTMLCollection.prototype._namedItem = HTMLCollection.prototype.namedItem;
	HTMLCollection.prototype.namedItem = function(name) { return conf.Element.bind(this[name]); }
}

if (!conf.HTMLCollection) conf.HTMLCollection = {};
conf.HTMLCollection.fixInterface = function(target, field) {
	var coll = target[field];
	coll._item = coll.item;
	coll._namedItem = coll.namedItem;
	coll.item = function(index) {
		var item = this[index]; 
		if (item) conf.Element.bind(item);
		return item;
	}
	coll.namedItem = function(name) { 
		var item = this[name]; 
		if (item) conf.Element.bind(item);
		return item;
	}
}
conf.HTMLCollection.addInterface = function(target, field, filter) {
	var coll = {};
	coll.__target__ = target;
	coll.item = function(index) {
		var i = -1, node = this.__target__.firstChild;
		while (node) {
			if (node.nodeType == 1) { // Node.ELEMENT_NODE
				if (!filter || filter(node) == 1) i++; // NodeFilter.FILTER_ACCEPT
				if (index == i) return conf.Element.bind(node);
			}
			node = node.nextSibling;
		}
		return null;
	}
	var getLength = function() {
		var i = 0, node = this.__target__.firstChild;
		while (node) {
			if (node.nodeType == 1) { // Node.ELEMENT_NODE
				if (!filter || filter(node) == 1) i++; // NodeFilter.FILTER_ACCEPT
			}
			node = node.nextSibling;
		}
		return i;		
	}
	coll.length = {
		toString: getLength.bind(coll),
		valueOf: getLength.bind(coll)
	}
	target[field] = coll;
}

conf.Element.matchesSelector = function(elt, selector) {
	return NW.Dom.match(elt, selector);
}
conf.Element.bind = function(elt) {
	if (elt._fixed) return elt;
	elt._fixed = true; // NOTE assumes no exceptions before end of function
	if (!elt.dispatchEvent) elt.dispatchEvent = function(event) {
		return NW.Event.dispatch(this, event.type, false);
	}
	if (elt.children) conf.HTMLCollection.fixInterface(elt, "children");
	else conf.HTMLCollection.addInterface(elt, "children");

	var getClassName = function() { return this.className; };
	var setClassName = function(val) { this.className = val; };
	elt.classList = new DOMTokenList(getClassName.bind(elt), setClassName.bind(elt));

	switch(elt.tagName.toLowerCase()) {
		case "table":
			conf.HTMLCollection.fixInterface(elt, "tBodies");
			if (elt.tHead) conf.Element.bind(elt.tHead);
			if (elt.tFoot) conf.Element.bind(elt.tFoot);
		case "thead": case "tbody": case "tfoot":
			conf.HTMLCollection.fixInterface(elt, "rows");
			break;
		case "tr":
			conf.HTMLCollection.fixInterface(elt, "cells");
			break;
		case "form":
			conf.HTMLCollection.fixInterface(elt, "elements");
			break;
		case "select":
			conf.HTMLCollection.fixInterface(elt, "options");
		case "input": case "textbox":
			if (elt.form) conf.Element.bind(elt.form);
			break;
	}
	return elt;
}

document._getElementById = document.getElementById;
document.getElementById = function(id) {
	var elt = this._getElementById(id);
	if (elt) conf.Element.bind(elt);
	return elt;
}

Meeko.stuff.xblSystem.initialize();

})();