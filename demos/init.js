(function() {


var DOM = {};

DOM.logger = {
	log: function fbug_log() { return console.log.apply(console, arguments); },
	debug: function fbug_debug() { return console.debug.apply(console, arguments); },
	info: function fbug_info() { return console.info.apply(console, arguments); },
	warn: function fbug_warn() { return console.warn.apply(console, arguments); },
	error: function fbug_error() { return console.error.apply(console, arguments); }
}

DOM.utils = {
	resolveURL: function(src, base) { return (Meeko.Net.URIParser.parseUri(src, base)).toString(); }
}

DOM.Document = {
	addEventListener: function(doc, type, handler, useCapture) {
		return doc.addEventListener(type, handler, useCapture);
	}
}

// NOTE these prototype method overrides are needed for Safari-3
// FIXME should we use them for all platforms??
if (NodeList) NodeList.prototype.item = function(index) { return Meeko.stuff.domSystem.attach(this[index]); }
if (HTMLCollection) HTMLCollection.prototype.item = function(index) { return Meeko.stuff.domSystem.attach(this[index]); }

DOM.Element = {
	matchesSelector: function(elt, selector) {
		return Element.matchesSelector(elt, selector);
	},
	bind: function(elt) {
		if (elt._domBindings) return elt; // FIXME orthogonality
		var bind = arguments.callee;
		Meeko.stuff.domSystem.attach(elt);
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

Meeko.stuff.xblSystem.initialize(DOM);

})();
