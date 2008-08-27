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
	
	<xsl:apply-templates select="xpl:package" mode="definition"/>
	
</xsl:template>


<xsl:template match="xpl:package" mode="definition">
function() {
	var xplPackage = this;

	with (xplPackage.sandbox)	
	with (xplPackage.namedClasses) { // make local classes visible in default namespace
	<xsl:for-each select="xpl:class | xpl:interface">
		// class name="<xsl:value-of select="@name" />"

		<xsl:call-template name="class-definition">
			<xsl:with-param name="classRef" select="@name"/>
		</xsl:call-template>
		
	</xsl:for-each>
	}
}
</xsl:template>

<xsl:template name="class-definition">
	<xsl:param name="classRef"/>
	
	<xsl:if test="@extends">
	<xsl:value-of select="$classRef"/>.prototype = new <xsl:value-of select="@extends"/>();
	<xsl:value-of select="$classRef"/>.prototype.__constructor__ = <xsl:value-of select="@extends"/>;
	</xsl:if>
	<xsl:value-of select="$classRef"/>.__is__ = XPLClass.getConstructors(<xsl:value-of select="$classRef"/>);
	
	<xsl:if test="@implements">
	<xsl:value-of select="$classRef"/>.__does__ = XPLClass.getConstructors(<xsl:value-of select="@implements"/>);
	</xsl:if>

	with (<xsl:value-of select="$classRef"/>) { // make static fields visible in default ns

	<xsl:for-each select="xpl:field">
		<xsl:value-of select="$classRef"/>.<xsl:value-of select="@name"/> = <xsl:value-of select="string()"/>;
	</xsl:for-each>
	
	<xsl:for-each select="xpl:function">
		<xsl:value-of select="$classRef"/>.<xsl:value-of select="@name"/> = 
			function(<xsl:for-each select="xpl:parameter">
						<xsl:value-of select="@name"/><xsl:if test="position()!=last()">, </xsl:if>
					</xsl:for-each>) {
			<xsl:value-of select="string(xpl:body)"/>;
			}
	</xsl:for-each>
	
	<xsl:for-each select="xpl:instance">
		// TODO handle classes without instance specs
		<xsl:call-template name="instance-definition">
			<xsl:with-param name="classRef" select="$classRef"/>
		</xsl:call-template>
	</xsl:for-each>

	<xsl:apply-templates select="xpl:handlers">
		<xsl:with-param name="classIndex" select="$classIndex"/>
	</xsl:apply-templates>

	}
</xsl:template>			

<xsl:template name="instance-definition">
	<xsl:param name="classRef"/>
	<xsl:param name="isBinding"/>
	
	<xsl:apply-templates select="xpl:property" mode="basic"/>

	<xsl:apply-templates select="xpl:method" mode="basic"/>	

	<xsl:value-of select="$classRef"/>.create = function(xplVisibility) {
		var xplInstance = new this;
		xplInstance.__constructor__ = this;

		var xplData = xplInstance;
		<xsl:if test="$assertReadonly">
		xplData = {};
		</xsl:if>
		xplInstance.xplData = xplData;

		var xplPublic = xplInstance;
		<xsl:if test="$assertVisibility">
		var xplPublic = {};
		</xsl:if>
		xplInstance.xplPublic = xplPublic;

		forEach(this.__is__, function(xplSuper) { xplSuper.prototype.oncreate.call(xplInstance) });
		
		switch (xplVisibility) {
			case "private":
				throw "Cannot access private interface";
				break;
			case "protected":
				return xplInstance;
				break;
			case "public": case null:
				return xplPublic;
				break;
			default:
				throw "Cannot access " + xplVisibility + " interface";
				break;
		}
	}
	
	<xsl:value-of select="$classRef"/>.prototype.__defineGetter__("__public__", function() { return this.xplPublic; });

	<xsl:value-of select="$classRef"/>.prototype.oncreate = function() {
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
		<xsl:value-of select="$classRef"/>.attach = function(xplInstance) {
			forEach(this.is, function(klass) { klass.prototype.onattach.call(xplInstance) });
			if (xplInstance.xplAttach) xplInstance.xplAttach();
		}
		
		<xsl:value-of select="$classRef"/>.prototype.onattach = function() {
		}
	</xsl:if>

	<xsl:value-of select="$classRef"/>.init = function(xplInstance) {
		forEach(this.is, function(klass) { klass.prototype.oninit.call(xplInstance) });
		if (xplInstance.xplInit) xplInstance.xplInit();
	}
	
	<xsl:value-of select="$classRef"/>.prototype.oninit = function() {
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


<xsl:template match="xpl:method" mode="basic">
<xsl:value-of select="$classRef"/>.prototype.<xsl:value-of select="@name"/> =
	function(<xsl:for-each select="xpl:parameter">
				<xsl:value-of select="@name"/><xsl:if test="position()!=last()">, </xsl:if>
			</xsl:for-each>) {
				<xsl:if test="$classScoping">
				with (this) return (function()  {
				</xsl:if>
		<xsl:value-of select="string(xpl:body)"/>
				<xsl:if test="$classScoping">
				}).apply(this, arguments);
				</xsl:if>
	}
</xsl:template>
	
<xsl:template match="xpl:property" mode="basic-definition">
	<xsl:choose>
		<xsl:when test="xpl:getter or xpl:setter">
			<xsl:if test="@implements"><xsl:message terminate="yes">@implements is incompatible with getter and setter</xsl:message></xsl:if>
			<xsl:apply-templates select="." mode="getset-definition"/>
		</xsl:when>
		
		<xsl:otherwise><xsl:if test="$assertReadonly">
			<xsl:value-of select="$classRef"/>.prototype.__defineGetter__("<xsl:value-of select="$propertyName"/>",
				function() { return this.xplData["<xsl:value-of select="$propertyName"/>"]; }
			);
			<xsl:if test="not($readOnly) and not(@implements)">
			<xsl:value-of select="$classRef"/>.prototype.__defineSetter__("<xsl:value-of select="$propertyName"/>",
				function(val) { this.xplData["<xsl:value-of select="$propertyName"/>"] = val; }
			);
			</xsl:if>
		</xsl:if></xsl:otherwise>
	</xsl:choose>
</xsl:template>


<xsl:template match="xpl:property" mode="getset-definition">
	<xsl:variable name="propertyName" select="@name"/>
	<xsl:variable name="readOnly" select="not(@readonly='true')"/>
	<xsl:if test="xpl:getter">
<xsl:value-of select="$classRef"/>.prototype.__defineGetter__("<xsl:value-of select="$propertyName"/>", 
	function() {
			<xsl:if test="$classScoping">
			with (this) return (function() {
			</xsl:if>
		<xsl:value-of select="string(xpl:getter)"/>
			<xsl:if test="$classScoping">
			}).call(this);
			</xsl:if>
	});
	</xsl:if>
	<xsl:if test="xpl:setter">
<xsl:value-of select="$classRef"/>.prototype.__defineSetter__("<xsl:value-of select="$propertyName"/>",
	function(val) {
			<xsl:if test="$classScoping">
			with (this) return (function()  {
			</xsl:if>
		<xsl:value-of select="string(xpl:setter)"/>
			<xsl:if test="$classScoping">
			}).call(this, val);
			</xsl:if>
	});
	</xsl:if>
</xsl:template>

</xsl:stylesheet>

