<?xml version="1.0"?>
<xsl:stylesheet version="1.0" exclude-result-prefixes="xsl xbl html #default"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:xbl="http://www.w3.org/ns/xbl"
	xmlns:html="http://www.w3.org/1999/xhtml"
	xmlns="http://www.w3.org/1999/xhtml">

<xsl:output method="html" indent="no"  encoding="ISO-8859-1"
			doctype-public="-//W3C//DTD HTML 4.01 Transitional//EN" doctype-system="http://www.w3.org/TR/html4/loose.dtd"/>

<xsl:template match="@*|node()">
	<xsl:copy>
		<xsl:apply-templates select="@*|node()"/>
	</xsl:copy>
</xsl:template>

</xsl:stylesheet>
