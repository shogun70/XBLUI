<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" exclude-result-prefixes="xsl html"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:html="http://www.w3.org/1999/xhtml">

<xsl:output method="html"/>

<xsl:template match="/">
<html>
	<head>
		<link rel="stylesheet" href="../../xmlviewer.css"/>
	</head>
	<body>
	<pre>
	<xsl:apply-templates select="//html:style"/>
	</pre>
	</body>
</html>
</xsl:template>
	
<xsl:template match="html:style">
	<xsl:value-of select="string()"/>
</xsl:template>

</xsl:stylesheet>
