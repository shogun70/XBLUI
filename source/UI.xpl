<?xml version="1.0"?>
<?access-control allow="*"?>
<!--
XBL2 UI classes
Copyright 2007, Sean Hogan (http://www.meekostuff.net/)
All rights reserved
-->

<!--
  TODO: use TreeWalker
  TODO: scrap navlist and navlistitem
  TODO: consolidate switchBox functionality
-->
<package namespace="Meeko.UI" xmlns="http://www.meekostuff.net/ns/xpl">

<class pattern="binding" name="treeitem">
	<instance>
		<property name="refElement">
			<getter>
	for (var node=this.boundElement.firstChild; node; node=node.nextSibling) {
		if ("A" == node.tagName || "LABEL" == node.tagName) return node;
	}
	return null;
			</getter>
		</property>
		<property name="view">
			<getter>
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
			</getter>
		</property>
		<property name="list">
			<getter>
	var element = this.boundElement;
	if ("OL" == element.tagName || "UL" == element.tagName || "SELECT" == element.tagName) return element;
	for (var node=element.firstChild; node; node=node.nextSibling) {
		if ("OL" == node.tagName || "UL" == node.tagName || "SELECT" == node.tagName) return node;
	}
	return null;
			</getter>
		</property>
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
	if (!list) throw " ";
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
	if (!list) throw " ";
	var state = element.classList.has("open");
	return state;
			</body>
		</method>
	</instance>
</class>

<class pattern="binding" name="tree" extends="treeitem">
	<instance>
		<method name="getItems">
			<body>
	var list = this.getList();
	var items = [];
	for (var node=list.firstChild; node; node=node.nextSibling) {
		if (Node.ELEMENT_NODE == node.nodeType) items.push(node);
	}
	return items;
			</body>
		</method>
		<property name="selectedIndex">
			<getter>
<![CDATA[
	var items = this.getItems();
	var n = items.length;
	for (var i=0; i<n; i++) {
		if (items[i].classList.has("current")) return i;
	}
	return null;
]]>
			</getter>
		</property>
		<property name="selectedItem">
			<getter>
<![CDATA[
	var items = this.getItems();
	var n = items.length;
	for (var i=0; i<n; i++) {
		if (items[i].classList.has("current")) return items[i];
	}
	return null;
]]>
			</getter>
		</property>
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
	this.boundElement.ownerDocument.addEventListener("load", this._init, false);
			</body>
		</method>
	</instance>
</class>

<!-- FIXME navlistitem and navlist have no functionality beyond tree and treeitem. Should they be scrapped? -->
<class pattern="binding" name="navlistitem" extends="treeitem"/>

<class pattern="binding" name="navlist" extends="tree"/>

<class pattern="binding" name="scrollBox">
	<instance>
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
	</instance>
</class>

<class pattern="binding" name="scrollBoxWithResize">
	<instance>
		<method name="setView">
			<parameter name="item"/>
			<body>
	var element = this.boundElement;
	var document = element.ownerDocument;
	for (var node=item; element!=node; node=node.parentNode) {
		if (document==node) throw "setView failed: item is not descendant of scrollBoxWithResize";
	}
	element.style.height = "" + item.clientHeight + "px";
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
	</instance>
</class>

<class pattern="binding" name="switchBox">
	<instance>
		<method name="setView">
			<parameter name="item"/>
			<body>
	var element = this.boundElement;
	if (element != item.parentNode) throw "setView failed: item is not child of switchBox";
	for (var child=element.firstChild; child; child=child.nextSibling) {
		if (Node.ELEMENT_NODE != child.nodeType) continue;
		if (item == child) child.style.display = "";
		else child.style.display = "none";
	}
			</body>
		</method>
		<method name="_getPanels">
			<body>
	var elements = [];
	for (var child=this.boundElement.firstChild; child; child=child.nextSibling) {
		if (Node.ELEMENT_NODE == child.nodeType) elements.push(child);
	}
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
	</instance>
</class>

<class pattern="xbl:binding" name="table">
	<instance>
		<method name="getColumns">
			<body>
	var element = this.boundElement;
	return element.tHead.rows[0].cells;
			</body>
		</method>
		<method name="_sort" visibility="protected">
			<parameter name="column"/>
			<parameter name="type"/>
			<parameter name="reverse"/>
			<body>
<![CDATA[
	var element = this.boundElement;
	Array.forEach(element.tBodies, function(tBody) {
		var rows = tBody.rows;
		var values = [];
		for (var i=0, n=rows.length; i<n; i++) {
			var row = rows[i]; var cell = row.cells[column];
			var val = new String(cell.firstChild.nodeValue);
			val.row = row;
			values.push(val);
		}
		switch (type) {
			case "string":
				values = values.sort();
				break;
			case "number":
				values = values.sort(function(a, b) { return Number(a) - Number(b); });
				break;
			default:
				throw "Unrecognized sort type: " + type;
				break;
		}
		if (reverse) values = values.reverse();
		for (var n=values.length, i=0; i<n; i++) {
			var val = values[i];
			var row = val.row;
			tBody.removeChild(row);
			if (i == n-1) tBody.appendChild(row);
			else tBody.insertBefore(row, tBody.rows[i]);
		}
	});
]]>
			</body>
		</method>
		<method name="toggleColumnSortState">
			<parameter name="column"/>
			<body>
<![CDATA[
	var type = "string";
	var cols = NodeList(this.getColumns());
	var classList = cols.item(column).classList;
	if (classList.has("number")) type = "number";
	if (classList.has("string")) type = "string";
	var sortable = classList.has("sortable");
	var sorted = classList.has("sorted");
	var reversed = classList.has("reversed");
	if (!sortable) return;
	if (!sorted) {
		this._sort(column, type, false);
		classList.add("sorted");
		classList.remove("reversed");
	}
	else {
		this._sort(column, type, !reversed);
		if (reversed) classList.remove("reversed");
		else classList.add("reversed");
	}
	for (var n=cols.length, i=0; i<n; i++) {
		if (column != i) {
			var classList = cols.item(i).classList;
			classList.remove("sorted");
			classList.remove("reversed");
		}
	}
]]>
			</body>
		</method>
	</instance>
</class>

<class pattern="xbl:binding" name="RepetitionElement" implements="RepetitionElement">
	<property readonly="true" name="REPETITION_NONE">0</property>
	<property readonly="true" name="REPETITION_TEMPLATE">1</property>
	<property readonly="true" name="REPETITION_BLOCK">2</property>
	<instance>
		<method name="addRepetitionBlock">
			<parameter name="previousBlock" />
			<body>
if (this.repetitionType != RepetitionElement.REPETITION_TEMPLATE) return null;
if (previousBlock.repetitionType != RepetitionElement.REPETITION_BLOCK) throw "previousBlock is not repetition block";
return this.addRepetitionBlockByIndex(previousBlock, previousBlock.repetitionIndex + 1);
			</body>
		</method>
		<method name="addRepetitionBlockByIndex">
			<parameter name="previousBlock" />
			<parameter name="index" />
			<body>
				<![CDATA[
var element = this.boundElement;
var document = element.ownerDocument;
if (this.repetitionType != RepetitionElement.REPETITION_TEMPLATE) return null;
var nBlocks = this.repetitionBlocks.length;
var maxBlocks = this.repeatMax;
if (maxBlocks && nBlocks >= maxBlocks) return null;
var index = this.repetitionIndex;
var newBlock = element.cloneNode(true);
newBlock.setAttribute("repeat", index);
newBlock.removeAttribute("repeat-min");
newBlock.removeAttribute("repeat-max");
newBlock.removeAttribute("repeat-start");

// recurse and substitute instances of "[name]"
var name = newBlock.id;
name = name.replace(/\[/, "\\[");
name = name.replace(/\]/, "\\]");
var pattern = new RegExp("\\[" + name + "\\]", "g");
var elt, iter = document.createTreeWalker(newBlock, NodeFilter.SHOW_ELEMENT, null, false);
while (elt = iter.nextNode()) {
	Array.forEach (["id", "name", "for", "value"], function(attrName) {
		var val = this.getAttribute(attrName);
		this.setAttribute(attrName, val.replace(pattern, index));
	}, elt);
}

newBlock.setAttribute("repeat-template", name);
newBlock.removeAttribute("id");
if (previousBlock) previousBlock.parentNode.insertBefore(newBlock, previousBlock.nextSibling);
else element.parentNode.insertBefore(newBlock, element);
var e = document.createEvent("UIEvent");
e.initEvent("added", true, false);
element.dispatchEvent(e);

return newBlock;
]]>
			</body>
		</method>
		<method name="removeRepetitionBlock">
			<body>
var element = this.boundElement;
if (this.repetitionType != RepetitionElement.REPETITION_BLOCK) return null;
var template = this.repetitionTemplate;

// remove block
element.parentNode.removeChild(element);

// fire "removed" event
if (template) {
	var e = document.createEvent("UIEvent");
	e.initEvent("removed", true, false);
	element.dispatchEvent(e);
}

// TODO: adjust number of blocks to comply with repeatMin, repeatMax

return;
			</body>
		</method>
		<property name="repetitionType">
			<getter>
var element = this.boundElement;
var repeat = element.getAttribute("repeat");
if ("template" == repeat) return RepetitionElement.REPETITION_TEMPLATE;
if (!isNaN(repeat)) return RepetitionElement.REPETITION_BLOCK;
return RepetitionElement.REPETITION_NONE;
			</getter>			
		</property>
		<property name="repetitionIndex">
			<getter>
<![CDATA[
var element = this.boundElement;
var repeat = element.getAttribute("repeat");
if (!isNaN(repeat)) return Number(repeat); // repeat is numeric, i.e. this is a repeat-block
if ("template" != repeat) return 0; // repeat is invalid
var index = 0;
var nBlocks = 0;
var sibling = element;
while (sibling = sibling.previousSibling) { // FIXME is the logic right here
	if (!sibling.repetitionType) continue;
	if (RepetitionElement.REPETITION_BLOCK == sibling.repetitionType) {
		nBlocks++;
		if (index <= sibling.repetitionIndex) index = 1 + sibling.repetitionIndex;
	}
}
if (index < nBlocks) index = nBlocks;
return index;
]]>
			</getter>
		</property>
		<property name="repetitionTemplate">
			<getter>return this.boundElement.getAttribute("repeat-template");</getter>
		</property>
		<property name="repetitionBlocks">
			<getter>
var element = this.boundElement;
var blocks = [];
var sibling = element;
while (sibling = sibling.previousSibling) {
	if (!sibling.repetitionType) continue;
	if (RepetitionElement.REPETITION_BLOCK == sibling.repetitionType) blocks.push(sibling);
}
return blocks;
			</getter>
		</property>
		<property name="repeatStart">
			<getter>return this.boundElement.getAttribute("repeat-start");</getter>
		</property>
		<property name="repeatMin">
			<getter>return this.boundElement.getAttribute("repeat-min");</getter>
		</property>
		<property name="repeatMax">
			<getter>return this.boundElement.getAttribute("repeat-max");</getter>
		</property>
			
		<method name="xplInit">
			<body>
<![CDATA[
var element = this.boundElement;
var nBlocks = (this.repeatStart) ? this.repeatStart : 1;
if (nBlocks < this.repeatMin) nBlocks = this.repeatMin;
if (nBlocks > this.repeatMax) nBlocks = this.repeatMax;
while (this.repetitionBlocks.length < nBlocks) this.addRepetitionBlock();
]]>
			</body>
		</method>
	</instance>
</class>

<class pattern="binding" name="WF2FormElement">
	<instance>
		<property name="replace" type="String">
			<getter>return this.boundElement.getAttribute("replace");</getter>
			<setter>this.boundElement.setAttribute("replace", val);</setter>
		</property>
		<property name="action" type="String">
			<getter>return this.boundElement.getAttribute("action");</getter>
			<setter>this.boundElement.setAttribute("action", val);</setter>
		</property>
		<property name="method" type="String">
			<getter>return this.boundElement.getAttribute("method");</getter>
			<setter>this.boundElement.setAttribute("method", val);</setter>
		</property>
		<property name="enctype" type="String">
			<getter>return this.boundElement.getAttribute("enctype");</getter>
			<setter>this.boundElement.setAttribute("enctype", val);</setter>
		</property>
		<property name="elements">
			<getter>
<![CDATA[
var elts = this.boundElement.getElementsByTagName("*");
var nodeList = [];
for (var i=0, n=elts.length; i<n; i++) {
	var el = elts[i];
	switch (el.tagName) {
		case "INPUT": case "BUTTON": case "SELECT": case "TEXTAREA": case "FIELDSET": case "OUTPUT":
			nodeList.push(el);
			break;
	}
}
return nodeList;
]]>
			</getter>
		</property>
		<method name="checkValidity">
			<body>
<![CDATA[
	var valid = true;
	var elements = this.boundElement.elements;
	for (var i=0, el; el=elements[i]; i++)  {
		if (el.checkValidity && !el.checkValidity()) valid = false;
	}
	return valid;
]]>
			</body>
		</method>
		<method name="resetFromData">
			<parameter name="doc" />
			<body>
<![CDATA[
var root = doc.documentElement;

var aClear = root.getElementsByTagName("clear");
var n = aClear.length;
for (var i=0; i<n; i++) {
	var clear = aClear[i];
	var templateId = clear.getAttribute("template");
	var template = RepetitionElement(document.getElementById(templateId));
	if (!template) continue;
	if (template.repetitionType != RepetitionElement.REPETITION_TEMPLATE) continue;
	var blocks = template.repetitionBlocks;
	var m = blocks.length;
	for (var j=0; j<m; j++) RepetitionElement(blocks[j]).removeRepetitionBlock();
}

var aRepeat = root.getElementsByTagName("repeat");
n = aRepeat.length;
for (i=0; i<n; i++) {
	var repeat = aRepeat[i];
	var templateId = repeat.getAttribute("template");
	var index = repeat.getAttribute("index");
	var template = RepetitionElement(document.getElementById(templateId));
	if (!template) continue;
	if (template.repetitionType != RepetitionElement.REPETITION_TEMPLATE) continue;
	template.addRepetitionBlockByIndex(null, index);

}


// build a hash of field names
// TODO: incorporate index
var aField = root.getElementsByTagName("field");
n = aField.length;
var fieldHash = {};
for (var i=0; i<n; i++) {
	var field = aField[i];
	var name = field.getAttribute("name");
	var index = field.getAttribute("index");
	var value = field.textContent;
	if (!fieldHash[name]) fieldHash[name] = [];
	fieldHash[name].push(value);
}
	
var aElt = this.elements;
forEach (aElt, function(elt) {
	var face = WF2FormControlElement(elt);
	if (!face) return;
	var name = face.name || elt.id;
	if (name) {
		var field = fieldHash[name];
		if (field) face.value = field.shift();
	}
});

]]>
			</body>
		</method>
		<method name="submit">
			<parameter name="button"/>
			<body>
<![CDATA[
// TODO handle replace="document"

if (!this.checkValidity()) {
	var message = this.title || "Invalid data";
	alert(message);
	return false;
}

var replace = (button.getReplace && button.getReplace()) || this.getReplace() || "document";
if ("values" != replace) return this.boundElement.submit(); // FIXME

var action = (button.getAction && button.getAction()) || this.getAction() || "";
var method = (button.getMethod && button.getMethod()) || this.getMethod() || "get";
var enctype = (button.getEncType && button.getEnctype()) || this.getEnctype() || "application/x-www-form-urlencoded";
if ("application/x-www-form-urlencoded" != enctype) throw "UNIMPLEMENTED ENCTYPE: "+enctype;

var txt = this.encode();
var httpRequest = this.httpRequest;
switch (method) {
	case "get": case "GET":
		action += "?" + txt;
		httpRequest.open(method, document.base + "/" + action, false);
		httpRequest.send("");
	break;
	
	case "post": case "POST":
		httpRequest.open(method, document.base + "/" + action, false);
		httpRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		httpRequest.setRequestHeader("Content-Length", txt.length);
		httpRequest.send(txt);
	break;
 
	default:
	break;
}
if (httpRequest.readyState != 4 || httpRequest.status != 200 || !httpRequest.responseXML) {
	alert("Could not complete that operation.\n"+
		"Please contact the administrator.\n"+
		"Details: \naction: "+action+"\nreadyState: "+httpRequest.readyState
	);
	return false;
}

try {
	var e = document.createEvent("UIEvents");
	e.initEvent("received", false, true);
	e.receivedDocument = httpRequest.responseXML;
	var allowDefault = this.boundElement.dispatchEvent(e);
	if (!allowDefault) return false;
}
catch (err) {
}

return this.resetFromData(httpRequest.responseXML);
]]>
			</body>
		</method>
		<method name="xblBindingAttached">
			<body>
this.httpRequest = new this.boundElement.ownerDocument.parentWindow.XMLHttpRequest();
			</body>
		</method>
		<method name="encode" visibility="protected">
			<body>
<![CDATA[
var a = [];
forEach(this.elements, function(el) {
	if (el.name) a.push(el.name + "=" + encodeURIComponent(el.value));
});
var txt = a.join('&');
return txt;
]]>
			</body>
		</method>
		<method name="decode" visibility="protected">
			<parameter name="txt" />
			<body>
<![CDATA[
var hash = eval("({" + txt + "})");
forEach(this.elements, function(el) {
	var name = el.name;
	if (name) {
		el.value = (undefined != hash[name]) ?
			hash[name] :
			"";
	}
});
]]>
			</body>
		</method>
	</instance>
</class>

<class pattern="binding" name="WF2SubmitButton">
	<instance>
		<property name="replace" type="String">
			<getter>return this.boundElement.getAttribute("replace");</getter>
			<setter>this.boundElement.setAttribute("replace", val);</setter>
		</property>
		<property name="action" type="String">
			<getter>return this.boundElement.getAttribute("action");</getter>
			<setter>this.boundElement.setAttribute("action", val);</setter>
		</property>
		<property name="method" type="String">
			<getter>return this.boundElement.getAttribute("method");</getter>
			<setter>this.boundElement.setAttribute("method", val);</setter>
		</property>
		<property name="enctype" type="String">
			<getter>return this.boundElement.getAttribute("enctype");</getter>
			<setter>this.boundElement.setAttribute("enctype", val);</setter>
		</property>
	</instance>
</class>

<class pattern="binding" name="WF2TextInput">
	<instance>
		<property name="filter">
			<getter>return this.boundElement.getAttribute("filter");</getter>
			<setter>this.boundElement.setAttribute("filter", val);</setter>
		</property>
	</instance>
</class>

<class pattern="binding" name="WF2NumberInput">
	<instance>
		<property name="min">
			<getter>return this.boundElement.getAttribute("min");</getter>
			<setter>this.boundElement.setAttribute("min", val);</setter>
		</property>
		<property name="max">
			<getter>return this.boundElement.getAttribute("max");</getter>
			<setter>this.boundElement.setAttribute("max", val);</setter>
		</property>
		<property name="step">
			<getter>return this.boundElement.getAttribute("step");</getter>
			<setter>this.boundElement.setAttribute("step", val);</setter>
		</property>
		<property name="value">
			<getter>return this.boundElement.value;</getter>
			<setter>this.boundElement.value = val;</setter>
		</property>
	
	<property name="_validity" visibility="protected">
				{
					valueMissing: false,
					typeMismatch: false,
					tooLong: false,
					patternMismatch: false,
					rangeUnderflow: false,
					rangeOverflow: false,
					stepMismatch: false,
					customError: false,
					valid: true
				}
		</property>
		<property name="validity">
			<getter>return this._validity;</getter>
		</property>
		<method name="checkValidity">
			<body>
this.test(this.getValue(), this._validity);
// TODO conditionally dispatch invalid event
return this._validity.valid;
			</body>
		</method>
		<method name="stepUp">
			<parameter name="n"/>
			<body>
<![CDATA[
if (!n || isNaN(n) || (n % 1)) throw "INDEX_SIZE_ERR";

var szStep = this.getStep();
var step = (null != szStep) ? Number(szStep) : 1;
var szValue = this.getValue();
var validity = this.test(szValue);
if (null == szValue || "" == szValue || "any" == szStep || !validity.valid) throw "INVALID_STATE_ERR";

var value = Number(szValue);
value += n * step;
validity = this.test(String(value));
if (!validity.valid) throw "INVALID_MODIFICATION_ERR";

this.setValue(value);
]]>
			</body>
		</method>
		<method name="stepDown">
			<parameter name="n"/>
			<body>
<![CDATA[
if (!n || isNaN(n) || (n % 1)) throw "INDEX_SIZE_ERR";
this.stepUp(-n);
]]>
			</body>
		</method>
		<method name="test" visibility="protected">
			<parameter name="szValue" type="String"/>
			<parameter name="validity"/>
			<body>
<![CDATA[
if (null == validity) validity = {};

var value = Number(szValue);
var required = this.boundElement.required;
validity.valueMissing = required && (null == szValue || "" == szValue);
validity.typeMismatch = null != szValue && "" != szValue && isNaN(szValue);
var szMin = this.getMin();
var min = (null != szMin && "" != szMin && !isNaN(szMin)) ? Number(szMin) : null;
validity.rangeUnderflow = (!validity.valueMissing & !validity.typeMismatch && null != min && value < min);
var szMax = this.getMax();
var max = (null != szMax && "" != szMax && !isNaN(szMax)) ? Number(szMax) : null;
validity.rangeOverflow = (!validity.valueMissing & !validity.typeMismatch && null != max && value > max);
var szStep = this.getStep();
var step = ("any" == szStep) ? 0 :
			(null != szStep && "" != szStep && !isNaN(szStep)) ? Number(szStep) :
			1;

var stepsFromMin = (null != min && 0 != step) ? (value - min) / step : 0;
var stepsFromMax = (null != max && 0 != step) ? (max - value) / step : 0;
var stepsFromZero =	(0 != step) ? value / step : 0;
var stepMismatch = (stepsFromMin) ? (Math.round(stepsFromMin) != stepsFromMin) :
					(stepsFromMax) ? (Math.round(stepsFromMax) != stepsFromMax) :
					(stepsFromZero) ? (Math.round(stepsFromZero) != stepsFromZero) :
					false;
validity.stepMismatch = !validity.valueMissing && !validity.typeMismatch && !validity.rangeUnderflow && !validity.rangeOverflow &&
			0 != step && stepMismatch;
validity.valid = !(validity.valueMissing || validity.typeMismatch || validity.rangeUnderflow || validity.rangeOverflow || validity.stepMismatch);

return validity;
]]>
			</body>
		</method>
	</instance>
</class>

<class pattern="binding" name="WF2SelectElement">
	<instance>
		<property name="value">
			<getter>return this.boundElement.getAttribute("value");</getter>
			<setter>this.boundElement.setAttribute("value", val);</setter>
		</property>
		<property name="name">
			<getter>return this.boundElement.getAttribute("name");</getter>
		</property>
		<property name="data">
			<getter>return this.boundElement.getAttribute("data");</getter>
			<setter>
var rc = this.load(val);
if (rc) this.boundElement.setAttribute("data", val);
			</setter>
		</property>
			
		<method name="xblBindingAttached">
			<body>
this.httpRequest = new this.boundElement.ownerDocument.parentWindow.XMLHttpRequest();
			</body>
		</method>
		<method name="load" visibility="protected">
			<parameter name="src" />
			<body>
<![CDATA[
var element = this.boundElement;
var document = element.ownerDocument;
var href =
	src.match(/^\//) ? src :
	document.documentURI.replace(/[^\/]*$/, "") + src;
var rq = this.httpRequest;
rq.open("GET", href, false);
rq.send("");
if (rq.readyState != 4) return false;
if (rq.status != 200) return false;
if (!rq.responseXML) return false;
var srcSelect = rq.responseXML.documentElement;
var aNode = srcSelect.childNodes;
var n = aNode.length;
for (var i=0; i<n; i++) {
	if (Node.ELEMENT_NODE != aNode[i].nodeType) continue;
	var tmp = document.importNode(aNode[i], true);
	this.boundElement.appendChild(tmp);
}
return true;
]]>	
			</body>
		</method>
		<method name="xblEnteredDocument">
			<body>
if (this.getData()) this.load(this.getData());
			</body>
		</method>
		
	</instance>
</class>

<class pattern="binding" name="WF2OutputElement">
	<instance>
		<property pattern="attribute" name="name" type="string">
			<getter>return this.boundElement.getAttribute("name");</getter>
			<setter>this.boundElement.setAttribute("name", val);</setter>
		</property>
		<property name="value">
			<getter>
var val = this.boundElement.textContent;
if (val == "\u00a0") return null;
return val;
			</getter>
			<setter>return (this.boundElement.textContent = val ? val : "\u00a0");</setter>
		</property>
		<method name="xblEnteredDocument">
			<body>
if (!this.boundElement.textContent) this.textContent = "\u00a0";// non-breaking-space
			</body>
		</method>
		
	</instance>
</class>

<class pattern="binding" name="WF2DatalistElement">
	<script>
document.createElement("datalist"); // NOTE fix for IE. Assumes HTML document
	</script>
	<instance>
		<property pattern="attribute" name="name" type="string">
			<getter>return this.boundElement.getAttribute("name");</getter>
			<setter>this.boundElement.setAttribute("name", val);</setter>
		</property>
	</instance>
</class>

</package>

