// NOTE this depends on base2-dom and sizzle libraries

(function() {

base2.JavaScript.bind(window);
base2.DOM.bind(document);

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
	return base2.DOM.Document.addEventListener(doc, type, handler, useCapture);
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
	return Sizzle.matches(selector, [ elt ]).length;
}
conf.Element.getAttribute = function(name) {
	switch (name) {
		case "class": return this.className; break;
		case "for": return this.htmlFor; break;
		default: return this.attributes[name].nodeValue; break;
	}
}
conf.Element.setAttribute = function(name, value) {
	switch (name) {
		case "class": this.className = value; break;
		case "for": this.htmlFor = value; break;
		default:
			var attr = this.attributes[name];
			if (!attr) {
				attr = document.createAttribute(name);
				this.setAttributeNode(attr);
			}
			attr.nodeValue = value;
			break;
	}
}
conf.Element.removeAttribute = function(name) {
        switch (name) {
                case "class": this.className = null; break;
                case "for": this.htmlFor = null; break;
                default:
                        var attr = this.attributes[name];
                        if (attr) attr.nodeValue = null;
                        break;
        }
}
conf.Element.bind = function(elt) {
	if (elt._fixed) return elt;
	elt._fixed = true; // NOTE assumes no exceptions before end of function
	base2.DOM.bind(elt);
	if (elt.getAttribute.ancestor) {
		elt.getAttribute = conf.Element.getAttribute.bind(elt);
		elt.setAttribute = conf.Element.setAttribute.bind(elt);
		elt.removeAttribute = conf.Element.removeAttribute.bind(elt);
	}
	if (elt.children) conf.HTMLCollection.fixInterface(elt, "children");
	else conf.HTMLCollection.addInterface(elt, "children");

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
			conf.Element.bind(elt.form);
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