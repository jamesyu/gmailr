/**
    This is the example app using the Gmailr API.
    In this file, you have access to the Gmailr object.
 */

Gmailr.debug = true; // Turn verbose debugging messages on

Gmailr.init(function(G) {

    G.insertTop($("<div id='gmailr'><span>Gmailr Status:</span> <span id='status'></span> </div>"));

    var status = function(msg) {
                    G.$('#gmailr #status').html(msg);
                 };

    G.observe(Gmailr.EVENT_LOADED, function() {
        status('Loaded.');
    });

    G.observe(Gmailr.EVENT_ARCHIVE, function(c, emails) {
        status('You archived ' + c + ' emails.');
        console.log('emails', emails);
    });

    G.observe(Gmailr.EVENT_DELETE, function(c, emails) {
        status('You deleted ' + c + ' emails.');
        console.log('emails', emails);
    });

    G.observe(Gmailr.EVENT_SPAM, function(c, emails) {
        status('You marked ' + c + ' emails as spam.');
        console.log('emails', emails);
    });

    G.observe(Gmailr.EVENT_COMPOSE, function(details) {
        status('You composed an email.');
        console.log('details', details);
    });

    G.observe(Gmailr.EVENT_REPLY, function(details) {
        status('You replied to an email.');
        console.log('details', details);
    });

    G.observe(Gmailr.EVENT_MARK_UNREAD, function(c, emails) {
        status('You marked ' + c + ' email as unread.');
        console.log('emails', emails);
    });

    G.observe(Gmailr.EVENT_STAR, function(c, emails) {
        status('You starred ' + c + ' emails.');
        console.log('emails', emails);
    });

    G.observe(Gmailr.EVENT_UNSTAR, function(c, emails) {
        status('You unstarred ' + c + ' emails.');
        console.log('emails', emails);
    });

    G.observe(Gmailr.EVENT_DRAFT_DISCARD, function() {
        status('You discarded a draft');
    });

    G.observe(Gmailr.EVENT_DRAFT_SAVE, function(details) {
        status('You saved a draft');
        console.log('details', details);
    });

    G.observe(Gmailr.EVENT_APPLY_LABEL, function(label, c, emails) {
        status("you applied label " + label + " to " + c + " email(s)");
        console.log('emails', emails);
    });

    G.observe(Gmailr.EVENT_UNREAD_CHANGE, function(newCount, oldCount) {
        status('The unread count changed from ' + oldCount + ' to ' + newCount);
    });

    G.observe(Gmailr.EVENT_VIEW_THREAD, function(threadId) {
        status('Switched to thread with ID '+ threadId);
    });

    G.observe(Gmailr.EVENT_REFRESH_INBOX, function() {
        status('Inbox refreshed');
    });

});