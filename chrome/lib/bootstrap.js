/**
  This is the bootstrapping code that sets up the scripts to be used in the 
  Gmailr example Chrome plugin. It does the following:
  
  1) Sets up data DOM elements that allow strings to be shared to injected scripts.
  2) Injects the scripts necessary to load the Gmailr API into the Gmail script environment.
*/

// Only run this script in the top-most frame (there are multiple frames in Gmail)
if(top.document == document) {
    
    // Adds a data DOM element that simply holds a string in an attribute, to be read
    // by the injected scripts.
    var addData = function(id, val) {
        var body = document.getElementsByTagName("body")[0];
        var div = document.createElement('div');
        div.setAttribute('data-val', val);
        div.id = id + "_gmailr_data";
        div.setAttribute('style', "display:none");
        body.appendChild(div);
    };
    
    // Loads a script
    var loadScript = function(path) {
        var headID = document.getElementsByTagName("head")[0];
        var newScript = document.createElement('script');
        newScript.type = 'text/javascript';
        newScript.src = path;
        headID.appendChild(newScript);
    };
    
    // Pass data to inserted scripts via DOM elements
    addData("css_path",        chrome.extension.getURL("main.css"));
    addData("jquery_path",     chrome.extension.getURL("lib/jquery.1.4.2.js"));
    addData("jquery_bbq_path", chrome.extension.getURL("lib/jquery.ba-bbq.js"));
    addData("gmailr_path",     chrome.extension.getURL("lib/gmailr.js"));
    addData("main_path",       chrome.extension.getURL("main.js"));
    
    // Load the initialization scripts
    loadScript(chrome.extension.getURL("lib/lab.js"));
    loadScript(chrome.extension.getURL("lib/init.js"));
};
