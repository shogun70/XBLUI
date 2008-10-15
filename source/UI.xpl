<?xml version="1.0"?>
<?access-control allow="*"?>
<!--
XBL2 UI classes
Copyright 2007, Sean Hogan (http://www.meekostuff.net/)
All rights reserved
-->
<package xmlns="http://www.meekostuff.net/ns/xpl">

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
		if (items[i] == item) items[i].classList.add("current");
		else items[i].classList.remove("current");
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
		element.classList.remove("closed");
		element.classList.add("open");
	}
	else {
		element.classList.remove("open");
		element.classList.add("closed");
	}
		</body>
	</method>
	<method name="getOpenState">
		<body>
	var element = this.boundElement;
	var list = this.getList();
	if (!list) throw "getOpenState";
	return element.classList.has("open");
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
		if (items[i].classList.has("current")) return i;
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
		if (items[i].classList.has("current")) return items[i];
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
		if (items[i] == item) items[i].classList.add("current");
		else items[i].classList.remove("current");
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

