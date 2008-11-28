<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" exclude-result-prefixes="xsl"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns="http://www.w3.org/1999/xhtml">

<xsl:output method="html" indent="yes"
			doctype-public="-//W3C//DTD XHTML 1.0 Strict//EN" doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"/>

<xsl:template match="@*|node()">
	<xsl:copy>
		<xsl:apply-templates select="@*|node()"/>
	</xsl:copy>
</xsl:template>

<xsl:template match="*">
	<li>
		<nobr><span class="tag">&lt;<xsl:value-of select="name()"/></span><xsl:for-each select="@*"><xsl:text> </xsl:text><span class="attrName"><xsl:value-of select="name()"/>=</span><span class="attrValue">"<xsl:value-of select="string()"/>"</span></xsl:for-each><span class="tag">&gt;</span></nobr>
	<xsl:choose>
		<xsl:when test="*">
		<ul>
			<xsl:apply-templates select="*|text()"/>
		</ul>
		</xsl:when>
		<xsl:when test="text() and normalize-space()!=''">
<pre><xsl:value-of select="string()"/></pre>
		</xsl:when>
	</xsl:choose>
		<nobr><span class="tag">&lt;/<xsl:value-of select="name()"/>&gt;</span></nobr>
	</li>
</xsl:template>

<xsl:template match="text()">
	<xsl:if test="normalize-space()!=''">
	<li>
	<!-- TODO pretty printing for JS -->
<pre><xsl:value-of select="string()"/></pre>
	</li>
	</xsl:if>
</xsl:template>

<xsl:template match="/">
<html>
	<head>
		<link rel="stylesheet" href="../../xmlviewer.css"/>
	</head>
	<body>
		<ul>
	<xsl:apply-templates/>
		</ul>
	</body>
</html>
</xsl:template>
	
</xsl:stylesheet>
