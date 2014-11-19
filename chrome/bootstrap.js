(function(window, jQuery) {
  'use strict';
  
  if (window.top.document === window.document) {
    yepnope({
      test: typeof jQuery === "undefined" || jQuery === null,
      yep: 'https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js'
    });
    yepnope([
      chrome.extension.getURL("lib/jquery-bbq/jquery.ba-bbq.min.js"),
      chrome.extension.getURL("lib/gmailr.js"),
      chrome.extension.getURL("main.js")
    ]);
  }
})(window, window.jQuery);
