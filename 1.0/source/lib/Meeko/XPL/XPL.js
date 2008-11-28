/*
	forEach, version 1.0
	Copyright 2006, Dean Edwards
	License: http://www.opensource.org/licenses/mit-license.php
*/


// array-like enumeration
if (!Array.forEach) { // mozilla already supports this
	Array.forEach = function(array, block, context) {
		for (var i = 0; i < array.length; i++) {
			block.call(context, array[i], i, array);
		}
	};
}


// generic enumeration
Function.prototype.forEach = function(object, block, context) {
	for (var key in object) {
		if (typeof this.prototype[key] == "undefined") {
			block.call(context, object[key], key, object);
		}
	}
};


// character enumeration
String.forEach = function(string, block, context) {
	Array.forEach(string.split(""), function(chr, index) {
		block.call(context, chr, index, string);
	});
};


// globally resolve forEach enumeration
forEach = function(object, block, context) {
	if (object) {
		var resolve = Object; // default
		if (object instanceof Function) {
			// functions have a "length" property
			resolve = Function;
		} else if (object.forEach instanceof Function) {
			// the object implements a custom forEach method so use that
			object.forEach(block, context);
			return;
		} else if (typeof object == "string") {
			// the object is a string
			resolve = String;
		} else if (typeof object.length == "number") {
			// the object is array-like
			resolve = Array;
		}
		resolve.forEach(object, block, context);
	}
};



// Trace
// TODO Event / Exception Tracing
Trace = function() {
	this.buffer = [];
	this.eventStack = [];
}

Trace.prototype.flush = function() {}

Trace.prototype.write = function(info) {
	var event = trace.eventStack[0];
	if (event) {
		info.type = event.type;
	}
	this.buffer.push(info);
	this.flush();
}

trace = new Trace();

//
// XPL stuff
//

XPLClass = function() {}

XPLClass.PUBLIC = 0;
XPLClass.PROTECTED = 1;
XPLClass.PRIVATE = 2;
XPLClass.INTERNAL = 3;

/*
define({
	classMethod: function(params) { code },
	classField: ...,
	prototype: {
		instanceMethod: ...,
	}
})
*/
XPLClass.define = function(xplClassSpecification) {
	var xplConstructor = function() {}
	for (var xplSlot in xplClassSpecification) {
		if ('prototype' != xplSlot) xplConstructor[xplSlot] = xplClassSpecification[xplSlot];
	}
	var xplPrototype = xplClassSpecification.prototype;
	for (var xplSlot in xplPrototype) {
		xplConstructor.prototype[xplSlot] = xplPrototype[xplSlot];
	}
	xplConstructor.create = function(xplInstanceProperties) {
		var xplInstance = new this;
			var $copy = function($src, $target) {
				for (var $i in $src) {
					if ($src.__lookupGetter__($i)) $target.__defineGetter__($i, $src.__lookupGetter__($i));
					if ($src.__lookupSetter__($i)) $target.__defineSetter__($i, $src.__lookupSetter__($i));
					if (!$src.__lookupGetter__($i) && !$src.__lookupSetter__($i)) $target[$i] = $src[$i];
				}
			}
			$copy(xplInstanceProperties, xplInstance);
		return xplInstance;
	}	
	return xplConstructor;
}

XPLClass.getConstructors = function(klass) {
	var chain = [];
	var constructor = klass;
	do {
		chain.unshift(constructor);
		constructor = (constructor.prototype) ? constructor.prototype.__constructor__ : null;
		klass = constructor;
	} while (constructor);
	return chain;
}


XPLHandler = function() {
	this.events = {};
}


XPLHandler.prototype.addHandler = function(type, handler) {
	if (!this.events[type]) this.events[type] = [];
	this.events[type].unshift(handler);
}


// TODO XPLHandler.prototype.removeHandler

XPLHandler.prototype.getHandlersByEventType = function(type) {
	return this.events[type];
}


XPLHandler.prototype.handleEvent = function(event) {
	trace.eventStack.unshift(event);
	var handlers = this.getHandlersByEventType(event.type);
	forEach(handlers, function(handler) {
		handler.handleEvent.call(handler.ownerBinding, event);
	});
	trace.eventStack.shift();
}


XPLPackage = XPLClass.define({
	prototype: {
		declareClasses: function() {
			throw 'UNIMPLEMENTED METHOD: declareClasses()';
		},
		defineClasses: function() {
			throw 'UNIMPLEMENTED METHOD: defineClasses()';
		},
		bindElements: function() {
			throw 'UNIMPLEMENTED METHOD: bindElements()';
		}
	}
});


XPLPackageManager = function() {}

XPLPackageManager.create = function(config) {
	var xplInstance = new this;
	(function() {
		
	this.packages = [];
	this.packagesByNamespace = {};
	this.featureDirectives = {};
	this.packagesByUri = {};
	this.packageHrefByNamespace = {};
	this.packageHrefByFeature = {};
	this.requiredFeatures = [];
	this.documentsByHref = {};
	
	}).call(xplInstance);
	return xplInstance;
}

// TODO improve cache settings
// TODO put load and loadXML in another namespace
XPLPackageManager.load = function(href) {
	var rq = new XMLHttpRequest();
	rq.open("GET", href, false);
rq.setRequestHeader( "If-Modified-Since", "Sat, 1 Jan 2000 00:00:00 GMT" );
	rq.send("");
	return rq.responseText;
}

XPLPackageManager.loadXML = function(href) {
	if (!href) return null;
	var rq = new XMLHttpRequest();
	rq.open("GET", href, false);
rq.setRequestHeader( "If-Modified-Since", "Sat, 1 Jan 2000 00:00:00 GMT" );
	rq.send("");
	return rq.responseXML;
}

XPLPackageManager.prototype.loadDocument = function(href, bAbsolute) {
	var xplManager = this;
	if (this.documentsByHref[href]) return this.documentsByHref[href];
		var base = xplManager.base;
		var actualHref =
			(bAbsolute) ? href :
			("" == base) ? href :
			base.match(/[^\/]$/) ? base + "/" + href :
			base + href;
	var doc = XPLPackageManager.loadXML(actualHref);
	if (doc) this.documentsByHref[href] = doc;
	return doc;
}

XPLPackageManager.prototype.createPackage = function(xplInstanceProperties) {
	var xplPackage = XPLPackage.create(xplInstanceProperties);
	this.packages.push(xplPackage);
	if (xplPackage.namespace) this.packagesByNamespace[xplPackage.namespace] = xplPackage;
	return xplPackage;
}

XPLPackageManager.prototype.getHrefByNamespace = function(namespace) {
	var xplManager = this;
	var path = namespace.split('.');
	var href = path.join('/') + ".xml";
	return href;
}


XPLPackageManager.prototype.requireFeature = function(feature) {
	var xplManager = this;
	var featureDirective = xplManager.featureDirectives[feature];
	featureDirective.packages = []; // TODO this should go in a constructor
	
	
	// require namespaces
	forEach (featureDirective.requiredNamespaces, function(namespace) {
		var xplPackage = xplManager.requireNamespace(namespace);
	});
	
}


XPLPackageManager.prototype.requireNamespace = function(namespace) {
	var xplManager = this;
	
	if (xplManager.packagesByNamespace[namespace]) return;

	// LOAD package and dependencies
	var xplPackage = xplManager.getPackageByNamespace(namespace);
	xplManager.packagesByNamespace[namespace] = xplPackage;

	// features
	forEach (xplPackage.requiredFeatures, function(feature) {
		xplManager.requireFeature(feature);
	});
	
	// namespaces
	forEach (xplPackage.requiredNamespaces, function(namespace) {
		xplManager.requireNamespace(namespace);
	});

	// SPECIFY package
	xplPackage.declareClasses();
	xplPackage.defineClasses();

}


XPLPackageManager.prototype.getPackageByNamespace = function(namespace) {
		var xplManager = this;
		var href = xplManager.getHrefByNamespace(namespace);
		var pkg = xplManager.getPackageByHref(href, false);
		return pkg;
}


XPLPackageManager.prototype.getPackageByHref = function(href, bAbsolute) {
		var xplManager = this;
		var xmlDoc = xplManager.loadDocument(href, bAbsolute);
		var xslt = xplManager.xplProcessor;
		var jsDoc = xslt.transformToDocument(xmlDoc);
		var jsonText = jsDoc.documentElement.textContent;
		var spec = eval("({" + jsonText +"})");
		var pkg = xplManager.createPackage(spec);
		pkg.document = xmlDoc;
		return pkg;
}

XPLPackageManager.prototype.__defineSetter__("index", function(val) {
		var xplManager = this;
		if (xplManager._index) {
			console.log('The "index" PI can only be set once.  The requested ' + val + ' will be ignored!');
			return;
		}
		
		xplManager._index = val;

		var base = val.replace(/[^\/]*$/,""); // trim everything after last slash
		var trailingSlash = val.match(/\/$/);
		base = base.replace(/\/+/, ""); // coalesce all trailing slashes
		xplManager.base = base;
		var xmlIndex = XPLPackageManager.loadXML(xplManager._index);
		forEach(xmlIndex.getElementsByTagName("feature"), function(feature) {
				var id = feature.getAttribute("name")+" "+feature.getAttribute("version");
				var pkg = {
					id: id,
					requiredNamespaces: [],
					importedNamespaces: []
				};

				function require(element) {
					pkg.requiredNamespaces.push(element.getAttribute("namespace"));
				}
				forEach(feature.getElementsByTagName("require"), require);
				forEach(feature.getElementsByTagName("import"), require);
				forEach(feature.getElementsByTagName("import"), function(element) {
					pkg.importedNamespaces.push(element.getAttribute("namespace"));
				});
				xplManager.featureDirectives[id] = pkg;
		});
		forEach(xmlIndex.getElementsByTagName("package"), function(xmlPkg) {
				var href = xmlPkg.getAttribute("href");
				var namespace = xmlPkg.getAttribute("namespace");
				if (namespace) xplManager.packageHrefByNamespace[namespace] = href;
		});
		forEach(xmlIndex.getElementsByTagName("link"), function(xplLink) {
				if ("transform" != xplLink.getAttribute("rel")) return;  // TODO handle uppercase and non-transform links
				var href = xplLink.getAttribute("href");
				xplManager.xplTransform = href;
				var xslt = new XSLTProcessor();
				var xsltDoc = xplManager.loadDocument(href);
				xslt.importStylesheet(xsltDoc);
				xplManager.xplProcessor = xslt;
		});
});


XPathContext = (function() {
	
	var XPathContext = function(owner) {
		var callee = arguments.callee;
		if (this.constructor == callee && callee.qualifiedName == owner) return;  // if caller == callee allow object creation
		if (!owner || !owner.nodeType) {
			throw "Cannot create XPathContext interface";
		}
		var xplInterface = new callee(callee.qualifiedName);
		xplInterface.owner = owner;
		return xplInterface;
	}
	
	XPathContext.qualifiedName = "XPathContext";
	
	XPathContext.prototype.select = function(expression) {
		var xpe = new XPathEvaluator();
		var iter = xpe.evaluate(expression,	this.owner,
								function(ns) { return "http://www.w3.org/1999/xhtml" },
								XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
		var node;
		var aNode = [];
		while (node = iter.iterateNext()) aNode.push(node);
		return aNode;
	}
	
	return XPathContext;

})();


XPLProcessingInstruction = (function() {

	var XPLProcessingInstruction = function(owner) {
		var callee = arguments.callee;
		if (this.constructor == callee && callee.qualifiedName == owner) return;  // if caller == callee allow object creation
		if (!owner || Node.PROCESSING_INSTRUCTION_NODE != owner.nodeType) throw "Cannot create XPLProcessingInstruction interface";
		if ("xpl" != owner.target) return null;
		var xplInterface = new callee(callee.qualifiedName);
		xplInterface.owner = owner;
		return xplInterface;
	}
	
	XPLProcessingInstruction.qualifiedName = "XPLProcessingInstruction";
	
	XPLProcessingInstruction.prototype.__defineGetter__("attributes", function() {
		var result = {};
		var data = this.owner.data;
		RegExp.lastIndex = 0;
		var r = /(\w+)="([^"]*)"/g;
		var att;
		while (att = r.exec(data)) {
			var name = att[1]; var value = att[2];
			result[name] = value;
		}
		return result;
	});
	
	return XPLProcessingInstruction;

})();


XPLStyle = function() {}

XPLStyle.create = function(config) {
	var xplInstance = new this;
	
	xplInstance.viewDocument = config.viewDocument;
	xplInstance.stylesheetCabinet = config.viewDocument.getElementsByTagName("head")[0];
//	xplInstance.reset();
	
	return xplInstance;
}

XPLStyle.prototype.add = function(text) {
	var elt = document.createElement("style");
	elt.appendChild(document.createTextNode(text));
	this.stylesheetCabinet.appendChild(elt);
}

XPLStyle.prototype.reset = function() {
	var cab = this.stylesheetCabinet;
	var styleElts = cab.getElementsByTagName("style");
	forEach (styleElts, function(elt) { cab.removeChild(elt); });
}


XPLView = function() {}
// TODO decide whether behaviorManager and styleManager are owned by the view, or assigned during init()
// DEFINE XPLView_OwnsManagers

XPLView.BEFORE = 0;
XPLView.AFTER = 1;
XPLView.FIRST_CHILD = 2;
XPLView.LAST_CHILD = 3;

XPLView.create = function(config) {
	var xplInstance = new this;
	(function() {

// IFDEF XPLView_OwnsManagers
	this.packageManager = config.packageManager;
// ENDIF
	this.viewDocument = config.viewDocument;
	this.viewObject = config.viewDocument.getElementsByTagName("body")[0];

	}).call(xplInstance);
	return xplInstance;
}

XPLView.prototype.init = function(config) {
	this.location = config.location;
	this.behaviorManager = config.behaviorManager
// IFDEF XPLView_OwnsManagers
		|| XPLBehaviorManager.create({ viewDocument: this.viewDocument, location: config.location, packageManager: this.packageManager });
// ENDIF
	this.styleManager = config.styleManager
// IFDEF XPLView_OwnsManagers
		|| XPLStyleManager.create({ viewDocument: this.viewDocument, location: config.location });
// ENDIF
}

XPLView.prototype.clear = function() {
	var tmp;
	while (tmp = this.viewObject.firstChild) this.viewObject.removeChild(tmp);
	delete this.location;
	delete this.styleManager;
	delete this.behaviorManager;
}


XPLView.prototype.insert = function(frag, ref, pos) {
	if (!ref) {
		ref = this.viewObject;
		if (pos != XPLView.LAST_CHILD) pos = XPLView.FIRST_CHILD;
	}
	if (null == pos) pos = XPLView.BEFORE;

	var div = frag;
if (frag.nodeType == Node.ELEMENT_NODE || frag.nodeType == Node.DOCUMENT_FRAGMENT_NODE)  {
	// the insert fragment needs to be wrapped so that xpath evaluation works (see XPLBehaviorManager.apply)
	div = document.createElement("div");
	div.appendChild(frag);
//	TODO this.context.applyBindingsAttached(div);

}

	switch (pos) {
		case XPLView.FIRST_CHILD:
			if (ref.firstChild) ref.insertBefore(div, ref.firstChild);
			else ref.appendChild(div);
			break;
		case XPLView.LAST_CHILD:
			ref.appendChild(div);
			break;
		case XPLView.BEFORE:
			ref.parentNode.insertBefore(div, ref);
			break;
		case XPLView.AFTER:
			if (ref.nextSibling) ref.parentNode.insertBefore(div, ref.nextSibling);
			else ref.parentNode.appendChild(div);
			break;
	}

// NOTE this is a work-around for context.apply() performing binding attachment and initialization in one go
if (frag.nodeType == Node.ELEMENT_NODE || frag.nodeType == Node.DOCUMENT_FRAGMENT_NODE) {
//	TODO this.context.applyBindingsReady(div);
	this.behaviorManager.apply(div);
	// now unwrap the fragment, i.e. replace div with it's children
	var tmp;
	while (tmp = div.firstChild) { div.removeChild(tmp); div.parentNode.insertBefore(tmp, div); }
	div.parentNode.removeChild(div);
}

}


XPLBrowser = function() {}

XPLBrowser.create = function(config) {
	if (!config) config = {};
	var xplInstance = new this;
	(function() {

	this.packageManager = XPLPackageManager.create();
	this.viewDocument = config.viewDocument || document;		
	this.view = XPLView.create({ viewDocument: this.viewDocument });
	
	}).call(xplInstance);
	return xplInstance;
}

XPLBrowser.prototype.clear = function() {
	this.view.clear();
	delete this.styleManager;
	delete this.behaviorManager;
}
	
XPLBrowser.prototype.init = function(config) {
	this.location = config.location;
	this.behaviorManager = XPLBehaviorManager.create({ packageManager: this.packageManager, location: config.location, viewDocument: this.viewDocument });
	this.styleManager = XPLStyleManager.create({ viewDocument: this.viewDocument, location: config.location });
	this.view.init(this);
}

XPLBrowser.prototype.attach = function() {
	this.sourceDocument = document;
	this.viewDocument.base = this.viewDocument.baseURI.replace(/\/[^\/]*$/, "");
	this.init({ location: window.location });
	
	this.applyProcessingInstructions();
	this.applyLinkDirectives();
	
	this.behaviorManager.apply(this.view.viewObject);

}

XPLBrowser.prototype.locationFromHref = function(href) {
	var leadingSlash = href.match(/^\//);
	var location = this.viewDocument.location;
	var pathname = (leadingSlash) ? href : location.pathname.replace(/[^\/]*$/, href);
	var path = pathname.replace(/\/[^\/]*$/,"");
	var filename = pathname.replace(/.*\/([^\/]*)$/, "$1");
	var fullHref = location.protocol + "//" + location.host + pathname;
	return {
		host: location.host,
		hostname: location.hostname,
		port: location.port,
		protocol: location.protocol,
		hash: "",
		pathname: pathname,
		href: fullHref,
		path: path,
		filename: filename
	};
	
}

XPLBrowser.prototype.load = function(href) {
	var location = this.locationFromHref(href);
	var document = this.viewDocument;

	// var src = XPLPackageManager.loadXML("get.php?url="+url);
	var src = XPLPackageManager.loadXML(location.pathname);
	// TODO check that load was valid
	this.clear();
	this.init({ location: location });
	document.base = location.path; // TODO roll this into XPLLocation or something else

	this.sourceDocument = src;
	this.applyProcessingInstructions();
	this.applyLinkDirectives();
	
	var srcBody = src.getElementsByTagName("body")[0];
	var frag = document.createDocumentFragment();
	var n = srcBody.childNodes.length;
	for (var i=0; i<n; i++) {
		var srcNode = srcBody.childNodes[i];
		var tmp = document.importNode(srcNode, true);
		frag.appendChild(tmp);
	}
	this.view.insert(frag, null, XPLView.LAST_CHILD);

}


XPLBrowser.prototype.applyLinkDirectives = function() {
	var directives = XPathContext(this.sourceDocument).select(".//html:head/html:link");
	forEach(directives, function(link) {
		if (link.getAttribute("rel") == "stylesheet" && link.getAttribute("type") == "text/css") {
			this.styleManager.add(link);
		}
		if (link.getAttribute("rel") == "stylesheet" && link.getAttribute("type") == "text/xml") {
			var href = link.getAttribute("href");
			this.behaviorManager.require(href);
		}
	}, this);
}

XPLBrowser.prototype.applyProcessingInstructions = function() {
	var xplBrowser = this;
	var xplBehaviors = this.behaviorManager;
	var xplManager = this.packageManager;
	var aProcInstr = XPathContext(this.sourceDocument).select("processing-instruction()");
	forEach (aProcInstr, function(pi) {
		var xplPI = XPLProcessingInstruction(pi);
		if (!xplPI) return;
		var aAttr = xplPI.attributes;
		for (var name in aAttr) {
			var value = aAttr[name];
			if ("index" == name) xplManager.index = value;
			if ("feature" == name) xplBehaviors.requireFeature(value);
		}							 
	});
}


XPLStyleManager = function() {}
// TODO handle alternate stylesheets via "title" attribute

XPLStyleManager.create = function(config) {
	var xplInstance = new this;
	
	xplInstance.viewDocument = config.viewDocument;
	xplInstance.location = config.location;
	
	var headElts = config.viewDocument.getElementsByTagName("head");
	if (1 != headElts.length) throw "viewDocument should only have one head";
	xplInstance.stylesheetCabinet = headElts[0];
	
	return xplInstance;
}

XPLStyleManager.prototype.add = function(link) {
	var document = this.viewDocument;

	var href = link.getAttribute("href");
	var text = XPLPackageManager.load(this.location.path + "/" + href, true);
	
	var elt = document.createElement("style");
	elt.appendChild(document.createTextNode(text));
	this.stylesheetCabinet.appendChild(elt);
}

XPLStyleManager.prototype.reset = function() {
	var cab = this.stylesheetCabinet;
	var styleElts = cab.getElementsByTagName("style");
	forEach (styleElts, function(elt) { cab.removeChild(elt); });
}


XPLBehaviorManager = function() {}

XPLBehaviorManager.create = function(config) {
	var xplInstance = new this;
	if (!config) config = {};
	(function() {
		
	this.packageManager = config.packageManager || XPLPackageManager.create();
	this.viewDocument = config.viewDocument || document;
	this.location = config.location;
	this.requiredFeatures = [];
	this.packages = [];
	this.packagesByNamespace = {};
	
	}).call(xplInstance);
	return xplInstance;
}

XPLBehaviorManager.prototype.eval = function(text) {
	var xplContext = this;
	var xplManager = this.packageManager;
	var sandbox = {};
	
	forEach(xplContext.requiredFeatures, function(feature) {
		var xplFeature = xplManager.featureDirectives[feature];
		forEach(xplFeature.importedNamespaces, function(xplNamespace) {
			var xplPackage = xplManager.packagesByNamespace[xplNamespace];
			for (var xplClass in xplPackage.publicClasses) {
				sandbox[xplClass] = xplPackage.publicClasses[xplClass];
			}
		});
	});

	with (sandbox) { return eval(text) }
}

XPLBehaviorManager.prototype.requireFeature = function(feature) {
	this.packageManager.requireFeature(feature);
	this.requiredFeatures.push(feature);
	$linearizeFeature.call(this, feature);
}


XPLBehaviorManager.prototype.require = function(href) {
	var xplPackage = this.importBindingDocument(this.location.path + "/" + href);
	$linearizePackage.call(this, xplPackage);
}


XPLBehaviorManager.prototype.importBindingDocument = function(href) {
	var xplManager = this.packageManager;
	var xplPackage = xplManager.getPackageByHref(href, true);
	// features
	forEach (xplPackage.requiredFeatures, function(feature) {
		xplManager.requireFeature(feature);
	});
	
	// namespaces
	forEach (xplPackage.requiredNamespaces, function(namespace) {
		xplManager.requireNamespace(namespace);
	});

	xplPackage.declareClasses();
	xplPackage.defineClasses();
	return xplPackage;
}


XPLBehaviorManager.prototype.apply = function(context) {
	var xplManager = this;
	var xpe = new XPathEvaluator();
	// APPLY bindings	
	forEach(xplManager.packages, function(xplPackage) {
		forEach(xplPackage.elementBindings, function(bindingSpec) {
			var binding = bindingSpec.src;
			var aElt = [];
			var iter = xpe.evaluate(bindingSpec.target, context, function(ns) { return "http://www.w3.org/1999/xhtml" }, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
			var elt; 
			while (elt = iter.iterateNext()) aElt.push(elt);
			forEach(aElt, function(elt) {
				if (!elt.xplBindings) elt.xplBindings = {};
				var o = binding.create(XPLClass.PROTECTED);
				o.boundElement = elt;
				o.element = elt;
				var chain = binding.does;
				// forEach(chain, function(xplClass) { elt.xplBindings[xplClass] = o; });
				var n = chain.length;
				for (var i=0; i<n; i++) { var qName = chain[i].qualifiedName; if(qName) elt.xplBindings[qName] = o.__public__; }
				// TODO walk the constructor chain to get handlers
				forEach(binding.xplHandlers, function(handlerClass) {
					var handler = new handlerClass();
					handler.ownerBinding = o;
					xplManager.addHandler(elt, handler);
				}, this);
				// TODO implement attach and init event handling
				binding.attach(o);
				binding.init(o);
			}, this);
		}, this);
	}, this);	

}


XPLBehaviorManager.prototype.addHandler = function(element, handler) {
//alert("addHandler(Element: "+element.tagName+"#"+element.name+", Event: "+handler.type+")");
	if (!element.eventHandler) element.eventHandler = new XPLHandler();
	element.addEventListener(handler.type, element.eventHandler, false);  // TODO how to handle event capture
	element.eventHandler.addHandler(handler.type, handler);
}

// TODO  XPLBehaviorManager.prototype.removeHandler


// TODO incorporate linearize functions into XPLBehaviorManager or something
function $linearizeNamespace(namespace) {
	var xplContext = this;
	var xplManager = this.manager || this.packageManager;
	if (xplContext.packagesByNamespace[namespace]) return;  // already incorporated.  Don't duplicate.  
	
	var xplPackage = xplManager.packagesByNamespace[namespace];
	
	xplContext.packagesByNamespace[namespace] = xplPackage;
	xplContext.packages.push(xplPackage);
	
	forEach (xplPackage.requiredFeatures, $linearizeFeature, xplContext);
	forEach (xplPackage.requiredNamespaces, $linearizeNamespace, xplContext);
}

function $linearizeFeature(feature) {
	var xplContext = this;
	var xplManager = this.manager || this.packageManager;
	var xplFeature = xplManager.featureDirectives[feature];
	forEach (xplFeature.requiredFeatures, $linearizeFeature, xplContext);
	forEach (xplFeature.requiredNamespaces, $linearizeNamespace, xplContext);
}

function $linearizePackage(xplPackage) {
	var xplContext = this;
	var xplManager = this.manager || this.packageManager;
	xplContext.packages.push(xplPackage);
	
	forEach (xplPackage.requiredFeatures, $linearizeFeature, xplContext);
	forEach (xplPackage.requiredNamespaces, $linearizeNamespace, xplContext);
}


XPLLocation = function(text) {
	
}
	

XPLLocation.create = function(config) {
	var xplInstance = new this;
	(function() {


				
	}).call(xplInstance);
	return xplInstance;
}

XPLLocation.prototype.__defineGetter__("href", function() {
	return this.xplData.href;
});

XPLLocation.prototype.resolve = function(href) {
	var leadingSlash = href.match(/^\//);
	var pathname = (leadingSlash) ? href : location.pathname.replace(/[^\/]*$/, href);
	var path = pathname.replace(/\/[^\/]*$/,"");
	var filename = pathname.replace(/.*\/([^\/]*)$/, "$1");
	var fullHref = location.protocol + "//" + location.host + pathname;
	return {
		host: location.host,
		hostname: location.hostname,
		port: location.port,
		protocol: location.protocol,
		hash: "",
		pathname: pathname,
		href: fullHref,
		path: path,
		filename: filename
	};
	
}

// TODO roll XPLSandbox into XPLPackage and XPLWindow
XPLSandbox = function() {}

XPLSandbox.prototype.getRoot = function() {
	var xplContext = this.context;
	var xplManager = this.manager;
	var root = {};

	forEach(xplContext.requiredFeatures, function(feature) {
		var xplFeature = xplManager.featureDirectives[feature];
		forEach(xplFeature.importedNamespaces, function(xplNamespace) {
			var xplPackage = xplManager.packagesByNamespace[xplNamespace];
			for (var xplClass in xplPackage.publicClasses) {
				root[xplClass] = xplPackage.publicClasses[xplClass];
			}
		});
	});

	return root;
}

XPLSandbox.prototype.eval = function(text) {
	with (this.getRoot()) { return eval(text) }
}


XPLVirtualizer = function() {}

XPLVirtualizer.prototype.doApply = function(fn, context, params) {
	if (fn.traceOn) {
		forEach (params, function(param, i) {
				
			});
	}
	return fn.apply(context, params);
}

XPLVirtualizer.prototype.doCall = function(fn, context) {
	var params = Array.slice(arguments, 2);
	return this.doApply(fn, context, params);
}

XPLVirtualizer.prototype.createFunction = function(fn) {
	var vm = this;
	var object = function() {
		vm.doApply(this.func, this, arguments);
	}
	object.func = fn;
	return object;
}


XPLFunction = function() {};

XPLFunction.create = function(funcSpec) {
	var xplInstance = new this;
	(function() {
		
	if (null == $classScoping) throw "$classScoping not defined";
	var evalText =
		"function(" + funcSpec.params.join(", ") + ") {\n" +
		$classScoping ? "with (this) return (function() {\n" : "" +
		funcSpec.body +
		$classScoping ? "\n}).apply(this, arguments);" : "" +
		"\n}"
		;
	if (null == $environment) throw "$environment not defined";
	with ($environment) this.exec = eval(evalText); 
	this.type = funcSpec.type;
	this.params = funcSpec.params;
	
	}).call(xplInstance);
	return xplInstance;
}

XPLFunction.prototype.apply = function(context, params) { this.exec.apply(context, params) };
XPLFunction.prototype.call = function(context) { var params = Array.slice(arguments, 1); this.exec.apply(context, params); };


XPLObject = function() {};
XPLObject.create = function(objSpec) {
	forEach (objSpec.methods, function(methSpec) {
		this[methSpec.name] = XPLFunction.create(methSpec);
	});
	forEach (objSpec.properties, function(propSpec) {
		if (propSpec.setter || propSpec.getter) {
			this.__defineGetter__(propSpec.name, XPLFunction.create({
					type: propSpec.type,
					params: [],
					body: propSpec.getter
				})
			);
			this.__defineSetter__(propSpec.name, XPLFunction.create({
					type: propSpec.type,
					params: [ { name: "val", type: propSpec.type } ],
					body: propSpec.setter
				})
			);
		}
		else {
			this.__defineGetter__(propSpec.name, XPLFunction.create({
					type: propSpec.type,
					params: [],
					body: "return this.xplData." + propSpec.name + ";"
				})
			);
			this.__defineSetter__(propSpec.name, XPLFunction.create({
					params: [ { name: "val", type: propSpec.type } ],
					body: "this.xplData." + propSpec.name + " = val;"
				})
			);
		}	
	});
}



create = function(xplClass, mods) {
	var xplInstance = new xplClass;
	xplInstance.__constructor__ = xplClass;
	var xplData = {};
	xplInstance.xplData = xplData;
	var xplPublic = {};
	xplInstance.xplPublic = xplPublic;

	forEach(this.is, function(klass) { klass.prototype.oncreate.call(xplInstance) });
	
	switch (xplVisibility) {
		case XPLClass.PRIVATE:
			throw "Cannot access private interface";
			break;
		case XPLClass.PROTECTED:
			return xplInstance;
			break;
		case XPLClass.PUBLIC: case null:
			return xplPublic;
			break;
		default:
			throw "Cannot create an object with visibility: " + xplVisibility;
			break;
	}
}

