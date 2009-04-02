(function() {


var conf = {};
/*
conf.logger = {
	log: function fbug_log() { return console.log.apply(console, arguments); },
	debug: function fbug_debug() { return console.debug.apply(console, arguments); },
	info: function fbug_info() { return console.info.apply(console, arguments); },
	warn: function fbug_warn() { return console.warn.apply(console, arguments); },
	error: function fbug_error() { return console.error.apply(console, arguments); }
}
*/
conf.URL = {
	resolve: function(src, base) { return (Meeko.Net.URIParser.parseUri(src, base)).toString(); }
}

conf.Document = {
	addEventListener: function(doc, type, handler, useCapture) {
		return doc.addEventListener(type, handler, useCapture);
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
	return conf.Element.bind(this[index]); 
}
if (window.HTMLCollection) {
	HTMLCollection.prototype._item = HTMLCollection.prototype.item;
	HTMLCollection.prototype.item = function(index) { return conf.Element.bind(this[index]); }
	HTMLCollection.prototype._namedItem = HTMLCollection.prototype.namedItem;
	HTMLCollection.prototype.namedItem = function(name) { return conf.Element.bind(this[name]); }
}

conf.HTMLCollection = { 
fixInterface: function(target, field) {
	var base = target[field]; // base points to the native interface
	target["_"+field] = base; 
	var coll = {};
	coll._base = base;
	coll.item = function(index) { 
		var item = this._base[index]; 
		if (item) conf.Element.bind(item);
		return item;
	}
	coll.namedItem = function(name) { 
		var item = this._base[name]; 
		if (item) conf.Element.bind(item);
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
				if (index == i) return conf.Element.bind(node);
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

conf.Element = {
	matchesSelector: function(elt, selector) {
		return Element.matchesSelector(elt, selector);
	},
	bind: function(elt) {
		if (elt._domBindings) return elt; // FIXME orthogonality
		var bind = arguments.callee;
		Meeko.stuff.domSystem.attach(elt);
		if (elt.children) conf.HTMLCollection.fixInterface(elt, "children");
		else conf.HTMLCollection.addInterface(elt, "children");

		switch(elt.tagName.toLowerCase()) {
			case "table":
				if (elt.tHead) bind(elt.tHead);
				if (elt.tFoot) bind(elt.tFoot);
				conf.HTMLCollection.fixInterface(elt, "tBodies");
			case "thead": case "tbody": case "tfoot":
				conf.HTMLCollection.fixInterface(elt, "rows");
				break;
			case "tr":
				conf.HTMLCollection.fixInterface(elt, "cells");
				break;
			case "select":
				conf.HTMLCollection.fixInterface(elt, "options");
				break;
		}
		return elt;
	}
}

Meeko.stuff.domSystem.initialize();
document._getElementById = document.getElementById;
document.getElementById = function(id) {
	var elt = this._getElementById(id);
	if (elt) conf.Element.bind(elt);
	return elt;
}
Meeko.stuff.xblSystem.initialize(conf);

})();
