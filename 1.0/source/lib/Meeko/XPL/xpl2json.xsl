<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" exclude-result-prefixes="xpl"
				xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
				xmlns:xpl="http://www.meekostuff.net/xpl"
				xmlns="http://www.w3.org/1999/xhtml">

	<xsl:output	method="text" media-type="text/javascript"/>
	
	<xsl:variable name="PACKAGE_NAME" select="/xpl:package/@namespace" />
	<xsl:variable name="PACKAGE_FEATURE" select="/xpl:package/@feature" />
	
	<xsl:template match="/">

	<xsl:if test="not(xpl:package/@feature or xpl:package/@namespace)">
		<xsl:message terminate="yes">A package must have either a namespace or a feature</xsl:message>
	</xsl:if>
	
namespace: "<xsl:value-of select="xpl:package/@namespace"/>",

feature: "<xsl:value-of select="xpl:package/@feature"/>",

requiredFeatures: [
		<xsl:for-each select="xpl:package/xpl:require[@feature]">
			"<xsl:value-of select="@feature"/>"<xsl:if test="position()!=last()">, </xsl:if>
		</xsl:for-each>
	],


requiredNamespaces: [
		<xsl:for-each select="xpl:package/xpl:require[@namespace] | xpl:package/xpl:import">
			"<xsl:value-of select="@namespace"/>"<xsl:if test="position()!=last()">, </xsl:if>
		</xsl:for-each>
	],

importedNamespaces: [
		<xsl:for-each select="xpl:package/xpl:import[not(@alias)]">
			"<xsl:value-of select="@namespace"/>"<xsl:if test="position()!=last()">, </xsl:if>
		</xsl:for-each>
	],
	
aliasedNamespaces: [
		<xsl:for-each select="xpl:package/xpl:import[@alias]">
			{
				alias: "<xsl:value-of select="@alias"/>",
				namespace: "<xsl:value-of select="@namespace"/>"
			}<xsl:if test="position()!=last()">, </xsl:if>
		</xsl:for-each>
	],

declareClasses:
		<xsl:apply-templates select="xpl:package" mode="declaration"/>,

defineClasses:
		<xsl:apply-templates select="xpl:package" mode="definition"/>,

get elementBindings()
		<xsl:apply-templates select="xpl:package" mode="bindings"/>

	</xsl:template>

	<xsl:template match="xpl:package" mode="bindings">
	{
		var xplPackage = this;

		// uncloak packages and alias to specified namespaces
		// with (xplPackage.aliasedImports)
		<xsl:for-each select="xpl:require[@namespace]">
		eval("var <xsl:value-of select="@namespace"/> = xplManager.packagesByNamespace['<xsl:value-of select="@namespace"/>'].publicClasses;");
		</xsl:for-each>
		<xsl:for-each select="xpl:import[@alias]">
		var <xsl:value-of select="@alias"/> = xplManager.packagesByNamespace["<xsl:value-of select="@namespace"/>"].publicClasses;
		</xsl:for-each>
		
		// import features and non-aliased packages to the default namespace
		var xplImports = {};
		<xsl:for-each select="xpl:require[@feature]">
		forEach(xplManager.featureDirectives["<xsl:value-of select="@feature"/>"].importedNamespaces, function(xplNamespace) {
			var xplImportedClasses = xplManager.packagesByNamespace[xplNamespace].publicClasses;
			for (var xplName in xplImportedClasses) xplImports[xplName] = xplImportedClasses[xplName];
		});
		</xsl:for-each>

		with (xplImports)
		<xsl:for-each select="xpl:import[not(@alias)]">
		with (xplManager.packagesByNamespace["<xsl:value-of select="@namespace"/>"].publicClasses)
		</xsl:for-each>
		with (xplPackage.namedClasses) { // make local classes visible in default namespace
			return [
			<xsl:for-each select="xpl:binding">
				{
					target: "<xsl:value-of select="@element" />",
					src: <xsl:value-of select="@class" />
				}<xsl:if test="position()!=last()">, </xsl:if>
			</xsl:for-each>
			];
		}
	}
	</xsl:template>


	<xsl:template match="xpl:package" mode="declaration">
	function() {
		var xplPackage = this;
		xplPackage.classes = [];
		xplPackage.namedClasses = {};
		xplPackage.publicClasses = {};
		<xsl:for-each select="xpl:class | xpl:interface">
			<xsl:call-template name="class-declaration">
				<xsl:with-param name="classIndex" select="position()-1"/>
				<xsl:with-param name="className" select="@name"/>
				<xsl:with-param name="isBinding" select="@pattern='binding'"/>
			</xsl:call-template>
		</xsl:for-each>
	}
	</xsl:template>
	
	<xsl:template name="class-declaration">
			<xsl:param name="classIndex"/>
			<xsl:param name="className"/>
			<xsl:param name="isBinding" select="false"/>
		var xplClass;
			<xsl:choose>
				<xsl:when test="self::xpl:interface">
		xplClass = function(element) {
			if (element) {
				if (Node.ELEMENT_NODE == element.nodeType) {
					return (element.xplBindings) ? element.xplBindings[arguments.callee.qualifiedName] : null;
				}
				return null;
			}
		};
				</xsl:when>
				<xsl:otherwise>
		xplClass = function() {
		};
				</xsl:otherwise>
			</xsl:choose>
		this.classes[<xsl:value-of select="$classIndex"/>] = xplClass;
			<xsl:choose>
				<xsl:when test="boolean($className)">
		xplPackage.namedClasses["<xsl:value-of select="$className"/>"] = xplClass;
					<xsl:if test="not(@visibility) or @visibility='public'">
		xplPackage.publicClasses["<xsl:value-of select="$className"/>"] = xplClass;
					</xsl:if>
		xplClass.qualifiedName =
					<xsl:choose>
						<xsl:when test="/xpl:package/@namespace">
							"<xsl:value-of select="/xpl:package/@namespace"/>.<xsl:value-of select="$className"/>";
						</xsl:when>
						<xsl:when test="/xpl:package/@feature">
							"<xsl:value-of select="/xpl:package/@feature"/>/<xsl:value-of select="$className"/>";
						</xsl:when>
					</xsl:choose>
				</xsl:when>
				<xsl:otherwise>
		xplClass.qualifiedName =
					<xsl:choose>
						<xsl:when test="/xpl:package/@namespace">
							"<xsl:value-of select="/xpl:package/@namespace"/>[<xsl:value-of select="$classIndex"/>]";
						</xsl:when>
						<xsl:when test="/xpl:package/@feature">
							"<xsl:value-of select="/xpl:package/@feature"/>[<xsl:value-of select="$classIndex"/>]";
						</xsl:when>
					</xsl:choose>
				</xsl:otherwise>
			</xsl:choose>
	</xsl:template>
	
	<xsl:template match="xpl:package" mode="definition">
	function() {
		var xplPackage = this;

		// uncloak packages and alias to specified namespaces
		// with (xplPackage.aliasedImports)
		<xsl:for-each select="xpl:require[@namespace]">
		eval("var <xsl:value-of select="@namespace"/> = xplManager.packagesByNamespace['<xsl:value-of select="@namespace"/>'].publicClasses;");
		</xsl:for-each>
		<xsl:for-each select="xpl:import[@alias]">
		var <xsl:value-of select="@alias"/> = xplManager.packagesByNamespace["<xsl:value-of select="@namespace"/>"].publicClasses;
		</xsl:for-each>
		
		// import features and non-aliased packages to the default namespace
		var xplImports = {};
		<xsl:for-each select="xpl:require[@feature]">
		forEach(xplManager.featureDirectives["<xsl:value-of select="@feature"/>"].importedNamespaces, function(xplNamespace) {
			var xplImportedClasses = xplManager.packagesByNamespace[xplNamespace].publicClasses;
			for (var xplName in xplImportedClasses) xplImports[xplName] = xplImportedClasses[xplName];
		});
		</xsl:for-each>

		with (xplImports)
		<xsl:for-each select="xpl:import[not(@alias)]">
		with (xplManager.packagesByNamespace["<xsl:value-of select="@namespace"/>"].publicClasses)
		</xsl:for-each>
		
		with (xplPackage.namedClasses) { // make local classes visible in default namespace
		<xsl:for-each select="xpl:class | xpl:interface">
			// class name="<xsl:value-of select="@name" />"
	
			<xsl:call-template name="class-definition">
				<xsl:with-param name="className" select="@name"/>
				<xsl:with-param name="classIndex" select="position()-1"/>
				<xsl:with-param name="isBinding" select="@pattern='binding'"/>
			</xsl:call-template>
			
		</xsl:for-each>
		}
	}
	</xsl:template>

	<xsl:template name="class-definition">
			<xsl:param name="className"/>
			<xsl:param name="classIndex"/>
			<xsl:param name="isBinding"/>
			
			var xplClass = xplPackage.classes[<xsl:value-of select="$classIndex"/>];
			<xsl:if test="@extends">
			xplClass.prototype = new <xsl:value-of select="@extends"/>();
			xplClass.prototype.__constructor__ = <xsl:value-of select="@extends"/>;
			</xsl:if>
			xplClass.is = XPLClass.getConstructors(xplClass);
			
			<xsl:if test="@implements">
			xplClass.does = XPLClass.getConstructors(<xsl:value-of select="@implements"/>);
			</xsl:if>

			with (xplClass) { // make static fields visible in default ns

			<xsl:for-each select="xpl:field">
				xplClass.<xsl:value-of select="@name"/> = <xsl:value-of select="string()"/>;
			</xsl:for-each>
			
			<xsl:for-each select="xpl:function">
				xplClass.<xsl:value-of select="@name"/> = 
					function(<xsl:for-each select="xpl:parameter">
								<xsl:value-of select="@name"/><xsl:if test="position()!=last()">, </xsl:if>
							</xsl:for-each>) {
					<xsl:value-of select="string(xpl:body)"/>;
					}
			</xsl:for-each>

			<xsl:for-each select="xpl:fragment">
				var xplTemplate = 
					(new XPathEvaluator).evaluate(
						"/xpl:package/xpl:class[@name='<xsl:value-of select="$className"/>']/xpl:template[@name='<xsl:value-of select="@name"/>']",
						xplPackage.document,
						function(ns) { return "http://www.meekostuff.net/xpl" },
						XPathResult.ORDERED_NODE_ITERATOR_TYPE,
						null
					).iterateNext();

				var xplFragment = document.createDocumentFragment();
				forEach (xulTemplate.childNodes, function(node) {
					if (node.nodeType) // TODO sometimes we get an undefined nodeType!! Why??
						xplFragment.appendChild(document.importNode(node, true));
				});
				xplClass.<xsl:value-of select="@name"/> = xplTemplate;
			</xsl:for-each>
			
			<xsl:for-each select="xpl:instance">
				// TODO handle classes without instance specs
				<xsl:call-template name="instance-definition">
					<xsl:with-param name="className" select="$className"/>
					<xsl:with-param name="classIndex" select="$classIndex"/>
					<xsl:with-param name="isBinding" select="$isBinding"/>
				</xsl:call-template>
			</xsl:for-each>

			<xsl:apply-templates select="xpl:handlers">
				<xsl:with-param name="classIndex" select="$classIndex"/>
			</xsl:apply-templates>

			}
	</xsl:template>			

<xsl:template name="instance-definition">
	<xsl:param name="className"/>
	<xsl:param name="isBinding"/>
	
	<xsl:for-each select="xpl:property">
		<xsl:choose>
		<xsl:when test="xpl:getter or xpl:setter">
			<xsl:if test="@implements"><xsl:message terminate="yes">@implements is incompatible with getter and setter</xsl:message></xsl:if>
			<xsl:variable name="propertyName" select="@name"/>
			<xsl:variable name="readOnly" select="not(@readonly='true')"/>
			<xsl:if test="xpl:getter">
			xplClass.prototype.__defineGetter__("<xsl:value-of select="$propertyName"/>", 
				function() {
					with (this) return (function()  {
						<xsl:value-of select="string(xpl:getter)"/>
					}).call(this);
				}
			);
			</xsl:if>
	
			<xsl:if test="xpl:setter">
			xplClass.prototype.__defineSetter__("<xsl:value-of select="$propertyName"/>",
				function(val) {
					with (this) return (function()  {
						<xsl:value-of select="string(xpl:setter)"/>
					}).call(this, val);
				}
			);
			</xsl:if>
		</xsl:when>
		<xsl:otherwise>
			<xsl:variable name="propertyName" select="@name"/>
			<xsl:variable name="readOnly" select="boolean(@readonly='true')"/>
			xplClass.prototype.__defineGetter__("<xsl:value-of select="$propertyName"/>",
				function() { return this.xplData["<xsl:value-of select="$propertyName"/>"]; }
			);
			<xsl:if test="not($readOnly) and not(@implements)">
			xplClass.prototype.__defineSetter__("<xsl:value-of select="$propertyName"/>",
				function(val) { this.xplData["<xsl:value-of select="$propertyName"/>"] = val; }
			);
			</xsl:if>
		</xsl:otherwise>
	
		</xsl:choose>
	</xsl:for-each>

	<xsl:for-each select="xpl:method">
		xplClass.prototype.<xsl:value-of select="@name"/> =
			function(<xsl:for-each select="xpl:parameter">
						<xsl:value-of select="@name"/><xsl:if test="position()!=last()">, </xsl:if>
					</xsl:for-each>) {
				with (this) return (function()  {
					<xsl:value-of select="string(xpl:body)"/>
				}).apply(this, arguments);

			}
	</xsl:for-each>
	
		xplClass.create = function(xplVisibility) {
			var xplInstance = new this;
			xplInstance.__constructor__ = this;
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
		
		xplClass.prototype.__defineGetter__("__public__", function() { return this.xplPublic; });

		xplClass.prototype.oncreate = function() {
			var xplInstance = this;
			var xplData = this.xplData;
			var xplPublic = this.xplPublic;

		<xsl:for-each select="xpl:property[not(@visibility) or @visibility='public']">
			<xsl:choose>
				<xsl:when test="@implements">
			xplPublic.__defineGetter__("<xsl:value-of select="@name"/>",
				function() { // return the public interface for this property
					return xplData["<xsl:value-of select="@name"/>"].xplPublic;
				}
			);
				</xsl:when>
			
				<xsl:otherwise>
			xplPublic.__defineGetter__("<xsl:value-of select="@name"/>",
				function() { return xplInstance["<xsl:value-of select="@name"/>"]; }
			);
	
					<xsl:if test="not(@readonly='true')">
			xplPublic.__defineSetter__("<xsl:value-of select="@name"/>",
				function(val) { xplInstance["<xsl:value-of select="@name"/>"] = val; }
			);
					</xsl:if>
				</xsl:otherwise>
			</xsl:choose>
		</xsl:for-each>
	
		<xsl:for-each select="xpl:method[not(@visibility) or @visibility='public']">
			xplPublic.__defineGetter__("<xsl:value-of select="@name"/>",
				function() { return function() { xplInstance["<xsl:value-of select="@name"/>"].apply(xplInstance, arguments); } }
			)
		</xsl:for-each>
		}
		
	<xsl:if test="$isBinding">
		xplClass.attach = function(xplInstance) {
			forEach(this.is, function(klass) { klass.prototype.onattach.call(xplInstance) });
			if (xplInstance.xplAttach) xplInstance.xplAttach();
		}
		
		xplClass.prototype.onattach = function() {
		}
	</xsl:if>

		xplClass.init = function(xplInstance) {
			forEach(this.is, function(klass) { klass.prototype.oninit.call(xplInstance) });
			if (xplInstance.xplInit) xplInstance.xplInit();
		}
		
		xplClass.prototype.oninit = function() {
			with (this) {
				// per instance fields
	<xsl:for-each select="xpl:property[not(xpl:getter or xpl:setter)]">
		<xsl:variable name="propertyName" select="@name"/>
			this.xplData["<xsl:value-of select="$propertyName"/>"] = 
				<xsl:choose>
					<xsl:when test="boolean(normalize-space())"><xsl:value-of select="string()" />;</xsl:when>
					<xsl:otherwise>null;</xsl:otherwise>
				</xsl:choose>
	</xsl:for-each>

			};
		}
</xsl:template>			
	
	<xsl:template match="xpl:handlers">
		xplClass.xplHandlers = [];
		<xsl:for-each select="xpl:handler">
		xplClass.xplHandlers[<xsl:value-of select="position()-1"/>] =
			function() {};
		xplClass.xplHandlers[<xsl:value-of select="position()-1"/>].prototype =
			{
				type: "<xsl:value-of select="@event"/>",
				attachTo: "<xsl:value-of select="@attach-to"/>",
				stopPropagation: <xsl:value-of select="@stop-propagation = 'true'"/>,
				preventDefault: <xsl:value-of select="@prevent-default = 'true'"/>,
				handleEvent: function(event) {
					with (this) return (function() {
						<xsl:value-of select="string()"/>
					}).call(this);
				}
			};
		</xsl:for-each>
	</xsl:template>
	
</xsl:stylesheet>

