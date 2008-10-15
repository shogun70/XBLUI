
<?php
$protocol = "http:";
$method = $_SERVER['REQUEST_METHOD'];
$accept = $_SERVER['HTTP_ACCEPT'];
$server = $_SERVER['SERVER_NAME'];
$host = $_SERVER['HTTP_HOST'];
$referer = $_SERVER['HTTP_REFERER'];
$path = $_SERVER['REQUEST_URI'];
$query = $_SERVER['QUERY_STRING'];
$srcfile = preg_replace("/&.*$/", "", $_SERVER['QUERY_STRING']);
$callback = $_GET['callback'];
$url = $protocol . "//" . $host . $path;
$text = file_get_contents("http://" . $host . "/" . $srcfile);
$search = array("\\", "'", "\r", "\n", "\t");
$replace = array("\\\\", "\\'", "\\r", "\\n", "\\t");
$text = str_replace($search, $replace, $text);
?>

(function() {

<?php echo("$callback")?>({
	_request: {
		Method: '<?php echo($method)?>',
		URL: "<?php echo($path)?>",
		Accept: "<?php echo($accept)?>",
		Host: "<?php echo($host)?>",
		Referer: "<?php echo($referer)?>"	
	},
	_response: {
		status: "200",
		statusText: "OK",
		content: '<?php echo($text)?>'
	}
});

})();
