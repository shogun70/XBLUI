<?xml version="1.0" encoding="UTF-8"?>
<!--
EXBL to XBL transform
Copyright 2007, Sean Hogan (http://www.meekostuff.net/)
All rights reserved
-->

<xsl:stylesheet
	exclude-result-prefixes="xsl xbl xpl"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
	xmlns:xbl="http://www.w3.org/ns/xbl"
	xmlns:xpl="http://www.meekostuff.net/ns/xpl"
	xmlns="http://www.w3.org/ns/xbl">

<xsl:include href="xplpp.xsl" />

<xsl:output method="xml" />

<xsl:template match="@*|node()">
	<xsl:copy>
		<xsl:apply-templates select="@*|node()"/>
	</xsl:copy>
</xsl:template>

<xsl:template match="xpl:package">
<script>
	<xsl:apply-templates select="xpl:class[@name]" />
</script>
</xsl:template>

</xsl:stylesheet>