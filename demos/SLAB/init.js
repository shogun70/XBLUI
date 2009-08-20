(function() {

Meeko.stuff.domSystem.initialize();

var xblSystem = Meeko.stuff.xblSystem;

xblSystem.Element.bind = function(elt) {
	if (elt.slabID) return elt; // FIXME orthogonality
	Meeko.stuff.domSystem.attach(elt);
	return elt;
}

xblSystem.Element.matchesSelector = Element.matchesSelector;

xblSystem.initialize();

})();
