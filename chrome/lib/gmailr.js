// Generated by CoffeeScript 1.3.3
/*
Gmailr v0.0.1
Licensed under The MIT License

Copyright 2012, James Yu, Joscha Feth
*/

var __slice = [].slice,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

(function($, window) {
  var Gmailr, XHRWatcher, dbg, isDescendant;
  XHRWatcher = (function() {

    XHRWatcher.prototype.initialized = false;

    XHRWatcher.prototype.iframeData = {};

    XHRWatcher.prototype.iframeCachedData = [];

    XHRWatcher.prototype._Gmail_open = null;

    XHRWatcher.prototype._Gmail_send = null;

    function XHRWatcher(cb) {
      var self, win, _ref, _ref1, _ref2;
      if (this.initialized) {
        return;
      }
      self = this;
      this.initialized = true;
      win = top.document.getElementById("js_frame").contentDocument.defaultView;
      if ((_ref = this._Gmail_open) == null) {
        this._Gmail_open = win.XMLHttpRequest.prototype.open;
      }
      win.XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        this.xhrParams = {
          method: method.toString(),
          url: url.toString()
        };
        return self._Gmail_open.apply(this, arguments);
      };
      if ((_ref1 = this._Gmail_send) == null) {
        this._Gmail_send = win.XMLHttpRequest.prototype.send;
      }
      win.XMLHttpRequest.prototype.send = function(body) {
        if (this.xhrParams) {
          this.xhrParams.body = body;
          cb(this.xhrParams);
        }
        return self._Gmail_send.apply(this, arguments);
      };
      if ((_ref2 = top._Gmail_iframeFn) == null) {
        top._Gmail_iframeFn = top.GG_iframeFn;
      }
      this.iframeCachedData.push({
        responseDataId: 1,
        url: top.location.href,
        responseData: top.VIEW_DATA
      });
      top.GG_iframeFn = function(win, data) {
        var body, d, parent, tmp, url, _ref3, _ref4;
        d = top._Gmail_iframeFn.apply(this, arguments);
        try {
          url = (_ref3 = win != null ? (_ref4 = win.location) != null ? _ref4.href : void 0 : void 0) != null ? _ref3 : null;
          if (data && (url != null ? url.indexOf("act=") : void 0) !== -1) {
            if (!self.iframeData[url]) {
              self.iframeData[url] = true;
              body = "";
              if ((parent = win.frameElement.parentNode)) {
                tmp = $(parent).find("form");
                if (tmp.length > 0) {
                  body = tmp.first().serialize();
                }
              }
              cb({
                body: body,
                url: url
              });
            }
          }
        } catch (e) {
          try {
            dbg("DEBUG error in GG_iframeFn: ", e);
          } catch (_error) {}
        }
        return d;
      };
    }

    return XHRWatcher;

  })();
  dbg = function() {
    var args;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if ((typeof console !== "undefined" && console !== null ? console.log : void 0) && Gmailr.debug === true) {
      return console.log.apply(console, args);
    }
  };
  isDescendant = function(el, t) {
    return t.parents().index(el) >= 0;
  };
  Gmailr = (function() {

    function Gmailr() {
      this.detectDOMEvents = __bind(this.detectDOMEvents, this);

      this.detectXHREvents = __bind(this.detectXHREvents, this);

    }

    Gmailr.prototype.debug = false;

    Gmailr.prototype.priorityInboxLink = null;

    Gmailr.prototype.currentNumUnread = null;

    Gmailr.prototype.currentInboxCount = null;

    Gmailr.prototype.elements = {};

    Gmailr.prototype.currentLeftMenuItem = null;

    Gmailr.prototype.observers = {};

    Gmailr.prototype.loaded = false;

    Gmailr.prototype.inConversationView = false;

    Gmailr.prototype.EVENT_VIEW_THREAD = 'viewThread';

    Gmailr.prototype.EVENT_ARCHIVE = 'archive';

    Gmailr.prototype.EVENT_APPLY_LABEL = 'applyLabel';

    Gmailr.prototype.EVENT_DELETE = 'delete';

    Gmailr.prototype.EVENT_COMPOSE = 'compose';

    Gmailr.prototype.EVENT_REPLY = 'reply';

    Gmailr.prototype.EVENT_SPAM = 'spam';

    Gmailr.prototype.EVENT_DRAFT_DISCARD = 'discardDraft';

    Gmailr.prototype.EVENT_DRAFT_SAVE = 'saveDraft';

    Gmailr.prototype.EVENT_MARK_UNREAD = 'unread';

    Gmailr.prototype.EVENT_MARK_READ = 'read';

    Gmailr.prototype.EVENT_STAR = 'star';

    Gmailr.prototype.EVENT_UNSTAR = 'unstar';

    Gmailr.prototype.EVENT_UNREAD_CHANGE = 'numUnreadChange';

    Gmailr.prototype.EVENT_INBOX_COUNT_CHANGE = 'inboxCountChange';

    Gmailr.prototype.EVENT_VIEW_CHANGED = 'viewChanged';

    Gmailr.prototype.VIEW_CONVERSATION = 'conversation';

    Gmailr.prototype.VIEW_THREADED = 'threaded';

    Gmailr.prototype.init = function(cb) {
      var count, load,
        _this = this;
      if (this.loaded) {
        dbg("Gmailr has already been initialized");
        if (typeof cb === "function") {
          cb(this);
        }
        return;
      }
      dbg("Initializing Gmailr API");
      count = 0;
      load = function() {
        _this.elements.canvas = $("[style*='min-height: 100%;']");
        _this.elements.body = _this.elements.canvas.find(".nH").first();
        if (_this.loaded) {
          if (count !== 0) {
            dbg("Delayed loader success.");
          }
          _this.elements.body.bind('DOMSubtreeModified', _this.detectDOMEvents);
          clearInterval(_this.delayed_loader);
        } else {
          dbg("Calling delayed loader...");
          count++;
          _this.bootstrap(cb);
        }
      };
      this.delayed_loader = setInterval(load, 500);
    };

    /*
        This method attempts to bootstrap Gmailr into the Gmail interface.
        Basically, this amounts polling to make sure Gmail has fully loaded,
        and then setting up some basic hooks.
    */


    Gmailr.prototype.bootstrap = function(cb) {
      var el, inboxLink, v;
      if (this.inBootstrap) {
        return;
      }
      this.inBootstrap = true;
      if (this.elements.body) {
        el = $(this.elements.body);
        if (!this.leftMenu || this.leftMenu.length === 0) {
          inboxLink = this.getInboxLink();
          v = el.find("a[href$='#mbox']");
          if (v.length > 0) {
            this.priorityInboxLink = v.first();
          }
          if (inboxLink) {
            this.leftMenu = inboxLink.closest(".TO").closest("div");
          } else {
            if (this.priorityInboxLink) {
              this.leftMenu = this.priorityInboxLink.closest(".TO").closest("div");
            }
          }
          if (this.leftMenu && this.leftMenu.length > 0) {
            this.leftMenuItems = this.leftMenu.find(".TO");
            dbg("Fully loaded.");
            this.loaded = true;
            this.currentNumUnread = this.numUnread();
            if (this.inboxTabHighlighted()) {
              this.currentInboxCount = this.toolbarCount();
            }
            this.xhrWatcher = new XHRWatcher(this.detectXHREvents);
            if (typeof cb === "function") {
              cb(this);
            }
          }
        }
        this.inBootstrap = false;
      }
    };

    Gmailr.prototype.intercept = function() {
      if (!this.loaded) {
        throw "Call to method before Gmail has loaded";
      }
    };

    Gmailr.prototype.insertTop = function(el) {
      this.intercept();
      return this.elements.body.prepend($(el));
    };

    Gmailr.prototype.$ = function(selector) {
      this.intercept();
      return this.elements.body.find(selector);
    };

    /*
        Subscribe to a specific event in Gmail
        name                arguments passed to callback
        'archive'         - count
        'numUnreadChange' - currentVal, previousVal
        'delete'          - count
        'spam'            - count
        'compose'
        'viewChanged'
        'applyLabel'
    */


    Gmailr.prototype.observe = function(type, cb) {
      var _base, _ref;
      return ((_ref = (_base = this.observers)[type]) != null ? _ref : _base[type] = []).push(cb);
    };

    Gmailr.prototype.notify = function() {
      var args, listener, type, _i, _len, _ref;
      type = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (this.observers[type]) {
        _ref = this.observers[type];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          listener = _ref[_i];
          if (listener != null) {
            if (typeof listener.apply === "function") {
              listener.apply(this, args);
            }
          }
        }
      }
    };

    /*
        Number of unread messages.
    */


    Gmailr.prototype.numUnread = function() {
      var m, title, _ref;
      this.intercept();
      title = this.getInboxLink()[0].title;
      m = /\((\d+)\)/.exec(title);
      return parseInt((_ref = (m != null ? m[1] : void 0) != null) != null ? _ref : 0);
    };

    /*
        Email address of the Gmail account.
    */


    Gmailr.prototype.emailAddress = function() {
      var el, selectors;
      this.intercept();
      selectors = ["#guser b", ".gbmp1", "#gbi4t"];
      el = this.elements.canvas.find(selectors.join(','));
      return el.first().html();
    };

    /*
        Returns whether the current view is a threaded or conversation view.
    */


    Gmailr.prototype.currentView = function() {
      this.intercept();
      if (this.elements.canvas.find("h1.ha").length > 0) {
        return this.VIEW_CONVERSATION;
      } else {
        return this.VIEW_THREADED;
      }
    };

    Gmailr.prototype.getInboxLink = function() {
      var v;
      v = $(this.elements.body).find("a[href$='#inbox'][title^='Inbox']");
      return v.first() || null;
    };

    Gmailr.prototype.liveLeftMenuItem = function() {
      var el;
      if (!this.loaded) {
        return null;
      }
      el = this.leftMenuItems.filter(".nZ").find("a");
      if (el[0]) {
        return el[0].title;
      } else {
        return null;
      }
    };

    Gmailr.prototype.inboxTabHighlighted = function() {
      return this.currentTabHighlighted() === "inbox" || this.currentTabHighlighted() === "priority_inbox";
    };

    Gmailr.prototype.currentTabHighlighted = function() {
      var inboxLink;
      inboxLink = this.getInboxLink();
      if (inboxLink && inboxLink.closest(".TO").hasClass("nZ")) {
        return "inbox";
      } else if (this.priorityInboxLink && this.priorityInboxLink.closest(".TO").hasClass("nZ")) {
        return "priority_inbox";
      } else {
        return null;
      }
    };

    Gmailr.prototype.archiveableState = function() {
      return (this.inboxTabHighlighted() && this.currentView() === this.VIEW_THREADED) || (this.currentView() !== this.VIEW_THREADED);
    };

    Gmailr.prototype.mainListingEl = function() {
      return this.elements.canvas.find(".nH.Cp").first();
    };

    Gmailr.prototype.mainListingEmpty = function() {
      if (this.mainListingEl().length > 0 && this.currentView() === this.VIEW_THREADED) {
        return this.mainListingEl().find("table tr").length === 0;
      } else {
        return null;
      }
    };

    Gmailr.prototype.toolbarEl = function() {
      return this.elements.canvas.find(".A1.D.E").first();
    };

    Gmailr.prototype.toolbarCount = function() {
      var el, m, t;
      el = this.toolbarEl().find(".Dj");
      if (el[0]) {
        t = el[0].innerHTML;
        m = /of <b>(\d+)<\/b>/.exec(t);
        if ((m != null ? m[1] : void 0) != null) {
          return parseInt(m[1]);
        } else {
          return null;
        }
      } else {
        if (this.mainListingEmpty()) {
          return 0;
        } else {
          return null;
        }
      }
    };

    Gmailr.prototype.toEmailProps = function(postParams) {
      var _ref, _ref1, _ref2, _ref3, _ref4;
      return {
        inReplyTo: (postParams.rm === "undefined" ? null : postParams.rm),
        body: (_ref = postParams.body) != null ? _ref : null,
        subject: (_ref1 = postParams.subject) != null ? _ref1 : null,
        bcc: (_ref2 = postParams.bcc) != null ? _ref2 : null,
        to: (_ref3 = postParams.to) != null ? _ref3 : null,
        from: postParams.from,
        isHTML: postParams.ishtml === '1',
        cc: (_ref4 = postParams.cc) != null ? _ref4 : null,
        fromDraft: (postParams.draft === "undefined" ? null : postParams.draft)
      };
    };

    Gmailr.prototype.detectXHREvents = function(params) {
      var action, count, label, postParams, starType, urlParams, _ref, _ref1;
      try {
        urlParams = $.deparam(params.url);
        action = (_ref = urlParams.act) != null ? _ref : urlParams.view;
        count = 1;
        postParams = null;
        if (params.body.length > 0) {
          postParams = $.deparam(params.body);
          if (postParams && postParams.t && !(postParams.t instanceof Array)) {
            postParams.t = [postParams.t];
            count = postParams.t.length;
          }
          if (postParams["ba"]) {
            count = -1;
          }
        }
        switch (action) {
          case "ad":
            dbg("User views a thred");
            this.notify(this.EVENT_VIEW_THREAD, urlParams.th);
            break;
          case "rc_^i":
            if ((_ref1 = urlParams.search) === "inbox" || _ref1 === "query" || _ref1 === "cat" || _ref1 === "mbox") {
              if (postParams) {
                dbg("User archived emails.");
                this.notify(this.EVENT_ARCHIVE, count, postParams.t);
              }
            }
            break;
          case "arl":
            label = urlParams["acn"];
            this.notify(this.EVENT_APPLY_LABEL, label, count, postParams.t);
            break;
          case "tr":
            dbg("User deleted " + count + " emails.");
            this.notify(this.EVENT_DELETE, count, postParams.t);
            break;
          case "sm":
            if (this.currentView() === this.VIEW_CONVERSATION) {
              dbg("User replied to an email.");
              this.notify(this.EVENT_REPLY, this.toEmailProps(postParams));
            } else {
              dbg("User composed an email.");
              this.notify(this.EVENT_COMPOSE, this.toEmailProps(postParams));
            }
            break;
          case "sp":
            dbg("User spammed " + count + " emails.");
            this.notify(this.EVENT_SPAM, count, postParams.t);
            break;
          case "dr":
            dbg("User discarded? a draft.");
            this.notify(this.EVENT_DRAFT_DISCARD);
            break;
          case "sd":
            dbg("User saved? a draft.");
            this.notify(this.EVENT_DRAFT_SAVE, this.toEmailProps(postParams));
            break;
          case "ur":
            dbg("User marked messages as unread.");
            this.notify(this.EVENT_MARK_UNREAD, count, postParams.t);
            break;
          case "rd":
            dbg("User marked messages as read.");
            this.notify(this.EVENT_MARK_READ, count, postParams.t);
            break;
          case "st":
            dbg("User starred messages.");
            starType = (function() {
              switch (postParams.sslbl) {
                case "^ss_sy":
                  return "standard";
                default:
                  return "unknown";
              }
            })();
            this.notify(this.EVENT_STAR, count, postParams.t, starType);
            break;
          case "xst":
            dbg("User unstarred messages.");
            this.notify(this.EVENT_UNSTAR, count, postParams.t);
        }
      } catch (e) {
        dbg("Error in detectXHREvents: " + e);
      }
    };

    Gmailr.prototype.detectDOMEvents = function(e) {
      var el, toolbarCount;
      el = $(e.target);
      if (this.elements.canvas.find(".ha").length > 0) {
        if (!this.inConversationView) {
          this.inConversationView = true;
          this.notify(this.EVENT_VIEW_CHANGED, this.VIEW_CONVERSATION);
        }
      } else {
        if (this.inConversationView) {
          this.inConversationView = false;
          this.notify(this.EVENT_VIEW_CHANGED, this.VIEW_THREADED);
        }
      }
      if (isDescendant(this.toolbarEl(), el)) {
        toolbarCount = this.toolbarCount();
        if (this.inboxTabHighlighted() && toolbarCount) {
          if ((this.currentInboxCount === null) || (toolbarCount !== this.currentInboxCount)) {
            if (this.currentInboxCount !== null) {
              this.notify(this.EVENT_INBOX_COUNT_CHANGE, toolbarCount, this.currentInboxCount);
            }
            return this.currentInboxCount = toolbarCount;
          }
        }
      }
    };

    return Gmailr;

  })();
  Gmailr = new Gmailr;
  window.Gmailr = Gmailr;
})(jQuery, window);
