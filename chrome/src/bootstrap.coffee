#  This is the bootstrapping code that sets up the scripts to be used in the 
#  Gmailr example Chrome plugin.

if top.document is document
    yepnope
        test: !jQuery? 
        yep: 'https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js'
    yepnope [
        chrome.extension.getURL "lib/jquery-bbq/jquery.ba-bbq.min.js"
        chrome.extension.getURL "lib/gmailr.js"
        chrome.extension.getURL "main.js"
    ]