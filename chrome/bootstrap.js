(function(window, jQuery) {
  'use strict';

  if (window.top.document === window.document) {
    yepnope({
      test: typeof jQuery === "undefined" || jQuery === null,
      yep: chrome.extension.getURL("bower_components/jquery/dist/jquery.min.js")
    });
    yepnope([
      chrome.extension.getURL("bower_components/jquery-deparam/jquery.ba-deparam.min.js"),
      chrome.extension.getURL("bower_components/gmailr/build/gmailr.min.js"),
      chrome.extension.getURL("main.js")
    ]);
  }
})(window, window.jQuery);
