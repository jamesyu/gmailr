###
Gmailr v0.0.1
Licensed under The MIT License

Copyright 2012, James Yu, Joscha Feth
###
(($, window) ->

  class XHRWatcher
    initialized: false
    iframeData: {}
    iframeCachedData: []
    _Gmail_open: null
    _Gmail_send: null

    constructor: (cb) ->
      unless @initialized
        @initialized = true
        self = @
        win = top.document.getElementById("js_frame").contentDocument.defaultView

        @_Gmail_open ?= win.XMLHttpRequest::open
        win.XMLHttpRequest::open = (method, url, async, user, password) ->
          @xhrParams =
            method: method.toString()
            url: url.toString()
          self._Gmail_open.apply @, arguments

        @_Gmail_send ?= win.XMLHttpRequest::send
        win.XMLHttpRequest::send = (body) ->
          if @xhrParams
            @xhrParams.body = body
            cb @xhrParams
          self._Gmail_send.apply @, arguments

        top._Gmail_iframeFn ?= top.GG_iframeFn
        @iframeCachedData.push
          responseDataId: 1
          url: top.location.href
          responseData: top.VIEW_DATA

        top.GG_iframeFn = (win, data) ->
          d = top._Gmail_iframeFn.apply @, arguments
          try
            url = win?.location?.href ? null
            if data and url?.indexOf("act=") isnt -1
              unless self.iframeData[url]
                self.iframeData[url] = true
                body = ""
                if (parent = win.frameElement.parentNode)
                  tmp = $(parent).find "form"
                  body = tmp.first().serialize() if tmp.length > 0

                cb
                  body: body
                  url: url

          catch e
            try
              dbg "DEBUG error in GG_iframeFn: ", e
          d
  
  # Utility methods
  dbg = (args...) ->
    console.log.apply console, args if console?.log and Gmailr.debug is true
    return

  isDescendant = (el, t) ->
    t.parents().index(el) >= 0

  class Gmailr
    
    debug:                false
    priorityInboxLink:    null
    inboxLink:            null
    currentNumUnread:     null
    currentInboxCount:    null
    elements:             {}
    currentLeftMenuItem:  null
    observers:            {}
    loaded:               false
    inConversationView:   false
    xhrWatcher:           null
    delayedLoader:        null
    ignoreDOMElements:      []

    EVENT_VIEW_THREAD:        'viewThread'
    EVENT_LOADED:             'load'
    EVENT_ARCHIVE:            'archive'
    EVENT_APPLY_LABEL:        'applyLabel'
    EVENT_DELETE:             'delete'
    EVENT_COMPOSE:            'compose'
    EVENT_REPLY:              'reply'
    EVENT_SPAM:               'spam'
    EVENT_DRAFT_DISCARD:      'discardDraft'
    EVENT_DRAFT_SAVE:         'saveDraft'
    EVENT_MARK_UNREAD:        'unread'
    # EVENT_MARK_READ:          'read'
    EVENT_STAR:               'star'
    EVENT_UNSTAR:             'unstar'
    EVENT_UNREAD_CHANGE:      'numUnreadChange'
    EVENT_INBOX_COUNT_CHANGE: 'inboxCountChange'
    EVENT_VIEW_CHANGED:       'viewChanged'
    EVENT_REFRESH_INBOX:      'refresh'
    EVENT_ANY:                'any'


    VIEW_CONVERSATION:  'conversation'
    VIEW_THREADED:      'threaded'
    
    #
    #            This is the main initialization routine. It bootstraps Gmailr into the Gmail interface.
    #            You must call this with a callback, like so:
    #
    #            Gmailr.init(funciton(G) {
    #                // .. G is the Gmailr API object
    #            });
    #        
    init: (cb) ->
      if @loaded
        dbg "Gmailr has already been initialized"
        cb? this
        return

      dbg "Initializing Gmailr API"
      # Here we do delayed loading until success. This is in the case
      # that our script loads after Gmail has already loaded.
      load = =>
        @elements.canvas = $ if (canvas_frame = $("#canvas_frame").get 0) then canvas_frame.contentDocument else document
        #dbg @elements.canvas
        @elements.body = @elements.canvas.find(".nH").first()
        #dbg @elements.body
        if @loaded
          clearInterval @delayedLoader
          dbg "Delayed loader success."
          @elements.body.children().on 'DOMSubtreeModified', @detectDOMEvents
          @notify @EVENT_LOADED
        else
          dbg "Calling delayed loader..."
          # we search from the body node, since there's no event to attach to
          @bootstrap cb
        return

      @delayedLoader = setInterval load, 500
      return

    ###
    This method attempts to bootstrap Gmailr into the Gmail interface.
    Basically, this amounts polling to make sure Gmail has fully loaded,
    and then setting up some basic hooks.
    ###
    bootstrap: (cb) ->
      unless @inBootstrap

        @inBootstrap = true
        if @elements.body
          # get handle on the left menu
          if not @leftMenu or @leftMenu.length is 0
            #                  this.leftMenu = el.find('.no .nM .TK').first().closest('.nn');
            if (inboxLink = @getInboxLink())
              @leftMenu = inboxLink.closest(".TO").closest "div"
            else
              v = @elements.body.find("a[href$='#mbox']")
              @priorityInboxLink = v.first() if v.length > 0
              @leftMenu = @priorityInboxLink.closest(".TO").closest "div" if @priorityInboxLink

            if @leftMenu and @leftMenu.length > 0
              @leftMenuItems = @leftMenu.find ".TO"
              dbg "Fully loaded."
              @loaded = true
              @currentNumUnread = @numUnread()
              @currentInboxCount = @toolbarCount()  if @inboxTabHighlighted()
              @xhrWatcher = new XHRWatcher @detectXHREvents
              cb? @
        @inBootstrap = false
      return

    intercept: ->
      throw "Call to method before Gmail has loaded" unless @loaded
      return
    
    #
    #            Inserts the element to the top of the Gmail interface.
    #        
    insertTop: (el, ignoreDOMEvents = true) ->
      @intercept()
      el = $ el
      @elements.body.prepend el
      @ignoreDOMElements.push el.get(0) if ignoreDOMEvents
      return

    
    #
    #            Allows you to apply jQuery selectors in the Gmail DOM, like so:
    #
    #            G.$('.my_class');
    #        
    $: (selector) ->
      @intercept()
      @elements.body.find selector

    
    ###
    Subscribe to a specific event in Gmail
    ###
    observe: (type, cb) ->
      (@observers[type] ?= []).push cb

    notify: (type, args...) ->
      if @observers[type]
        for listener in @observers[type]
          listener?.apply? @, args
      if type isnt @EVENT_ANY
        for listener in @observers[@EVENT_ANY]
          listener?.call? @, type, args
      return

    
    ###
    Number of unread messages.
    ###
    numUnread: ->
      @intercept()
      
      # We always look to the inbox link, bc it always displays the number unread
      # no matter where you are in Gmail
      
      #var title = this.inboxLink[0].title;
      title = @getInboxLink().attr 'title'
      m = /\((\d+)\)/.exec title
      if m?[1] then parseInt m[1] else 0

    
    ###
    Email address of the Gmail account.
    ###
    emailAddress: ->
      @intercept()
      
      selectors = [
        "#guser b" # First, try old Gmail header
        ".gbmp1" # Try the new one
        '.gbps2'
      ] 
      el = @elements.canvas.find selectors.join ','
      el.first().html()

    
    ###
    Returns whether the current view is a threaded or conversation view.
    ###
    currentView: ->
      @intercept()
      if @elements.canvas.find("h1.ha").length > 0 then @VIEW_CONVERSATION else @VIEW_THREADED


    inboxes:  [
              "a[href$='#inbox'][title^='Inbox']"
              "a[href$='#inbox'][title^='Posteingang']"
              ]

    getInboxLink: ->
      @elements.body.find(@inboxes.join ',').first() or null

    liveLeftMenuItem: ->
      return null unless @loaded
      el = @leftMenuItems.filter(".nZ").find("a")
      if el[0]
        el[0].title
      else
        null

    inboxTabHighlighted: ->
      @currentTabHighlighted() is "inbox" or @currentTabHighlighted() is "priority_inbox"

    currentTabHighlighted: ->
      inboxLink = @getInboxLink()
      if inboxLink and inboxLink.closest(".TO").hasClass("nZ")
        "inbox"
      else if @priorityInboxLink and @priorityInboxLink.closest(".TO").hasClass("nZ")
        "priority_inbox"
      else
        null

    
    # Return true if a yellow archive highlight actually means the user is archiving
    archiveableState: ->
      
      # For threads, this overrestricts:
      #   TODO: should detect if user is archiving an inbox item from a non-inbox view
      # For conversations, this underrestricts:
      #   TODO: should detect if the current email is in the inbox, and only assign points if it is
      (@inboxTabHighlighted() and @currentView() is @VIEW_THREADED) or (@currentView() isnt @VIEW_THREADED)

    mainListingEl: ->
      @elements.canvas.find(".nH.Cp").first()

    mainListingEmpty: ->
      if @mainListingEl().length > 0 and @currentView() is @VIEW_THREADED
        @mainListingEl().find("table tr").length is 0
      else
        null

    toolbarEl: ->
      @elements.canvas.find(".A1.D.E").first()

    toolbarCount: ->
      el = @toolbarEl().find(".Dj")
      if el[0]
        t = el[0].innerHTML
        m = /of <b>(\d+)<\/b>/.exec(t)
        if m?[1]? then parseInt m[1] else null
      else
        if @mainListingEmpty() then 0 else null

    toEmailProps: (postParams) ->
      inReplyTo:  (if postParams.rm is "undefined" then null else postParams.rm)
      body:       postParams.body ? null
      subject:    postParams.subject ? null
      bcc:        @toEmailArray postParams.bcc
      to:         @toEmailArray postParams.to
      from:       postParams.from
      isHTML:     postParams.ishtml is '1'
      cc:         @toEmailArray postParams.cc
      fromDraft:  (if postParams.draft is "undefined" then null else postParams.draft)

    # Adapted from http://notepad2.blogspot.com/2012/02/javascript-parse-string-of-email.html
    toEmailArray: (str) ->
      return [] if !str
      regex = /(?:"([^"]+)")? ?<?(.*?@[^>,]+)>?,? ?/g;
      while (m = regex.exec str)
          name:  m[1]
          email: m[2]

    detectXHREvents: (params) =>
      try
        urlParams = $.deparam params.url
        action = urlParams.act ? urlParams.view
        count = 1
        postParams = null
        if params.body.length > 0
          postParams = $.deparam params.body
          if postParams and postParams.t and !(postParams.t instanceof Array)
            postParams.t = [postParams.t]
            count = postParams.t.length
          
          # The user has cleared more than a pageful, so we don't know the exact count
          count = -1  if postParams["ba"]

        switch action

          # View thread
          when "ad"
            
            unless urlParams.th
              @notify @EVENT_REFRESH_INBOX
            else
              dbg "User views a thred"
              @notify @EVENT_VIEW_THREAD, urlParams.th

          # Archiving
          when "rc_^i"
            # only count if from inbox or query
            # TODO: could do better
            if urlParams.search in ["inbox", "query", "cat", "mbox"]
              if postParams
                  dbg "User archived emails."
                  @notify @EVENT_ARCHIVE, count, postParams.t
                #delete emailsArchived

          #Applying label
          when "arl"
            label = urlParams["acn"]
            @notify @EVENT_APPLY_LABEL, label, count, postParams.t

          # Deleting
          when "tr"
            dbg "User deleted #{count} emails."
            @notify @EVENT_DELETE, count, postParams.t

          # Composing
          when "sm"
            if @currentView() is @VIEW_CONVERSATION
              dbg "User replied to an email."
              @notify @EVENT_REPLY, @toEmailProps postParams
            else
              dbg "User composed an email."
              @notify @EVENT_COMPOSE, @toEmailProps postParams

          # Spam
          when "sp"
            dbg "User spammed #{count} emails."
            @notify @EVENT_SPAM, count, postParams.t

          # Discard draft
          when "dr"
            dbg "User discarded? a draft."
            @notify @EVENT_DRAFT_DISCARD

          # Save draft
          when "sd"
            dbg "User saved? a draft."
            @notify @EVENT_DRAFT_SAVE, @toEmailProps postParams

          # Mark unread
          when "ur"
            dbg "User marked messages as unread."
            @notify @EVENT_MARK_UNREAD, count, postParams.t

          # Mark read
          #when "rd"
          #  dbg "User marked messages as read."
          #  @notify @EVENT_MARK_READ, count, postParams.t

          # Star
          when "st"
            dbg "User starred messages."
            starType = switch postParams.sslbl
                          when "^ss_sy" then "standard"
                          else "unknown"
            @notify @EVENT_STAR, count, postParams.t, starType

          # Unstar
          when "xst"
            dbg "User unstarred messages."
            @notify @EVENT_UNSTAR, count, postParams.t

      catch e
        dbg "Error in detectXHREvents: " + e

      return

    detectDOMEvents: (e) =>
      # don't bubble
      e.stopPropagation()

      # dbg "DOM changed", e.target
      for ignored in @ignoreDOMElements
        # check all the ignored DOM elements
        if $.contains ignored, e.target
          # the target from where the change came is a descendant of an ignored element
          # dbg "...but the event came from a descendant of an ignored element"
          return false
      
      el = $ e.target

      # Left Menu Changes
      #var s = this.liveLeftMenuItem();
      #            if(this.currentLeftMenuItem != s) {
      #                this.currentLeftMenuItem = s;
      #                this.notify('tabChange', s);
      #            }

      newCount = @numUnread()
      if @currentNumUnread isnt newCount
          dbg "Unread count changed"
          @notify @EVENT_UNREAD_CHANGE, newCount, @currentNumUnread
          @currentNumUnread = newCount
         
      if @elements.canvas.find(".ha").length > 0
        unless @inConversationView
          @inConversationView = true
          @notify @EVENT_VIEW_CHANGED, @VIEW_CONVERSATION
      else
        if @inConversationView
          @inConversationView = false
          @notify @EVENT_VIEW_CHANGED, @VIEW_THREADED
      
      # Inbox count change
      if isDescendant @toolbarEl(), el
        toolbarCount = @toolbarCount()
        if @inboxTabHighlighted() and toolbarCount
          if (@currentInboxCount is null) or (toolbarCount isnt @currentInboxCount)
            @notify @EVENT_INBOX_COUNT_CHANGE, toolbarCount, @currentInboxCount  if @currentInboxCount isnt null
            @currentInboxCount = toolbarCount

  Gmailr = new Gmailr

  window.Gmailr = Gmailr
  return

) jQuery, window