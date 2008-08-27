#!/usr/bin/perl

$JAVA = "/usr/bin/java";
$RHINO_JAR = "~/Library/Java/Extensions/js.jar";
$RHINO_CLASSPATH = "org.mozilla.javascript.tools.shell.Main";
$BROWSER_ENV = "~/devel/rhino1_7R1/env.js";
$XPL_SCRIPT = "~/devel/lib.xuistuff.net/XBL/lib/Meeko/XPL/xhtml2js.js";
$OPTIONS = "";
foreach (@ARGV) {
	if (/^-/) { $OPTIONS .= "$_ "; }
	else { $OPTIONS .= "'$_' "; }
}

system("$JAVA $RHINO_CLASSPATH -f $BROWSER_ENV $XPL_SCRIPT $OPTIONS");
