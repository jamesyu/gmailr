/**
    This is the first script (along with lab.js) that is injected into the top frame of the
    Gmail DOM. 
    
    It loads the dependencies needed for Gmailr (via LAB), and then runs main.js, 
    which is the app code that uses Gmailr.
    
    If you want to get started writing an extension using Gmailr, edit main.js.
    
    If you want to add more files, or change how files are loaded, simply extend the load 
    paths after the LAB call to getData('gmailr_path'). 
 */

// Grabs the data that is injected using addData in bootstrap.js
var getData = function(id) {
    return document.getElementById(id + "_gmailr_data").getAttribute('data-val');
};

// Load all dependencies and run main.js
$LAB
.script(getData('jquery_path'))
.wait()
.script(getData('jquery_bbq_path'))
.wait()
.script(getData('gmailr_path'))
.wait()
.script(getData('main_path'));
