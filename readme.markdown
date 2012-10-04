Gmailr: A Gmail Javascript API
==============================

Gmailr is a javascript library that lets you interact and get data from the Gmail interface. It is meant to be injected into the Gmail DOM directly, usually through a browser plugin.

Note: this is not an official Gmail API, and is not affiliated with Google. [Read more about the origins of this API here](http://www.jamesyu.org/2011/02/05/introducing-gmailr-an-unofficial-javscript-api-for-gmail/).

Getting Started
===============

The library is packaged here as a Chrome extension that presents some status information that is accessed through the Gmailr library.

To install the extension, clone the repo and:

1. Open Chrome and go to chrome://extensions
2. If the Developer Mode toggle is set to "-", click it to go into Developer Mode.
3. Click "Load unpacked extension..."
4. Choose the `chrome` directory in this repo.
5. Enable the newly added extension.
6. Head to your Gmail account, and you should now see a blue Gmailr bar above the top bar.

Try archiving or deleting an email, and you'll see the status bar display the action.

Creating Your Own Extension
===========================

To create your own extension using Gmailr, simply change main.js to implement your functionality.

Extension Architecture
----------------------

You'll notice that the extension does a lot of roundabout loading of the js files. Basically, Gmailr needs to be injected directly into the Gmail DOM, because otherwise, it is in a sandbox environment that is outside the Gmail javascript environment.

Thus, we have to manually inject the scripts into the head of the Gmail DOM.

`bootstrap.js` is first loaded like a normal content script, and it injects `lab.js` and `init.js`. Then, `init.js` loads the rest of the js files using LAB, and finally `main.js` is loaded with access to the Gmailr API.

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

* 'archive'         - callback(count)
* 'numUnreadChange' - callback(currentVal, previousVal)
* 'delete'          - callback(count)
* 'spam'            - callback(count)
* 'compose'         - no args
* 'viewChanged'     - no args

Currently, you won't get any information about the contents of the email messages.

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
* Ability to get more information about emails that are archived, composed, etc.