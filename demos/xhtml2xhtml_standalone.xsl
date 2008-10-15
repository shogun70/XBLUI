<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" exclude-result-prefixes="xsl xbl html"
	xmlns:xbl="http://www.w3.org/ns/xbl"
	xmlns:html="http://www.w3.org/1999/xhtml"
	xmlns="http://www.w3.org/1999/xhtml"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:dyn="http://exslt.org/dynamic"
	extension-element-prefixes="dyn">

<xsl:output method="xml"/>
<xsl:param name="XBL_SCRIPT_URL"/>

<xsl:template match="/">
	<xsl:if test="not($XBL_SCRIPT_URL)"><xsl:message terminate="yes">XBL_SCRIPT_URL is not set</xsl:message></xsl:if>

	<xsl:apply-templates select="node()"/>
</xsl:template>

<xsl:template match="@*|node()">
	<xsl:copy>
		<xsl:apply-templates select="@*|node()"/>
	</xsl:copy>
</xsl:template>

<xsl:template match="html:head">
	<xsl:copy>
		<script type="text/javascript" src="{$XBL_SCRIPT_URL}"></script>
		<style type="text/css">xml { display: none; }</style>
		<xsl:apply-templates select="@*|node()"/>
		<xsl:for-each select="xbl:xbl">
		<style type="application/xml">
			<xsl:copy>
			<xsl:apply-templates select="@*|node()"/>
			</xsl:copy>
		</style>
		</xsl:for-each>
	</xsl:copy>
</xsl:template>

<xsl:template match="html:body">
	<xsl:copy>
		<xsl:apply-templates select="@*|node()"/>
	</xsl:copy>
</xsl:template>

<xsl:template match="xbl:xbl">
</xsl:template>

<xsl:template match="xbl:binding[@extends]">
	<xsl:copy>
		<xsl:attribute name="extends">
			<xsl:call-template name="href_template">
				<xsl:with-param name="input" select="string(@extends)"/>
			</xsl:call-template>
		</xsl:attribute>
		<xsl:apply-templates select="@*|node()"/>
	</xsl:copy>
</xsl:template>

<xsl:template name="href_template">
<xsl:param name="input"/>
<xsl:variable name="before" select="substring-before($input, '{')"/>
<xsl:variable name="after" select="substring-after($input, '{')"/>
<xsl:choose>
	<xsl:when test="$after">
		<xsl:value-of select="$before"/>
		<xsl:call-template name="href_template_param">
			<xsl:with-param name="input" select="$after"/>
		</xsl:call-template>
	</xsl:when>
	<xsl:otherwise>
		<xsl:value-of select="$input"/>
	</xsl:otherwise>
</xsl:choose>
</xsl:template>

<xsl:template name="href_template_param">
<xsl:param name="input"/>
<xsl:variable name="before" select="substring-before($input, '}')"/>
<xsl:variable name="after" select="substring-after($input, '}')"/>
<xsl:if test="$before">
	<xsl:value-of select="dyn:evaluate(concat('$', $before))"/>
</xsl:if>
<xsl:if test="$after">
	<xsl:call-template name="href_template">
		<xsl:with-param name="input" select="$after"/>
	</xsl:call-template>
</xsl:if>
</xsl:template>

</xsl:stylesheet>
