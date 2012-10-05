#  This is the bootstrapping code that sets up the scripts to be used in the 
#  Gmailr example Chrome plugin.

yepnope
    test: top.document is document
    yep: [
            chrome.extension.getURL "main.css"
            'https://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js'
            chrome.extension.getURL "lib/jquery-bbq/jquery.ba-bbq.min.js"
            chrome.extension.getURL "lib/gmailr.js"
            chrome.extension.getURL "main.js"
        ]