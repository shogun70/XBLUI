/*
 Light-weight (or poor man's) XBL2.
 (c) Sean Hogan, December 2008
 All rights reserved.

 NOTES: 
 Uses event delegation and late-binding to do everything.
 Bindings are created when an event is handled and destroyed immediately after.
 Therefore the bindings are stateless.
 Doesn't support xbl:template.
 xblBindingAttached, etc are never called.
*/

if (!this.Meeko) this.Meeko = {};
if (!this.Meeko.stuff) this.Meeko.stuff = {};
this.Meeko.stuff.xblSystem = (function() {

var system = {};

system.logger = {
	log: function() {},
	debug: function() { this.log.apply(this, arguments); },
	info: function() { this.log.apply(this, arguments); },
	warn: function() { this.log.apply(this, arguments); },
	error: function() { this.log.apply(this, arguments); }
}
system.URL = {
	resolve: function(src, base) {
		var rex = /^([a-z]+):\/\/([^\/]+)(\/.*)$/i;
		var srcParts = src.match(rex);
		if (srcParts && srcParts.length) return src;
		if (!base) throw "Base URL is null in URL.resolve()";
		var szBase = "" + base;
		var baseParts = szBase.match(rex);
		if (!(baseParts && baseParts.length)) throw "Base URL " + szBase + " could not be parsed in URL.resolve()";
		var url = baseParts[1] + "://" + baseParts[2];
		if (src[0] == '/') url += src;
		else url += baseParts[3].replace(/[^\/]*$/, src);
		return url;
	},
	load: function(options) {
		var method = options.method || "GET";
		if ("GET" != method && "get" != options.method) throw "" + method + " method not supported in URL.load()";
		var async = options.async || false;
		if (async) throw "Asynchronous URL.load() not supported.";
		var url = options.url;
		var rq = new XMLHttpRequest(); 
		rq.open("GET", url, false);
		rq.send("");
		if (rq.status != 200) throw "Error loading " + url;
		return rq;
	}
}

var loadURL = function(url) {
	var xplSystem = Meeko.stuff.xplSystem;
	if (xplSystem) {
		var data = xplSystem.prefetch[url];
		if (data) return { responseText: data };
	}
	return system.URL.load({ url: url });
}

system.XMLDocument = {
	load: function(uri) {
		var rq = new XMLHttpRequest(); 
		rq.open("GET", uri, false);
		rq.send("");
		if (rq.status != 200) throw "Error loading " + uri;
		if (!rq.responseXML) throw "Document is not XML: " + uri;
		return rq.responseXML;
	},
	loadXML: function(data) {
		var domParser = new DOMParser;
		var xmlDoc = domParser.parseFromString(data, "application/xml"); // TODO catch errors
		return xmlDoc;
	}
}

var loadXMLDocument = function(uri) {
	var xplSystem = Meeko.stuff.xplSystem;
	if (xplSystem) {
		var data = xplSystem.prefetch[uri];
		if (data) return system.XMLDocument.loadXML(data); 
	}
	return system.XMLDocument.load(uri);
}

system.XBLDocument = {
	load: function(uri) {
		var xmlDoc = loadXMLDocument(uri);
		var xblDoc = new XBLDocument(xmlDoc, uri);
		return xblDoc;
	},
	loadXML: function(data) {
		var xmlDoc = system.XMLDocument.loadXML(data);
		var xblDoc = new XBLDocument(xmlDoc, window.location);
		return xblDoc;
	}
}

system.Document = {
	addEventListener: function(doc, type, handler, useCapture) {
		return doc.addEventListener(type, handler, useCapture);
	}
}

system.Element = {
	matchesSelector: function(elt, selector) {
		return elt.matchesSelector(selector);
	},
	bind: function(elt) {}
}

/*
 initialize() kicks everything off. 
*/
function initialize() {
	registerXBLProcessingInstructions();
	registerXBLLinkElements();
	registerXBLStyleElements();
	configureEventDelegation();
}

function registerXBLProcessingInstructions() {
	for (var node=document.firstChild; node; node=node.nextSibling) {
		if (node == document.documentElement) break;
		if (node.nodeType != 7 /* Node.PROCESSING_INSTRUCTION_NODE */) continue;
		if ("xbl" != node.target) continue;
		var m = node.data.match(/^\s*href=['"]([^'"]*)['"]/);
		loadBindingDocument(m[1]);
	}
}

function registerXBLLinkElements() {
	var head = document.getElementsByTagName("head")[0];
	for (var node=head.firstChild; node; node=node.nextSibling) {
		if (node.nodeType != 1 /* Node.ELEMENT_NODE */) continue;
		if (node.tagName.toLowerCase() != "link") continue;
		if (node.rel != "bindings") continue;
		loadBindingDocument(node.href);
	}
}

function registerXBLStyleElements() {
	var head = document.getElementsByTagName("head")[0];
	for (var node=head.firstChild; node; node=node.nextSibling) {
		if (node.nodeType != 1 /* Node.ELEMENT_NODE */) continue;
		if (node.tagName.toLowerCase() != "style") continue;
		if (node.type != "application/xml") continue;
		var text = node.textContent || node.innerHTML; // TODO standardize??
		loadBindingDocumentFromData(text, document.URL);
	}
}

var bindingDocuments = []; // NOTE these are XBLDocument wrappers around the actual XBL documents
var xblDocuments = {};

function loadBindingDocument(uri) {
	var xblDoc = importXBLDocument(uri);
	if (!xblDoc || !xblDoc.bindings) {
		system.logger.error("Failure loading binding document " + uri);
		return;
	}
	bindingDocuments.push(xblDoc); // WARN assumes loadBindingDocument never called twice with same uri
	importDependencies(xblDoc);
}

function loadBindingDocumentFromData(data, uri) {
	var xblDoc = system.XBLDocument.loadXML(data, uri);
	if (!xblDoc || !xblDoc.bindings) {
		system.logger.error("Failure loading binding document from data");
		return;
	}
	bindingDocuments.push(xblDoc);
	importDependencies(xblDoc);
}

function importXBLDocument(uri) {
	var xblDoc;
	var absoluteURI = system.URL.resolve(uri, document.URL);
	
	// check the cache
	xblDoc = xblDocuments[absoluteURI]; 
	if (typeof xblDoc != "undefined") return xblDoc;
	
	// otherwise fetch and wrap
	try {
		xblDoc = system.XBLDocument.load(absoluteURI);
		xblDocuments[absoluteURI] = xblDoc;
	}
	catch(error) {
		xblDocuments[absoluteURI] = null; // NOTE placeholder
		system.logger.error("Failure loading xbl document " + uri);
	}
	return xblDoc;
}

function importDependencies(xblDoc) {
	for (var i=0, binding; binding=xblDoc.bindings[i]; i++) {
		if (!binding.element) continue;
		importBaseBinding(binding);
	}
}

function importBaseBinding(binding) {
	if (!binding.baseBindingURI) return;
	if (typeof binding.baseBinding != "undefined") return;
	var m = binding.baseBindingURI.match(/^(.*)#(.*)$/); // FIXME bindingURI need not have #id
	var xblDoc;
	if (m[1] == "") xblDoc = binding.xblDocument;
	else {
		var absoluteURI = system.URL.resolve(m[1], binding.xblDocument.documentURI);
		xblDoc = importXBLDocument(absoluteURI);
	}
	var baseBinding = xblDoc.namedBindings[m[2]];
	if (baseBinding) {
		binding.baseBinding = baseBinding;
		importBaseBinding(baseBinding);
	}
	else binding.baseBinding = null; // place-holder
}

/*
 configureEventDelegation() makes a lookup-table of handlers by looping over: 
   valid handlers of bindings with element-selectors in every binding-document
*/
var handlerTable = {}; // NOTE accessed with handlerTable[String:eventType][Number:eventPhase][Number:handlerIndex]

function configureEventDelegation() {
	for (var i=0, xblDoc; xblDoc=bindingDocuments[i]; i++) {
		for (var j=0, binding; binding=xblDoc.bindings[j]; j++) {
			if (!binding.element) continue; // NOTE bindings without an element-selector never apply
			registerBinding(binding);
		}
	}
}

function registerBinding(binding, selector) { // FIXME doesn't break inheritance loops
	if (!selector) selector = binding.element;
	if (binding.baseBinding) registerBinding(binding.baseBinding, selector); // FIXME doesn't facilitate calling baseBinding
	for (var k=0, handler; handler=binding.handlers[k]; k++) {
		var type = handler.event;
		if (!type) continue; // NOTE handlers without type are invalid
		var phase = handler.phase;
		if (!handlerTable[type]) { // i.e. first registration for event.type
			system.Document.addEventListener(document, type, dispatchEvent, true); // route through our event-system
			handlerTable[type] = new Array(4); 					// and pre-allocate space in handlerTable
			handlerTable[type][1] = []; // capture
			handlerTable[type][2] = []; // target
			handlerTable[type][3] = []; // bubbling
		}

		var handlerRef = { selector: selector, binding: binding, handler: handler };
		if (phase) handlerTable[type][phase].push(handlerRef);
		else { // no specified phase means AT_TARGET or BUBBLING_PHASE
			handlerTable[type][2].push(handlerRef);
			handlerTable[type][3].push(handlerRef);
		}
	}
}

/*
 dispatchEvent() takes over the browser's event dispatch. It is designed to be attached as a listener on document.
 It determines the event-path and routes the event through capture, target and bubbling phases.
 For each element on the path it determines if there are valid handlers, and if so
 it creates the associated binding and calls the handler. 
*/
function dispatchEvent(event) { 
	event.stopPropagation(); // NOTE stopped because we handle all events here
	
	var phase = 0,
		target = event.target,
		current = target,
		path = [];
		
	// precalculate the event-path thru the DOM
	for (current=target; current!=document; current=current.parentNode) path.push(current);
	
	/*
	  callHandlers() is a pseudo event-listener on currentTarget. It is called on every element in the event-path.
	  It finds appropriate xbl-handlers by matching event type and phase, and current.matchesSelector().
	  Valid handlers are called with 'this' set to a new instance of the binding implementation.
	  i.e. no state is saved in bindings
	*/
	function callHandlers() {
		system.Element.bind(current);
		var handlerRefs = handlerTable[event.type][phase];
		for (var i=0, handlerRef; handlerRef=handlerRefs[i]; i++) {
			var binding = handlerRef.binding;
			var selector = handlerRef.selector;
			var handler = handlerRef.handler;
			if (selector && !system.Element.matchesSelector(current, selector)) continue; // NOTE no element-selector means this is a base-binding
			if (!handler.matchesEvent(event, { eventPhase: false })) continue; // NOTE switch off eventPhase checking
			// instantiate internal object
			var internal = new binding.implementation;
			internal.boundElement = current;

			// instantiate internal object for baseBindings
			// FIXME this is inefficient if more than one binding in a chain will handle the same event
			// as the binding chain gets built up every time. 
			var b0 = binding, i0 = internal;
			do {
				var b1 = b0.baseBinding;
				if (!b1) break;
				var i1 = new b1.implementation;
				i1.boundElement = current;
				i0.baseBinding = i1;
				b0 = b1; i0 = i1;
			} while (b0); // NOTE redundant
			// execute handler code
			if (handler.action) try { // NOTE handlers don't need an action
				handler.action.call(internal, event);
			}
			catch(error) { system.logger.debug(error); } // FIXME log error
			
			// FIXME which way is correct??
			// if (handler.defaultPrevented) event.__preventDefault();
			// if (handler.propagationStopped) event.__stopPropagation();
			if (handler.defaultPrevented) event.preventDefault();
			if (handler.propagationStopped) event.stopPropagation();
		}
	}

	// override event properties and methods
	if (event.__defineGetter__) {
		event.__defineGetter__("currentTarget" , function() { return current; }); // WARN not working for Safari
		event.__defineGetter__("eventPhase" , function() { return phase; }); // WARN not working for Safari
	}
	event.eventStatus = 0;
	event.__preventDefault = event.preventDefault;
	event.preventDefault = function() { this.eventStatus |= 1; };
	event.__stopPropagation = event.stopPropagation;
	event.stopPropagation = function() { this.eventStatus |= 2; };

	
	phase = 1; // Event.CAPTURING_PHASE;
	if (!event.__defineGetter__) event.phase = phase;
	for (var n=path.length, i=n-1; i>0; i--) {
		current = path[i];
		if (!event.__defineGetter__) event.currentTarget = current;
		callHandlers();
		if (event.eventStatus & 1) event.__preventDefault();
		if (event.eventStatus & 2) return;
	}

	phase = 2; // Event.AT_TARGET;
	if (!event.__defineGetter__) event.phase = phase;
	current = path[0];
	if (!event.__defineGetter__) event.currentTarget = current;
	callHandlers();
	if (event.eventStatus & 1) event.__preventDefault();
	if (event.eventStatus & 2) return;
	if (!event.bubbles) return;

	phase = 3; // Event.BUBBLING_PHASE;
	if (!event.__defineGetter__) event.phase = phase;
	for (var n=path.length, i=1; i<n; i++) {
		current = path[i];
		if (!event.__defineGetter__) event.currentTarget = current;
		callHandlers();
		if (event.eventStatus & 1) event.__preventDefault();
		if (event.eventStatus & 2) return;
	}
	
	return;
}

/*
	XBL document & element wrappers
	TODO: better reporting of invalid content
	TODO: clean up the process of adding xblDocument property to XBLBindingElements
	TODO: tight binding of wrappers?? Won't work in IE
*/

var XBLNS = "http://www.w3.org/ns/xbl";
var HTMLNS = "http://www.w3.org/1999/xhtml";

var XBLDocument = function(_document, documentURI) { // TODO documentURI is available via _document, except in IE
	if (!(this instanceof arguments.callee)) return new arguments.callee(_document, documentURI);

	this._target = _document;
	this.documentURI = documentURI;

	this.xblElement = XBLXblElement(_document.documentElement, this);
	this.bindings = this.xblElement.bindings; // FIXME getBindings()
	this.namedBindings = this.xblElement.namedBindings; // FIXME getBindingById(id)
}

var XBLXblElement = function(_element, _document) {
	if (!(this instanceof arguments.callee)) return new arguments.callee(_element, _document);

	var localName = getLocalName(_element);
	if ("xbl" != localName || XBLNS != _element.namespaceURI) throw 'XBLXblElement interface only valid for "xbl" elements';
	this._target = _element;
	this.xblDocument = _document;
	this.bindings = [];
	this.namedBindings = [];
	this.srcHTMLStyleElements = []; // NOTE unused

	for (var node=_element.firstChild; node; node=node.nextSibling) {
		if (node.nodeType != 1 /* Node.ELEMENT_NODE */) continue;
		var localName = getLocalName(node);
		if ("script" == localName && XBLNS == node.namespaceURI) {
			var src = node.getAttribute("src");
			var jsText = "";
			if (src) {
				var uri = system.URL.resolve(src, _document.documentURI);
				var rq = loadURL(uri);
				jsText = rq.responseText;
				execScript(jsText);
			}
			else { // TODO refactor this duplication of execScript
				jsText = getTextContent(node);	
				execScript(jsText);
			}			
			continue;
		}
		if ("binding" == localName  && XBLNS == node.namespaceURI) {
			var binding = XBLBindingElement(node, this.xblDocument);
			this.bindings.push(binding);
			if (binding.id && !this.namedBindings[binding.id]) this.namedBindings[binding.id] = binding;
			continue;
		}
		if ("style" == localName && HTMLNS == node.namespaceURI) {
			var cssText = getTextContent(node);
			var text = cssText.replace(/url\(\s*['"]?([^)]+)['"]?\s*\)/g, function(all, href) { return 'url("' + (system.URL.resolve(href, _document.documentURI)) + '")'; }); // FIXME assert that quotes are matching
			var styleElt = document.createElement("style");
			try { styleElt.innerText = text; } catch(error) { }
			if (!styleElt.innerHTML) try { styleElt.innerHTML = text; } catch(error) { }
			document.getElementsByTagName("head")[0].appendChild(styleElt);
			if (!styleElt.innerHTML) try {
				var styleSheets = document.styleSheets;
				var sheet = styleSheets[styleSheets.length-1];
				if (sheet.owningElement == styleElt) sheet.cssText = text;
				else throw "Can't import stylesheet from XBL document";
			}
			catch (error) { }
			continue;
		}
		system.logger.warn("Ignoring " + node.tagName + " element: invalid child of xbl:xbl");			
	}
}

var XBLBindingElement = function(_element, _document) {
	if (!(this instanceof arguments.callee)) return new arguments.callee(_element, _document);
	var localName = getLocalName(_element);
	if ("binding" != localName || XBLNS != _element.namespaceURI) throw 'XBLBindingElement interface only valid for "binding" elements';
	this._target = _element;
	this.xblDocument = _document;
	var binding = this;
	var _element = this._target;
	var _document = this.xblDocument;
	this.id = _element.getAttribute("id");
	this.element = _element.getAttribute("element");
	this.baseBindingURI = _element.getAttribute("extends");
	
	this.implementation = function() {};
	this.handlers = [];
	this.resources = [];
	this.template = null;
	
	var XBLHandlers = function(_element) {
		for (var node=_element.firstChild; node; node=node.nextSibling) {
			if (node.nodeType != 1 /* Node.ELEMENT_NODE */) continue;
			var localName = getLocalName(node);
			if ("handler" == localName && XBLNS == node.namespaceURI) {
				var handler = XBLHandlerElement(node, _document);
				binding.handlers.push(handler);
				continue;
			}
			system.logger.warn("Ignoring " + node.tagName + " element: invalid child of xbl:handlers");
		}
	}

	// TODO refactor child element parsing
	var implementationElts = [];
	var handlersElts = [];
	var resourcesElts = [];
	var templateElts = [];

	for (var node=_element.firstChild; node; node=node.nextSibling) {
		if (node.nodeType != 1 /* Node.ELEMENT_NODE */) continue;
		if (XBLNS != node.namespaceURI) {
			system.logger.warn("Ignoring " + tagName + " element: invalid namespace for child of xbl:binding");
			continue;
		}
		var localName = getLocalName(node);
		switch (localName) {
			case "implementation":
				implementationElts.push(node);
				if (implementationElts.length <= 1) {
					var jsText = getTextContent(node);
					try {
						this.implementation.prototype = evalScript.call(window, jsText);
					}
					catch (error) {
						system.logger.warn("Error in xbl:implementation script"); // FIXME more specific message
					}
					if (this.implementation.prototype.xblBindingAttached) system.logger.warn("xblBindingAttached not supported");
					if (this.implementation.prototype.xblEnteredDocument) system.logger.warn("xblEnteredDocument not supported");
				}
				else {
					system.logger.warn("Ignoring xbl:implementation element: only first instance is valid");
				}
				break;
			
			case "template":
				implementationElts.push(node);
				if (templateElts.length <= 1) {
					system.logger.warn("Ignoring xbl:template element: feature not implemented");
					this.template = node;
				}
				else {
					system.logger.warn("Ignoring xbl:template element: only first instance is valid");
				}
				break;
			
			case "handlers":
				handlersElts.push(node);
				if (handlersElts.length <= 1) {
					XBLHandlers(node);
				}
				else {
					system.logger.warn("Ignoring xbl:handlers element: only first instance is valid");
				}
				break;
			
			case "resources":
				resourcesElts.push(node);
				if (resourcesElts.length <= 1) {
					system.logger.warn("Ignoring xbl:resources element: feature not implemented");
				}
				else {
					system.logger.warn("Ignoring xbl:resources element: only first instance is valid");
				}
				break;
			
			default:
				system.logger.warn("Ignoring " + node.tagName + " element: invalid child of xbl:binding");
				break;
		}
	}

	return this;
}

var XBLHandlerElement = function(_element, _document) {
	if (!(this instanceof arguments.callee)) return new arguments.callee(_element, _document);
	var localName = getLocalName(_element);
	if ("handler" != localName || XBLNS != _element.namespaceURI) throw 'XBLHandlerElement interface only valid for "handler" elements';
	this._target = _element;
	this.xblDocument = _document;
	this.event = _element.getAttribute("event");
	if (null == this.event) system.logger.warn("Invalid handler: empty event attribute");

	function lookupValue(attrName, lookup) {
		var attrValue = _element.getAttribute(attrName);
		var result;
		if (attrValue) {
			result = lookup[attrValue];
			if (null == result) system.logger.info("Ignoring invalid @" + attrName + ": " + attrValue);
		}
		return result;
	}

	this.phase = lookupValue("phase", {
		"capture": 1, // Event.CAPTURING_PHASE,
		"target": 2, // Event.AT_TARGET,
		"bubble": 3, // Event.BUBBLING_PHASE,
		"default-action": 0x78626C44 
	}) || 0;

	this.defaultPrevented = lookupValue("default-action", {
		"cancel" : true,
		"perform" : false
	}) || false;

	this.propagationStopped = lookupValue("propagate", {
		"stop": true,
		"continue": false
	}) || false;
	
	function attrText_to_numArray(attr) {				
		var attrText = _element.getAttribute(attr);
		if (!attrText) return null;
		var result = [];
		var strings = attrText.split(/\s+/);
		Array.forEach (strings, function(text) {
			var num = Number(text);
			if (NaN != num && Math.floor(num) == num) result.push(num);
		});
		return result;
	}

	// Event Filters: mouse / keyboard / text / mutation / modifiers
	
	// mouse
	this.button = attrText_to_numArray("button");
	this.clickCount = attrText_to_numArray("click-count");
	
	// keyboard
	this.key = _element.getAttribute("key");
	this.keyLocation = [];
	var keyLocationText = _element.getAttribute("key-location");
	var keyLocationStrings =  (keyLocationText) ? keyLocationText.split(/\s+/) : [];
	Array.forEach(keyLocationStrings, function(text) {
		switch (text) {
			case "standard": this.keyLocation.push(KeyboardEvent.DOM_KEY_LOCATION_STANDARD); break;
			case "left": this.keyLocation.push(KeyboardEvent.DOM_KEY_LOCATION_LEFT); break;
			case "right": this.keyLocation.push(KeyboardEvent.DOM_KEY_LOCATION_RIGHT); break;
			case "numpad": this.keyLocation.push(KeyboardEvent.DOM_KEY_LOCATION_NUMPAD); break;
		}
	}, this);

	// text
	this.text = _element.getAttribute("text");
	
	// non-standard
	this.filter = new RegExp(_element.getAttribute("filter"), "");
	
	// mutation
	this.attrName = _element.getAttribute("attr-name");
	this.attrChange = [];
	var attrChangeText = _element.getAttribute("attr-change");
	var attrChangeStrings =  (attrChangeText) ? attrChangeText.split(/\s+/) : [];
	Array.forEach(attrChangeStrings, function(text) {
		switch (text) {
			case "modification": this.attrChange.push(MutationEvent.MODIFICATION); break;
			case "addition": this.attrChange.push(MutationEvent.ADDITION); break;
			case "removal": this.attrChange.push(MutationEvent.REMOVAL); break;
		}
	}, this);
	this.prevValue = _element.getAttribute("prev-value");
	this.newValue = _element.getAttribute("new-value");
	
	// modifiers
	// TODO should this.modifiers be {} or []?
	if (null != _element.getAttribute("modifiers")) {
		this.modifiers = [];
		var modifiersText = _element.getAttribute("modifiers");
		var modifiersStrings = (modifiersText) ? modifiersText.split(/\s+/) : [];
		Array.forEach (modifiersStrings, function(text) { // TODO check parser
			var m;
			m = /^([+-]?)([a-z]+)(\??)$/.exec(text);
			if (m) {
				var key = m[2];
				var condition = 1; // MUST
				if (m[3]) condition = 0; // OPTIONAL
				else if (m[1] == "+") condition = 1; // MUST
				else if (m[1] == "-") condition = -1; // MUST NOT
				this.modifiers.push({ key: key, condition: condition });
			}
		}, this);
	}
	else this.modifiers = null;

	var jsText = getTextContent(_element);
	if (jsText) {
		try {
			this.action = Function("event", jsText);
		}
		catch (error) {
			system.logger.warn("Parse error in handler"); // FIXME more specific message
		}
	}
	return this;
}

XBLHandlerElement.prototype.matchesEvent = function(event, fields) {
	var handler = this;
	// type
	var xblEvents = { click: true, dblclick: true, mousedown: true, mouseup: true, mouseover: true, mouseout: true, mousemove: true,
		keydown: true, keyup: true, textInput: true, DOMAttrModified: true,
		load: true, unload: true, abort: true, error: true, select: true, change: true, submit: true, reset: true, resize: true, scroll: true };
	var xblMouseEvents = { click: true, dblclick: true, mousedown: true, mouseup: true, mouseover: true, mouseout: true, mousemove: true, mousewheel: true };
	var xblKeyboardEvents = { keydown: true, keyup: true };
	var xblTextEvents = { textInput: true };
	var xblMutationEvents = { DOMAttrModified: true }; // TODO
	var xblHTMLEvents = { load: true, unload: true, abort: true, error: true, select: true, change: true, submit: true, reset: true, resize: true, scroll: true };

	if (event.type != handler.event) return false;

	// phase
	if (fields.eventPhase != false) {
		if (handler.phase && event.eventPhase != handler.phase) return false;
		else { // no specified phase means target or bubbling okay
			if (Event.BUBBLING_PHASE != event.eventPhase && Event.AT_TARGET != event.eventPhase) return false;
		}
	}
	var evType = event.type;

	// MouseEvents
	if (evType in xblMouseEvents) { // FIXME needs testing. Bound to be cross-platform issues still
		if (handler.button && handler.button.length) {
			if (handler.button.indexOf(event.button) == -1) return false;
		}
		if (handler.clickCount && handler.clickCount.length) { 
			var count = 1;
			if ("dblclick" == event.type) count = 2;
			if ("click" == event.type) count = (event.detail) ? event.detail : 1;
			if (handler.clickCount.indexOf(count) == -1) return false;
		}
		if (handler.modifiers) {
			if (!this.modifiersMatchEvent(event, handler.modifiers)) return false;
		}
	}

	// KeyboardEvents
	// NOTE some of these are non-standard
	var ourKeyIdentifiers = {
		Backspace: "U+0008", Delete: "U+007F", Escape: "U+001B", Space: "U+0020", Tab: "U+0009"
	}

	if (evType in xblKeyboardEvents) {
		if (handler.key) {
			var success = false;
			var keyId = event.keyIdentifier;
			if (/^U\+00....$/.test(keyId)) { // TODO Needed for Safari-2. It would be great if this test could be done in eventSystem
				keyId = keyId.replace(/^U\+00/, "U+");
			}
			if (handler.key != keyId && ourKeyIdentifiers[handler.key] != keyId) return false;
		}

		// TODO key-location		
		if (handler.modifiers || handler.key) {
			if (!this.modifiersMatchEvent(event, handler.modifiers || [ "none" ])) return false;
		}
	}

	// TextEvents
	if (evType in xblTextEvents) {
		if (handler.text && handler.text != event.data) return false;
	}

	// MutationEvents
	if (evType in xblMutationEvents) {
		if (handler.attrName) {
			// mutation attribute name
			if (handler.attrName != event.attrName) return false;
			// mutation type
			if (handler.attrChange.length > 0 && handler.attrChange.indexOf(event.attrChange) < 0) return false;
			// previous value
			if (MutationEvent.MODIFICATION == event.attrChange || MutationEvent.REMOVAL == event.attrChange)
				if (null != handler.prevValue && handler.prevValue != event.prevValue) return false;
			// new value
			if (MutationEvent.MODIFICATION == event.attrChange || MutationEvent.ADDITION == event.attrChange)
				if (null != handler.newValue && handler.newValue != event.newValue) return false;
		}
	}
		
	// HTML events
	if (evType in xblHTMLEvents) { }
	
	// user-defined events.  TODO should these be optionally allowed / prevented??
	if (!(evType in xblEvents)) { }

	return true;
}

XBLHandlerElement.prototype.modifiersMatchEvent = function(event) {
	// TODO comprehensive modifiers list
	// event.getModifierState() -> evMods
	// Need to account for any positives
	// Fields are set to -1 when accounted for
	var evMods = {
		control: event.ctrlKey,
		shift: event.shiftKey,
		alt: event.altKey,
		meta: event.metaKey
	};

	var modifiers = this.modifiers;
	var evMods_any = event.ctrlKey || event.shiftKey || event.altKey || event.metaKey;
	var evMods_none = !evMods_any;

	var any = false;

	if (modifiers)	{
		for (var i=0, n=modifiers.length; i<n; i++) {
			var modifier = modifiers[i];
			switch (modifier.key) {
				case "none":
					if (evMods_any) return false;
					break;
	
				case "any":
					any = true;
					break;
	
				default:
					var active = evMods[modifier.key];
					switch (modifier.condition) {
						case -1:
							if (active) return false;
							break;
						case 0:
							if (active) evMods[modifier.key] = -1;
							break;
						case 1:
							if (!active) return false;
							evMods[modifier.key] = -1;
							break;
					}				
			}
		}
	}
	
	if (any) return true;
	
	// Fail if any positive modifiers not accounted for
	for (var key in evMods) {
		if (evMods[key] > 0) return false;
	}
	return true;
}

/*
 utility functions
*/

function execScript(text) {
	var scriptElt = document.createElement("script");
	scriptElt.type = "text/javascript";
	scriptElt.text = text;
	if (!scriptElt.innerHTML) scriptElt.appendChild(document.createTextNode(text)); // Safari-2 ??
	var head = document.getElementsByTagName("head")[0];
	head.appendChild(scriptElt);
}

function evalScript() {
	return eval(arguments[0]);
}

function getTextContent(element) {
	var text = "";
	if (null != element.textContent) text = element.textContent; // W3C
	else if (null != element.text) text = element.text; // IE
	else for (var textNode=element.firstChild; null!=textNode; textNode=textNode.nextSibling) { // Safari2
		if (textNode.nodeType == 3 || textNode.nodeType == 4) // Node.TEXT_NODE or Node.CDATA_SECTION_NODE
			text += textNode.nodeValue;
	}
	return text;
}

function getLocalName(element) {
	return (element.localName) ? element.localName : element.tagName.replace(element.prefix+":", "");	
}

system.initialize = initialize;
return system;

})();
