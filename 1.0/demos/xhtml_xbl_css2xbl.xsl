<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" exclude-result-prefixes="xsl xbl html"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns="http://www.w3.org/ns/xbl"
	xmlns:xbl="http://www.w3.org/ns/xbl"
	xmlns:html="http://www.w3.org/1999/xhtml">

<xsl:output method="xml"/>

<xsl:template match="@*|node()">
	<xsl:apply-templates select="@*|node()"/>
</xsl:template>

<xsl:template match="/">
	<xbl>
		<xsl:apply-templates select="node()"/>
	</xbl>
</xsl:template>

<xsl:template match="xbl:xbl">
	<xsl:copy-of select="xbl:binding"/>
</xsl:template>

<xsl:template match="xbl:*">
	<xsl:copy>
		<xsl:apply-templates select="@*|node()"/>
	</xsl:copy>
</xsl:template>

<xsl:template match="html:iframe[@class='disabledDemo']">
	<xsl:apply-templates select="document(@src)//html:html"/>
</xsl:template>

</xsl:stylesheet>
