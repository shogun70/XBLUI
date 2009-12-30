// NOTE this depends on NWEvents and NWMatcher libs

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
		valueOf: getLength.bind(this),
		toString: getLength.bind(this)
	}
};
DOMTokenList.prototype.item = function(index) {
	return this._getTokens()[index];
}
DOMTokenList.prototype.contains = function(token) {
	var tokens = this._getTokens();
	return (tokens.indexOf(token) >= 0) ? true : false;
}
DOMTokenList.prototype.add = function(token) {
	if (this.contains(token)) return;
	var text = this._getText();
	var n = text.length;
	if (n && text.substring(n-1,1) != " ") text += " " + token;
	else text += token;
	this._setText(text);
}
DOMTokenList.prototype.remove = function(token) {
	var text = this._getText();
	var result = text;
	result = result.replace(new RegExp("^\\s*"+token+"\\s*$"), "");
	result = result.replace(new RegExp("^\\s*"+token+"\\s+"), "");
	result = result.replace(new RegExp("\\s+"+token+"\\s*$"), "");
	result = result.replace(new RegExp("\\s+"+token+"\\s+", "g"), " ");
	if (result == text) return;
	this._setText(result);
}
DOMTokenList.prototype.toggle = function(token) {
	if (this.contains(token)) this.remove(token);
	else this.add(token);		
}
DOMTokenList.prototype._getTokens = function() {
	var text = this._getText();
	if (!text) return [];
	return text.split(/\s+/);
}

var xblSystem = Meeko.stuff.xblSystem;
	
/*
xblSystem.logger = {
	log: function) { return console.log.apply(console, arguments); },
	debug: function) { return console.debug.apply(console, arguments); },
	info: function) { return console.info.apply(console, arguments); },
	warn: function) { return console.warn.apply(console, arguments); },
	error: function) { return console.error.apply(console, arguments); }
}
*/
xblSystem.URL.load = function(options) {
	var url = options.url
	var rq = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
	rq.open("GET", url, false);
	rq.send("");
	if (rq.status != 200) throw "Error loading " + url;
	return rq;		
}

xblSystem.XMLDocument.load = function(uri) {
	var rq = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP"); 
	rq.open("GET", uri, false);
	rq.send("");
	if (rq.status != 200) throw "Error loading " + uri;
	if (!rq.responseXML) throw "Document is not XML: " + uri;
	return rq.responseXML;
}

xblSystem.XMLDocument.loadXML = function(data) {
	if (window.DOMParser) return (new DOMParser).parseFromString(data, "application/xml"); // TODO catch errors
	var xmlDom = new ActiveXObject("Microsoft.XMLDOM");
	xmlDom.async = "false";
	xmlDom.loadXML(data);
	return xmlDom;
}

xblSystem.Document.addEventListener = function(doc, type, handler, useCapture) {
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
	return xblSystem.Element.bind(this[index]); 
}
if (window.HTMLCollection) {
	HTMLCollection.prototype._item = HTMLCollection.prototype.item;
	HTMLCollection.prototype.item = function(index) { return xblSystem.Element.bind(this[index]); }
	HTMLCollection.prototype._namedItem = HTMLCollection.prototype.namedItem;
	HTMLCollection.prototype.namedItem = function(name) { return xblSystem.Element.bind(this[name]); }
}

if (!xblSystem.HTMLCollection) xblSystem.HTMLCollection = {};
xblSystem.HTMLCollection.fixInterface = function(target, field) {
	var coll = target[field];
	coll._item = coll.item;
	coll._namedItem = coll.namedItem;
	coll.item = function(index) {
		var item = this[index]; 
		if (item) xblSystem.Element.bind(item);
		return item;
	}
	coll.namedItem = function(name) { 
		var item = this[name]; 
		if (item) xblSystem.Element.bind(item);
		return item;
	}
}
xblSystem.HTMLCollection.addInterface = function(target, field, filter) {
	var coll = {};
	coll.__target__ = target;
	coll.item = function(index) {
		var i = -1, node = this.__target__.firstChild;
		while (node) {
			if (node.nodeType == 1) { // Node.ELEMENT_NODE
				if (!filter || filter(node) == 1) i++; // NodeFilter.FILTER_ACCEPT
				if (index == i) return xblSystem.Element.bind(node);
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

xblSystem.Element.matchesSelector = function(elt, selector) {
	return NW.Dom.match(elt, selector);
}

xblSystem.Element.bind = function(elt) {
	if (elt._fixed) return elt;
	elt._fixed = true; // NOTE assumes no exceptions before end of function
	if (!elt.dispatchEvent) elt.dispatchEvent = function(event) {
		return NW.Event.dispatch(this, event.type, false);
	}
	if (elt.children) xblSystem.HTMLCollection.fixInterface(elt, "children");
	else xblSystem.HTMLCollection.addInterface(elt, "children");

	var getClassName = function() { return this.className; };
	var setClassName = function(val) { this.className = val; };
	elt.classList = new DOMTokenList(getClassName.bind(elt), setClassName.bind(elt));

	elt.matchesSelector = function(selector) { return NW.Dom.match(this, selector); }
	elt.querySelectorAll = function(selector) { return NW.Dom.select(selector, this); }
	elt.querySelector = function(selector) { return NW.Dom.select(selector, this)[0]; } // FIXME so inefficient
	
	switch(elt.tagName.toLowerCase()) {
		case "table":
			xblSystem.HTMLCollection.fixInterface(elt, "tBodies");
			if (elt.tHead) xblSystem.Element.bind(elt.tHead);
			if (elt.tFoot) xblSystem.Element.bind(elt.tFoot);
		case "thead": case "tbody": case "tfoot":
			xblSystem.HTMLCollection.fixInterface(elt, "rows");
			break;
		case "tr":
			xblSystem.HTMLCollection.fixInterface(elt, "cells");
			break;
		case "form":
			xblSystem.HTMLCollection.fixInterface(elt, "elements");
			break;
		case "select":
			xblSystem.HTMLCollection.fixInterface(elt, "options");
		case "input": case "textbox":
			if (elt.form) xblSystem.Element.bind(elt.form);
			break;
	}
	return elt;
}

document._getElementById = document.getElementById;
document.getElementById = function(id) {
	var elt = this._getElementById(id);
	if (elt) xblSystem.Element.bind(elt);
	return elt;
}

xblSystem.initialize();

})();
