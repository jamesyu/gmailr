/**
 * Gmailr v0.0.1
 * Licensed under The MIT License
 *
 * Copyright 2011, James Yu
 */

(function($, window) {

    // Utility methods

    var dbg = function(msg) {
        if(Gmailr.debug)
            console.log(msg);
    };

    var p = function(els, m) {
        if(!els) {
            dbg(els);
        } else if(els.each) {
            if(els.length == 0) {
                dbg('p: Empty');
            } else {
                els.each(function(i,e) {
                    dbg(e);
                });
            }
        } else {
            dbg(els);
        }
    };

    var pm = function(m, els) {
        dbg(m);
        p(els);
    };

    var isDescendant = function(el, t) {
        return t.parents().index(el) >= 0;
    };

    var Gmailr = {

        /*****************************************************************************************
         * Public Methods and Variables
         */

        debug: false,
        priorityInboxLink: null,
        currentNumUnread: null,
        currentInboxCount: null,
        archived: [],
        elements: {},

        /*
            This is the main initialization routine. It bootstraps Gmailr into the Gmail interface.
            You must call this with a callback, like so:

            Gmailr.init(funciton(G) {
                // .. G is the Gmailr API object
            });
        */

        init: function(cb) {
            var self = this;

            dbg('Initializing Gmailr API');

            var delayed_loader_count = 0;

            // Here we do delayed loading until success. This is in the case
            // that our script loads after Gmail has already loaded.
            self.delayed_loader = setInterval(function() {
                self.elements.canvas = $("[style*='min-height: 100%;']");
                self.elements.body   = self.elements.canvas.find('.nH').first();

                if(self.loaded) {
                    if(delayed_loader_count != 0)
                        dbg('Delayed loader success.');

                    self.elements.body.bind("DOMSubtreeModified", function(e) {
                        self.detectDOMEvents(e);
                    });
                    clearInterval(self.delayed_loader);
                } else {
                    dbg('Calling delayed loader...');
                    delayed_loader_count += 1;
                    // we search from the body node, since there's no event to attach to
                    self.bootstrap(cb);
                }
            }, 500);
        },

        /*
            Inserts the element to the top of the Gmail interface.
        */

        insertTop: function(el) {
            if(!this.loaded) throw "Call to insertTop before Gmail has loaded";
            this.elements.body.prepend($(el));
        },

        /*
            Allows you to apply jQuery selectors in the Gmail DOM, like so:

            G.$('.my_class');
        */

        $: function(selector) {
            return this.elements.body.find(selector);
        },

        /**
         * Subscribe to a specific event in Gmail
         *   name                arguments passed to callback
         *   'archive'         - count
         *   'numUnreadChange' - currentVal, previousVal
         *   'delete'          - count
         *   'spam'            - count
         *   'compose'
         *   'viewChanged'
         *   'applyLabel'
         */
        observe: function(type, cb) {
            this.ob_queues[type].push(cb);
        },

        /**
         * Number of unread messages.
         */
        numUnread: function() {
            if(!this.loaded) throw "Call to numUnread before Gmail has loaded";

            // We always look to the inbox link, bc it always displays the number unread
            // no matter where you are in Gmail

            //var title = this.inboxLink[0].title;
            var title = this.getInboxLink()[0].title;
            var m = /\((\d+)\)/.exec(title);
            return (m && m[1]) ? parseInt(m[1]) : 0;
        },

        /**
         * Email address of the Gmail account.
         */
        emailAddress: function() {
            if(!this.loaded) throw "Call to emailAddress before Gmail has loaded";

            var selectors = [
              '#guser b', // First, try old Gmail header
              '.gbmp1', // Try the new one
              '#gbi4t' // Google+ (as of 2012-10-05)
            ];
            
            var el = this.elements.canvas.find(selectors.join(','));
            return el.first().html();
        },

        /**
         * Returns whether the current view is a threaded or conversation view.
         */
        currentView: function() {
            if(!this.loaded) throw "Call to currentView before Gmail has loaded";

            if(this.elements.canvas.find('h1.ha').length > 0) {
                return 'conversation';
            } else {
                return 'thread';
            }
        },

        /*****************************************************************************************
         * Private Methods
         */


        /**
         * This method attempts to bootstrap Gmailr into the Gmail interface.
         * Basically, this amounts polling to make sure Gmail has fully loaded,
         * and then setting up some basic hooks.
         */

        bootstrap: function(cb) {
            if(this.elements.body) {
                var el = $(this.elements.body);

                // get handle on the left menu
                if(!this.leftMenu || this.leftMenu.length == 0) {
//                  this.leftMenu = el.find('.no .nM .TK').first().closest('.nn');
                    
                    inboxLink = this.getInboxLink()

                    var v = el.find('a[href$="#mbox"]');
                    if(v.length > 0) this.priorityInboxLink = v.first();

                    if(inboxLink) {
                        this.leftMenu = inboxLink.closest('.TO').closest('div');
                    } else if(this.priorityInboxLink) {
                        this.leftMenu = this.priorityInboxLink.closest('.TO').closest('div');
                    }

                    if(this.leftMenu && this.leftMenu.length > 0) {
                        this.leftMenuItems = this.leftMenu.find('.TO');

                        p('Fully loaded.');
                        this.loaded = true;

                        this.currentNumUnread = this.numUnread();

                        if(this.inboxTabHighlighted())
                            this.currentInboxCount = this.toolbarCount();

                        this.xhrWatcher.init();

                        if(cb) cb(this);
                    }

                }
            }
        },

        getInboxLink: function() {
          // use the inbox link as an anchor
          var v = $(this.elements.body).find('a[href$="#inbox"][title^="Inbox"]');
          return v.first() || null;
        },

        xhrWatcher: {
            xhrParams: null,
            initialized: null,

            init: function() {
                var self = this;

                if(!this.initialized) {
                    this.initialized = true;
                    var win = top.document.getElementById("js_frame").contentDocument.defaultView;

                    this._Gmail_open = win.XMLHttpRequest.prototype.open;
                    win.XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
                        var out = self._Gmail_open.apply(this, arguments);
                        this.xhrParams = {
                            method: method.toString(),
                            url: url.toString()
                        };
                        return out;
                    };

                    this._Gmail_send = win.XMLHttpRequest.prototype.send;
                    win.XMLHttpRequest.prototype.send = function (body) {
                        var out = self._Gmail_send.apply(this, arguments);
                        if (this.xhrParams) {
                            this.xhrParams.body = body;
                            Gmailr.detectXHREvents(this.xhrParams);
                        }
                        return out;
                    }

                    if (!top._Gmail_iframeFn) {
                        top._Gmail_iframeFn = top.GG_iframeFn;
                        this.iframeData = {};
                        this.iframeCachedData = [];
                        this.iframeCachedData.push({
                            responseDataId: 1,
                            url: top.location.href,
                            responseData: top.VIEW_DATA
                        });

                        top.GG_iframeFn = function(win, data) {
                            var d = top._Gmail_iframeFn.apply(this, arguments);
                            try {
                                var url = win && win.location ? win.location.href: null;
                                if (url && data && (url.indexOf("act=") != -1 )) {

                                    if(!self.iframeData[url]) {

                                        var body = "";
                                        var parent = win.frameElement.parentNode;
                                        if(parent && $(parent).find('form').length > 0)
                                            body = $(parent).find('form').first().serialize();

                                        self.iframeData[url] = true;
                                        Gmailr.detectXHREvents({
                                            body: body,
                                            url: url
                                        });
                                    }
                                }
                            } catch(e) {
                                try {
                                    dbg("DEBUG error in GG_iframeFn: " + e);
                                } catch(e) {}
                            }
                            return d
                        }
                    }

                }
            }
        },

        currentLeftMenuItem: null,
        ob_queues: {
            archive: [],
            'delete': [],
            spam: [],
            reply: [],
            tabChange: [],
            compose: [],
            numUnreadChange: [],
            inboxCountChange: [],
            viewChanged: [],
            viewThread: [],
            applyLabel: [],
            draft: [],
            unread: [],
            read: [],
            star: [],
            unstar: []
        },
        loaded: false,

        liveLeftMenuItem: function() {
            if(!this.loaded) return null;

            var el = this.leftMenuItems.filter('.nZ').find('a');
            if(el[0]) {
                return el[0].title;
            } else {
                return null;
            }
        },

        inboxTabHighlighted: function() {
            return this.currentTabHighlighted() == 'inbox' || this.currentTabHighlighted() == 'priority_inbox';
        },

        currentTabHighlighted: function() {
            var inboxLink = this.getInboxLink()
            if(inboxLink && inboxLink.closest('.TO').hasClass('nZ')) {
                return 'inbox';
            } else if(this.priorityInboxLink && this.priorityInboxLink.closest('.TO').hasClass('nZ')) {
                return 'priority_inbox';
            } else {
                return null;
            }
        },

        // Return true if a yellow archive highlight actually means the user is archiving
        archiveableState: function() {
            // For threads, this overrestricts:
            //   TODO: should detect if user is archiving an inbox item from a non-inbox view
            // For conversations, this underrestricts:
            //   TODO: should detect if the current email is in the inbox, and only assign points if it is
            return (this.inboxTabHighlighted() && this.currentView() == 'thread') || (this.currentView() != 'thread');
        },

        mainListingEl: function() {
            return this.elements.canvas.find('.nH.Cp').first();
        },

        mainListingEmpty: function() {
            if(this.mainListingEl().length > 0 && this.currentView() == 'thread') {
                return this.mainListingEl().find('table tr').length == 0;
            } else {
                return null;
            }
        },

        toolbarEl: function() {
            return this.elements.canvas.find('.A1.D.E').first();
        },

        toolbarCount: function() {
            var el = this.toolbarEl().find('.Dj');
            if(el[0]) {
                var t = el[0].innerHTML;

                var m = /of <b>(\d+)<\/b>/.exec(t);

                if(m && m[1]) {
                    return parseInt(m[1]);
                } else {
                    return null;
                }
            } else {
                if(this.mainListingEmpty()) {
                    return 0;
                } else {
                    return null;
                }
            }
        },

        detectXHREvents: function(params) {
            var self = this;

            try {
                var urlParams = $.deparam(params.url);
                var action = urlParams.act || urlParams.view;
                var count = 1;
                
                var postParams = null;

                if(params.body.length > 0) {
                    postParams = $.deparam(params.body);
                    
                    if(postParams && postParams.t && !(postParams.t instanceof Array)) {
                      postParams.t = [ postParams.t ];
                      count = postParams.t.length;
                    }

                    if(postParams['ba']) {
                        // The user has cleared more than a pageful, just give'em 50 points
                        count = -1;
                    }
                }



                switch(action) {
                    case 'ad':
                      // View thread
                      p('User views a thred');
                      this.executeObQueues('viewThread', urlParams.th);
                      break;
                    case 'cv':
                      // View conversation
                        dbg(urlParams);
                        dbg(postParams);
                      break;
                    case "rc_^i": // Archiving
                        // only count if from inbox or query
                        // TODO: could do better
                        if(urlParams['search'] == 'inbox' || urlParams['search'] == 'query' || urlParams['search'] == 'cat' || urlParams['search'] == 'mbox') {
                            if(postParams) {
                                // Get list of email hashes
                                var emailsArchived = [];
                                postParams.t.forEach(function(e) {
                                    // Make sure user didn't already archive this email
                                    if(self.archived.indexOf(e) == -1)
                                        emailsArchived.push(e);
                                });

                                this.archived = this.archived.concat(emailsArchived);

                                if(emailsArchived.length > 0) {
                                    p("User archived " + emailsArchived.length + " emails.");
                                    this.executeObQueues('archive', count);
                                }

                                delete emailsArchived;
                            }
                        }
                        break;
                    case "arl": //applying label
                        var label = urlParams["acn"];
                        this.executeObQueues('applyLabel', label, postParams.t);
                        break;
                    case "tr": // Deleting
                        p("User deleted " + count + " emails.");
                        this.executeObQueues('delete', count);
                        break;
                    case "sm": // Composing
                        if(this.currentView() == 'conversation') {
                            p("User replied to an email.");
                            var details = {
                              inReplyTo: postParams.rm,
                              body: postParams.body || null,
                              subject: postParams.subject || null,
                              bcc: postParams.bcc || null,
                              to: postParams.to,
                              from: postParams.from,
                              isHTML: postParams.ishtml == '1',
                              cc: postParams.cc || null,
                              fromDraft: postParams.draft === "undefined" ? null : postParams.draft
                            };
                            this.executeObQueues('reply', details);
                        } else {
                            p("User composed an email.");
                            var details = {
                              body: postParams.body || null,
                              subject: postParams.subject || null,
                              bcc: postParams.bcc || null,
                              to: postParams.to,
                              from: postParams.from,
                              isHTML: postParams.ishtml == '1',
                              cc: postParams.cc || null,
                              fromDraft: postParams.draft === "undefined" ? null : postParams.draft
                            };
                            this.executeObQueues('compose', details);
                        }
                        break;
                    case "sp": // Spam
                        p("User spammed " + count + " emails.");
                        this.executeObQueues('spam', count);
                        break;
                    case "dr": // Some action with a draft
                        p("User discarded? a draft.");
                        this.executeObQueues('draft','discard');
                        break;
                    case "sd":
                        p("User saved? a draft.");
                        var details = {
                          inReplyTo: postParams.rm === "undefined" ? null : postParams.rm,
                          body: postParams.body || null,
                          subject: postParams.subject || null,
                          bcc: postParams.bcc || null,
                          to: postParams.to || null,
                          from: postParams.from,
                          isHTML: postParams.ishtml == '1',
                          cc: postParams.cc || null
                        };
                        this.executeObQueues('draft','save', details);
                        break;
                    case 'ur':
                      p("User marked messages as unread.");
                      this.executeObQueues('unread', postParams.t);
                      break;
                    case 'rd':
                      p("User marked messages as read.");
                      this.executeObQueues('read', postParams.t);
                      break;
                    case 'st':
                      p("User starred messages.");
                      var starType;
                      switch(postParams.sslbl) {
                        case '^ss_sy':
                          starType = 'standard';
                          break;
                        default:
                          starType = 'unknown';
                          break;
                      }
                      this.executeObQueues('star', postParams.t, starType);
                      break;
                    case 'xst':
                      p("User unstarred messages.");
                      this.executeObQueues('unstar', postParams.t);
                      break;
                }
            } catch(e) {
                dbg("Error in detectXHREvents: " + e);
            }
        },

        inConversationView: false,

        detectDOMEvents: function(e) {
            var el = $(e.target);

            // Left Menu Changes
            /*var s = this.liveLeftMenuItem();
            if(this.currentLeftMenuItem != s) {
                this.currentLeftMenuItem = s;
                this.executeObQueues('tabChange', s);
            }
            */

            /*
            // Unread change
            var l = this.getInboxLink() || this.priorityInboxLink;
            if((el[0] == l[0]) || isDescendant(el, l)) {
                var newCount = this.numUnread();
                if(this.currentNumUnread != newCount) {
                    this.executeObQueues('numUnreadChange', newCount, this.currentNumUnread);
                    this.currentNumUnread = newCount;
                }
            }
            */
            

            if(this.elements.canvas.find('.ha').length > 0) {
                if(!this.inConversationView) {
                    this.inConversationView = true;
                    this.executeObQueues('viewChanged', 'conversation');
                }
            } else {
                if(this.inConversationView) {
                    this.inConversationView = false;
                    this.executeObQueues('viewChanged', 'threaded');
                }
            }

            // Inbox count change
            if(isDescendant(this.toolbarEl(), el)) {
                var toolbarCount = this.toolbarCount();
                if(this.inboxTabHighlighted() && toolbarCount !== null) {
                    if((this.currentInboxCount === null) || (toolbarCount != this.currentInboxCount)) {
                        if(this.currentInboxCount !== null)
                            this.executeObQueues('inboxCountChange', toolbarCount, this.currentInboxCount);
                        this.currentInboxCount = toolbarCount;
                    }
                }
            }
        },

        executeObQueues: function(type, arg) {
            if(this.ob_queues[type])
                for(var i = 0; i < this.ob_queues[type].length; i++) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    (this.ob_queues[type][i]).apply(this, args)
                }
        }
    };

    window.Gmailr = Gmailr;
})(jQuery, window);
