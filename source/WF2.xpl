<?xml version="1.0" encoding="UTF-8"?>
<?access-control allow="*"?>
<!--
XBL2 Webforms2 implementation
Copyright 2007, Sean Hogan (http://www.meekostuff.net/)
All rights reserved
-->

<!--
TODO: more input elements
TODO: repetition interface
TODO: create events in the right categories/namespaces
TODO: robustize
-->

<package xmlns="http://www.meekostuff.net/ns/xpl">
	<class name="WF2FormElement">
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
	var element = this.boundElement;
	var valid = true;
	forEach (element.elements, function(el)  {
		if (el.checkValidity && !el.checkValidity()) valid = false;
	})
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
		<property name="httpRequest" visibility="private" readonly="true" type="XMLHttpRequest">new XMLHttpRequest()</property>
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
	</class>
	
	<class name="WF2SubmitButton">
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
	</class>
	
	<class name="WF2TextInput">
		<property name="filter">
			<getter>return this.boundElement.getAttribute("filter");</getter>
			<setter>this.boundElement.setAttribute("filter", val);</setter>
		</property>
	</class>
	
	<class name="WF2NumberInput">
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
	</class>

	<class name="WF2SelectElement">
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
		
		<property name="httpRequest" visibility="protected" readonly="true" type="XMLHttpRequest">new this.boundElement.ownerDocument.parentWindow.XMLHttpRequest()</property>
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
		
	</class>
	
	<class name="WF2OutputElement">
		<property name="name">
			<getter>return this.boundElement.getAttribute("name");</getter>
			<setter>return this.boundElement.setAttribute("name", val);</setter>
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
		
	</class>
	
	<class name="WF2DatalistElement">
		<property name="name">
			<getter>return this.boundElement.getAttribute("name");</getter>
		</property>
	</class>
</package>
