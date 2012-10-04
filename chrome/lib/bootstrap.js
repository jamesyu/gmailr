/**
  This is the bootstrapping code that sets up the scripts to be used in the 
  Gmailr example Chrome plugin.
*/

yepnope({
    test: top.document === document,
    yep: [
        chrome.extension.getURL("main.css"),
        chrome.extension.getURL("lib/jquery.1.4.2.js"),
        chrome.extension.getURL("lib/jquery.ba-bbq.js"),
        chrome.extension.getURL("lib/gmailr.js"),
        chrome.extension.getURL("main.js")
    ]
});