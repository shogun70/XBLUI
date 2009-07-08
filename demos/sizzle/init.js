// NOTE this depends on base2-dom and sizzle libraries

(function() {

base2.JavaScript.bind(window);
base2.DOM.bind(document);

var xblSystem = Meeko.stuff.xblSystem;

/*
xblSystem.logger = {
	log: function() { return console.log.apply(console, arguments); },
	debug: function() { return console.debug.apply(console, arguments); },
	info: function() { return console.info.apply(console, arguments); },
	warn: function() { return console.warn.apply(console, arguments); },
	error: function() { return console.error.apply(console, arguments); }
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
	return Sizzle.matches(selector, [ elt ]).length;
}
xblSystem.Element.getAttribute = function(name) {
	switch (name) {
		case "class": return this.className; break;
		case "for": return this.htmlFor; break;
		default: return this.attributes[name].nodeValue; break;
	}
}
xblSystem.Element.setAttribute = function(name, value) {
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
xblSystem.Element.removeAttribute = function(name) {
        switch (name) {
                case "class": this.className = null; break;
                case "for": this.htmlFor = null; break;
                default:
                        var attr = this.attributes[name];
                        if (attr) attr.nodeValue = null;
                        break;
        }
}
xblSystem.Element.bind = function(elt) {
	if (elt._fixed) return elt;
	elt._fixed = true; // NOTE assumes no exceptions before end of function
	base2.DOM.bind(elt);
	if (elt.getAttribute.ancestor) {
		elt.getAttribute = xblSystem.Element.getAttribute.bind(elt);
		elt.setAttribute = xblSystem.Element.setAttribute.bind(elt);
		elt.removeAttribute = xblSystem.Element.removeAttribute.bind(elt);
	}
	if (elt.children) xblSystem.HTMLCollection.fixInterface(elt, "children");
	else xblSystem.HTMLCollection.addInterface(elt, "children");

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
			xblSystem.Element.bind(elt.form);
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
