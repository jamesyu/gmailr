/**
    This is the example app using the Gmailr API.

    In this file, you have access to the Gmailr object.
 */

Gmailr.debug = true; // Turn verbose debugging messages on 

Gmailr.init(function(G) {
 
    G.insertTop($("<div id='gmailr'><span>Gmailr Status:</span> <span id='status'>Loaded.</span> </div>"));

    var status = function(msg) {
        G.$('#gmailr #status').html(msg);
    };

    G.observe('archive', function(num) {
        status('You archived ' + num + ' emails.');
    });

    G.observe('delete', function(c) {
        status('You deleted ' + c + ' emails.');
    });

    G.observe('spam', function(c) {
        status('You marked ' + c + ' emails as spam.');
    });

    G.observe('compose', function(details) {
        status('You composed an email.');
        console.log('details', details);
    });

    G.observe('reply', function(details) {
        status('You replied to an email.');
        console.log('details', details);
    });

    G.observe('read', function(emails) {
        status('You marked '+emails.length+' as read.');
        console.log('emails', emails);
    });

    G.observe('unread', function(emails) {
        status('You marked '+emails.length+' as unread.');
        console.log('emails', emails);
    });

    G.observe('draft', function(action, details) {
        switch(action) {
            case 'save':
                status('You saved a draft');
                break;
            case 'discard':
                status('You discarded a draft');
                break;
        }
        console.log('details', details);
    });

    G.observe('applyLabel', function(label,emails) {
       status("you applied label " + label + " to " + emails.length + " email(s)");
    });

    G.observe('numUnreadChange', function(newCount, oldCount) {
        status('The unread count changed from '+oldCount+' to '+newCount);
    });
    
});
