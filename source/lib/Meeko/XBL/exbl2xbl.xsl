<?xml version="1.0" encoding="UTF-8"?>
<!--
EXBL to XBL transform
Copyright 2007, Sean Hogan (http://www.meekostuff.net/)
All rights reserved
-->

<xsl:stylesheet
	exclude-result-prefixes="xsl xbl"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
	xmlns:xbl="http://www.w3.org/ns/xbl"
	xmlns="http://www.w3.org/ns/xbl">

<xsl:template match="@*|node()">
	<xsl:copy>
		<xsl:apply-templates select="@*|node()"/>
	</xsl:copy>
</xsl:template>

<xsl:template match="xbl:implementation">
	<implementation>
(function() {
var prototype = { };
	<xsl:apply-templates select="xbl:property[@visibility='public' or not(@visibility)]">
		<xsl:with-param name="object">prototype</xsl:with-param>
	</xsl:apply-templates>
	
	<xsl:apply-templates select="xbl:method[(@visibility='public' or not(@visibility)) and @name!='xblBindingAttached']">
		<xsl:with-param name="object">prototype</xsl:with-param>
	</xsl:apply-templates>
	
	<xsl:if test="(xbl:property | xbl:method)[@visibility='protected' or @visibility='private'] or xbl:method[@name='xblBindingAttached']">
prototype.xblBindingAttached = function() {
	var binding = this;
		<xsl:apply-templates select="xbl:property[@visibility='protected' or @visibility='private']">
			<xsl:with-param name="object">binding</xsl:with-param>
		</xsl:apply-templates>
		<xsl:apply-templates select="xbl:method[@visibility='protected' or @visibility='private']">
			<xsl:with-param name="object">binding</xsl:with-param>
		</xsl:apply-templates>
	if (binding.__defineGetter__) {
		<xsl:apply-templates select="xbl:property[@visibility='protected' or @visibility='private']" mode="js2">
			<xsl:with-param name="object">binding</xsl:with-param>
		</xsl:apply-templates>
	}
		<xsl:value-of select="string(xbl:method[@name='xblBindingAttached']/xbl:body)"/>
}
	</xsl:if>
	

if (prototype.__defineGetter__) {
	<xsl:apply-templates select="xbl:property[@visibility='public' or not(@visibility)]" mode="js2">
		<xsl:with-param name="object">prototype</xsl:with-param>
	</xsl:apply-templates>
}

return prototype;
})()
	</implementation>
</xsl:template>


<xsl:template match="xbl:property">
	<xsl:param name="object">this</xsl:param>
	<xsl:variable name="Name"><xsl:call-template name="ucFirst"><xsl:with-param name="text" select="@name"/></xsl:call-template></xsl:variable>
	<xsl:if test="xbl:getter">
<xsl:value-of select="$object"/>.<xsl:value-of select="concat('get', $Name)"/> = function() {
	<xsl:value-of select="string(xbl:getter)"/>
}
	</xsl:if>
	<xsl:if test="xbl:setter">
<xsl:value-of select="$object"/>.<xsl:value-of select="concat('set', $Name)"/> = function(val) {
	<xsl:value-of select="string(xbl:setter)"/>
}
	</xsl:if>	
	<xsl:if test="not(xbl:setter or xbl:getter)">
<xsl:value-of select="$object"/>.<xsl:value-of select="@name"/> = <xsl:value-of select="string()"/>;
	</xsl:if>
</xsl:template>

<xsl:template match="xbl:property" mode="js2">
	<xsl:param name="object">this</xsl:param>
	<xsl:variable name="Name"><xsl:call-template name="ucFirst"><xsl:with-param name="text" select="@name"/></xsl:call-template></xsl:variable>
	<xsl:if test="xbl:getter">
<xsl:value-of select="$object"/>.__defineGetter__("<xsl:value-of select="@name"/>", <xsl:value-of select="$object"/>.<xsl:value-of select="concat('get', $Name)"/>);
	</xsl:if>
	<xsl:if test="xbl:setter">
<xsl:value-of select="$object"/>.__defineSetter__("<xsl:value-of select="@name"/>", <xsl:value-of select="$object"/>.<xsl:value-of select="concat('set', $Name)"/>);
	</xsl:if>
</xsl:template>

<xsl:template match="xbl:method">
	<xsl:param name="$object">this</xsl:param>
<xsl:value-of select="$object"/>.<xsl:value-of select="@name"/> = function(<xsl:for-each select="xbl:parameter">
			<xsl:value-of select="@name"/><xsl:if test="position()!=last()">, </xsl:if>
		</xsl:for-each>) {
	<xsl:value-of select="string(xbl:body)"/>
}
</xsl:template>

<xsl:template name="ucFirst">
<xsl:param name="text"/>
<xsl:value-of select="translate(substring($text,1,1),'abcdefghijklmnopqrstuvwxyz','ABCDEFGHIJKLMNOPQRSTUVWXYZ')"/><xsl:value-of select="substring($text,2)"/>
</xsl:template>

</xsl:stylesheet>