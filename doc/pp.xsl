<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:html="http://www.w3.org/1999/xhtml"
	xmlns:xbl="http://www.w3.org/ns/xbl">

<xsl:variable name="top" select="/" />

<xsl:template match="@*|node()">
	<xsl:copy>
		<xsl:apply-templates select="@*|node()"/>
	</xsl:copy>
</xsl:template>

<xsl:template match="/">
	<xsl:for-each select="html:html/html:head/html:link[@rel='viewer']">
		<xsl:choose>
			<xsl:when test="position()=1">
				<xsl:apply-templates select="document(@href)" mode="viewer" />
			</xsl:when>
			<xsl:otherwise>
				<xsl:message terminate="no">Ignoring second (or later) incidence of &lt;link rel=viewer /&gt;</xsl:message>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:for-each>
</xsl:template>

<xsl:template match="@*|node()" mode="viewer">
	<xsl:copy>
		<xsl:apply-templates select="@*|node()" mode="viewer"/>
	</xsl:copy>
</xsl:template>

<xsl:template match="html:head" mode="viewer">
	<xsl:copy>
		<xsl:if test="not($top/html:html/html:head/html:title)">
			<xsl:copy-of select="html:title"/>
		</xsl:if>
		<xsl:apply-templates select="@*|node()[not(self::html:title)]" mode="viewer"/>
		<xsl:apply-templates select="$top/html:html/html:head/node()[not(self::html:script)]"/>
	</xsl:copy>
</xsl:template>

<xsl:template match="html:div[@id='content']" mode="viewer">
	<xsl:copy>
		<xsl:apply-templates select="@*" mode="viewer"/>
		<xsl:apply-templates select="$top/html:html/html:body/node()"/>
	</xsl:copy>
</xsl:template>

</xsl:stylesheet>
