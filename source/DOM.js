
if (!window.Meeko) window.Meeko = {};
if (!Meeko.XPL) Meeko.XPL = (function() {

var Namespace = function() {};
Namespace.enhance = function(dest, src) {
	for (var className in src) {
		var srcClass = src[className];
		var destClass = dest[className];
		if (destClass) {
			for (var propName in srcClass) {
				if ("prototype" == propName) continue;
				if (destClass[propName]) continue;
				else destClass[propName] = srcClass[propName];
			}
			if (srcClass.prototype && null == destClass.prototype) destClass.prototype = {}; // NOTE fixes DOMException on Opera and Safari2
			for (var propName in srcClass.prototype) {
				if (destClass.prototype[propName]) continue;
				else destClass.prototype[propName] = srcClass.prototype[propName];
			}
		}
		else dest[className] = srcClass;
	}
}

var Logger = function(ref) {
	this.ref = ref;
}

Logger.DEBUG = 0;
Logger.INFO = 1;
Logger.WARN = 2;
Logger.ERROR = 3;

Logger.prototype.log = function() { this._log({ message: arguments }); }
Logger.prototype.debug = function() { this._log({ level: Logger.DEBUG, message: arguments }); }
Logger.prototype.info = function() { this._log({ level: Logger.INFO, message: arguments }); }
Logger.prototype.warn = function() { this._log({ level: Logger.WARN, message: arguments }); }
Logger.prototype.error = function() { this._log({ level: Logger.ERROR, message: arguments }); }

Logger.prototype._log = function(data) {
	data.date = new Date;
	data.ref = this.ref;
	data.message = Array.prototype.join.call(data.message, " ");
	if (this._trace) this._trace.log(data);
}

var XPLContext = function(ref) {
	this.params = {};
	this.requiredContexts = [];
	this.installed = false;
	this.logger = new Logger(ref);
}

var XPLSystem = function() {
	this.prefetch = {};
	this.contexts = {};
	this.documentURI = document.documentURI || document.baseURI || document.URL;
	this.boundDocumentURI = this.documentURI; // FIXME orthogonality
}

XPLSystem.prototype.createContext = function(ref) {
	if (null == ref) { ref = 0; for (var text in this.contexts) ref++; } // NOTE default value for ref is the current number of contexts;
	var xplContext = new XPLContext(ref);
	this.contexts[ref] = xplContext;
	xplContext.logger._trace = this.trace;
	return xplContext;
}

XPLSystem.prototype.createNamespace = function(name) { // TODO error checking
	var a = name.split(".");
	var ns = window;
	for (var n=a.length, i=0; i<n; i++) {
		var step = a[i];
		if (!ns[step]) ns[step] = {};
		ns = ns[step];
	}
	return ns;
}

XPLSystem.prototype.init = function() {
	var xplSystem = this;
	function require(href) {
		var xplContext = xplSystem.contexts[href];
		if (xplContext.installed) return true;
		for (var n=xplContext.requiredContexts.length, i=0; i<n; i++) {
			require(xplContext.requiredContexts[i]);
		}
		var rc = xplContext.wrappedScript.call(window);
		xplContext.installed = true; // FIXME
		return rc;
	}
	for (var href in xplSystem.contexts) require(href);
}

var Script = function() {
	this.readyState = "initialized";
}

Script.runList = [];

Script.prototype.run = function(text) {
	function setText(_elt, _text) {
		_elt.text = _text;
		if (!_elt.innerHTML) _elt.appendChild(document.createTextNode(_text));
	}
	var scriptElt = document.createElement("script");
	scriptElt.type = "text/javascript";

	this.scriptElement = scriptElt;
	this.scriptIndex = Script.runList.length;
	Script.runList.push(this);

	this.readyState = "loaded";
	setText(scriptElt, 
		'try {\n' +
		text + '\n' +
		' Meeko.XPL.Script.runList[' + this.scriptIndex + '].readyState = "complete";\n' +
		'}\n' +
		'catch (__xplError__) {\n' +
		' Meeko.XPL.Script.runList[' + this.scriptIndex + '].readyState = "error";\n' +
		'}\n'
	);
	
	var callbackElt = document.createElement("script");
	callbackElt.type = "text/javascript";
	
	this.callbackElement = callbackElt;
	setText(callbackElt, 'window.setTimeout(function() { Meeko.XPL.Script.runList[' + this.scriptIndex + '].callback(); }, 10);');

	var head = document.getElementsByTagName("head")[0];
	head.appendChild(scriptElt);
	head.appendChild(callbackElt);
}

Script.prototype.callback = function() {
	var head = this.scriptElement.parentNode;
	head.removeChild(this.scriptElement);
	head.removeChild(this.callbackElement);
	if (this.readyState == "error") {
	}
	else if (this.readyState == "loaded") {
		this.readyState = "syntax-error";
	}
	if (this.onreadystatechange) this.onreadystatechange();
}


return {
	Namespace: Namespace,
	XPLContext: XPLContext,
	XPLSystem: XPLSystem,
	Script: Script
}

})();

if (!Meeko.stuff) Meeko.stuff = {};
Meeko.stuff.xplSystem = new Meeko.XPL.XPLSystem();
var traceWindow = this;
do {
	if (traceWindow && traceWindow.Meeko && traceWindow.Meeko.stuff && traceWindow.Meeko.stuff.trace) {
		Meeko.stuff.xplSystem.trace = {
			_log: traceWindow.Meeko.stuff.trace.log,
			log: function(data) {
				data.url = Meeko.stuff.xplSystem.documentURI; 
				data.boundDocumentURI = Meeko.stuff.xplSystem.boundDocumentURI; // FIXME orthogonality
				this._log(data);
			}
		}
		break;
	}
	if (traceWindow == top) break; // need to break at top because top.parent == top
} while (traceWindow = traceWindow.parent);

if (!Meeko.stuff.xplSystem.trace) {
	Meeko.stuff.xplSystem.trace = {
		log: function(data) {}
	}
}

Meeko.stuff.execScript = function(text, callback) {
	var script = new Meeko.XPL.Script;
	if (callback) script.onreadystatechange = function() { callback(script.readyState); };
	script.run(text);
}

Meeko.stuff.evalScript = function() {
	return eval(arguments[0]);
}

// NOTE emulate firebug behavior which complements the XMLHttpRequest wrapper in Meeko.xml
if (XMLHttpRequest && !XMLHttpRequest.wrapped) var XMLHttpRequest = (function() {
	var _xhr = window.XMLHttpRequest;
	var xhr = function() { return new _xhr; };
	xhr.wrapped = _xhr;
	return xhr;
})();

// NOTE cross-browser error catch-all
//if (window.addEventListener) window.addEventListener("error", function(event) { event.preventDefault(); }, false);
//else window.onerror = function(event) { return true; }; // FIXME

Meeko.stuff.xplSystem.createContext('DOM.xhtml');
Meeko.stuff.xplSystem.contexts['DOM.xhtml'].requiredContexts.push('lib/Meeko/DOM.xhtml');
Meeko.stuff.xplSystem.createContext('lib/Meeko/DOM.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM.xhtml'].requiredContexts.push('lib/Meeko/Javascript-1.6/Javascript.xhtml');
Meeko.stuff.xplSystem.createContext('lib/Meeko/Javascript-1.6/Javascript.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/Javascript-1.6/Javascript.xhtml'].wrappedScript = function() {
	var xplSystem = Meeko.stuff.xplSystem;
	var xplContext = xplSystem.contexts['lib/Meeko/Javascript-1.6/Javascript.xhtml'];
	var logger = xplContext.logger;
	

if (!this.Meeko) this.Meeko = {};

Meeko['Javascript 1.6'] = (function() {

var Array = function() {}
Array.prototype = new this.Array();

Array.indexOf = function(array, val, start) {
	var n = array.length;
	if (start == null) start = 0;
	for (var i=start; i<n; i++) {
		if (val == array[i]) return i;
	}
	return -1;
}

Array.lastIndexOf = function(array, val, start) {
	var n = array.length;
	if (start == null) start = n-1;
	for (var i=start; i>=0; i--) {
		if (val == array[i]) return i;
	}
	return -1;
}

Array.filter = function(array, callback, context) {
	var out = [];
	var n = array.length;
	for (var i=0; i<n; i++) {
		var rc = callback.call(context, array[i], i, array);
		if (rc) out.push(array[i]);
	}
	return out;
}

Array.every = function(array, callback, context) {
	var n = array.length;
	for (var i=0; i<n; i++) {
		var rc = callback.call(context, array[i], i, array);
		if (!rc) return false;
	}
	return true;
}

Array.forEach = function(array, callback, context) {
	var n = array.length;
	for (var i=0; i<n; i++) {
		callback.call(context, array[i], i, array);
	}
}


Array.map = function(array, callback, context) {
	var out = [];
	var n = array.length;
	for (var i=0; i<n; i++) {
		var rc = callback.call(context, array[i], i, array);
		out[i] = rc;
	}
	return out;
}

Array.some = function(array, callback, context) {
	var n = array.length;
	for (var i=0; i<n; i++) {
		var rc = callback.call(context, array[i], i, array);
		if (rc) return true;
	}
	return false;
}

// NOTE non-standard Array methods
Array.compare = function(array1, array2, cmp) { // NOTE compares n elements where n is length of shorter array
	if (!cmp) cmp = function(a,b) { return (a < b) ? -1 : (a > b) ? 1 : 0 };
	var rc = 0;
	var n1 = array1.length, n2 = array2.length, n = (n1 <= n2) ? n1 : n2;
	for (var i=0; i<n; i++) {
		if (rc = cmp(array1[i], array2[i])) return rc;
	}
	return rc;
}

Array.prototype.indexOf = function(val, start) { return Array.indexOf(this, val, start); }
Array.prototype.lastIndexOf = function(val, start) { return Array.lastIndexOf(this, val, start); }
Array.prototype.every = function(callback, context) { return Array.every(this, callback, context); }
Array.prototype.filter = function(callback, context) { return Array.filter(this, callback, context); }
Array.prototype.forEach = function(callback, context) { return Array.forEach(this, callback, context); }
Array.prototype.map = function(callback, context) { return Array.map(this, callback, context); }
Array.prototype.some = function(callback, context) { return Array.some(this, callback, context); }
Array.prototype.compare = function(array, cmp) { return Array.compare(this, array, cmp); }

var Object = function() {}
Object.prototype = new this.Object();

// NOTE non-standard Object methods
Object.copy = function(dest, source, fields, override) {
	function _copy(dst, src, name, over) {
		if (!over && (dst.hasOwnProperty && dst.hasOwnProperty(name) || dst[name] != null)) return;
		dst[name] = src[name];
	}
	if (fields && fields.length) {
		for (var n=fields.length, i=0; i<n; i++) {
			var name = fields[i];
			_copy(dest, source, name, override);
		}
	}
	else {
		for (var name in source) _copy(dest, source, name, override);
	}
	return dest;
}

Object.toLoggerString = function(object) { // NOTE the complexity here is work-arounds for Safari-2
	var string = "";
	for (var field in object) {
		var slot = object[field];
		var t = typeof slot;
		var sz;
		try { if (t == "object" && slot.length) t = "array"; }
		catch (error) { }
		try { var sz = "" + slot; }
		catch (error) { t = "null"; }
		if (t == "function") string += field + ": " + "function() {}" + "\n";
		else if (t == "array") string += field + ": " + "[ " + slot + " ]" + "\n";
		else if (t == "null") string += field + ": " + "null" + "\n";
		else string += field + ": " + slot + "\n";
	}
	return string;
}

Object.forEach = function(object, callback, context) {
	for (var key in object) {
		var val = object[key];
		if (typeof val != "function") callback.call(context, val, key, object);
	}
}

var forEach = function(object, callback, context) {
	if (object.forEach instanceof Function) {
		object.forEach(callback, context);
	}
	else if (null != object.length) {
		Array.forEach(object, callback, context);
	}
	else {
		Object.forEach(object, callback, context);
	}
}

return {
	Array: Array,
	Object: Object,
	forEach: forEach
}

})();

Meeko.XPL.Namespace.enhance(window, Meeko['Javascript 1.6']);



}
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM.xhtml'].requiredContexts.push('lib/Meeko/DOM/System.xhtml');
Meeko.stuff.xplSystem.createContext('lib/Meeko/DOM/System.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/System.xhtml'].requiredContexts.push('lib/Meeko/Javascript-1.6/Javascript.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/System.xhtml'].wrappedScript = function() {
	var xplSystem = Meeko.stuff.xplSystem;
	var xplContext = xplSystem.contexts['lib/Meeko/DOM/System.xhtml'];
	var logger = xplContext.logger;
	


(function() { // A few cross-browser fixes

if (!document.parentWindow) document.parentWindow = window;

//	document.documentURI for a range of browsers
var _documentURI = document.documentURI || document.baseURI || document.URL || document.url || document.location;
if (!document.documentURI) document.documentURI = _documentURI;

// make visible window["[[DOMDocument]]"], etc in Safari-2
document.createElement("select").options;
document.createTextNode("text");
document.createAttribute("attribute");

var safari2Prototypes = {
	Node: "[[DOMNode.prototype]]",
	Text: "[[DOMText.prototype]]",
	Document: "[[DOMDocument.prototype]]",
	Element: "[[DOMElement.prototype]]",
	Event: "[[DOMEvent.prototype]]"
}

for (var name in safari2Prototypes) {
	var proto = safari2Prototypes[name];
	if (!window[proto]) continue;
	if (!window[name]) window[name] = function() {};
	window[name].prototype = window[proto];
}

})();

Meeko.stuff.domSystem = (function() {

var domSystem = {};

var interfaceTable = [
//	{ name: "Node" },
	{ name: "Window", nodeType: 0 }, // NOTE treated as a node for internal purposes
	{ name: "Text", base: "Node", nodeType: 3 }, // Node.TEXT_NODE },
	{ name: "Document", base: "Node", nodeType: 9 }, // Node.DOCUMENT_NODE },
	{ name: "HTMLDocument", base: "Document", nodeType: 9 }, // Node.DOCUMENT_NODE },
	{ name: "Element", base: "Node", nodeType: 1 }, // Node.ELEMENT_NODE },
	{ name: "HTMLElement", base: "Element", nodeType: 1 }, // Node.ELEMENT_NODE },
	{ name: "HTMLLinkElement", element: "link", base: "HTMLElement", nodeType: 1 }, // Node.ELEMENT_NODE },
	{ name: "HTMLStyleElement", element: "style", base: "HTMLElement", nodeType: 1 }, // Node.ELEMENT_NODE },
	{ name: "HTMLFormElement", element: "form", base: "HTMLElement", nodeType: 1 } // Node.ELEMENT_NODE }
];

var interfacesByName = {};
Object.forEach (interfaceTable, function(row) {
	interfacesByName[row.name] = row;
})

var interfaceInheritanceChains = {};
for (var name in interfacesByName) {
	interfaceInheritanceChains[name] = [];
	var chain = interfaceInheritanceChains[name];
	do {
		chain.unshift(name);
		var ifSpec = interfacesByName[name];
		name = (ifSpec) ? ifSpec.base : null;
	} while (name);
}

function getLocalName(element) {
	return (element.localName) ? element.localName : element.tagName.replace(element.prefix+":", "");	
}
var htmlElementRulesTree = {
	_test: function(node) { return getLocalName(node) },
	"link": "HTMLLinkElement",
	"style": "HTMLStyleElement",
	"form": "HTMLFormElement",
	"LINK": "HTMLLinkElement", // FIXME either change getLocalName() or generate upper-case rules
	"STYLE": "HTMLStyleElement",
	"FORM": "HTMLFormElement",
	_default: "HTMLElement"
}

var interfaceRulesTree = {
	_test: function(node) { return (node != window) ? node.nodeType : 0; },
	0: "Window",
	1: { // Node.ELEMENT_NODE
		_test: function(node) { return node.namespaceURI },
		"http://www.w3.org/1999/xhtml" : htmlElementRulesTree,
		_null: htmlElementRulesTree,
		_default: "Element"
	},
	9: { // Node.DOCUMENT_NODE
		_test: function(node) { return node.namespaceURI },
		"http://www.w3.org/1999/xhtml" : "HTMLDocument",
		_null: "HTMLDocument",
		_default: "Document"
	}
}

var nodeTable = new Array(13);
for (var i=0; i<13; i++) {
	nodeTable[i] = [];
}
var nodeManager = {};
nodeManager.getStorage = function(node) {
	return node._domBindings;
}
nodeManager.addNode = function(node, callback, context) {
	if (this.getStorage(node)) { // FIXME why?
		// logger.error("Failure in addNode(): node already being managed " + node.tagName);
		return false;
		// throw "Failure in addNode()";
	}
	var nodeType = (node != window) ? node.nodeType : 0;
	var nodeList = nodeTable[nodeType];
	nodeList.push(node);
	var store = {};
	node._domBindings = store;
	if (callback) callback.call(context, node);
	return true;
}
nodeManager.releaseNodesByType = function(type, callback, context) {
	var nodeList = nodeTable[type];
	for (var i=nodeList.length-1; i>=0; i--) {
		var node = nodeList[i];
		if (callback) callback.call(context, node);
		delete nodeList[i];
		var store = node._domBindings;
		node._domBindings = null;
	}
}

/*
elementBinding = function() {}
	prototype: {},
	implementation: function() {},
		prototype: {},
	handlers: []
*/


var privateKey = Math.random();

function bind(dest, source, fields, override) {
	function _bind(dst, src, name, over) {
		if (src[name] == null) return;
		if (!over && (dst.hasOwnProperty && dst.hasOwnProperty(name) || dst[name] != null)) return;
		if ("function" == typeof src[name]) dst[name] = function() { return src[name].apply(src, arguments); };
		else if (dst.__defineGetter__) dst.__defineGetter__(name, function() { return src[name]; });
		else dst[name] = src[name];
	}
	if (fields && fields.length) {
		for (var n=fields.length, i=0; i<n; i++) {
			var name = fields[i];
			_bind(dest, source, name, override);
		}
	}
	else {
		for (var name in source) _bind(dest, source, name, override);
	}
	return dest;
}

function release(dest, source, fields) {
	function _release(dst, src, name) {
		if (dst[name] == null) return;
		dst[name] = null;
	}
	if (fields && fields.length) {
		for (var n=fields.length, i=0; i<n; i++) {
			var name = fields[i];
			_release(dest, source, name);
		}
	}
	else {
		for (var name in source) _release(dest, source, name);
	}
	return dest;
}

function hide(node, fields) {
	for (var n=fields.length, i=0; i<n; i++) {
		var name = fields[i];
		var _name = "_" + name;
		if (node[name]) {
			node[_name] = node[name];
			// delete node[name];
			node[name] = null;
		}
	}
}

function restore(node, fields) {
	for (var n=fields.length, i=0; i<n; i++) {
		var name = fields[i];
		var _name = "_" + name;
		if (node[_name]) {
			node[name] = node[_name];
			// delete node[name];
			node[_name] = null;
		}
	}
}

var incompleteBindings = []; // domBindings with xblReadyState() != "complete"

/*
 DOMBinding is a ClassFactory for dom-binding classes. Usage:
   var HTMLElement = new DOMBinding("HTMLElement");
 The DOMBinding class is then attached to a node with:
   HTMLElement.attach(node);
*/
var DOMBinding = function(name) {
	this.name = name;
	this.prototype = {};
	this.interfaces = [];
	this.mergedInterfaces = [];
	this.implementation = function(node) {};
}
DOMBinding.prototype.xblRequired = function(node) {
	for (var n=this.interfaces.length, i=0; i<n; i++) {
		var ifaceSpec = this.interfaces[i];
		if (ifaceSpec.xblRequired && ifaceSpec.xblRequired(node)) return true;
	}
	if (this.baseBinding) return this.baseBinding.xblRequired(node);
	else return false;
}
DOMBinding.prototype.attach = function(node) {
	if (this.baseBinding) this.baseBinding.attach(node);
	Object.copy(node, this.prototype); // TODO optimize
	var internal = new this.implementation(node);
	for (var n=this.mergedInterfaces.length, i=0; i<n; i++) {
		var ifaceSpec = this.mergedInterfaces[i];
		if (ifaceSpec.prototype.xblCreate) ifaceSpec.prototype.xblCreate.call(internal, node);
	}
	for (var n=this.interfaces.length, i=0; i<n; i++) {
		var ifaceSpec = this.interfaces[i];
		var iface = new ifaceSpec(node);
		internal[i] = iface;
		if (iface.xblReadyState && iface.xblReadyState() != "complete") incompleteBindings.push(iface);
	}
	var ifName = "_" + this.name;
	nodeManager.getStorage(node)[ifName] = internal;
}
DOMBinding.prototype.detach = function(node) { // FIXME
	var ifName = "_" + this.name;
	var store = nodeManager.getStorage(node);
	var internal = store[ifName];
	// delete node[ifName]
	store[ifName] = null;
	if (!internal) {
		logger.warn("Failure removing non-existant "+this.name+" interface from "+node.tagName);
		return;
	}
	for (var n=this.interfaces.length, i=n-1; i>=0; i--) {
		var iface = internal[i];
		if (iface && iface.xblDestroy) iface.xblDestroy(node);
		internal[i] = null;
	}
	// FIXME Object.uncopy(node, this.prototype);
	for (var field in this.prototype) {
		if (node[field] === this.prototype[field]) node[field] = null;
	}
	if (this.baseBinding) this.baseBinding.detach(node);
}
DOMBinding.prototype.addImplementation = function(impl) {
	this.interfaces.push(impl);
	var ifName = "_" + this.name;
	var index = this.interfaces.length - 1;
	return function(node) {
		var store = nodeManager.getStorage(node);
		if (!store) return;
		var domBinding = store[ifName];
		if (!domBinding) return;
		return domBinding[index];
	};
}
DOMBinding.prototype.mergeImplementation = function(impl) {
	this.mergedInterfaces.push(impl);
	var ifName = "_" + this.name;
	return Function("node", "return node['"+ifName+"']; ");
}
DOMBinding.init = function(domBinding, interfaces, mergedInterfaces) {
	for (var n=mergedInterfaces.length, i=0; i<n; i++) {
		var iface = mergedInterfaces[i];
		if (iface && iface.prototype) Object.copy(domBinding.implementation.prototype, iface.prototype);			
	}
}
DOMBinding.prototype.init = function() {
	DOMBinding.init(this, this.interfaces, this.mergedInterfaces);
}

var domBindings = {};
for (var name in interfacesByName) {
	var ifSpec = interfacesByName[name];
	var domBinding = new DOMBinding(name);
	domBindings[name] = domBinding;
	if (!window[name]) window[name] = domBinding;
	if (!window[name].prototype) window[name].prototype = domBinding.prototype;
	
	var baseName = ifSpec.base;
	if (baseName) domBinding.baseBinding = domBindings[baseName];
}

// TODO tidy-up the DOMBinding utils into a class
function lookupDOMBinding(node) {
	var rule = interfaceRulesTree;
	while ("string" != typeof rule) {
		var rc = rule._test(node);
		if (rc != null) rule = rule[rc] || rule._default || "";
		else rule = rule._null || "";
	}
	return domBindings[rule];
}
var filterDOMBindings = {
	acceptNode: function(node) {
		var domBinding = lookupDOMBinding(node);
		if (!domBinding) {
			logger.warn("filterDOMBindings: Could not find DOMBinding for nodeType: " + node.nodeType);
			return NodeFilter.FILTER_REJECT;
		}
		return (domBinding.xblRequired(node)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
	}
}
function attachDOMBindings(node) {
	var domBinding = lookupDOMBinding(node);
	if (!domBinding) {
		logger.error("attachDOMBindings: Could not find DOMBinding for nodeType: " + node.nodeType);
		throw "Error attaching DOMBindings";
	}
	if (nodeManager.addNode(node)) domBinding.attach(node); // FIXME assumes that if addNode fails then bindings are already attached
	return node;
}
function detachDOMBindings(node) { // MUST be called with nodeManager.releaseNodesByType(nodeType, detachDOMBindings)
	var domBinding = lookupDOMBinding(node);
	if (!domBinding) {
		logger.error("detachDOMBindings: Could not find DOMBinding for nodeType: " + node.nodeType);
		throw "Error detaching DOMBindings";
	}
	domBinding.detach(node);
}

function detachDOMBindingsByNodeType(nodeType) {
	nodeManager.releaseNodesByType(nodeType, detachDOMBindings);
}

var timerId = null,
	readyState = "uninitialized",
	_initializing = false,
	domWalker = null;

function init() {
	if (null == document.readyState) { // Mozilla
		document.readyState = "loading";	
		document.addEventListener("DOMContentLoaded", function(event) { document.readyState = "loaded"; }, true);
		window.addEventListener("load", function(event) { if (event.target == document || event.target == window) document.readyState = "complete"; }, true);
	}
	
	if (window.addEventListener) window.addEventListener("unload", exit, true);
	if (window.attachEvent) window.attachEvent("onunload", exit);	

	timerId = window.setTimeout(onprogress, 50);
}

function exit() { // FIXME
logger.debug("Beginning exit process");
	detachDOMBindingsByNodeType(Node.ELEMENT_NODE);
	detachDOMBindingsByNodeType(Node.DOCUMENT_NODE);
	detachDOMBindingsByNodeType(0); // Window

logger.debug("DOMBindings detached");

	if (window.removeEventListener) window.removeEventListener("unload", exit, false);
	if (window.detachEvent) window.detachEvent("onunload", exit);
logger.debug("Finished exit process");
}

function onprogress() {
	if (_initializing) { // NOTE re-entrancy usually means a crash in the initialization
		;;;logger.debug("Re-entrancy during initialization");
		return false; 
	}
	_initializing = true;
	_init();
	_initializing = false;
}


function _init() {
	timerId = window.setTimeout(onprogress, 50);
	MAIN: switch (readyState) { // NOTE all these branches can fall-thru when they result in a state transition
		case "uninitialized":
;;;logger.debug("initializing");
			if (!document.body) return false;
			for (var name in domBindings) {
				domBindings[name].init();
			}
			attachDOMBindings(window); // force attach
			attachDOMBindings(document); // force attach
			window.addEventListener("DOMNodeInserted", function(event) {
				if (event.target.nodeType == 1) { // Node.ELEMENT_NODE) {
logger.debug("DOMNodeInserted");
					var localWalker = document._createTreeWalker(event.target, NodeFilter.SHOW_ELEMENT, filterDOMBindings, false);
					localWalker.forEach(attachDOMBindings); // FIXME some elements will already have bindings applied
				}
			}, true);
			domWalker = document._createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT, filterDOMBindings, false);
			readyState = "loading";
		case "loading":
;;;logger.debug("loading");
			domWalker.forEach(attachDOMBindings);
			// FIXME if document.readyState is updated while this thread is running then there could be a failure here.
			switch (document.readyState) {
				case "loaded": case "interactive": case "complete":
					logger.debug("Dispatching compat DOMContentLoaded event");
					var event = document.createEvent("Event");
					event.initEvent("DOMContentLoaded", true, true);
					document.dispatchEvent(event);
					readyState = "loaded";
					break;
				default: break MAIN;
			}
		case "loaded":
;;;logger.debug("loaded");
			for (var i=incompleteBindings.length-1; i>=0; i--) {
				if ("complete" == incompleteBindings[i].xblReadyState()) incompleteBindings.splice(i,1);
			}
			if (incompleteBindings.length) break MAIN;
			readyState = "complete";
;;;logger.debug("complete");
	}
	
	// NOTE it is an error if we don't get to this point
	logger.debug("Dispatching compat progress event");
	var event = document.createEvent("Event");
	event.initEvent("progress", true, true);
	document.dispatchEvent(event);
	if (readyState == "complete") {
		logger.debug("Dispatching compat load event");
		var event = document.createEvent("Event");
		event.initEvent("load", true, true);
		document.dispatchEvent(event);
		window.clearTimeout(timerId);
	}
}

function wrap(dest, fields) {
	for (var n=fields.length, i=0; i<n; i++) {
		var name = fields[i];
		var _name = "_" + name;
		dest[_name] = dest[name];
		dest[name] = function() {
			var node = this[_name]();
			domSystem.attach(node);
			return node;
		}
	}
}


init();

Object.copy(domSystem, { // FIXME this is a complete hack
	addImplementation: function(name, impl) { return domBindings[name].addImplementation(impl); },
	mergeImplementation: function(name, impl) { return domBindings[name].mergeImplementation(impl); },
	bindInterface: bind,
	releaseInterface: release,
	hideInterface: hide,
	restoreInterface: restore,
	wrapInterface: wrap,
	attach: attachDOMBindings,
	document: {} // FIXME implement this
});

var Traversal = function(target) {
	if (null == target) return null; // TODO throw ??
	if (this == window) return arguments.callee.getInterface(target);
	else arguments.callee.prototype.xblCreate.call(this, target);
}
Traversal.getInterface = domSystem.addImplementation("Document", Traversal);
Traversal.methods = ["createTreeWalker", "createNodeIterator"];
Traversal.prototype.xblCreate = function(target) {
	this.target = target;
	var xblPublic = Traversal.methods;
	domSystem.hideInterface(target, xblPublic);
	domSystem.bindInterface(target, this, xblPublic, true); // NOTE override on W3C systems
}
Traversal.prototype.xblDestroy = function(target) {
	this.target = null;
	var xblPublic = Traversal.methods;
	domSystem.releaseInterface(target, this, xblPublic, true);
	domSystem.restoreInterface(target, xblPublic);
}
Traversal._createInterface = function(fields) {
	var iface = function() {};
	for (var n=fields.length, i=0; i<n; i++) {
		var name = fields[i];
		iface.prototype[name] = new Function('var node = this.baseBinding["' + name + '"](); if (node) { this.currentNode = node; Meeko.stuff.domSystem.attach(node); } return node;');
	}
	return iface;
}

Traversal.TreeWalker = Traversal._createInterface(["firstChild", "lastChild", "parentNode", "nextSibling", "previousSibling", "nextNode", "previousNode"]);
Traversal.TreeWalker.prototype.forEach = function(callback, context) { return this.baseBinding.forEach.call(this, callback, context); }
Traversal.NodeIterator = Traversal._createInterface(["nextNode", "previousNode"]);
Traversal.NodeIterator.prototype.forEach = function(callback, context) { return this.baseBinding.forEach.call(this, callback, context); }

Traversal.prototype.createTreeWalker = function(root, whatToShow, filter, entityReferenceExpansion) {
	var _filter = {};
	_filter.baseBinding = filter;
	_filter.acceptNode = function(node) {
		var lastDocumentNode = domWalker.currentNode;
		if (lastDocumentNode === node || lastDocumentNode.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING) {
			if (this.baseBinding) return this.baseBinding.acceptNode(node);
			else return NodeFilter.FILTER_ACCEPT;
		}
		else return NodeFilter.FILTER_REJECT;
	}
	var iter = new Traversal.TreeWalker();
	iter.baseBinding = document._createTreeWalker(root, whatToShow, _filter, entityReferenceExpansion);
	return iter;
}
Traversal.prototype.createNodeIterator = function(root, whatToShow, filter, entityReferenceExpansion) {
	var _filter = {};
	_filter.baseBinding = filter;
	_filter.acceptNode = function(node) {
		var lastDocumentNode = domWalker.currentNode;
		var cmp = (lastDocumentNode.compareDocumentPosition) ?
			lastDocumentNode.compareDocumentPosition(node) :
			Element.prototype.compareDocumentPosition.call(lastDocumentNode, node);
		if (lastDocumentNode === node || cmp & Node.DOCUMENT_POSITION_PRECEDING) {
			if (this.baseBinding) return this.baseBinding.acceptNode(node);
			else return NodeFilter.FILTER_ACCEPT;
		}
		else return NodeFilter.FILTER_REJECT;
	}
	var iter = new Traversal.NodeIterator();
	iter.baseBinding = document._createNodeIterator(root, whatToShow, _filter, entityReferenceExpansion);
	return iter;
}


var NodeList = function(target) {
	if (!(this instanceof arguments.callee)) return new arguments.callee(target);

	if (!(target && target.length != null)) throw "Target does not have NodeList interface"; 
	this.target = target;
	this.length = {
		target: target,
		valueOf: function() { return this.target.length; }
	};
}
NodeList.prototype.item = function(i) {
	var target = this.target;
	var node = (target.item) ? target.item(i) : target[i];
	if (node) Meeko.stuff.domSystem.attach(node);
	return node;
}
NodeList.prototype.forEach = function(fn, context) {
	var target = this.target;
	for (var n=target.length, i=0; i<n; i++) {
		var node = (target.item) ? target.item(i) : target[i];
		if (node) Meeko.stuff.domSystem.attach(node);
		fn.call(context, node, i);
	}
}

// FIXME
if (window.NodeList) window._NodeList = window.NodeList;
window.NodeList = NodeList; 

return domSystem;

})();




}
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM.xhtml'].requiredContexts.push('lib/Meeko/DOM/Core.xhtml');
Meeko.stuff.xplSystem.createContext('lib/Meeko/DOM/Core.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/Core.xhtml'].requiredContexts.push('lib/Meeko/Javascript-1.6/Javascript.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/Core.xhtml'].requiredContexts.push('lib/Meeko/DOM/System.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/Core.xhtml'].wrappedScript = function() {
	var xplSystem = Meeko.stuff.xplSystem;
	var xplContext = xplSystem.contexts['lib/Meeko/DOM/Core.xhtml'];
	var logger = xplContext.logger;
	


Meeko.stuff.xplSystem.createNamespace("Meeko.DOM.Core");
Meeko.DOM.Core = (function() {
	
var Node = function() {};
Node.ELEMENT_NODE = 1;
Node.ATTRIBUTE_NODE = 2;
Node.TEXT_NODE = 3;
Node.CDATA_SECTION_NODE = 4;
Node.ENTITY_REFERENCE_NODE = 5;
Node.ENTITY_NODE = 6;
Node.PROCESSING_INSTRUCTION_NODE = 7;
Node.COMMENT_NODE = 8;
Node.DOCUMENT_NODE = 9;
Node.DOCUMENT_TYPE_NODE = 10;
Node.DOCUMENT_FRAGMENT_NODE = 11;
Node.NOTATION_NODE = 12;

Node.DOCUMENT_POSITION_DISCONNECTED = 0x01;
Node.DOCUMENT_POSITION_PRECEDING = 0x02;
Node.DOCUMENT_POSITION_FOLLOWING = 0x04;
Node.DOCUMENT_POSITION_CONTAINS = 0x08;
Node.DOCUMENT_POSITION_CONTAINED_BY = 0x10;
Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 0x20;

var Text = function() {};

var Document = function() {};

Document.prototype.importNode = function(node, bDeep) {
	var document = this;
	var tree;
	switch (node.nodeType) {
		case Node.ELEMENT_NODE:
			tree = document.createElement(node.nodeName);
			var attrs = node.attributes;
			for (var i=0; i<attrs.length; i++) {
				var attr = attrs[i];
				tree.setAttribute(attr.nodeName, attr.nodeValue);
			};
			var children = node.childNodes;
			if (bDeep) for (var i=0; i<children.length; i++) {
				var child = children[i];
				tree.appendChild(document.importNode(child, true));
			};
			break;
		case Node.CDATA_SECTION_NODE:
		case Node.TEXT_NODE:
			tree = document.createTextNode(node.nodeValue);
			break;
	}
	return tree;
}

var Element = function() {}


var DOMException = function() {};

if (!document.documentElement.compareDocumentPosition && document.documentElement.contains) {

Element.prototype.compareDocumentPosition = function(node) {
	if (node == undefined) return 0x01; // Node.DOCUMENT_POSITION_DISCONNECTED;
	if (this === node) return 0;
	if (node.sourceIndex <= 0 || this.sourceIndex <= 0) return 0x01; // Node.DOCUMENT_POSITION_DISCONNECTED;
	if (node.contains(this)) return 0x0A; // Node.DOCUMENT_POSITION_CONTAINS | Node.DOCUMENT_POSITION_PRECEDING;
	if (this.contains(node)) return 0x14; // Node.DOCUMENT_POSITION_CONTAINED_BY | Node.DOCUMENT_POSITION_FOLLOWING;
	if (node.sourceIndex < this.sourceIndex) return 0x02; // Node.DOCUMENT_POSITION_PRECEDING;
	if (node.sourceIndex > this.sourceIndex) return 0x04; // Node.DOCUMENT_POSITION_FOLLOWING;
	return 0x01; // Node.DOCUMENT_POSITION_DISCONNECTED;
}

}


DOMException.INDEX_SIZE_ERR = 1;
DOMException.DOMSTRING_SIZE_ERR = 2;
DOMException.HIERARCHY_REQUEST_ERR = 3;
DOMException.WRONG_DOCUMENT_ERR = 4;
DOMException.INVALID_CHARACTER_ERR = 5;
DOMException.NO_DATA_ALLOWED_ERR = 6;
DOMException.NO_MODIFICATION_ALLOWED_ERR = 7;
DOMException.NOT_FOUND_ERR = 8;
DOMException.NOT_SUPPORTED_ERR = 9;
DOMException.INUSE_ATTRIBUTE_ERR = 10;
DOMException.INVALID_STATE_ERR = 11;
DOMException.SYNTAX_ERR = 12;
DOMException.INVALID_MODIFICATION_ERR = 13;
DOMException.NAMESPACE_ERR = 14;
DOMException.INVALID_ACCESS_ERR = 15;
DOMException.VALIDATION_ERR = 16;
DOMException.TYPE_MISMATCH_ERR = 17;


var DOMTokenList = function(getter, setter) { // TODO parameter checking
	this._getText = getter;
	this._setText = setter;
	this.valueOf = getter;
	this.toString = getter;
	this.length = {
		internal: this,
		valueOf: function() { return this.internal._getTokens().length },
		toString: function() { return String(this.valueOf()); }
	};
};
DOMTokenList.prototype.xblDestroy = function() { // FIXME is this needed??
	this.valueOf = null;
	this.toString = null;
	this._getText = null;
	this._setText = null;
	this.length.internal = null;
	this.length.valueOf = null;
	this.length.toString = null;
	this.length = null;
}
DOMTokenList.prototype.item = function(index) {
	return this._getTokens()[index];		
}
DOMTokenList.prototype.has = function(token) {
	return (-1 != Array.indexOf(this._getTokens(), token));
}
DOMTokenList.prototype.add = function(token) {
	var tokens = this._getTokens();
	if (!this.has(token)) {
		var text = this._getText().replace(/\s*$/, " " + token);
		this._setText(text);
	}
}
DOMTokenList.prototype.remove = function(token) {
	if (this.has(token)) {
		var rex, text = this._getText();
		rex = RegExp("\\s+"+token+"\\s+", "g");
		text = text.replace(rex, " ");
		rex = RegExp("^\\s*"+token+"\\s+");
		text = text.replace(rex, "");
		rex = RegExp("\\s+"+token+"\\s*$");
		text = text.replace(rex, "");
		if (text == token) text = "";
		this._setText(text);
	}		
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

return {
	Node: Node,
	Text: Text,
	Document: Document,
	Element: Element,
	DOMException: DOMException,
	DOMTokenList: DOMTokenList
};

})();

Meeko.XPL.Namespace.enhance(window, Meeko.DOM.Core);




}
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM.xhtml'].requiredContexts.push('lib/Meeko/DOM/Events.xhtml');
Meeko.stuff.xplSystem.createContext('lib/Meeko/DOM/Events.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/Events.xhtml'].requiredContexts.push('lib/Meeko/Javascript-1.6/Javascript.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/Events.xhtml'].requiredContexts.push('lib/Meeko/DOM/System.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/Events.xhtml'].requiredContexts.push('lib/Meeko/DOM/Core.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/Events.xhtml'].wrappedScript = function() {
	var xplSystem = Meeko.stuff.xplSystem;
	var xplContext = xplSystem.contexts['lib/Meeko/DOM/Events.xhtml'];
	var logger = xplContext.logger;
	


// FIXME refactor - this package has its fingers in everywhere and has back-doors for everything. Seriously yukky.
// FIXME confirm that preventDefault & stopPropagation actually work

Meeko.stuff.xplSystem.createNamespace("Meeko.DOM.Events");
Meeko.DOM.Events = (function() {

var privateKey = Math.random();

var w3cEventsTable = [
	{ type: "DOMActivate", bubbles: true, cancelable: true, module: "UIEvent" },
	{ type: "DOMFocusIn", bubbles: true, cancelable: false, module: "UIEvent" },
	{ type: "DOMFocusOut", bubbles: true, cancelable: false, module: "UIEvent" },
	{ type: "focus", bubbles: false, cancelable: false, module: "UIEvent" },
	{ type: "blur", bubbles: false, cancelable: false, module: "UIEvent" },
	{ type: "textInput", bubbles: true, cancelable: true, module: "TextEvent" },
	{ type: "click", bubbles: true, cancelable: true, module: "MouseEvent" },
	{ type: "dblclick", bubbles: true, cancelable: true, module: "MouseEvent" },
	{ type: "mousedown", bubbles: true, cancelable: true, module: "MouseEvent" },
	{ type: "mouseup", bubbles: true, cancelable: true, module: "MouseEvent" },
	{ type: "mouseover", bubbles: true, cancelable: true, module: "MouseEvent" },
	{ type: "mousemove", bubbles: true, cancelable: true, module: "MouseEvent" },
	{ type: "mouseout", bubbles: true, cancelable: true, module: "MouseEvent" },
	{ type: "keydown", bubbles: true, cancelable: true, module: "KeyboardEvent" },
	{ type: "keyup", bubbles: true, cancelable: true, module: "KeyboardEvent" },
	{ type: "mousemultiwheel", bubbles: true, cancelable: true, module: "MouseMultiWheelEvent" },
	{ type: "mousewheel", bubbles: true, cancelable: true, module: "MouseWheelEvent" },
	{ type: "DOMSubtreeModified", bubbles: true, cancelable: false, module: "MutationEvent" },
	{ type: "DOMNodeInserted", bubbles: true, cancelable: false, module: "MutationEvent" },
	{ type: "DOMNodeRemoved", bubbles: true, cancelable: false, module: "MutationEvent" },
	{ type: "DOMNodeRemovedFromDocument", bubbles: false, cancelable: false, module: "MutationEvent" },
	{ type: "DOMNodeInsertedIntoDocument", bubbles: false, cancelable: false, module: "MutationEvent" },
	{ type: "DOMAttrModified", bubbles: true, cancelable: false, module: "MutationEvent" },
	{ type: "DOMCharacterDataModified", bubbles: true, cancelable: false, module: "MutationEvent" },
	{ type: "DOMElementNameChanged", bubbles: true, cancelable: false, module: "MutationNameEvent" },
	{ type: "DOMAttributeNameChanged", bubbles: true, cancelable: false, module: "MutationNameEvent" },
	{ type: "load", bubbles: false, cancelable: false, module: "Event" },
	{ type: "unload", bubbles: false, cancelable: false, module: "Event" },
	{ type: "abort", bubbles: true, cancelable: false, module: "Event" },
	{ type: "error", bubbles: true, cancelable: false, module: "Event" },
	{ type: "select", bubbles: true, cancelable: false, module: "Event" },
	{ type: "change", bubbles: true, cancelable: false, module: "Event" },
	{ type: "submit", bubbles: true, cancelable: true, module: "Event" },
	{ type: "reset", bubbles: true, cancelable: true, module: "Event" },
	{ type: "resize", bubbles: true, cancelable: false, module: "UIEvent" },
	{ type: "scroll", bubbles: true, cancelable: false, module: "UIEvent" },
	{ type: "keypress", bubbles: true, cancelable: true, module: "KeyboardEvent" }, // non-standard
	{ type: "DOMContentLoaded", bubbles: true, cancelable: false, module: "Event" } // mozilla
];

var eventsByType = {};
for (var i=0, n=w3cEventsTable.length; i<n; i++) {
	var row = w3cEventsTable[i];
	var type = row["type"];
	eventsByType[type] = row;
}

var eventsByModule = {};
for (var i=0, n=w3cEventsTable.length; i<n; i++) {
	var row = w3cEventsTable[i];
	var type = row["type"];
	var module = row["module"];
	if (!eventsByModule[module]) eventsByModule[module] = {};
	eventsByModule[module][type] = row;
}


var w3cKeyIdentifiers = {
	"U+007F": 46, // Delete
	"U+0008": 8, // Backspace
	"U+001B": 27, // Escape
	Down: 40, End: 35, Enter: 13, Home: 36, Insert: 45,
	Left: 37, PageUp: 33, PageDown: 34, Right: 39, Up: 38,
	F1: 112, F2: 113, F3: 114, F4: 115, F5: 116, F6: 117, F7: 118, F8: 119, F9: 120, F10: 121, F11: 122, F12: 123
}

var keyIdentifiersByCode = {};
for (var keyId in w3cKeyIdentifiers) {
	var code = w3cKeyIdentifiers[keyId];
	keyIdentifiersByCode[code] = keyId;
}

var toHexDigit = "0123456789ABCDEF".split(/\s*/);
for (var i=0; i<=15; i++) {
	for (var j=0; j<=15; j++) {
		var hex = "" + toHexDigit[i] + toHexDigit[j];
		var code = Number("0x"+hex);
		var keyId = "U+00" + hex;
		if (!keyIdentifiersByCode[code]) keyIdentifiersByCode[code] = keyId;		
	}
}

var AppleWebKit = (/AppleWebKit/.test(navigator.userAgent)) ? Number(navigator.userAgent.match(/AppleWebKit\/([0-9]+\.[0-9]+)/)[1]) : null;
var safari2bouncyKeys;
if (AppleWebKit && AppleWebKit < 500) {
	safari2bouncyKeys = Object.copy({}, w3cKeyIdentifiers);
	delete safari2bouncyKeys["U+0008"];	
}

var EventState = function() {}
// These states are set by the EventSystem, so won't be valid for general use
EventState.DEFAULT_PREVENTED = 0x01; 
EventState.PROPAGATION_STOPPED = 0x02;
EventState.FAKE_EVENT = 0x04;
EventState.COMPATIBILITY_EVENT = 0x08;
EventState.FIXED_WINDOW_CAPTURING = 0x10;
EventState.FIXED_WINDOW_BUBBLING = 0x10;

var EventSystem = function() {
	var eventSystem = this;
	this.registeredEvents = {};
	this.keyEventHistory = [];
	if (window.addEventListener) {
		for (var type in EventSystem.handlers) (function(system, evType, handlers) {
			window.addEventListener(evType, function(event) { handlers[evType].call(system, event); }, true);
		})(this, type, EventSystem.handlers);
		for (var type in {"DOMContentLoaded": true, "load": true}) (function(system, evType, handlers) {
			document.addEventListener(evType, function(event) { handlers[evType].call(system, event); }, true);
			document.addEventListener(evType, function(event) { handlers[evType].call(system, event); }, false);
		})(this, type, EventSystem.handlers);
	}
}

EventSystem.prototype.handleEvent = function(event, currentTarget) {
	var target = currentTarget || event.currentTarget;
	var eventTarget = EventTarget(target);
	var rc = (eventTarget) ? eventTarget.handleEvent(event) : null;
	logger.debug((event.eventStatus & EventState.FAKE_EVENT ? "Compatibility" : "Browser") + " " + event.type + " event received" + (target == window ? " on window" : "") +
		" during " + (event.eventPhase == 1 ? "capture" : "bubbling") + " phase" + (eventTarget ? " and forwarded" : ""));
	return rc;
}
// FIXME the key-event handling is all a bit dodgy, relying on faked events and handling those properly
var keyEventFields = [ "type", "keyCode", "charCode", "keyIdentifier" ];
EventSystem.handlers = { // these handlers must always be called as handler.call(eventSystem, event)
	"load": function(event) {
		if (event.eventStatus & EventState.FAKE_EVENT) { // only let fake events thru
			if (event.eventPhase == 1) { // CAPTURE
				if (!(event.eventStatus & EventState.FIXED_WINDOW_CAPTURING)) { // re-route thru window unless already done
					this.handleEvent(event, window);
					event.eventStatus |= EventState.FIXED_WINDOW_CAPTURING;
				}
				var current = event.currentTarget || window;
				if (current != window) this.handleEvent(event, current);
			}
			else { // TARGET or BUBBLING
				var current = event.currentTarget || window;
				if (current != window) this.handleEvent(event, current);
				if (!(event.eventStatus & EventState.FIXED_WINDOW_BUBBING)) { // re-route thru window unless already done
					this.handleEvent(event, window);
					event.eventStatus |= EventState.FIXED_WINDOW_BUBBLING;
				}
			}
		}
		else {
			logger.debug("Browser load event received and blocked.");
			event.stopPropagation();				
		}
		return false;
	},
	"DOMContentLoaded": function(event) {
		if (event.eventStatus & EventState.FAKE_EVENT) { // only let fake events thru
			var current = event.currentTarget || window;
			this.handleEvent(event, current);
		}
		else {
			logger.debug("Browser DOMContentLoaded event received and blocked.");
			event.stopPropagation();				
		}
		return false;
	},
	"keydown": function(event) {
		var current = event.currentTarget || window;
		var keyId;
		if (event.keyIdentifier) keyId = event.keyIdentifier;
		else {
			keyId = keyIdentifiersByCode[event.keyCode || event.charCode]; // FIXME
			event.keyIdentifier = keyId;
		}
		var hist = this.keyEventHistory;
		var n = hist.length;
		var prev = (n) ? hist[n-1] : null;
		var repeat = 0;
		var delta = 1;
		if (safari2bouncyKeys && keyId in safari2bouncyKeys) { // TODO refactor
			repeat = -0.5;
			delta = 0.5;
		}
		if (prev && prev.type == "keydown") repeat = prev.repeat + delta;
		else if (prev && prev.type == "keypress") repeat = prev.repeat + delta;
		event.repeat = repeat;
		hist.push(Object.copy({ type: "keydown", repeat: repeat }, event, keyEventFields));
		if (event.eventStatus & EventState.DEFAULT_PREVENTED) event.preventDefault(); // signal from keypress
		if (repeat % 1) { // ignore bouncy key registrations
			event.stopPropagation();
		}
		else {
			this.handleEvent(event, current);
		}		
	},
	"keypress": function(event) {
		event.stopPropagation(); // NOTE there are no keypress events in DOM3 Events
		var keyId;
		if (event.keyIdentifier) keyId = event.keyIdentifier;
		else {
			keyId = keyIdentifiersByCode[event.charCode]; // FIXME
			event.keyIdentifier = keyId;
		}
		var hist = this.keyEventHistory;
		var n = hist.length;
		var prev = (n) ? hist[n-1] : null;
		var repeat = 0;
		var delta = 1;
		if (safari2bouncyKeys && keyId in safari2bouncyKeys) { // TODO refactor
			repeat = -0.5;
			delta = 0.5;
		}
		if (prev && prev.type == "keydown") repeat = prev.repeat;
		else if (prev && prev.type == "keypress") repeat = prev.repeat + delta;
		
		if (!(prev && prev.type == "keydown")) {
			var newEvent = document.createEvent("KeyboardEvent");
			newEvent.initKeyboardEvent("keydown", true, true, window, keyId, 0, "");						
			newEvent.eventStatus = 0x01 | 0x04 | 0x08; // DEFAULT_PREVENTED | FAKE_EVENT | COMPATIBILITY_EVENT: signal to keypress handler to prevent default
			event.target.dispatchEvent(newEvent);
		}
		hist.push(Object.copy({ type: "keypress", repeat: repeat }, event, keyEventFields));
//		if (!(keyId in w3cKeyIdentifiers)) { 
		if (event.charCode && !(event.metaKey || event.altKey || event.ctrlKey)) { // FIXME is this comprehensive?? 
			if (!AppleWebKit || AppleWebKit < 500) { // FIXME won't work when other browsers implement textInput events
				var newEvent = document.createEvent("TextEvent");
				newEvent.initTextEvent("textInput", true, true, window, String.fromCharCode(event.charCode)); // FIXME
				event.target.dispatchEvent(newEvent);
				if (newEvent.eventStatus & EventState.DEFAULT_PREVENTED) event.preventDefault();
			}
		}
	},
	"textInput": function(event) { // TODO should stopPropagation on browser textInput events
		var current = event.currentTarget || window;
		var hist = this.keyEventHistory;
		var n = hist.length;
		var prev = (n) ? hist[n-1] : null;
		if (prev && prev.type == "keydown") {
			this.handleEvent(event, current);
			hist.push(Object.copy({ type: "textInput" }, event, keyEventFields));
		}			
	},
	"keyup": function(event) {
		var current = event.currentTarget || window;
		var keyId;
		if (event.keyIdentifier) keyId = event.keyIdentifier;
		else {
			keyId = keyIdentifiersByCode[event.keyCode];
			event.keyIdentifier = keyId;
		}
		var hist = this.keyEventHistory;
		var n = hist.length;
		var prev = hist[n-1];
		if (prev && (prev.type != "keyup" || prev.keyIdentifier != keyId)) {
			hist.push(Object.copy({ type: "keyup" }, event, keyEventFields));
			this.handleEvent(event, current);
		}			
	},
	"DOMMouseScroll": function(event) {
		event.stopPropagation(); // NOTE no DOMMouseScroll events in DOM3 spec
		var newEvent = document.createEvent("MouseWheelEvent");
		var xplParams = [ "type", "bubbles", "cancelable", "view", "detail", "screenX", "screenY", "clientX", "clientY", "ctrlKey", "altKey", "shiftKey", "metaKey", "button", "relatedTarget", "wheelDelta" ]
		var n=xplParams.length;
		var eventArgs = [];
		eventArgs[0] = "mousewheel";
		for (var i=1; i<n-1; i++) {
			var name = xplParams[i];
			eventArgs[i] = event[name];
		}
		eventArgs[n-1] = -40 * event.detail; // FIXME is this valid?
		newEvent.initMouseWheelEvent.apply(newEvent, eventArgs);
		return event.target.dispatchEvent(newEvent);
	}
}

var eventSystem = new EventSystem;


EventSystem.prototype.registerEvent = function(type) {
	if (this.registeredEvents[type]) return;
	var systemListener = function(srcEvent) { // FIXME not sending w3c event
		var event = document.createEvent("Event");
		event.initEvent(srcEvent.type, srcEvent.bubbles, srcEvent.cancelable);
		Object.copy(event, srcEvent);
		eventSystem.dispatchEvent(srcEvent.srcElement, event);
		return event.returnValue;
	}

	var ieLookup = { // FIXME ensure all standard event properties are copied / created
		"DOMAttrModified": function() { // FIXME handled in addEventListener for now
		},
		"DOMActivate": { type: "activate", bubbles: true, cancelable: true },
		"DOMFocusIn": { type: "focusin", bubbles: true, cancelable: false },
		"DOMFocusOut": { type: "focusout", bubbles: true, cancelable: false },
		"keydown": function() {
			document.attachEvent("onkeydown", function(srcEvent) {
				var event = document.createEvent("UIEvent");
				event.initEvent("keydown", true, true);
				event.keyCode = srcEvent.keyCode;
				event.keyIdentifier = keyIdentifiersByCode[srcEvent.keyCode];
				event.returnValue = eventSystem.dispatchEvent(srcEvent.srcElement, event);
				return event.returnValue;
			});
		},
		"keyup": function() {
			document.attachEvent("onkeyup", function(srcEvent) {
				var event = document.createEvent("UIEvent");
				event.initEvent("keyup", true, true);
				event.keyCode = srcEvent.keyCode;
				event.keyIdentifier = keyIdentifiersByCode[srcEvent.keyCode];
				event.returnValue = eventSystem.dispatchEvent(srcEvent.srcElement, event);
				return event.returnValue;
			});
		},
		"textInput": function() {
			document.attachEvent("onkeypress", function(srcEvent) {
				var event = document.createEvent("UIEvent");
				event.initEvent("textInput", true, true);
				event.data = String.fromCharCode(srcEvent.keyCode);
				srcEvent.returnValue = eventSystem.dispatchEvent(srcEvent.srcElement, event);
			});
		},
		"focus": function() {
			document.attachEvent("onfocusin", function(srcEvent) {
				var event = document.createEvent("UIEvent");
				event.initEvent("focus", false, false);
				srcEvent.returnValue = eventSystem.dispatchEvent(srcEvent.srcElement, event);
			});
		},
		"blur": function() {
			document.attachEvent("onfocusout", function(srcEvent) {
				var event = document.createEvent("UIEvent");
				event.initEvent("blur", false, false);
				srcEvent.returnValue = eventSystem.dispatchEvent(srcEvent.srcElement, event);
			});
		},
		"mouseover": function() {
			document.attachEvent("onmouseover", function(srcEvent) {
				var event = document.createEvent("MouseEvent");
				MouseEvent.copyMouseEvent(event, srcEvent);
				event.relatedTarget = srcEvent.fromElement;
				srcEvent.returnValue = eventSystem.dispatchEvent(srcEvent.srcElement, event);
				event.relatedTarget = null;
			});
		},
		"mouseout": function() {
			document.attachEvent("onmouseout", function(srcEvent) {
				var event = document.createEvent("MouseEvent");
				MouseEvent.copyMouseEvent(event, srcEvent);
				event.relatedTarget = srcEvent.toElement;
				srcEvent.returnValue = eventSystem.dispatchEvent(srcEvent.srcElement, event);
				event.relatedTarget = null;
			});
		},
		"click": function() {
			document.attachEvent("onclick", function(srcEvent) {
				var event = document.createEvent("MouseEvent");
				MouseEvent.copyMouseEvent(event, srcEvent);
				event.button = ([ null, 0, 2, null, 1 ])[srcEvent.button];
				event.detail = 1; // FIXME
				srcEvent.returnValue = eventSystem.dispatchEvent(srcEvent.srcElement, event);
			});
		},
		"dblclick": function() {
			document.attachEvent("ondblclick", function(srcEvent) {
				var event = document.createEvent("MouseEvent");
				MouseEvent.copyMouseEvent(event, srcEvent);
				event.button = ([ null, 0, 2, null, 1 ])[srcEvent.button];
				event.detail = 2; // FIXME
				srcEvent.returnValue = eventSystem.dispatchEvent(srcEvent.srcElement, event);
			});
		},
		"mousewheel": function() {
			document.attachEvent("onmousewheel", function(srcEvent) {
				var event = document.createEvent("MouseWheelEvent");
				MouseWheelEvent.copyMouseWheelEvent(event, srcEvent);
				srcEvent.returnValue = eventSystem.dispatchEvent(srcEvent.srcElement, event);
			});
		}
	}

	var rego = ieLookup[type] || { type: type, bubbles: true, cancelable: true};

	if (typeof rego == "function") rego();
	else document.attachEvent("on"+rego.type, systemListener);
	this.registeredEvents[type] = true;
}

EventSystem.prototype.dispatchEvent = function(target, event) {
	this._dispatchEvent(target, event);
	event.currentTarget = null;
	event.target = null;
	return event.returnValue;
}

EventSystem.prototype._dispatchEvent = function(target, event) {
	event.target = target;
	var path = [];
	var current = target;
	if (target != window) {
		for (current=target; current!=document; current=current.parentNode) { // FIXME will fail for document fragments, etc
			path.push(current);
		}
		path.push(document);
	}
	path.push(window);

	function dispatch(current, event) {
		event.currentTarget = current;
		var eventTarget = EventTarget(current);
		if (eventTarget) eventTarget.handleEvent(event);		
	}
	
	event.eventPhase = Event.CAPTURING_PHASE;
	
	for (var n=path.length, i=n-1; i>0; i--) {
		dispatch(path[i], event);
		if (event.cancelBubble) return event.returnValue; 
	}

	event.eventPhase = Event.AT_TARGET;
	dispatch(path[0], event);
	if (event.cancelBubble) return event.returnValue;

	if (!event.bubbles) return event.returnValue;

	event.eventPhase = Event.BUBBLING_PHASE;
	for (var n=path.length, i=1; i<n; i++) {
		dispatch(path[i], event);
		if (event.cancelBubble) return event.returnValue; 
	}
	
	return event.returnValue;	
}

var Event = function(key) {
	if (key != privateKey) throw "Event is not a constructor";
};
Event.CAPTURING_PHASE = 1;
Event.AT_TARGET = 2;
Event.BUBBLING_PHASE = 3;
Event.prototype.initEvent = function(type, bubbles, cancelable) { // TODO check that event.type is appropriate for event-module
	this.eventStatus = 0;
	this.timeStamp = Number(new Date);
	this.type = type;
	this.bubbles = Boolean(bubbles);
	this.cancelable = Boolean(cancelable);
}

Event.prototype.preventDefault = function() { this.eventStatus |= EventState.DEFAULT_PREVENTED; }
Event.prototype.stopPropagation = function() { this.eventStatus |= EventState.PROPAGATION_STOPPED; }


var CustomEvent = function(key) {
	if (key != privateKey) throw "CustomEvent is not a constructor";
};
CustomEvent.prototype = new Event(privateKey);
CustomEvent.prototype.initCustomEvent = function(type, bubbles, cancelable, detail) {
	this.initEvent(type, bubbles, cancelable);
	this.detail = detail;
}

var UIEvent = function(key) {
	if (key != privateKey) throw "UIEvent is not a constructor";
};
UIEvent.prototype = new Event(privateKey);
UIEvent.prototype.initUIEvent = function(type, bubbles, cancelable, view, detail) {
	this.initEvent(type, bubbles, cancelable);
	this.view = view;
	this.detail = detail;
}

var TextEvent = function(key) {
	if (key != privateKey) throw "TextEvent is not a constructor";
};
TextEvent.prototype = new UIEvent(privateKey);
TextEvent.DOM_KEY_LOCATION_STANDARD = 0x00;
TextEvent.DOM_KEY_LOCATION_LEFT = 0x01;
TextEvent.DOM_KEY_LOCATION_RIGHT = 0x02;
TextEvent.DOM_KEY_LOCATION_NUMPAD = 0x03;
TextEvent.prototype.initTextEvent = function(type, bubbles, cancelable, view, data) {
	this.initUIEvent(type, bubbles, cancelable, view, 0);
	this.data = data;
}

var KeyboardEvent = function(key) {
	if (key != privateKey) throw "KeyboardEvent is not a constructor";
};
KeyboardEvent.prototype = new UIEvent(privateKey);
KeyboardEvent.DOM_KEY_LOCATION_STANDARD = 0x00;
KeyboardEvent.DOM_KEY_LOCATION_LEFT = 0x01;
KeyboardEvent.DOM_KEY_LOCATION_RIGHT = 0x02;
KeyboardEvent.DOM_KEY_LOCATION_NUMPAD = 0x03;
KeyboardEvent.prototype.initKeyboardEvent = function(type, bubbles, cancelable, view, keyIdentifier, keyLocation, modifierList) {
	this.initUIEvent(type, bubbles, cancelable, view, 0);
	this.keyIdentifier = keyIdentifier;
	this.keyLocation = keyLocation;
	this._modifiers = modifierList.split(" ");
	for (var n=this._modifiers.length, i=0; i<n; i++) {
		switch (this._modifiers[i]) {
			case "Alt": this.altKey = true; break;
			case "Control": this.ctrlKey = true; break;
			case "Meta": this.metaKey = true; break;
			case "Shift": this.shiftKey = true; break;
		}
	}
}
KeyboardEvent.prototype.getModifierState = function(keyIdentifier) {
	for (var n=this._modifiers.length, i=0; i<n; i++) {
		if (keyIdentifier == this._modifiers[i]) return true;
	}
	return false;
}

var MouseEvent = function(key) {
	if (key != privateKey) throw "MouseEvent is not a constructor";
};
MouseEvent.prototype = new UIEvent(privateKey);
MouseEvent.initArgs = [ "type", "bubbles", "cancelable", "view", "detail", "screenX", "screenY", "clientX", "clientY", "ctrlKey", "altKey", "shiftKey", "metaKey", "button", "relatedTarget" ];
MouseEvent.copyMouseEvent = function(dst, src) {
	var xplParams = MouseEvent.initArgs;
	var n = xplParams.length;
	var bubbles = (null != src.bubbles) ? src.bubbles : "true";
	var cancelable = (null != src.cancelable) ? src.cancelable : "true";
	var view = (null != src.view) ? src.view : window; // FIXME is this right?
	dst.initUIEvent(src.type, bubbles, cancelable, view, src.detail);
	for (var i=5; i<n; i++) {
		var name = xplParams[i];
		dst[name] = src[name];
	}
}
MouseEvent.prototype.initMouseEvent = function(type, bubbles, cancelable, view, detail, screenX, screenY, clientX, clientY, ctrlKey, altKey, shiftKey, metaKey, button, relatedTarget) {
	var xplParams = MouseEvent.initArgs;
	var n = xplParams.length;
	if (arguments.length < n) throw "Improper argument list in call to initMouseEvent";
	this.initUIEvent(type, bubbles, cancelable, view, detail);
	for (var i=5; i<n; i++) {
		var name = xplParams[i];
		this[name] = arguments[i];
	}
}

var MouseWheelEvent = function(key) {
	if (key != privateKey) throw "MouseWheelEvent is not a constructor";
};
MouseWheelEvent.initArgs = [ "type", "bubbles", "cancelable", "view", "detail", "screenX", "screenY", "clientX", "clientY", "ctrlKey", "altKey", "shiftKey", "metaKey", "button", "relatedTarget", "wheelDelta" ];
MouseWheelEvent.copyMouseWheelEvent = function(dst, src) {
	var xplParams = MouseWheelEvent.initArgs;
	var n = xplParams.length;
	var bubbles = (null != src.bubbles) ? src.bubbles : "true";
	var cancelable = (null != src.cancelable) ? src.cancelable : "true";
	var view = (null != src.view) ? src.view : window; // FIXME is this right?
	dst.initUIEvent(src.type, bubbles, cancelable, view, src.detail);
	for (var i=5; i<n; i++) {
		var name = xplParams[i];
		dst[name] = src[name];
	}
}
MouseWheelEvent.prototype = new MouseEvent(privateKey);
MouseWheelEvent.prototype.initMouseWheelEvent = function(type, bubbles, cancelable, view, detail, screenX, screenY, clientX, clientY, ctrlKey, altKey, shiftKey, metaKey, button, relatedTarget, wheelDelta) {
	var xplParams = MouseWheelEvent.initArgs;
	var n = xplParams.length;
	if (arguments.length < n) throw "Improper argument list in call to initMouseWheelEvent"; // FIXME
	this.initUIEvent(type, bubbles, cancelable, view, detail);
	for (var i=5; i<n; i++) {
		var name = xplParams[i];
		this[name] = arguments[i];
	}
}

var MutationEvent = function(key) {
	if (key != privateKey) throw "MutationEvent is not a constructor";
};
MutationEvent.MODIFICATION = 1;
MutationEvent.ADDITION = 2;
MutationEvent.REMOVAL = 3;
MutationEvent.prototype = new Event(privateKey);
MutationEvent.prototype.initMutationEvent = function(type, bubbles, cancelable) {
	var xplParams = [ "type", "bubbles", "cancelable", "relatedNode", "prevValue", "newValue", "attrName", "attrChange" ]
	var n = xplParams.length;
	// if (arguments.length < n) throw "Improper argument list in call to initMutationEvent"; // FIXME
	this.initEvent(type, bubbles, cancelable);
	for (var i=3; i<n; i++) {
		var name = xplParams[i];
		this[name] = arguments[i];
	}
}


var eventTemplates = {
	Event: new Event(privateKey),
	CustomEvent: new CustomEvent(privateKey),
	UIEvent: new UIEvent(privateKey),
	TextEvent: new TextEvent(privateKey),
	KeyboardEvent: new KeyboardEvent(privateKey),
	MouseEvent: new MouseEvent(privateKey),
	MouseWheelEvent: new MouseWheelEvent(privateKey),
	MutationEvent: new MutationEvent(privateKey)	
}

var eventModuleMap = {
	"Events": "Event",
	"HTMLEvents": "Event",
	"UIEvents": "UIEvent",
	"MouseEvents": "MouseEvent",
	"MutationEvents": "MutationEvent"
}


var DocumentEvent = function() {} // TODO Document.addImplementation(DocumentEvent);
if (document.createEvent) {{ // Upgrade if less than DOM3

DocumentEvent.prototype.createEvent = function(module) {
	var dom3Module = eventModuleMap[module] || module;
	var tmp = eventTemplates[dom3Module];
	if (!tmp) throw "Invalid event module: " + module;
	var event;
	var modules = [ dom3Module, module, "Event", "HTMLEvents" ];
	for (var n=modules.length, i=0; i<n; i++) {
		try { event = document._createEvent(modules[i]); } catch (error) { }
		if (event) break;
	}
	if (!event) throw "Could not create event in " + module;
	Object.copy(event, tmp);
	event.eventStatus |= EventState.FAKE_EVENT;
//	event.preventDefault = function() { Event.prototype.preventDefault.call(this); window.Event.prototype.preventDefault.call(this); }
//	event.stopPropagation = function() { Event.prototype.stopPropagation.call(this); window.Event.prototype.stopPropagation.call(this); }
	event._preventDefault = event.preventDefault;
	event._stopPropagation = event.stopPropagation;
	event.preventDefault = function() { Event.prototype.preventDefault.call(this); this._preventDefault(); }
	event.stopPropagation = function() { Event.prototype.stopPropagation.call(this); this._stopPropagation(); }
	return event;
}

var fail = false;
forEach (eventsByModule, function(dummy, module) {
	try {
		var event = document.createEvent(module);
		if (!event["init"+module]) fail = true;
	}
	catch (error) { fail = true; }
})
if (fail) {
	document._createEvent = document.createEvent;
	document.createEvent = DocumentEvent.prototype.createEvent;
}

}}

else if (document.createEventObject) {{

DocumentEvent.prototype.createEvent = function(module) {
	var dom3Module = eventModuleMap[module] || module;
	var tmp = eventTemplates[dom3Module];
	if (!tmp) throw "Invalid event module: " + module;
	var event = {}; // document.createEventObject(); TODO do we ever need IE event objects??
	Object.copy(event, tmp);
	event.eventStatus |= EventState.FAKE_EVENT;
	event.preventDefault = function() { Event.prototype.preventDefault.call(this); this.returnValue = false; }
	event.stopPropagation = function() { Event.prototype.stopPropagation.call(this); this.cancelBubble = true; }
	return event;
}

document.createEvent = DocumentEvent.prototype.createEvent;

}}


var GenericEventTarget = function(target, eventSystem) {
	this.target = target;
	this.eventSystem = eventSystem;
	this.listenerTable = {}; // lookup by this.listenerTable[type][Boolean(capture)][index]	
}
GenericEventTarget.prototype.xblDestroy = function(target) {
	this.target = null;
	this.eventSystem = null;
	this.listenerTable = null;
}
GenericEventTarget.prototype.handleEvent = function(event) {
	var capture = (event.eventPhase == Event.CAPTURING_PHASE) ? 1 : 0;
	var table = this.listenerTable[event.type];
	if (!table) return;
	var listeners = table[capture];
	for (var n=listeners.length, i=0; i<n; i++) {
		var listener = listeners[i];
		try {
			if (listener.handleEvent) return listener.handleEvent(event);
			else return listener(event);
		}
		catch (error) {
			logger.error("Error in event listener: " + error);
			return;
		}
	}
}

GenericEventTarget.prototype.addEventListener = function(type, listener, useCapture) {
	if (!this.listenerTable[type]) this.listenerTable[type] = [ [], [] ];
	var capture = (useCapture) ? 1 : 0;
	this.listenerTable[type][capture].push(listener);
}

GenericEventTarget.prototype.removeEventListener = function(type, listener, useCapture) {
	var capture = (useCapture) ? 1 : 0;
	var listeners = this.listenerTable[type][capture];
	for (var i=listeners.length-1; i>=0; i--) {
		if (listeners[i] == listener) {
			listeners.splice(i, 1);
			break;
		}
	}
}
GenericEventTarget.prototype.hasEventListener = function(type, listener, useCapture) {
	if (null == listener) {
		var tmp = this.listenerTable[type];
		if (!(tmp && (tmp[0] && tmp[0].length || tmp[1] && tmp[1].length))) return false;
	}
	var capture = (useCapture) ? 1 : 0;
	var listeners = this.listenerTable[type][capture];
	for (var i=listeners.length-1; i>=0; i--) {
		if (listeners[i] == listener) return true;
	}
	return false;
}
GenericEventTarget.prototype.dispatchEvent = function(event) {
	return this.eventSystem.dispatchEvent(this.target, event);
}

var EventTarget = function(target) {
	if (null == target) return null; // TODO throw ??
	if (this == window) return arguments.callee.getInterface(target);
	else arguments.callee.prototype.xblCreate.call(this, target);
}
EventTarget.interfaceLookup = new Array(13); // NOTE potentially one for every node type + Window
EventTarget.getInterface = function(target) {
	var nodeType = (target == window) ? 0 : target.nodeType;
	var lookup = this.interfaceLookup[nodeType];
	return (lookup) ? lookup(target) : null;	
}
EventTarget.methods = ["addEventListener", "removeEventListener", "dispatchEvent"];
EventTarget.prototype.xblCreate = function(target) {
	this.target = target;
	var xblPublic = EventTarget.methods;
	Meeko.stuff.domSystem.hideInterface(target, xblPublic);
	Meeko.stuff.domSystem.bindInterface(target, this, xblPublic, true); // NOTE override on W3C systems
	this.baseBinding = new GenericEventTarget(target, eventSystem);
	var eventTarget = this;
	this.eventListener = function(event) { eventTarget.handleEvent(event); }
}
EventTarget.prototype.xblDestroy = function(target) {
	this.target = null;
	this.eventListener = null;
	this.baseBinding.xblDestroy(target);
	var xblPublic = EventTarget.methods;
	Meeko.stuff.domSystem.releaseInterface(target, this, xblPublic, true);
	Meeko.stuff.domSystem.restoreInterface(target, xblPublic);
}
EventTarget.prototype.handleEvent = function(event) {
	this.baseBinding.handleEvent(event);
}

if (window.addEventListener) {{
EventTarget.interfaceLookup[0] = Meeko.stuff.domSystem.addImplementation("Window", EventTarget);
EventTarget.interfaceLookup[Node.DOCUMENT_NODE] = Meeko.stuff.domSystem.addImplementation("Document", EventTarget);
EventTarget.prototype.addEventListener = function(type, listener, useCapture) {
	if (!this.baseBinding.hasEventListener(type, null, useCapture)) {
		if (!EventSystem.handlers[type]) this.target._addEventListener(type, this.eventListener, useCapture);
	}
	this.baseBinding.addEventListener(type, listener, useCapture);
}
EventTarget.prototype.removeEventListener = function(type, listener, useCapture) {
	this.baseBinding.removeEventListener(type, listener, useCapture);
	if (!this.baseBinding.hasEventListener(type, null, useCapture)) {
		if (!EventSystem.handlers[type]) this.target._removeEventListener(type, this.eventListener, useCapture);
	}
}
EventTarget.prototype.dispatchEvent = function(event) { // FIXME this assumes that EventTarget is only attached to window or document
	if (this.target._dispatchEvent) this.target._dispatchEvent(event);
	else document.dispatchEvent(event);
}
}}
else if (window.attachEvent) {{
EventTarget.interfaceLookup[0] = Meeko.stuff.domSystem.addImplementation("Window", EventTarget);
EventTarget.interfaceLookup[Node.DOCUMENT_NODE] = Meeko.stuff.domSystem.addImplementation("Document", EventTarget);
EventTarget.interfaceLookup[Node.ELEMENT_NODE] = Meeko.stuff.domSystem.addImplementation("Element", EventTarget);
EventTarget.prototype._xblCreate = EventTarget.prototype.xblCreate;
EventTarget.prototype.xblCreate = function(target) {
	this._xblCreate(target);
	if (target.nodeType != Node.ELEMENT_NODE) return;
	this.onattrmodified = function(srcEvent) {
		var target = eventTarget.target;
		var attrName = srcEvent.propertyName;
		var newValue = target[attrName];
		switch (typeof newValue) {
			case "string": case "number": case "boolean": case "undefined": break;
			case "object": if (null === newValue) break;
			default: return;
		}
		var prevValue = this.prevValues[attrName];
		this.prevValues[attrName] = newValue;
		var attrChange = (newValue != null) ? ((prevValue != null) ? 1 : 2) : 3; // MODIFICATION, ADDITION, REMOVAL;
		var event = document.createEvent("MutationEvent");
		event.initMutationEvent("DOMAttrModified", true, false, null, prevValue, newValue, attrName, attrChange);
		event.target = target;
		event.eventPhase = 2; // AT_TARGET
		event.currentTarget = target;
		eventTarget.handleEvent(event);
		event.currentTarget = null;
		event.target = null;
	}
	this.prevValues = {}; // for onattrmodified
	var clone = this.target.cloneNode(false);
	var text = clone.outerHTML.replace(/^\S+/, "");
	var rex = /\s+([-_a-zA-Z0-9]+)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))(\>)?/g;
	RegExp.lastIndex = 0;
	var m;
	while (m = rex.exec(text)) {
		var attrName = m[1];
		var val = m[2]; if ("" == val) val = m[3]; if ("" == val) val = m[4];
		this.prevValues[attrName] = val;
		if (">" == m[5]) break; 
	}
}

EventTarget.prototype.addEventListener = function(type, listener, useCapture) {
	if (!this.baseBinding.hasEventListener(type)) {
		eventSystem.registerEvent(type);
		if (type == "DOMAttrModified") this.target.attachEvent("onpropertychange", this.onattrmodified);
	}
	this.baseBinding.addEventListener(type, listener, useCapture);
}
EventTarget.prototype.removeEventListener = function(type, listener, useCapture) {
	this.baseBinding.removeEventListener(type, listener, useCapture);
	if (type == "DOMAttrModified" && !this.baseBinding.hasEventListener(type)) this.target.detachEvent("onpropertychange", this.onattrmodified);
}
EventTarget.prototype.dispatchEvent = function(event) {
	eventSystem.dispatchEvent(this.target, event);
}
}}
else { throw "EventTarget only implemented with addEventListener of attachEvent"; }


if (!document.addEventListener && document.attachEvent) {{ // DOMMutation is only required on IE

var DOMMutation = function(target) {
	if (null == target) return null; // TODO throw ??
	if (this == window) return arguments.callee.getInterface(target);
	else arguments.callee.prototype.xblCreate.call(this, target);
}

DOMMutation.interfaceLookup = new Array(13); // NOTE potentially one for every node type + Window
DOMMutation.interfaceLookup[Node.DOCUMENT_NODE] = Meeko.stuff.domSystem.addImplementation("Document", DOMMutation);
DOMMutation.interfaceLookup[Node.ELEMENT_NODE] = Meeko.stuff.domSystem.addImplementation("Element", DOMMutation);
DOMMutation.getInterface = function(target) {
	var nodeType = (target == window) ? 0 : target.nodeType;
	var lookup = this.interfaceLookup[nodeType];
	return (lookup) ? lookup(target) : null;
}
DOMMutation.methods = ["insertBefore", "replaceChild", "removeChild", "appendChild", "cloneNode"];

DOMMutation.prototype.xblCreate = function(element) {
	var domMutation = this;
	this.boundElement = element;
	Meeko.stuff.domSystem.hideInterface(element, DOMMutation.methods);
	Meeko.stuff.domSystem.bindInterface(element, this, DOMMutation.methods, true);
	this.domMutation_listener = function(event) { domMutation.onpropertychange(event); }
	element.attachEvent("onpropertychange", this.domMutation_listener);
}
DOMMutation.prototype.xblDestroy = function() {
	var element = this.boundElement;
	element.detachEvent("onpropertychange", this.domMutation_listener);
	Meeko.stuff.domSystem.releaseInterface(element, this, DOMMutation.methods, true);
	Meeko.stuff.domSystem.restoreInterface(element, DOMMutation.methods);
}

DOMMutation.prototype.cloneNode = function(deep) {
	var element = this.boundElement;
	var lookup = {
		"thead": [ "table" ],
		"tbody": [ "table" ],
		"tfoot": [ "table" ],
		"colgroup": [ "table" ],
		"col": [ "table", "colgroup" ],
		"tr": [ "table" ],
		"td": [ "table", "tr" ],
		"option": [ "select" ],
		"li": [ "ul" ]
	}
	var tree = lookup[element.tagName.toLowerCase()];
	var frag = document.createElement("div");
	var begin = "", end = "";
	for (var n=tree.length, i=0; i<n; i++) begin += "<" + tree[i] + ">";
	for (var i=tree.length-1; i>=0; i--) end += "</" + tree[i] + ">";
	frag.innerHTML = begin + (deep ? element.outerHTML : element.cloneNode(false).outerHTML) + end;
	var clone = frag.firstChild;
	for (var i=0; i<tree.length; i++) {
		clone = clone.firstChild;
	}
	clone.parentNode.removeChild(clone);
	return clone;
}

DOMMutation.prototype.onpropertychange = function(event) {
	if (event.propertyName == "innerHTML") {
		var element = this.boundElement;
		// FIXME should have "DOMNodeRemoved" events too
		for (var node=element.firstChild; node; node=node.nextSibling) {
			if (Node.ELEMENT_NODE != node.nodeType) continue;
			if (node["_Element"]) continue; // FIXME orthogonality - how to tell if node is newly inserted??
			this.notify("DOMNodeInserted", node, element);
		}
	}
}
DOMMutation.prototype.insertBefore = function(node, ref) {
	var result = this.boundElement._insertBefore(node, ref);
	this.notify("DOMNodeInserted", node, this.boundElement); // FIXME
	return result;
}

DOMMutation.prototype.replaceChild = function(node, old) {
	this.notify("DOMNodeRemoved", old, this.boundElement); // FIXME
	var result = this.boundElement._replaceChild(node, old);
	this.notify("DOMNodeInserted", node, this.boundElement); // FIXME
	return result;
}

DOMMutation.prototype.removeChild = function(old) {
	var element = this.boundElement;
	this.notify("DOMNodeRemoved", old, this.boundElement); // FIXME
	var result = element._removeChild(old);
	return result;
}

DOMMutation.prototype.appendChild = function(node) {
	var result = this.boundElement._appendChild(node);
	this.notify("DOMNodeInserted", node, this.boundElement); // FIXME
	return result;
}

DOMMutation.prototype.notify = function(type, node) {
	if (!document.documentElement.contains(node)) return;
	var event = document.createEvent("MutationEvent");
	event.initMutationEvent(type, true, false, this.boundElement);
	eventSystem.dispatchEvent(node, event);
}

}}


if (!document.addEventListener && document.attachEvent) {{ // EventBubbler is only required on IE

var EventBubbler = function(target) {
	if (null == target) return null; // TODO throw ??
	if (this == window) return arguments.callee.getInterface(target);
	else arguments.callee.prototype.xblCreate.call(this, target);
}

EventBubbler.getInterface = Meeko.stuff.domSystem.addImplementation("HTMLFormElement", EventBubbler);
EventBubbler.xblRequired = function(node) { return true; }
EventBubbler.prototype.xblCreate = function(target) {
	this.target = target;
	var bubbler = this;
	this.eventBubbler_listener = function(srcEvent) {
		var event = document.createEvent("Event");
		event.initEvent(srcEvent.type, true, true);
		return eventSystem.dispatchEvent(srcEvent.srcElement, event);
	}
	target.attachEvent("onsubmit", this.eventBubbler_listener);
	target.attachEvent("onreset", this.eventBubbler_listener);
}

EventBubbler.prototype.xblDestroy = function(target) {
	target.detachEvent("onsubmit", this.eventBubbler_listener);
	target.detachEvent("onreset", this.eventBubbler_listener);
	this.eventBubbler_listener = null;
	this.target = null;
}

}}


Meeko.stuff.eventSystem = eventSystem; // FIXME back-door to virtually everything

return {
	Event: Event,
	CustomEvent: CustomEvent,
	UIEvent: UIEvent,
	TextEvent: TextEvent,
	KeyboardEvent: KeyboardEvent,
	MouseEvent: MouseEvent,
	MutationEvent: MutationEvent
}

})();

Meeko.XPL.Namespace.enhance(window, Meeko.DOM.Events);



}
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM.xhtml'].requiredContexts.push('lib/Meeko/DOM/Traversal.xhtml');
Meeko.stuff.xplSystem.createContext('lib/Meeko/DOM/Traversal.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/Traversal.xhtml'].requiredContexts.push('lib/Meeko/Javascript-1.6/Javascript.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/Traversal.xhtml'].requiredContexts.push('lib/Meeko/DOM/System.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/Traversal.xhtml'].requiredContexts.push('lib/Meeko/DOM/Core.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/Traversal.xhtml'].wrappedScript = function() {
	var xplSystem = Meeko.stuff.xplSystem;
	var xplContext = xplSystem.contexts['lib/Meeko/DOM/Traversal.xhtml'];
	var logger = xplContext.logger;
	

Meeko.stuff.xplSystem.createNamespace("Meeko.DOM.Traversal");
Meeko.DOM.Traversal = (function() {

var privateKey = Math.random();

var NodeFilter = function() {}
// Constants returned by acceptNode
NodeFilter.FILTER_ACCEPT = 1;
NodeFilter.FILTER_REJECT = 2;
NodeFilter.FILTER_SKIP = 3;

// Constants for whatToShow
NodeFilter.SHOW_ALL = 0xFFFFFFFF;
NodeFilter.SHOW_ELEMENT = 0x00000001;
NodeFilter.SHOW_ATTRIBUTE = 0x00000002;
NodeFilter.SHOW_TEXT = 0x00000004;
NodeFilter.SHOW_CDATA_SECTION = 0x00000008;
NodeFilter.SHOW_ENTITY_REFERENCE = 0x00000010;
NodeFilter.SHOW_ENTITY = 0x00000020;
NodeFilter.SHOW_PROCESSING_INSTRUCTION = 0x00000040;
NodeFilter.SHOW_COMMENT = 0x00000080;
NodeFilter.SHOW_DOCUMENT = 0x00000100;
NodeFilter.SHOW_DOCUMENT_TYPE = 0x00000200;
NodeFilter.SHOW_DOCUMENT_FRAGMENT = 0x00000400;
NodeFilter.SHOW_NOTATION = 0x00000800;

var TreeWalker = function(key) {
	if (key != privateKey) throw "TreeWalker is not a constructor";
}
TreeWalker.prototype._init = function() {
	var xplParams = [ "root", "whatToShow", "filter", "expandEntityReferences" ];
	var n = xplParams.length;
	// if (arguments.length < n) throw "Improper argument list in createTreeWalker"; // FIXME
	for (var i=0; i<n; i++) {
		var name = xplParams[i];
		this[name] = arguments[i];
	}
	if (Node.ATTRIBUTE_NODE == this.root.nodeType) { // FIXME
		this.root = null;
		throw "TreeWalker does not handle attributes";
	}
	if (this.filter && "function" != typeof this.filter.acceptNode) { // TODO what is appropriate here??
		logger.warn("filter parameter does not have valid acceptNode() for TreeWalker");
		this.filter = null; 
	}
	this.currentNode = this.root;
}
TreeWalker.prototype._acceptNode = function(node) {
	if (0x1 << (node.nodeType-1) & this.whatToShow) {
		return (this.filter) ?
			this.filter.acceptNode(node) : // FIXME assumes filter.acceptNode is valid
			NodeFilter.FILTER_ACCEPT;
	}
	else return NodeFilter.FILTER_SKIP;
}
TreeWalker.prototype.firstChild = function() {
	for (var node=this.currentNode.firstChild; node; node=node.nextSibling) {
		var rc = this._acceptNode(node);
		if (rc == NodeFilter.FILTER_ACCEPT) break;
	}
	if (node) this.currentNode = node;
	return node;
}
TreeWalker.prototype.lastChild = function() {
	for (var node=this.currentNode.lastChild; node; node=node.previousSibling) {
		var rc = this._acceptNode(node);
		if (rc == NodeFilter.FILTER_ACCEPT) break;
	}
	if (node) this.currentNode = node;
	return node;
}
TreeWalker.prototype.nextSibling = function() {
	for (var node=this.currentNode.nextSibling; node; node=node.nextSibling) {
		var rc = this._acceptNode(node);
		if (rc == NodeFilter.FILTER_ACCEPT) break;
	}
	if (node) this.currentNode = node;
	return node;
}
TreeWalker.prototype.previousSibling = function() {
	for (var node=this.currentNode.previousSibling; node; node=node.previousSibling) {
		var rc = this._acceptNode(node);
		if (rc == NodeFilter.FILTER_ACCEPT) break;
	}
	if (node) this.currentNode = node;
	return node;
}
TreeWalker.prototype.parentNode = function() {
	for (var node=this.currentNode.parentNode; node; node=node.parentNode) {
		var rc = this._acceptNode(node);
		if (rc == NodeFilter.FILTER_ACCEPT) break;
		if (node == this.root) return null; // don't step upwards from root
	}
	if (node) this.currentNode = node;
	return node;
}
TreeWalker.prototype.nextNode = function() {
	var node = this.currentNode;
	var reject = false;
	for (;;) {
		if (!reject && node.firstChild) node = node.firstChild;
		else for (; node; node=node.parentNode) {
			if (node == this.root) return null;
			if (!node.nextSibling) continue;
			node = node.nextSibling;
			break;
		}
		reject = false;
		var rc = this._acceptNode(node);
		if (rc == NodeFilter.FILTER_ACCEPT) break;
		if (rc == NodeFilter.FILTER_SKIP) continue;
		if (rc == NodeFilter.FILTER_REJECT) reject = true;
	}
	
	if (node) this.currentNode = node;
	return node;
}
TreeWalker.prototype.previousNode = function() {
	if (!this.root) throw "TreeWalker is not attached to DOM";
	if (!this.currentNode) return null;
	var prev = this.currentNode;
	for (;;) {
		var rc;
		if (node.previousSibling) {
			var node = node.previousSibling;
			rc = this._acceptNode(node);
			if (rc == NodeFilter.FILTER_REJECT) continue;
			if (node.lastChild) while (node.lastChild) node = node.lastChild;
		}
		else node = node.parentNode;		
		rc = this._acceptNode(node);
		if (rc == NodeFilter.FILTER_ACCEPT) break;
		if (node == this.root) return null;
	}
	
	if (node) this.currentNode = node;
	return node;
}
TreeWalker.forEach = function(iter, fn, context) {
	if (!iter.nextNode) throw "Object doesn't have TreeWalker interface";
	var node;
	while (node = iter.nextNode()) fn.call(context, node); // TODO try / catch??
}
TreeWalker.prototype.forEach = function(fn, context) {
	return TreeWalker.forEach(this, fn, context);
}

var NodeIterator = function(key) {
	if (key != privateKey) throw "NodeIterator is not a constructor";
}
NodeIterator.prototype._init = function() {
	var xplParams = [ "root", "whatToShow", "filter", "expandEntityReferences" ];
	var n = xplParams.length;
	// if (arguments.length < n) throw "Improper argument list in createNodeIterator"; // FIXME
	for (var i=0; i<n; i++) {
		var name = xplParams[i];
		this[name] = arguments[i];
	}
	if (Node.ATTRIBUTE_NODE == this.root.nodeType) { // FIXME
		this.root = null;
		throw "NodeIterator does not handle attributes";
	}
	if (this.filter && "function" != typeof this.filter.acceptNode) { // TODO what is appropriate here??
		logger.warn("filter parameter does not have valid acceptNode() for NodeIterator");
		this.filter = null; 
	}
	this.currentNode = null;
}
NodeIterator.prototype.nextNode = function() {
	if (!this.root) throw "NodeIterator is not attached to DOM";
	var next = (this.currentNode) ? this.currentNode : this.root;
	function nextNode(node) {
		if (node.firstChild) return node.firstChild;
		for (; node!=this.root; node=node.parentNode) {
			if (node.nextSibling) return node.nextSibling;	
		}
		return null;
	}
	do { // TODO expandEntityReferences
		if (!(0x1 << (next.nodeType-1) & this.whatToShow)) continue;
		if (this.filter) {
			var rc = this.filter.acceptNode(next);
			if (rc == NodeFilter.FILTER_ACCEPT) break;
			else continue;
		}
		break;
	} while (next = nextNode.call(this, next));
	
	if (next) this.currentNode = next;
	return next;
}
NodeIterator.prototype.previousNode = function() {
	if (!this.root) throw "NodeIterator is not attached to DOM";
	if (!this.currentNode) return null;
	var prev = this.currentNode;
	function prevNode(node) {
		if (node == this.root) return null;
		if (node.previousSibling) {
			node = node.previousSibling;
			while (node.lastChild) node = node.lastChild;
			return node;
		}
		return (node.parentNode);
	}
	while (prev = prevNode.call(this, prev)) {
		if (!(0x1 << (next.nodeType-1) & this.whatToShow)) continue;
		if (this.filter) {
			var rc = this.filter.acceptNode(next);
			if (rc == NodeFilter.FILTER_ACCEPT) break;
			else continue;
		}
		break;		
	}
	
	if (prev) this.currentNode = prev;
	return prev;
}
NodeIterator.prototype.detach = function() {
	this.root = null;	
}
NodeIterator.forEach = function(iter, fn, context) {
	if (!iter.nextNode) throw "Object doesn't have NodeIterator interface";
	var node;
	while (node = iter.nextNode()) fn.call(context, node); // TODO try / catch??
}
NodeIterator.prototype.forEach = function(fn, context) {
	return NodeIterator.forEach(this, fn, context);
}

var documentTraversal = {};
documentTraversal.createTreeWalker = function() {
	var instance = new TreeWalker(privateKey);
	instance._init.apply(instance, arguments);
	return instance;
}
documentTraversal.createNodeIterator = function() {
	var instance = new NodeIterator(privateKey);
	instance._init.apply(instance, arguments);
	return instance;
}

return {
	NodeFilter: NodeFilter,
	TreeWalker: TreeWalker,
	NodeIterator: NodeIterator,
	document: documentTraversal
}
})();

Meeko.XPL.Namespace.enhance(window, Meeko.DOM.Traversal);

try {{
var iter = document.createTreeWalker(document, NodeFilter.SHOW_ALL, null, false);
if (!iter.forEach) {
	document.__createTreeWalker = document.createTreeWalker;
	document.createTreeWalker = function(root, whatToShow, filter, entityReferenceExpansion) {
		// NOTE fix for Safari-3 which treats filter as an acceptNode() function
		var _filter = function(node) { return arguments.callee.acceptNode(node); }
		Object.copy(_filter, filter);
		var iter = this.__createTreeWalker(root, whatToShow, _filter, entityReferenceExpansion);
		// NOTE and add forEach method
		iter.forEach = TreeWalker.prototype.forEach;
		return iter;
	}
}
}}
catch (error) { document.createTreeWalker = Meeko.DOM.Traversal.document.createTreeWalker; }

try {{
var iter = document.createNodeIterator(document, NodeFilter.SHOW_ALL, null, false);
if (!iter.forEach) {
	document.__createNodeIterator = document.createNodeIterator;
	document.createNodeIterator = function(root, whatToShow, filter, entityReferenceExpansion) {
		// NOTE fix for Safari-3 which treats filter as an acceptNode() function
		var _filter = function(node) { return arguments.callee.acceptNode(node); }
		Object.copy(_filter, filter);
		var iter = this.__createNodeIterator(root, whatToShow, _filter, entityReferenceExpansion);
		// NOTE and add forEach method
		iter.forEach = NodeIterator.prototype.forEach;
		return iter;
	}
}
}}
catch (error) { document.createNodeIterator = Meeko.DOM.Traversal.document.createNodeIterator; }




}
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM.xhtml'].requiredContexts.push('lib/Meeko/DOM/HTML.xhtml');
Meeko.stuff.xplSystem.createContext('lib/Meeko/DOM/HTML.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/HTML.xhtml'].requiredContexts.push('lib/Meeko/Javascript-1.6/Javascript.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/HTML.xhtml'].requiredContexts.push('lib/Meeko/DOM/System.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/HTML.xhtml'].wrappedScript = function() {
	var xplSystem = Meeko.stuff.xplSystem;
	var xplContext = xplSystem.contexts['lib/Meeko/DOM/HTML.xhtml'];
	var logger = xplContext.logger;
	


Meeko.stuff.xplSystem.createNamespace("Meeko.DOM.HTML");
Meeko.DOM.HTML = (function() {

// make abbr and output parse on Internet Explorer
document.createElement("abbr");
document.createElement("output");

var HTMLCollection = function() {}
var HTMLOptionsCollection = function() {}
var HTMLDocument = function() {};
var HTMLElement = function() {}

if (document.documentElement.classList == null) {{

var HTML5Element = function(target) {
	if (null == target) return null; // TODO throw ??
	if (this == window) return null;
	else arguments.callee.prototype.xblCreate.call(this, target);
}
HTML5Element.prototype.xblCreate = function(target) {
	this.boundElement = target;
	this.getClassName = function() { return this.boundElement.className; };
	this.setClassName = function(val) { this.boundElement.className = val; };
	var binding = this;
	this.classList = new DOMTokenList(function() { return binding.getClassName(); }, function(val) { binding.setClassName(val); });
	Meeko.stuff.domSystem.bindInterface(target, this, ["classList"]);
}
HTML5Element.prototype.xblDestroy = function(target) {
	// FIXME Meeko.stuff.domSystem.unbindInterface()
	this.boundElement.classList = null;
	this.classList.xblDestroy(); // FIXME is this necessary
	this.boundElement = null;
}

Meeko.stuff.domSystem.addImplementation("HTMLElement", HTML5Element);
}}


return {
	HTMLCollection: HTMLCollection,
	HTMLOptionsCollection: HTMLOptionsCollection,
	HTMLDocument: HTMLDocument,
	HTMLElement: HTMLElement
};

})();

//Meeko.XPL.Namespace.enhance(window, Meeko.DOM.HTML);




}
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM.xhtml'].requiredContexts.push('lib/Meeko/DOM/Selectors.xhtml');
Meeko.stuff.xplSystem.createContext('lib/Meeko/DOM/Selectors.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/Selectors.xhtml'].requiredContexts.push('lib/Meeko/Javascript-1.6/Javascript.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/Selectors.xhtml'].requiredContexts.push('lib/Meeko/CSS.xhtml');
Meeko.stuff.xplSystem.createContext('lib/Meeko/CSS.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/CSS.xhtml'].requiredContexts.push('lib/Meeko/Javascript-1.6/Javascript.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/CSS.xhtml'].wrappedScript = function() {
	var xplSystem = Meeko.stuff.xplSystem;
	var xplContext = xplSystem.contexts['lib/Meeko/CSS.xhtml'];
	var logger = xplContext.logger;
	


/* 
CSS Parser
Copyright October 2007, Sean Hogan (http://www.meekostuff.net/)
All rights reserved
*/

/*
This API and implementation is a Frankenstein of:
1. W3C Simple API for CSS
	http://www.w3.org/TR/SAC
	http://www.w3.org/Style/CSS/SAC/doc/org/w3c/css/sac/package-summary.html
2. CSS Editing and Selectors Object Models
	Daniel Glazman
	http://daniel.glazman.free.fr/csswg/csseom/csseom-0.00-01.htm
3. XPath model: axis/node-test/predicate
*/

/*
TODO
- stylesheet & property parsing
*/

if (!this.Meeko) this.Meeko = {};

Meeko.CSS = (function() {	


var Parser = function() {
	this.conditionFactory = _conditionFactory;
}

Parser.prototype.parseSelectors = function(text)
{
	var selectorList = this._parseSelectors(text);
	Array.forEach (selectorList, function(selector) {
		selector.__refresh();
	});
	return selectorList;
}

Parser.prototype._parseSelectors = function(selectorText) { // TODO error handling
	var text = selectorText;

	var cf = this.conditionFactory;
	
	var selectorList = [];
	var selector = new Selector();
	var relSelector = new RelativeSelector();
	relSelector.relationType = RelativeSelector.DESCENDANT_RELATIVE;
	var ci = null; // current Condition

	function mergeCondition(c) {
		relSelector.addCondition(c);
	}

	var ns = null;
	var name = null;

	var state = 0;

	do {
		var m = null;

		switch (state) {
			case 0:
				m = /^\s*/.exec(text);
				if (m) {
					state = 1;
					text = text.substr(m[0].length);
					break;
				}
				break;
		
			case 1:
				// Element / Universal
				m = /^(\*|[a-zA-Z0-9_]+)(\|(\*|[a-zA-Z0-9_-]+))?/.exec(text);
				if (m) {
					if (m[3]) {	ns = m[1]; name = m[3];	}
					else { ns = null; name = m[1]; }
					ci = cf.createNodeTestCondition(name, ns);
					mergeCondition(ci);
					state = 2;
					text = text.substr(m[0].length);
					break;
				}
		
			case 2:
				// ID
				m = /^#([a-zA-Z0-9_-]+)/.exec(text);
				if (m) {
					ci = cf.createIdCondition(m[1]);
					mergeCondition(ci);
					state = 2;
					text = text.substr(m[0].length);
					break;
				}
	
				// Class
				m = /^\.([a-zA-Z0-9_-]*)/.exec(text);
				if (m) {
					ci = cf.createClassCondition(null, m[1]);
					mergeCondition(ci);
					state = 2;
					text = text.substr(m[0].length);
					break;
				}
	
				// Attribute
				m = /^\[\s*([a-z0-9_-]+)(\|([a-z0-9_-]+))?\s*(([~|^$*]?=)\s*("([^"]*)"|'([^']*)'|(\S+))\s*)?\]/.exec(text);
				if (m) {
					if (m[3]) { ns = m[1]; name = m[3]; }
					else { ns = null; name = m[1]; }
					if (m[4]) {
						value = m[7] || m[8] || m[9];
						switch(m[5]) {
							case "~=": ci = cf.createOneOfAttributeCondition(name, ns, true, value); break;
							case "|=": ci = cf.createBeginHyphenAttributeCondition(name, ns, true, value); break;
							case "^=": ci = cf.createStartsWithAttributeCondition(name, ns, true, value); break;
							case "$=": ci = cf.createEndsWithAttributeCondition(name, ns, true, value); break;
							case "*=": ci = cf.createContainsAttributeCondition(name, ns, true, value); break;
							case "=": ci = cf.createAttributeCondition(name, ns, true, value); break;
						}
					}
					else {
						ci = cf.createAttributeCondition(name, ns, false, null);
					}
	
					mergeCondition(ci);
					state = 2;
					text = text.substr(m[0].length);
					break;
				}
				
				// Pseudo-element. FIXME
				m = /^::([a-zA-Z_-]+)/.exec(text) ||
					/^:(first-line)/.exec(text) ||
					/^:(first-letter)/.exec(text) ||
					/^:(before)/.exec(text) ||
					/^:(after)/.exec(text);	
				if (m) {
					ci = cf.createPseudoElementCondition(m[1]);
					mergeCondition(ci);
					state = 3;
					text = text.substr(m[0].length);
					break;
				}
				
				// Only-child. FIXME
				m = /^:only-(child|of-type)/.exec(text);
				if (m) {
					var same_type = ("of-type" == m[1]);
					ci = (same_type) ? cf.createOnlyTypeCondition() : cf.createOnlyChildCondition();
					mergeCondition(ci);
					state = 2;
					text = text.substr(m[0].length);
					break;
				}
				
				// Positionals. FIXME
				m = /^:first-(child|of-type)/.exec(text);
				if (m) {
					var same_type = ("of-type" == m[1]);
					var a = 0, b = 0;
					ci = cf.createPositionalCondition([a, b], same_type, true);
					mergeCondition(ci);
					state = 2;
					text = text.substr(m[0].length);
					break;
				}
				
				m = /^:nth-(child|of-type)\(/.exec(text);
				if (m) {
					var same_type = ("of-type" == m[1]);
					text = text.substr(m[0].length);
					m = /^\s*(odd|even)\s*\)/.exec(text); // TODO an+b
					var a = 0, b = 0;
					switch (m[1]) {
						case "even": a = 2; b = 0; break;
						case "odd": a = 2; b = 1; break;
					}
					ci = cf.createPositionalCondition([a, b], same_type, true);
					mergeCondition(ci);
					state = 2;
					text = text.substr(m[0].length);
					break;
				}
					
				
				// Pseudo-class.  FIXME
				m = /^:([a-zA-Z_-]+)/.exec(text);
				if (m) {
					ci = cf.createPseudoClassCondition(null, m[1]);
					mergeCondition(ci);
					state = 2;
					text = text.substr(m[0].length);
					break;
				}
				
			case 3:
				// Selector grouping
				m = /^\s*,/.exec(text);
				if (m) {
					selector.addStep(relSelector);
					selectorList.push(selector);

					relSelector = new RelativeSelector();
					relSelector.relationType = RelativeSelector.DESCENDANT_RELATIVE;
					selector = new Selector();

					state = 0;
					text = text.substr(m[0].length);
					break;
				}
		
			case 4:
				// Combinators
				m = /^\s*([\s>~+])/.exec(text);
				if (m) {
					selector.addStep(relSelector);

					relSelector = new RelativeSelector();
					switch (m[1]) {
						case ">": relSelector.relationType = RelativeSelector.CHILD_RELATIVE; break;
						case "~": relSelector.relationType = RelativeSelector.INDIRECT_ADJACENT_RELATIVE; break;
						case "+": relSelector.relationType = RelativeSelector.DIRECT_ADJACENT_RELATIVE; break;
						default /* case "\s" */: relSelector.relationType = RelativeSelector.DESCENDANT_RELATIVE; break;
					}
					
					state = 0;
					text = text.substr(m[0].length);
					break;
				}
				
				break;
		}

		
	} while (text.length && m);
	
	selector.addStep(relSelector);
	selectorList.push(selector);
	
	return selectorList;
}


// FIXME how to implement SelectorList magic?
var SelectorList = function() {}
SelectorList.prototype.addSelector = function(selector) {
	this.push(selector);
}

SelectorList.prototype.test = function(element) {
	var n = this.length;
	for (var i=0; i<n; i++) {
		var selector = this[i];
		var rc = selector.test(element);
		if (rc) return true;
	}
	return false;
}


/*
interface Selector {
	RelativeSelector steps[];
	Specificity specifity;
}
*/
var Selector = function() {
	this.steps = [];
	this.specificity = new Specificity();
}

Selector.prototype.__refresh = function() {
	this.specificity = Selector.__get_specificity(this);
}

Selector.__get_specificity = function(selector) {
	var aCount = 0, bCount = 0, cCount = 0;
	Array.forEach (selector.steps, function(step) {
		Array.forEach (step.conditions, function(condition) {
			switch (condition.conditionType) {
				case Condition.NODE_TEST_CONDITION:
					if (/* Node.ELEMENT_NODE */ 1 == condition.nodeType && condition.localName && "*" != condition.localName) cCount++;
					break;
				case Condition.ID_CONDITION:
					aCount++;
					break;
				case Condition.PSEUDO_ELEMENT_CONDITION:
					break;
				default:
					bCount++;
					break;
			}
		});
	});
	return new Specificity(aCount, bCount, cCount);
}

Selector.prototype.addStep = function(step) {
	if (step instanceof RelativeSelector) this.steps.push(step);
	else throw "Error in Selector.addStep";
}

Selector.prototype.test = function(element) {
	var curElt = element;
	var rel = null;
	var n = this.steps.length;
	with (RelativeSelector) for (var i=n-1; i>=0; i--) {
		var step = this.steps[i];
		do {
			var rc = step.test(curElt);
			switch (rel) {
				default:
					if (!rc) return false; // no more chances
					else rel = null; // NOTE rel is already null
					break;
				case DESCENDANT_RELATIVE:
					if (!rc) { // keep trying ancestors unless already at top of tree
						if (/* Node.DOCUMENT_NODE */ 9 == curElt.parentNode) return false; // can't go any higher
						curElt = curElt.parentNode;
						if (!curElt) return false; // NOTE this could only happen in an unattached tree
					}
					else rel = null;
					break;
				case CHILD_RELATIVE:
					if (!rc) return false; // no second chance
					else rel = null;
					break;
				case INDIRECT_ADJACENT_RELATIVE:
					if (!rc) { // keep trying preceding-siblings
						curElt = curElt.previousSibling;
						if (!curElt) return false;
					}
					else rel = null;
					break;
				case DIRECT_ADJACENT_RELATIVE:
					if (!rc) return false; // no second chance
					else rel = null;
					break;
			}
		} while (rel);
		rel = step.relationType;
		switch (rel) {
			default: break;
			case DESCENDANT_RELATIVE: case CHILD_RELATIVE:
				if (/* Node.DOCUMENT_NODE */ 9 == curElt.parentNode) return false; // can't go any higher
				curElt = curElt.parentNode;
				if (!curElt) return false;
				break;
			case INDIRECT_ADJACENT_RELATIVE: case DIRECT_ADJACENT_RELATIVE:
				while (curElt = curElt.previousSibling) {
					if (/* Node.ELEMENT_NODE */ 1 == curElt.nodeType) break;
				}
				if (!curElt) return false;
				break;
		}
	}
	return true;
}



/*
interface Specificity {
	int aCount;
	int bCount;
	int cCount;
}
*/
var Specificity = function(a,b,c) {
	this.aCount = a || 0;
	this.bCount = b || 0;
	this.cCount = c || 0;
}

Specificity.cmp = function(first, second) {
	if (first.aCount > second.aCount) return 1;
	if (first.aCount < second.aCount) return -1;
	if (first.bCount > second.bCount) return 1;
	if (first.bCount < second.bCount) return -1;
	if (first.cCount > second.cCount) return 1;
	if (first.cCount < second.cCount) return -1;
	return 0;
}

/*
interface RelativeSelector {
	int relationType;
	Condition conditions[];
}
*/
var RelativeSelector = function() {
	this.relationType = null;
	this.conditions = [];
}
RelativeSelector.NO_RELATIVE = 0;
RelativeSelector.DESCENDANT_RELATIVE = 1;
RelativeSelector.CHILD_RELATIVE = 2;
RelativeSelector.DIRECT_ADJACENT_RELATIVE = 3;
RelativeSelector.INDIRECT_ADJACENT_RELATIVE = 4;

RelativeSelector.prototype.addCondition = function(condition) {
	if (condition instanceof Condition) this.conditions.push(condition);
	else throw "Error in RelativeSelector.addCondition";
}

RelativeSelector.prototype.test = function(element) {
	var n = this.conditions.length;
	for (var i=0; i<n; i++) {
		var rc = this.conditions[i].test(element);
		if (!rc) return false;
	}
	return true;
}


/*
interface Condition {
	int conditionType;
	int nodeType;
	boolean negativeCondition;
}
*/
var Condition = function() {}
Condition.NODE_TEST_CONDITION = 1;
Condition.ID_CONDITION = 2;
Condition.CLASS_CONDITION = 3;
Condition.PSEUDO_ELEMENT_CONDITION = 4;
Condition.ATTRIBUTE_CONDITION = 5;
Condition.ONE_OF_ATTRIBUTE_CONDITION = 6;
Condition.BEGIN_HYPHEN_ATTRIBUTE_CONDITION = 7;
Condition.STARTS_WITH_ATTRIBUTE_CONDITION = 8;
Condition.ENDS_WITH_ATTRIBUTE_CONDITION = 9;
Condition.CONTAINS_ATTRIBUTE_CONDITION = 10;
Condition.LANG_CONDITION = 11;
Condition.ONLY_CHILD_CONDITION = 12;
Condition.ONLY_TYPE_CONDITION = 13;
Condition.POSITIONAL_CONDITION = 14;
Condition.PSEUDO_CLASS_CONDITION = 15;
Condition.IS_ROOT_CONDITION = 16;
Condition.IS_EMPTY_CONDITION = 17;


Condition.prototype.test = function(element) { // TODO namespace handling
	var attrValue;
	switch (this.conditionType) {
		case Condition.NODE_TEST_CONDITION:
			if (/* Node.ELEMENT_NODE */ 1 != this.nodeType) return false; // TODO should we allow tests for other node types?
			if (!this.localName || "*" == this.localName) return true;
			if (element.tagName.toLowerCase() == this.localName.toLowerCase()) return true;
			return false;
			break;
		case Condition.ID_CONDITION:
			attrValue = element.getAttribute("id"); // TODO what about other namespaces where ID != @id?
			if (attrValue == this.value) return true;
			return false;
			break;
		case Condition.CLASS_CONDITION:
			var rex = new RegExp(" "+this.value+" ");
			var attrValue = element.className;
			if (rex.test(" "+attrValue+" ")) return true;
			return false;
			break;
		case Condition.PSEUDO_CLASS_CONDITION: // TODO
			break;
		case Condition.PSEUDO_ELEMENT_CONDITION: // TODO
			break;
		case Condition.LANG_CONDITION: // TODO
			break;
		case Condition.ONLY_CHILD_CONDITION: // TODO
			break;
		case Condition.ONLY_TYPE_CONDITION: // TODO
			break;
		case Condition.POSITIONAL_CONDITION: // TODO
			break;
		case Condition.IS_ROOT_CONDITION:
			if (/* Node.DOCUMENT_NODE */ 9 == element.parentNode) return true;
			return false;
			break;
		case Condition.IS_EMPTY_CONDITION: // FIXME does this fulfil the spec?
			if (0 == element.childNodes.length) return true;
			return false;
			break;
		case Condition.ATTRIBUTE_CONDITION:
			if (!this.specified || null == this.value) return true;
			attrValue = element.getAttribute(this.localName);
			if (attrValue == this.value) return true;
			return false;
			break;
		case Condition.ONE_OF_ATTRIBUTE_CONDITION:
			var rex = new RegExp(" "+this.value+" ");
			attrValue = element.getAttribute(this.localName);
			if (rex.test(" "+attrValue+" ")) return true;
			return false;
			break;
		case Condition.BEGIN_HYPHEN_ATTRIBUTE_CONDITION:
			attrValue = element.getAttribute(this.localName);
			if (attrValue == this.value) return true;
			var rex = new RegExp("^"+this.value+"-");
			if (rex.test(" "+attrValue+" ")) return true;
			return false;
			break;
		case Condition.STARTS_WITH_ATTRIBUTE_CONDITION:
			var rex = new RegExp("^"+this.value);
			attrValue = element.getAttribute(this.localName);
			if (rex.test(attrValue)) return true;
			return false;
			break;
		case Condition.ENDS_WITH_ATTRIBUTE_CONDITION:
			var rex = new RegExp(this.value+"$");
			attrValue = element.getAttribute(this.localName);
			if (rex.test(attrValue)) return true;
			return false;
			break;
		case Condition.CONTAINS_ATTRIBUTE_CONDITION:
			var rex = new RegExp(this.value);
			attrValue = element.getAttribute(this.localName);
			if (rex.test(attrValue)) return true;
			return false;
			break;	
	}
	throw "Error in Condition.test()"; 
}


var _conditionFactory = {

	createNodeTestCondition: function(name, ns) {
		var c = new Condition();
		c.conditionType = Condition.NODE_TEST_CONDITION;
		c.nodeType = 1/* Node.ELEMENT_NODE */;
		c.localName = name;
		c.namespaceURI = ns;
		return c;
	},
	
	createIdCondition: function(value) {
		var c = new Condition();
		c.conditionType = Condition.ID_CONDITION;
		c.value = value;
		return c;
	},

	createClassCondition: function(ns, value) {
		var c = new Condition();
		c.conditionType = Condition.CLASS_CONDITION;
		c.namespaceURI = ns; // TODO is this relavent?
		c.value = value;
		return c;
	},

	createAttributeCondition: function(name, ns, specified, value, conditionType) {
		var c = new Condition();
		c.conditionType = conditionType || Condition.ATTRIBUTE_CONDITION;
		c.localName = name;
		c.namespaceURI = ns;
		c.specified = specified;
		c.value = value;
		return c;
	},

	createBeginHyphenAttributeCondition: function(name, ns, specified, value) {
		return this.createAttributeCondition(name, ns, specified, value, Condition.BEGIN_HYPHEN_ATTRIBUTE_CONDITION);
	},

	createOneOfAttributeCondition: function(name, ns, specified, value) {
		return this.createAttributeCondition(name, ns, specified, value, Condition.ONE_OF_ATTRIBUTE_CONDITION);
	},

	createStartsWithAttributeCondition: function(name, ns, specified, value) {
		return this.createAttributeCondition(name, ns, specified, value, Condition.STARTS_WITH_ATTRIBUTE_CONDITION);
	},

	createEndsWithAttributeCondition: function(name, ns, specified, value) {
		return this.createAttributeCondition(name, ns, specified, value, Condition.ENDS_WITH_ATTRIBUTE_CONDITION);
	},

	createContainsAttributeCondition: function(name, ns, specified, value) {
		return this.createAttributeCondition(name, ns, specified, value, Condition.CONTAINS_ATTRIBUTE_CONDITION);
	},

	createOnlyChildCondition: function() {
		// TODO
	},

	createPositionalCondition: function(position, typeNode, type) {
		// TODO
	},

	createPseudoClassCondition: function(ns, value) {
		// TODO
	}
	
}



return {
	Parser: Parser,
	SelectorList: SelectorList,
	Selector: Selector,
	Specificity: Specificity,
	RelativeSelector: RelativeSelector,
	Condition: Condition
}


})();



}
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/Selectors.xhtml'].requiredContexts.push('lib/Meeko/DOM/System.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM/Selectors.xhtml'].wrappedScript = function() {
	var xplSystem = Meeko.stuff.xplSystem;
	var xplContext = xplSystem.contexts['lib/Meeko/DOM/Selectors.xhtml'];
	var logger = xplContext.logger;
	


Meeko.stuff.xplSystem.createNamespace("Meeko.DOM.Selectors");
Meeko.DOM.Selectors = (function() {

var NodeSelector = function(target) {
	if (!(this instanceof arguments.callee)) return new arguments.callee(target);

	if (target) {
		if (target.nodeType) this._target = target;
		else throw "Target does not have NodeSelector interface";
	}
}
NodeSelector.querySelector = function(target, selectorText) { return NodeSelector(target).querySelector(selectorText); }
NodeSelector.querySelectorAll = function(target, selectorText) { return NodeSelector(target).querySelectorAll(selectorText); }
NodeSelector.prototype.querySelector = function(selectorText) {
	var target = this._target || this;
	if (null == selectorText) return false;
	return getElementsBySelector(target, selectorText, true);
}
NodeSelector.prototype.querySelectorAll = function(selectorText) {
	var target = this._target || this;
	if (null == selectorText) return false;
	return getElementsBySelector(target, selectorText, false);
}
var ElementSelector = function(target) {
	if (!(this instanceof arguments.callee)) return new arguments.callee(target);

	if (target) {
		if (target.nodeType == Node.ELEMENT_NODE) this._target = target;
		else throw "Target does not have ElementSelector interface"; 
	}
}
ElementSelector.prototype = new NodeSelector();
ElementSelector.matchesSelector = function(target, selectorText) { return ElementSelector(target).matchesSelector(selectorText); }
ElementSelector.prototype.matchesSelector = function(selectorText) {
	var target = this._target || this;
	if (null == selectorText) return false;
	var selectorList = getSelector(selectorText);
	if (!selectorList) return false;
	for (var j=0, selector; selector=selectorList[j]; j++) {
		if (selector.test(target)) return true;
	}
	return false;
}

var CSS = Meeko.CSS;
var cssParser = new CSS.Parser();
var selectors = {};

function getSelector(selectorText) {
	var selectorList = selectors[selectorText];
	if (!selectorList) {
		selectorList = cssParser.parseSelectors(selectorText);
		selectors[selectorText] = selectorList;
	}
	return selectorList;
}

function getElementsBySelector(scope, selectorText, single) {
	if (null == selectorText) return false;
	var selectorList = getSelector(selectorText);
	var nodeList = [];
	if (!selectorList) return (single) ? null : nodeList;
	var tagName = '*';
	FOUND: if (selectorList.length == 1) {
		var selector = selectorList[0];
		var relSelectors = selector.steps; // FIXME don't want to access internal data directly. Should be an API cal
		var conditions = relSelectors[relSelectors.length-1].conditions;
		for (var n=conditions.length, i=0; i<n; i++) {
			var c = conditions[i];
			if (c.conditionType == CSS.Condition.NODE_TEST_CONDITION && c.nodeType == Node.ELEMENT_NODE) {
				tagName = c.localName;
				break FOUND;
			}
		}
	}
	var descendants = scope.getElementsByTagName(tagName);
	for (var i=0, current; current=descendants[i]; i++) {
		for (var j=0, selector; selector=selectorList[j]; j++) {
			if (selector.test(current)) {
				if (single) return current;
				nodeList.push(current);
			}
		}
	}
	return (single) ? null : nodeList;
}

return {
	NodeSelector: NodeSelector,
	ElementSelector: ElementSelector,
	Document: NodeSelector,
	Element: ElementSelector
};

})();

Meeko.XPL.Namespace.enhance(window, Meeko.DOM.Selectors);



}
Meeko.stuff.xplSystem.contexts['lib/Meeko/DOM.xhtml'].wrappedScript = function() {
	var xplSystem = Meeko.stuff.xplSystem;
	var xplContext = xplSystem.contexts['lib/Meeko/DOM.xhtml'];
	var logger = xplContext.logger;
	




}
Meeko.stuff.xplSystem.contexts['DOM.xhtml'].requiredContexts.push('lib/Meeko/Net.xhtml');
Meeko.stuff.xplSystem.createContext('lib/Meeko/Net.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/Net.xhtml'].wrappedScript = function() {
	var xplSystem = Meeko.stuff.xplSystem;
	var xplContext = xplSystem.contexts['lib/Meeko/Net.xhtml'];
	var logger = xplContext.logger;
	


/*
	URIParser (a wrapper class for parseUri), MIT License
	URIParser by Sean Hogan <http://www.meekostuff.net>
	parseUri by Steven Levithan <http://stevenlevithan.com>
*/

Meeko.stuff.xplSystem.createNamespace("Meeko.Net");
Meeko.Net.URIParser = (function() {
	
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



}
Meeko.stuff.xplSystem.contexts['DOM.xhtml'].requiredContexts.push('lib/Meeko/XML.xhtml');
Meeko.stuff.xplSystem.createContext('lib/Meeko/XML.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/XML.xhtml'].requiredContexts.push('lib/Meeko/Net.xhtml');
Meeko.stuff.xplSystem.contexts['lib/Meeko/XML.xhtml'].wrappedScript = function() {
	var xplSystem = Meeko.stuff.xplSystem;
	var xplContext = xplSystem.contexts['lib/Meeko/XML.xhtml'];
	var logger = xplContext.logger;
	


/*
 NOTE See Microsoft's reccomendation for choosing the right version of MSXML
 at http://blogs.msdn.com/xmlteam/archive/2006/10/23/using-the-right-version-of-msxml-in-internet-explorer.aspx
*/

if (!this.Meeko) this.Meeko = {};

Meeko.XML = (function() {

var createActiveXObject = function(name) {
	var versions = [ "Msxml2.%name%", "Microsoft.%name%" ];
	var object;
	for (var n = versions.length, i=0; i<n; i++) {
		var oName = versions[i].replace("%name%", name);
		try { object = new ActiveXObject(oName); } catch (error) { continue; }
		break;
	}
	if (!object) throw "" + name + " not supported on this platform";
	return object;
}
var URIParser = Meeko.Net.URIParser;

var DOMParser = this.DOMParser || (function() {

var DOMParser = function() {}

DOMParser.prototype.parseFromString = function(text, mimeType) {
	var xmlDom;
	if (!ActiveXObject) throw "DOMParser.parseFromString not supported";
	xmlDom = createActiveXObject("XMLDOM");
	xmlDom.async = "false";
	xmlDom.loadXML(text);
	return xmlDom;
}

return DOMParser;

})();

var HttpRequest = function() {};
HttpRequest.hosts = {};

HttpRequest.prototype.open = function(method, url, async) {
	var loc = HttpRequest.getLocation(url, location.href);
	var HostRq = HttpRequest.hosts[loc.host];
	if (!HostRq) throw "HttpRequest not valid for that host";
	var rq = new HostRq(loc.host);
	this._httpRequest = rq;
	var httpRq = this;
	rq.onreadystatechange = function(event) { httpRq.handler(event) };
	rq.open(method, loc.relative, async);
}

HttpRequest.prototype.send = function(data) {
	var rq = this._httpRequest;
	rq.send(data);
}

HttpRequest.prototype.handler = function(event) {
	var rq = this._httpRequest;
	if (4 == rq.readyState) {
		var result = rq;
		this._request = result._request;
		this._response = result._response;
		this.status = result.status;
		this.statusText = result.statusText;
		this.responseText = result.responseText
		this.readyState = 4;
		if (this.onreadystatechange) this.onreadystatechange({ type: "readystatechange" });
	}
}


HttpRequest.getLocation = function(uri, baseURI) {
	var loc = URIParser.parseUri(uri, baseURI);
	return loc;
}

var xXMLHttpRequest = this.XMLHttpRequest || function() {
	return createActiveXObject("XMLHTTP"); 
};

var XMLHttpRequest = function() {
	var rq = this;
	this.readyState = 0;
	this._async = false;
	
	this._useXHR = true;
	this._xhrHandler = function(event) { rq._xhrReadyStateChange(event); }
	this._xhr = new xXMLHttpRequest();
	this._xhr.onreadystatechange = this._xhrHandler;

	this._hrHandler = function(event) { rq._hrReadyStateChange(event); }
	this._hr = new HttpRequest();
	this._hr.onreadystatechange = this._hrHandler;
}

XMLHttpRequest.UNSENT = 0;
XMLHttpRequest.OPENED = 1;
XMLHttpRequest.HEADERS_RECEIVED = 2;
XMLHttpRequest.LOADING = 3;
XMLHttpRequest.DONE = 4;

if (xXMLHttpRequest.wrapped) XMLHttpRequest.wrapped = xXMLHttpRequest.wrapped;
else XMLHttpRequest.wrapped = xXMLHttpRequest;

XMLHttpRequest.prototype._xhrReadyStateChange = function(event) {
	if (this.readyState == this._xhr.readyState) return;
	this.readyState = this._xhr.readyState;
	if (4 == this.readyState) {
		var result = this._xhr;
		this._request = result._request;
		this._response = result._response;
		this.status = result.status;
		this.statusText = result.statusText;
		this.responseText = result.responseText;
		this.responseXML = result.responseXML;
	}
	if (this.onreadystatechange) this.onreadystatechange({ type: "readystatechange" });
}

XMLHttpRequest.prototype._hrReadyStateChange = function(event) {
	if (this.readyState == this._hr.readyState) return;
	this.readyState = this._hr.readyState;
	if (4 == this.readyState) {
		var result = this._hr;
		this._request = result._request;
		this._response = result._response;
		this.status = result.status;
		this.statusText = result.statusText;
		this.responseText = result.responseText;
		this.responseXML = (new DOMParser()).parseFromString(result.responseText.toString(), // NOTE toString() only needed for Opera-9.5beta
						"text/xml"); // TODO mime-type checking
	}
	if (this.onreadystatechange) this.onreadystatechange({ type: "readystatechange" });
}

XMLHttpRequest.prototype.open = function(method, url, async) {
	this._method = method.toUpperCase();
	this._url = url;
	this._async = async;
	try { // Firefox-2 and Safari-3 throw on cross-domain open
		this._xhr.open(method, url, async);
		this._xhr.onreadystatechange = this._xhrHandler;
		this._useXHR = true;
		if (0 == this._xhr.readyState) this._useXHR = false; // Safari-2
	}
	catch (err) { this._useXHR = false; }
	try {
		this._hr.open(method, url, async);
	}
	catch (err) { }
}

XMLHttpRequest.prototype.send = function(data) {
	// FIXME this HTTP struct should be in Meeko.stuff.xplSystem.prefetch[url]
	var prefetchText = xplSystem.prefetch[this._url];
	if ("GET" == this._method && prefetchText) {
		this.readyState = 4;
		this.status = "200";
		this.statusText = "OK";
		this.responseText = prefetchText;
		try { this.responseXML = (new DOMParser()).parseFromString(prefetchText, "text/xml"); } // TODO Opera throws on fail
		catch (err) { } // FIXME logger.warn
		if (this.onreadystatechange) {
			this.onreadystatechange({ type: "readystatechange" });
//			var xhr = this;
//			window.setTimeout(function() { xhr.onreadystatechange({ type: "readystatechange" }); }, 10); // FIXME
		}
		return;
	}

	if (this._useXHR) try { // Opera throws on send
		this._xhr.send(data);
	}
	catch (err) { this._useXHR = false; }
	if (!this._useXHR) this._hr.send(data);
	if (!this._async) { // NOTE We do this in case onreadystatechange doesn't work for sync requests. eg Firefox-3beta
		if (this._useXHR) this._xhrReadyStateChange();
		else this._hrReadyStateChange();
	}
}

return {
	DOMParser: DOMParser,
	HttpRequest: HttpRequest,
	XMLHttpRequest: XMLHttpRequest
}

})();

window.XMLHttpRequest = Meeko.XML.XMLHttpRequest;
Meeko.XPL.Namespace.enhance(window, Meeko.XML);



}
Meeko.stuff.xplSystem.contexts['DOM.xhtml'].wrappedScript = function() {
	var xplSystem = Meeko.stuff.xplSystem;
	var xplContext = xplSystem.contexts['DOM.xhtml'];
	var logger = xplContext.logger;
	
}
Meeko.stuff.xplSystem.init();
