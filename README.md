Gmailr: A Gmail Javascript API
==============================

Gmailr is a javascript library that lets you interact and get data from the Gmail interface. It is meant to be injected into the Gmail DOM directly, usually through a browser plugin.

Note: this is not an official Gmail API, and is not affiliated with Google. [Read more about the origins of this API here](http://www.jamesyu.org/2011/02/05/introducing-gmailr-an-unofficial-javscript-api-for-gmail/).

Getting Started
===============

The library is packaged here as a Chrome extension that presents some status information that is accessed through the Gmailr library.

To install the extension, clone the repo and:


- Get an install CoffeeScript for your system
- Run cake build in the root directory to generate JavaScript files from the CoffeeScript source
- Open Chrome and go to chrome://extensions
- If the Developer Mode toggle is set to "-", click it to go into Developer Mode.
- Click "Load unpacked extension..."
- Choose the `chrome` directory in this repo.
- Enable the newly added extension.
- Head to your Gmail account, and you should now see a blue Gmailr bar above the top bar.

Try archiving or deleting an email, and you'll see the status bar display the action.

Creating Your Own Extension
===========================

To create your own extension using Gmailr, simply change main.js to implement your functionality.
You can add more resources to load in init.coffee - simply add files to the array - if they are local files coming from the extension, you need to make them web-accessible in the `manifest.json`

Extension Architecture
----------------------

You'll notice that the extension does a lot of roundabout loading of the js files. Basically, Gmailr needs to be injected directly into the Gmail DOM, because otherwise, it is in a sandbox environment that is outside the Gmail javascript environment.

Thus, we have to manually inject the scripts into the head of the Gmail DOM.

`bootstrap.js` is first loaded like a normal content script, and it loads all other files needed for Gmailr.
Finally `main.js` is loaded with access to the Gmailr API.

Development Notes
-----------------

Gmailr is used in the core of [0Boxer](http://www.0boxer.com), a game extension for Gmail, and has been tested in Firefox, Chrome, and Safari. That being said, Gmailr is very young and incomplete. My hope is that other people will extend, add functionality, and make Gmailr more stable.

Usage
=====

Everything should be wrapped in a call to init, like so:

    Gmailr.init(function(G) {
        // access Gmailr methods through passed in G
    });
    
This bootstraps the Gmailr javascript API on top of Gmail, taking care of all the hairy loading issues.

You can now use the core Gmailr methods and attributes:

    G.elements.canvas
    G.elements.body
    
The elements hash holds some interesting elements inside Gmail. Currently, there are only two: the canvas (which is the iframe that holds the Gmail UI) and the body inside the canvas.

    G.observe(type, callback)

This method will observe to various actions that the user does in Gmail, and will call a callback based on those actions. The available types are (with the callback arguments):

* `EVENT_LOADED`:
* `EVENT_VIEW_THREAD`: threadId
* `EVENT_ARCHIVE`: count, [messageId,  ...]
* `EVENT_APPLY_LABEL`: label, count, [messageId,  ...]
* `EVENT_DELETE`: count, [messageId,  ...]
* `EVENT_COMPOSE`: emailProperties
* `EVENT_REPLY`: emailProperties
* `EVENT_SPAM`: count, [messageId,  ...]
* `EVENT_DRAFT_DISCARD`: 
* `EVENT_DRAFT_SAVE`: emailProperties
* `EVENT_MARK_UNREAD`: count, [messageId,  ...]

* `EVENT_MARK_READ`: count, [messageId,  ...]* `EVENT_STAR`: count, [messageId,  ...]
* `EVENT_UNSTAR`: count, [messageId,  ...]
* `EVENT_UNREAD_CHANGE`: current, previous
* `EVENT_INBOX_COUNT_CHANGE`: current, previous
* `EVENT_REFRESH_INBOX`: 
* `EVENT_VIEW_CHANGED`: type (either `VIEW_THREADED` or `VIEW_CONVERSATION`)
* `EVENT_ANY`: type, arguments - this meta event gets fired on any of the events above with `type` being one of `Gmailr.EVENT_*` and the second argument an array of parameters

If `count` is `-1` that means the user made a bulk event which affects more than only the visible emails on the current page.

Contents of the `emailProperties` object are:

* `inReplyTo`: (message id of the email that this is in reply to, or `null` if not in reply to anything)
* `body`: String (or `null` if not defined)
* `subject`: String (or `null` if not defined)
* `bcc`: Array
* `to`: Array
* `from`: String (the email address you are sending from)
* `isHTML`: (boolean)
* `cc`: Array
* `fromDraft`: (message id of the draft or `null` if there was no draft)

`to`, `cc` and `bcc` are Arrays of name, email tuple objects, e.g. `{name: 'Name', email: 'email@email.email' }`

---


    G.insertTop(el)
    
Inserts a DOM element on the top of Gmail's interface.

    G.$(selector)
    
Provides a jQuery selector so you can select elements in the Gmail interface.

    G.numUnread()
    
Number of unread emails.

    G.emailAddress()

The email address of the current Gmail user.

    G.currentView()
    
Returns whether the current view is a threaded or conversation view.


TODOs
=====

There are much more TODOs than I have time for :) 

* More stability and accuracy for various events.
* Ability to add DOM elements in various places in Gmail, like the sidebar, etc.