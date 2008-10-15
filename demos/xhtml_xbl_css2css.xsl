<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:xbl="http://www.w3.org/ns/xbl"
	xmlns:html="http://www.w3.org/1999/xhtml">

<xsl:output method="text"/>

<xsl:template match="@*|node()">
	<xsl:apply-templates select="@*|node()"/>
</xsl:template>

<xsl:template match="html:style">
	<xsl:copy-of select="."/>
</xsl:template>

<xsl:template match="html:iframe[@class='disabledDemo']">
	<xsl:apply-templates select="document(@src)//html:html"/>
</xsl:template>

</xsl:stylesheet>
