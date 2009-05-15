(function() {

Meeko.stuff.domSystem.initialize();

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
conf.URL.resolve = function(src, base) {
	return (Meeko.Net.URIParser.parseUri(src, base)).toString();
}

conf.Element.matchesSelector = function(elt, selector) {
	return Element.matchesSelector(elt, selector);
}
conf.Element.bind = function(elt) {
	if (elt._domBindings) return elt; // FIXME orthogonality
	Meeko.stuff.domSystem.attach(elt);
	return elt;
}

Meeko.stuff.xblSystem.initialize();

})();
