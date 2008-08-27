// FIXME this file is no longer used and should be deleted

var System = java.lang.System;

var XPLBuilder = function() {
	this.contextDocuments = {};
	this.prefetchedDocuments = {};
	this.params = {};
	this.diskCache = {};
	this.memCache = {};
	this.makeDepend = false;
}


XPLBuilder.prototype.build = function(href) {
	print("window.Meeko = {}; Meeko.XPL = {}; Meeko.XPL.params = {}; Meeko.XPL.prefetch = {};");
	if (href) xplBuilder.buildFromHref(href);
}

XPLBuilder.prototype.makeDependencies = function(fname) {
	var uri = new java.io.File(fname).toURL().toString();
	var rq = this.requestUri(uri);
	this.process(rq.responseXML, {
		handleContext: function(uri, rq) { print(uri+" "); },
		handlePrefetch: function(uri, rq) { print(uri+" "); },
		handleScript: function(uri, rq) { if (uri) print(uri+" "); }
	});
}

XPLBuilder.prototype.expandParams = function(text) {
	for (var name in this.params) {
		var value = this.params[name];
		text = text.replace(RegExp("\{"+name+"\}", "g"), value);
	}
	return text;
}

XPLBuilder.prototype.prefetchFromHref = function(href, baseHref) {
	var baseURLObj = (baseHref) ? new java.net.URL(baseHref) :
			(document) ? new java.net.URL(document.location) :
			new java.io.File("./").toURL();
	var urlObj = new java.net.URL(baseURLObj, href);
	var url = urlObj.toString();
	if (this.diskCache[url]) {
		url = "file://" + this.diskCache[url];
	}
	var rq = new XMLHttpRequest;
	rq.open("GET", url, false);
	rq.send("");
	if (!rq.responseXML) throw "couldn't retrieve " + href;
	var text = rq.responseText;
	text = text.replace(/\\/g, "\\\\");
	text = text.replace(/'/g, "\\'");
	text = text.replace(/\t/g, "\\t");
	text = text.replace(/\r/g, "\\r");
	text = text.replace(/\n/g, "\\n");
	print("Meeko.XPL.prefetch['" + href + "'] = '" + text + "';");
}

XPLBuilder.prototype.buildFromHref = function(href, baseHref) {
	var baseURLObj = (baseHref) ? new java.net.URL(baseHref) :
			(document) ? new java.net.URL(document.location) :
			new java.io.File("./").toURL();
	var urlObj = new java.net.URL(baseURLObj, href);
	var url = urlObj.toString();
	if (this.contextDocuments[url]) return;
	if (this.diskCache[url]) {
		url = "file://" + this.diskCache[url];
	}
	var rq = new XMLHttpRequest;
	rq.open("GET", url, false);
	rq.send("");
	if (!rq.responseXML) throw "couldn't retrieve " + href;
	var document = rq.responseXML;
	this.contextDocuments[url] = document;
	
	var node = document.firstChild;
	while (node) {
		if (1 == node.nodeType) break;
		if (7 == node.nodeType) {
			var pi = XMLProcessingInstruction(node);
			if (!pi && !pi.target) continue;
			if ("xpl-param" == pi.target) {
				print("Meeko.XPL.params['" + pi.attributes['name'] + "'] = '" + this.expandParams(pi.attributes['value']) +"';");
			}
			if ("xpl-require" == pi.target) {
				var href = this.expandParams(pi.attributes['href']);
				this.buildFromHref(href, url);
			}
			if ("xpl-prefetch" == pi.target) {
				var href = this.expandParams(pi.attributes['href']);
				this.prefetchFromHref(href, url);
			}
		}
		node = node.nextSibling;
	}
	
	var head = document.getElementsByTagName("head")[0];
	var scripts = head.getElementsByTagName("script");
	for (var i=0; i<scripts.length; i++) {
		var script = scripts[i];
		var href = script.getAttribute("src");
		if (href) {
			var scriptUrl = new java.net.URL(baseURLObj, href).toString();
			var scriptDoc = readUrl(scriptUrl);
			print(scriptDoc);
		}
		else {
			print(script.textContent);
		}
	}

}

XPLBuilder.prototype.requestUri = function(uri) {
	var resolvedUri = (this.diskCache[uri]) ? "file://" + this.diskCache[uri] : uri;
	var rq = new XMLHttpRequest;
	rq.open("GET", resolvedUri, false);
	rq.send("");
	if (rq.status == "200") this.memCache[uri] = rq;
	if (rq.responseXML) rq.responseXML.documentURI = uri;
	return rq;
}

XPLBuilder.prototype.resolveUri = function(uri) {
	return (this.diskCache[uri]) ? "file://" + this.diskCache[uri] : uri;
}

XPLBuilder.prototype.normalize = function(href, baseUri) {
	var baseURL = new java.net.URL(baseUri);
	var normalURL = new java.net.URL(baseURL, href);
	return normalURL.toString();
}

XPLBuilder.prototype.preprocess = function(uri) {
	if (this.contextDocuments[uri]) return;
	var rq = this.requestUri(uri);
	if (!rq.responseXML) throw "couldn't retrieve " + uri;
	var document = rq.responseXML;
	this.contextDocuments[uri] = document;
	
	var node = document.firstChild;
	while (node) {
		if (1 == node.nodeType) break;
		if (7 == node.nodeType) {
			var pi = XMLProcessingInstruction(node);
			if (!pi && !pi.target) continue;
			if ("xpl-param" == pi.target) {
			}
			if ("xpl-require" == pi.target) {
				var contextHref = this.expandParams(pi.attributes['href']);
				contextHref = this.normalize(contextHref, uri);
				this.preprocess(contextHref);
			}
			if ("xpl-prefetch" == pi.target) {
			}
		}
		node = node.nextSibling;
	}	
}

XPLBuilder.prototype.process = function(document, options) {
	var node = document.firstChild;
	while (node) {
		if (1 == node.nodeType) break;
		if (7 == node.nodeType) {
			var pi = XMLProcessingInstruction(node);
			if (!pi && !pi.target) continue;
			if ("xpl-param" == pi.target) {
				if (options.handleParam) options.handleParam(pi);
			}
			if ("xpl-require" == pi.target) {
				var href = this.expandParams(pi.attributes['href']);
				var uri = this.normalize(href, document.documentURI);
				if (!this.contextDocuments[uri]) {
					var rq = this.requestUri(uri);
					this.contextDocuments[uri] = rq;
					if (options.handleContext) options.handleContext(uri, rq);
					this.process(rq.responseXML, options);
				}
			}
			if ("xpl-prefetch" == pi.target) {
				var href = this.expandParams(pi.attributes['href']);
				var uri = this.normalize(href, document.documentURI);
				if (!this.prefetchedDocuments[uri]) {
					var rq = this.requestUri(uri);
					this.prefetchedDocuments[uri] = rq;
					if (options.handlePrefetch) options.handlePrefetch(uri, rq);
				}
			}
		}
		node = node.nextSibling;
	}
	
	var head = document.getElementsByTagName("head")[0];
	var scripts = head.getElementsByTagName("script");
	for (var i=0; i<scripts.length; i++) {
		var script = scripts[i];
		var href = script.getAttribute("src");
		if (href) {
			var uri = this.normalize(href, uri);
			var rq = this.requestUri(uri);
			if (options.handleScript) options.handleScript(uri, rq);
		}
		else {
			if (options.handleScript) options.handleScript(null, null, { responseText: script.textContent});
		}
	}
}



var XMLProcessingInstruction = (function() {

	var XMLProcessingInstruction = function(node) {
		if (!(this instanceof arguments.callee)) return new arguments.callee(node);
		if (!node || 7 != node.nodeType) throw "Cannot create XMLProcessingInstruction interface";
		this.owner = node;
	}

	XMLProcessingInstruction.prototype.__defineGetter__("target", function() { return this.owner.target; });
	XMLProcessingInstruction.prototype.__defineGetter__("data", function() { return this.owner.data; });
	XMLProcessingInstruction.prototype.__defineGetter__("attributes", function() {
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
	
	return XMLProcessingInstruction;

})();


var usage = "xpl [--disk-cache uri fname] [--param name value] [--make-depend] file\n";
var n = arguments.length;
var href;

var xplBuilder = new XPLBuilder;

for (var i=0; i<n; i++) {
	var arg = arguments[i];
	if ("--help" == arg || "-?" == arg) {
		System.err.print(usage);
		quit();
	}
	else if ("--param" == arg) {
		var name = arguments[++i];
		var value = arguments[++i];
		xplBuilder.params[name] = value;
		continue;
	}
	else if ("--disk-cache" == arg) {
		var uri = arguments[++i];
		var fname = arguments[++i];
		xplBuilder.diskCache[uri] = fname;
		continue;
	}
	else if ("--make-depend" == arg) {
		xplBuilder.makeDepend = true;
	}
	else if (/^-/.test(arg)) {
		System.err.print("Illegal option " + arg + "\n" + "Usage:" + usage);
		quit();
	}
	
	else {
		if (null == href) href = arg;
		else {
			System.err.print("Cannot process more than one file.\nUsage: " + usage);
			quit();
		}
	}
}

if (xplBuilder.makeDepend) xplBuilder.makeDependencies(href);
else xplBuilder.build(href);
