<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" exclude-result-prefixes="xpl"
				xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
				xmlns:xpl="http://www.meekostuff.net/xpl"
				xmlns="http://www.w3.org/1999/xhtml">

	<xsl:import href="xpl2json.xsl"/>
	
	<xsl:output	method="text" media-type="text/javascript"/>
	
	<xsl:variable name="PACKAGE_NAME" select="/xpl:package/@namespace" />
	<xsl:variable name="PACKAGE_FEATURE" select="/xpl:package/@feature" />

	<xsl:template match="/">
xplManager.createPackage({
		<xsl:apply-imports/>
});
	</xsl:template>
	
</xsl:stylesheet>

