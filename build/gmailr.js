(function() {
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
        var self, win;
        if (!this.initialized) {
          this.initialized = true;
          self = this;
          win = top.document.getElementById("js_frame").contentDocument.defaultView;
          if (this._Gmail_open == null) {
            this._Gmail_open = win.XMLHttpRequest.prototype.open;
          }
          win.XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
            this.xhrParams = {
              method: method.toString(),
              url: url.toString()
            };
            return self._Gmail_open.apply(this, arguments);
          };
          if (this._Gmail_send == null) {
            this._Gmail_send = win.XMLHttpRequest.prototype.send;
          }
          win.XMLHttpRequest.prototype.send = function(body) {
            if (this.xhrParams) {
              this.xhrParams.body = body;
              cb(this.xhrParams);
            }
            return self._Gmail_send.apply(this, arguments);
          };
          if (top._Gmail_iframeFn == null) {
            top._Gmail_iframeFn = top.GG_iframeFn;
          }
          this.iframeCachedData.push({
            responseDataId: 1,
            url: top.location.href,
            responseData: top.VIEW_DATA
          });
          top.GG_iframeFn = function(win, data) {
            var body, d, e, parent, tmp, url, _ref, _ref1;
            d = top._Gmail_iframeFn.apply(this, arguments);
            try {
              url = (_ref = win != null ? (_ref1 = win.location) != null ? _ref1.href : void 0 : void 0) != null ? _ref : null;
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
            } catch (_error) {
              e = _error;
              try {
                dbg("DEBUG error in GG_iframeFn: ", e);
              } catch (_error) {}
            }
            return d;
          };
        }
      }

      return XHRWatcher;

    })();
    dbg = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      args.unshift('[Gmailr]');
      if ((typeof console !== "undefined" && console !== null ? console.log : void 0) && Gmailr.debug === true) {
        console.log.apply(console, args);
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

      Gmailr.prototype.inboxLink = null;

      Gmailr.prototype.currentNumUnread = null;

      Gmailr.prototype.currentInboxCount = null;

      Gmailr.prototype.elements = {};

      Gmailr.prototype.currentLeftMenuItem = null;

      Gmailr.prototype.observers = {};

      Gmailr.prototype.loaded = false;

      Gmailr.prototype.inConversationView = false;

      Gmailr.prototype.xhrWatcher = null;

      Gmailr.prototype.delayedLoader = null;

      Gmailr.prototype.ignoreDOMElements = [];

      Gmailr.prototype.EVENT_VIEW_THREAD = 'viewThread';

      Gmailr.prototype.EVENT_LOADED = 'load';

      Gmailr.prototype.EVENT_ARCHIVE = 'archive';

      Gmailr.prototype.EVENT_APPLY_LABEL = 'applyLabel';

      Gmailr.prototype.EVENT_DELETE = 'delete';

      Gmailr.prototype.EVENT_COMPOSE = 'compose';

      Gmailr.prototype.EVENT_REPLY = 'reply';

      Gmailr.prototype.EVENT_SPAM = 'spam';

      Gmailr.prototype.EVENT_DRAFT_DISCARD = 'discardDraft';

      Gmailr.prototype.EVENT_DRAFT_SAVE = 'saveDraft';

      Gmailr.prototype.EVENT_MARK_UNREAD = 'unread';

      Gmailr.prototype.EVENT_STAR = 'star';

      Gmailr.prototype.EVENT_UNSTAR = 'unstar';

      Gmailr.prototype.EVENT_UNREAD_CHANGE = 'numUnreadChange';

      Gmailr.prototype.EVENT_INBOX_COUNT_CHANGE = 'inboxCountChange';

      Gmailr.prototype.EVENT_VIEW_CHANGED = 'viewChanged';

      Gmailr.prototype.EVENT_REFRESH_INBOX = 'refresh';

      Gmailr.prototype.EVENT_ANY = 'any';

      Gmailr.prototype.VIEW_CONVERSATION = 'conversation';

      Gmailr.prototype.VIEW_THREADED = 'threaded';

      Gmailr.prototype.init = function(cb) {
        var load;
        if (this.loaded) {
          dbg("Gmailr has already been initialized");
          if (typeof cb === "function") {
            cb(this);
          }
          return;
        }
        dbg("Initializing Gmailr API");
        load = (function(_this) {
          return function() {
            var canvas_frame;
            _this.elements.canvas = $((canvas_frame = $("#canvas_frame").get(0)) ? canvas_frame.contentDocument : document);
            _this.elements.body = _this.elements.canvas.find(".nH").first();
            if (_this.loaded) {
              clearInterval(_this.delayedLoader);
              dbg("Delayed loader success.");
              _this.elements.body.children().on('DOMSubtreeModified', _this.detectDOMEvents);
              _this.notify(_this.EVENT_LOADED);
            } else {
              dbg("Calling delayed loader...");
              _this.bootstrap(cb);
            }
          };
        })(this);
        this.delayedLoader = setInterval(load, 200);
      };


      /*
      This method attempts to bootstrap Gmailr into the Gmail interface.
      Basically, this amounts polling to make sure Gmail has fully loaded,
      and then setting up some basic hooks.
       */

      Gmailr.prototype.bootstrap = function(cb) {
        var inboxLink, v;
        if (!this.inBootstrap) {
          this.inBootstrap = true;
          if (this.elements.body) {
            if (!this.leftMenu || this.leftMenu.length === 0) {
              if ((inboxLink = this.getInboxLink())) {
                this.leftMenu = inboxLink.closest(".TO").closest("div");
              } else {
                v = this.elements.body.find("a[href$='#mbox']");
                if (v.length > 0) {
                  this.priorityInboxLink = v.first();
                }
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
          }
          this.inBootstrap = false;
        }
      };

      Gmailr.prototype.intercept = function() {
        if (!this.loaded) {
          throw "Call to method before Gmail has loaded";
        }
      };

      Gmailr.prototype.insertTop = function(el, ignoreDOMEvents) {
        if (ignoreDOMEvents == null) {
          ignoreDOMEvents = true;
        }
        this.intercept();
        el = $(el);
        this.elements.body.prepend(el);
        if (ignoreDOMEvents) {
          this.ignoreDOMElements.push(el.get(0));
        }
      };

      Gmailr.prototype.$ = function(selector) {
        this.intercept();
        return this.elements.body.find(selector);
      };


      /*
      Subscribe to a specific event in Gmail
       */

      Gmailr.prototype.observe = function(type, cb) {
        var _base;
        return ((_base = this.observers)[type] != null ? _base[type] : _base[type] = []).push(cb);
      };

      Gmailr.prototype.notify = function() {
        var args, listener, type, _i, _j, _len, _len1, _ref, _ref1;
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
        if (type !== this.EVENT_ANY && this.observers[this.EVENT_ANY]) {
          _ref1 = this.observers[this.EVENT_ANY];
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            listener = _ref1[_j];
            if (listener != null) {
              if (typeof listener.call === "function") {
                listener.call(this, type, args);
              }
            }
          }
        }
      };


      /*
      Number of unread messages.
       */

      Gmailr.prototype.numUnread = function() {
        var m, title;
        this.intercept();
        title = this.getInboxLink().attr('title');
        m = /\((\d+)\)/.exec(title);
        if (m != null ? m[1] : void 0) {
          return parseInt(m[1]);
        } else {
          return 0;
        }
      };


      /*
      Email address of the Gmail account.
       */

      Gmailr.prototype.emailAddress = function() {
        var el, selectors;
        this.intercept();
        selectors = ["#guser b", ".gbmp1", '.gbps2', '.gb_qa'];
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

      Gmailr.prototype.inboxes = ["a[href$='#inbox'][title^='Inbox']", "a[href$='#inbox'][title^='Posteingang']", "a[href$='#inbox'][title^='Postvak IN']", "a[href$='#inbox'][target='_top']"];

      Gmailr.prototype.getInboxLink = function() {
        return this.elements.body.find(this.inboxes.join(',')).first() || null;
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
        var _ref, _ref1;
        return {
          inReplyTo: (postParams.rm === "undefined" ? null : postParams.rm),
          body: (_ref = postParams.body) != null ? _ref : null,
          subject: (_ref1 = postParams.subject) != null ? _ref1 : null,
          bcc: this.toEmailArray(postParams.bcc),
          to: this.toEmailArray(postParams.to),
          from: postParams.from,
          isHTML: postParams.ishtml === '1',
          cc: this.toEmailArray(postParams.cc),
          fromDraft: (postParams.draft === "undefined" ? null : postParams.draft),
          _raw: postParams
        };
      };

      Gmailr.prototype.toEmailArray = function(str) {
        var m, regex, _results;
        if (!str) {
          return [];
        }
        regex = /(?:"([^"]+)")? ?<?(.*?@[^>,]+)>?,? ?/g;
        _results = [];
        while ((m = regex.exec(str))) {
          _results.push({
            name: m[1],
            email: m[2]
          });
        }
        return _results;
      };

      Gmailr.prototype.detectXHREvents = function(params) {
        var action, count, e, label, postParams, starType, urlParams, _ref, _ref1;
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
              if (!urlParams.th) {
                this.notify(this.EVENT_REFRESH_INBOX);
              } else {
                dbg("User views a thred");
                this.notify(this.EVENT_VIEW_THREAD, urlParams.th);
              }
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
        } catch (_error) {
          e = _error;
          dbg("Error in detectXHREvents: " + e);
        }
      };

      Gmailr.prototype.detectDOMEvents = function(e) {
        var el, ignored, newCount, toolbarCount, _i, _len, _ref;
        e.stopPropagation();
        _ref = this.ignoreDOMElements;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          ignored = _ref[_i];
          if ($.contains(ignored, e.target)) {
            return false;
          }
        }
        el = $(e.target);
        newCount = this.numUnread();
        if (this.currentNumUnread !== newCount) {
          dbg("Unread count changed");
          this.notify(this.EVENT_UNREAD_CHANGE, newCount, this.currentNumUnread);
          this.currentNumUnread = newCount;
        }
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

}).call(this);

//# sourceMappingURL=gmailr.js.map
