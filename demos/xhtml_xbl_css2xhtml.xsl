<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" exclude-result-prefixes="xsl xbl html"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:xbl="http://www.w3.org/ns/xbl"
	xmlns:html="http://www.w3.org/1999/xhtml"
	xmlns="http://www.w3.org/1999/xhtml">

<xsl:output method="xml" />

<xsl:template match="@*|node()">
	<xsl:copy>
		<xsl:apply-templates select="@*|node()"/>
	</xsl:copy>
</xsl:template>

<xsl:template match="html:head">
	<xsl:copy>
		<link rel="stylesheet" type="text/css" href="style.css" />
		<link rel="bindings" type="text/xml" href="bindings.xml" />
		<xsl:apply-templates select="@*|node()"/>
	</xsl:copy>
</xsl:template>

<xsl:template match="xbl:xbl">
</xsl:template>

<xsl:template match="html:style">
</xsl:template>

</xsl:stylesheet>
