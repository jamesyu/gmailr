#  This is the bootstrapping code that sets up the scripts to be used in the 
#  Gmailr example Chrome plugin.

if top.document is document
    yepnope
        test: !jQuery? 
        yep: 'https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js'
    yepnope [
    	# 2013-03-01: Currenty, you can not use the .min version of jquery-bbq with jQuery 1.9.x
        chrome.extension.getURL "lib/jquery-bbq/jquery.ba-bbq.js"
        chrome.extension.getURL "lib/gmailr.js"
        chrome.extension.getURL "main.js"
    ]