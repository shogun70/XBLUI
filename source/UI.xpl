<?xml version="1.0"?>
<?access-control allow="*"?>
<!--
XBL2 UI classes
Copyright 2007, Sean Hogan (http://www.meekostuff.net/)
All rights reserved
-->
<package xmlns="http://www.meekostuff.net/ns/xpl">

<class name="DOMTokenList">
	<property name="tokens" visibility="protected">
		<getter>
var element = this.boundElement;
var text = element.className;
if (!text) return [];
var strings = text.split(/\s+/);
var sorted = strings.sort();
for (var i=sorted.length-1; i>0; i--) {
	if (sorted[i] == sorted[i-1]) sorted.splice(i);
}
return sorted;
		</getter>
	</property>
	<property name="length">
		<getter>
return this.getTokens().length;
		</getter>
	</property>
	<method name="item">
		<parameter name="index"/>
		<body>
return this.getTokens()[index];
		</body>
	</method>
	<method name="has">
		<parameter name="token"/>
		<body>
return (-1 != Array.indexOf(this.getTokens(), token));
		</body>
	</method>
	<method name="add">
		<parameter name="token"/>
		<body>
var element = this.boundElement;
var tokens = this.getTokens();
if (!this.has(token)) {
	var text = element.className.replace(/\s*$/, " " + token);
	element.className = text;
}
		</body>
	</method>
	<method name="remove">
		<parameter name="token"/>
		<body>
var element = this.boundElement;
if (this.has(token)) {
	var rex, text = element.className;
	rex = RegExp("\\s+"+token+"\\s+", "g");
	text = text.replace(rex, " ");
	rex = RegExp("^\\s*"+token+"\\s+");
	text = text.replace(rex, "");
	rex = RegExp("\\s+"+token+"\\s*$");
	text = text.replace(rex, "");
	if (text == token) text = "";
	element.className = text;
}
		</body>
	</method>
	<method name="toggle">
		<parameter name="token"/>
		<body>
if (this.has(token)) this.remove(token);
else this.add(token);
		</body>
	</method>		
</class>

<class name="HTMLElement">
	<property name="classList">
		<getter>return this._classList;</getter>
	</property>
	<method name="xblBindingAttached">
		<body>
this._classList = ({
	_binding: this,
	_getTokens: function() {
		var text = this._binding.boundElement.className;
		if (!text) return [];
		var strings = text.split(/\s+/);
		var sorted = strings.sort();
		for (var i=sorted.length-1; i>0; i--) {
			if (sorted[i] == sorted[i-1]) sorted.splice(i);
		}
		return sorted;
	},
	getLength: function() { return this._getTokens().length; },
	item: function(index) { return this._getTokens()[index]; },
	has: function(string) { return (-1 != Array.indexOf(this._getTokens(), string)); },
	add: function(string) {
		var tokens = this._getTokens();
		if (!this.has(string)) {
			var text = this._binding.boundElement.className.replace(/\s*$/, " " + string);
			this._binding.boundElement.className = text;
		}
	},
	remove: function(string) {
		if (this.has(string)) {
			var rex, text = this._binding.boundElement.className;
			rex = RegExp("\\s+"+string+"\\s+", "g");
			text = text.replace(rex, " ");
			rex = RegExp("^\\s*"+string+"\\s+");
			text = text.replace(rex, "");
			rex = RegExp("\\s+"+string+"\\s*$");
			text = text.replace(rex, "");
			if (text == string) text = "";
			this._binding.boundElement.className = text;
		}
	},
	toggle: function(string) {
		if (this.has(string)) this.remove(string);
		else this.add(string);
	}
});
		</body>
	</method>
</class>

<class name="ElementUI">
	<method name="xblBindingAttached">
		<body>
	this._meta = [];
	this._meta[0] = true; // enabled
	this._meta[1] = false; // default
	this._meta[2] = false; // checked
	this._meta[3] = false; // selected
	this._meta[4] = false; // valid
	this._meta[5] = false; // required
	this._meta[6] = 3; // data
	this._meta[10] = 0; // value
	
	this._dynamic = [];
	this._dynamic[0] = false; // active
	this._dynamic[1] = false; // hover
	this._dynamic[2] = true; // open
		</body>
	</method>
	<method name="setDynamicState">
		<parameter name="state"/>
		<parameter name="value"/>
		<body>
	var evType =
		(0 == state) ? "activestatechange" :
		(1 == state) ? "hoverstatechange" :
		(2 == state) ? "openstatechange" :
		null;
	if (null == evType) throw "Invalid state in setDynamicState()";
	
	var bVal = Boolean(value);
	this._dynamic[state] = bVal;
	event = document.createEvent("UIEvents");
	event.initUIEvent(evType, false, true, null, bVal);
	return this.boundElement.dispatchEvent(event);
		</body>
	</method>
	<method name="getDynamicState">
		<parameter name="state"/>
		<body>
	return this._dynamic[state];
		</body>
	</method>
</class>

<class name="tree">
	<method name="getRefElement">
		<body>
	for (var node=this.boundElement.firstChild; node; node=node.nextSibling) {
		if ("A" == node.tagName || "LABEL" == node.tagName) return node;
	}
	return null;
		</body>
	</method>
	<method name="getView">
		<body>
	var element = this.boundElement;
	var document = element.ownerDocument;
	var ref = this.getRefElement();
	if ("A" == ref.tagName) {
		var href = ref.href;
		var baseURI = document.documentURI;
		var rex = new RegExp("^"+baseURI+"#");
		if (href.match(rex)) {
			var id = href.replace(rex, "");
			return document.getElementById(id);
		}
	}
	else if ("LABEL" == ref.tagName) {
		var id = ref.htmlFor;
		if (id) return document.getElementById(id);
	}
	return null;
		</body>
	</method>
	<method name="getList">
		<body>
	var node = this.boundElement;
	if ("OL" == node.tagName || "UL" == node.tagName || "SELECT" == node.tagName) return node;
	for (var node=node.firstChild; node; node=node.nextSibling) {
		if ("OL" == node.tagName || "UL" == node.tagName || "SELECT" == node.tagName) return node;
	}
	return null;
		</body>
	</method>
	<method name="setOpenState">
		<parameter name="state"/>
		<body>
	var element = this.boundElement;
	var list = this.getList();
	if (!list) throw " ";
	if (state) {
		element.setAttribute("class", "open");
	}
	else {
		element.setAttribute("class", "closed");
	}
		</body>
	</method>
	<method name="getOpenState">
		<body>
	var element = this.boundElement;
	var list = this.getList();
	if (!list) throw " ";
	var state = (element.getAttribute("class") == "open");
	return state;
		</body>
	</method>
	<method name="getItems">
		<body>
	var list = this.getList();
	var items = [];
	forEach (list.childNodes, function(node) {
		if (Node.ELEMENT_NODE == node.nodeType) items.push(node);
	});
	return items;
		</body>
	</method>
	<method name="getSelectedItem">
		<body>
<![CDATA[
	var items = this.getItems();
	var n = items.length;
	for (var i=0; i<n; i++) {
		if ("current" == items[i].className) return items[i];
	}
	return null;
]]>
		</body>
	</method>
	<method name="selectItem">
		<parameter name="item"/>
		<body>
<![CDATA[
	var list = this.getList();
	if (item.parentNode != list) throw "Element doesn't exist in list";
	var items = this.getItems();
	var n = items.length;
	for (var i=0; i<n; i++) {
		if (items[i] == item) items[i].getClassList().add("current");
		else items[i].getClassList().remove("current");
	}
	this.signalChange();
]]>
		</body>
	</method>
	<method name="signalChange">
		<body>
	var element = this.boundElement;
	var document = element.ownerDocument;
	var event;
	event = document.createEvent("HTMLEvents");
	event.initEvent("change", false, true);
	return element.dispatchEvent(event);
		</body>
	</method>
	<method name="ondocumentready">
		<body>
	var item = this.getSelectedItem();
	if (item) {
		this.signalChange();
	}
	else {
		item = this.getItems()[0];
		this.selectItem(item);
	}	
		</body>
	</method>
	<method name="xblEnteredDocument">
		<body>
	var binding = this;
	this._init = function() {
		binding.ondocumentready();
	}
	this.boundElement.ownerDocument.parentWindow.addEventListener("load", this._init, false);
		</body>
	</method>
</class>

<class name="treeitem">
	<method name="getRefElement">
		<body>
	for (var node=this.boundElement.firstChild; node; node=node.nextSibling) {
		if ("A" == node.tagName || "LABEL" == node.tagName) return node;
	}
	return null;
		</body>
	</method>
	<method name="getView">
		<body>
	var element = this.boundElement;
	var document = element.ownerDocument;
	var ref = this.getRefElement();
	if ("A" == ref.tagName) {
		var href = ref.href;
		var baseURI = document.documentURI;
		var rex = new RegExp("^"+baseURI+"#");
		if (href.match(rex)) {
			var id = href.replace(rex, "");
			return document.getElementById(id);
		}
	}
	else if ("LABEL" == ref.tagName) {
		var id = ref.htmlFor;
		if (id) return document.getElementById(id);
	}
	return null;
		</body>
	</method>
	<method name="getList">
		<body>
	var node = this.boundElement;
	if ("OL" == node.tagName || "UL" == node.tagName || "SELECT" == node.tagName) return node;
	for (var node=node.firstChild; node; node=node.nextSibling) {
		if ("OL" == node.tagName || "UL" == node.tagName || "SELECT" == node.tagName) return node;
	}
	return null;
		</body>
	</method>
	<method name="activate">
		<body>
	var element = this.boundElement;
	for (var ancestor=element.parentNode; ancestor; ancestor=ancestor.parentNode) {
		if (ancestor.selectItem) {
			ancestor.selectItem(element);
			break;
		}
	}
		</body>
	</method>
	<method name="setOpenState">
		<parameter name="state"/>
		<body>
	var element = this.boundElement;
	var list = this.getList();
	if (!list) throw "setOpenState";
	if (state) {
		element.getClassList().remove("closed");
		element.getClassList().add("open");
	}
	else {
		element.getClassList().remove("open");
		element.getClassList().add("closed");
	}
		</body>
	</method>
	<method name="getOpenState">
		<body>
	var element = this.boundElement;
	var list = this.getList();
	if (!list) throw "getOpenState";
	return element.getClassList().has("open");
		</body>
	</method>
</class>

<class name="navlist">
	<method name="getRefElement">
		<body>
	for (var node=this.boundElement.firstChild; node; node=node.nextSibling) {
		if ("A" == node.tagName) return node;
	}
	return null;
		</body>
	</method>
	<method name="getView">
		<body>
	var element = this.boundElement;
	var document = element.ownerDocument;
	var anchor = this.getRefElement();
	var href = anchor.href;
	var baseURI = document.documentURI;
	var rex = new RegExp("^"+baseURI+"#");
	if (href.match(rex)) {
		var id = href.replace(rex, "");
		return document.getElementById(id);
	}
	return null;
		</body>
	</method>
	<method name="getList">
		<body>
	var element = this.boundElement;
	if ("OL" == element.tagName || "UL" == element.tagName) return node;
	for (var node=element.firstChild; node; node=node.nextSibling) {
		if ("OL" == node.tagName || "UL" == node.tagName) return node;
	}
	return null;
		</body>
	</method>
	<method name="getItems">
		<body>
	var list = this.getList();
	var items = [];
	forEach (list.childNodes, function(node) {
		if (Node.ELEMENT_NODE == node.nodeType) items.push(node);
	});
	return items;
		</body>
	</method>
	<method name="getSelectedIndex">
		<body>
<![CDATA[
	var items = this.getItems();
	var n = items.length;
	for (var i=0; i<n; i++) {
		if (items[i].getClassList().has("current")) return i;
	}
	return null;
]]>
		</body>
	</method>
	<method name="getSelectedItem">
		<body>
<![CDATA[
	var items = this.getItems();
	var n = items.length;
	for (var i=0; i<n; i++) {
		if (items[i].getClassList().has("current")) return items[i];
	}
	return null;
]]>
		</body>
	</method>
	<method name="selectItem">
		<parameter name="item"/>
		<body>
<![CDATA[
	var list = this.getList();
	if (item.parentNode != list) throw "Element doesn't exist in list";
	var items = this.getItems();
	var n = items.length;
	for (var i=0; i<n; i++) {
		if (items[i] == item) items[i].getClassList().add("current");
		else items[i].getClassList().remove("current");
	}
	this.signalChange();
]]>
		</body>
	</method>
	<method name="signalChange">
		<body>
	var element = this.boundElement;
	var document = element.ownerDocument;
	var event;
	event = document.createEvent("HTMLEvents");
	event.initEvent("change", false, true);
	return element.dispatchEvent(event);
		</body>
	</method>
	<method name="ondocumentready">
		<body>
	var item = this.getSelectedItem();
	if (item) {
		this.signalChange();
	}
	else {
		var item = this.getItems()[0];
		this.selectItem(item);
	}
		</body>
	</method>
	<method name="xblEnteredDocument">
		<body>
	var binding = this;
	this._init = function() {
		binding.ondocumentready();
	}
	this.boundElement.ownerDocument.parentWindow.addEventListener("load", this._init, false);
		</body>
	</method>
</class>

<class name="navlistitem">
	<method name="getRefElement">
		<body>
	for (var node=this.boundElement.firstChild; node; node=node.nextSibling) {
		if ("A" == node.tagName) return node;
	}
	return null;
		</body>
	</method>
	<method name="getView">
		<body>
	var element = this.boundElement;
	var document = element.ownerDocument;
	var anchor = this.getRefElement();
	var href = anchor.href;
	var baseURI = document.documentURI;
	var rex = new RegExp("^"+baseURI+"#");
	if (href.match(rex)) {
		var id = href.replace(rex, "");
		return document.getElementById(id);
	}
	return null;
		</body>
	</method>
</class>

<class name="scrollBox">
	<method name="setView">
		<parameter name="item"/>
		<body>
	var element = this.boundElement;
	var document = element.ownerDocument;
	for (var node=item; element!=node; node=node.parentNode) {
		if (document==node) throw "setView failed: item is not descendant of scrollBox";
	}

	element.scrollTop = item.offsetTop - element.offsetTop;
		</body>
	</method>
</class>
	
<class name="scrollBoxWithResize">
	<method name="setView">
		<parameter name="item"/>
		<body>
	var element = this.boundElement;
	var document = element.ownerDocument;
	for (var node=item; element!=node; node=node.parentNode) {
		if (document==node) throw "setView failed: item is not descendant of scrollBoxWithResize";
	}
	element.style.height = String(item.clientHeight) + "px";
	element.scrollTop = item.offsetTop - element.offsetTop;
		</body>
	</method>
	<method name="xblBindingAttached">
		<body>
	var element = this.boundElement;
	var elementHeight = element.clientHeight;
	element.style.overflow = "hidden";
	element.style.height = "0px";
		</body>
	</method>
</class>
	
<class name="switchBox">
	<method name="setView">
		<parameter name="item"/>
		<body>
	var element = this.boundElement;
	if (element != item.parentNode) throw "setView failed: item is not child of switchBox";
	forEach (element.childNodes, function(child) {
		if (Node.ELEMENT_NODE != child.nodeType) return;
		if (item == child) child.style.display = "";
		else child.style.display = "none";
	});
		</body>
	</method>
	<method name="_getPanels">
		<body>
	var elements = [];
	forEach (this.boundElement.childNodes, function(child) {
		if (Node.ELEMENT_NODE == child.nodeType) elements.push(child);
	});
	return elements;
		</body>
	</method>
	<method name="setViewByIndex">
		<parameter name="index"/>
		<body>
<![CDATA[
	var panels = this._getPanels();
	var n = panels.length;
	if (index >= n) throw "setViewByIndex failed: index is not valid for switchBox";
	for (var i=0; i<n; i++) {
		if (index == i) panels[i].style.display = "";
		else panels[i].style.display = "";
	}
	return;
]]>
		</body>
	</method>
</class>
</package>

