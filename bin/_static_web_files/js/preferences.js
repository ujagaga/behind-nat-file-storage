var user_field = document.getElementById('username');
var new_pass_field = document.getElementById('new_pass');
var confirm_pass_field = document.getElementById('confirm_pass');
var req_login_field = document.getElementById('require_login');
var lcd_on_field = document.getElementById('screen_always_on');
var subdomain = document.getElementById('subdomain');

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function focus_field(target){
    user_field.style.border = "1px solid #dee2e6";
    new_pass_field.style.border = "1px solid #dee2e6";
    confirm_pass_field.style.border = "1px solid #dee2e6";

    target.focus();
    target.style.border = "thick solid #FF0000";
}


function save_prefs(user, pass){
    var user = user_field.value;
    var new_pass = new_pass_field.value;
    var confirm_pass = confirm_pass_field.value;
    var req_login = req_login_field.checked;
    var lcd_on = lcd_on_field.checked;

    if(user === ""){        
        focus_field(user_field);
        popup_msg("Please choose a user name.", false, true);
    }else if(new_pass === ""){        
        focus_field(new_pass_field);
        popup_msg("Please choose a new password.", false, true);
    }else if(confirm_pass === ""){        
        focus_field(confirm_pass_field);
        popup_msg("Please confirm password.", false, true);
    }else if(new_pass === confirm_pass){
        $.ajax({
            type: "GET",
            url: window.location.protocol + "//" + window.location.host + "/api/save_prefs",
            dataType: 'json',
            data: {      
                "username": user,    
                "newpass": new_pass,
                "reqlogin": req_login,
                "lcdalwayson": lcd_on,
                "subdomain": subdomain.value
            },
            cache: false,            
            success: function (response) {
                if(response.result == "0"){
                    popup_msg("Saved. Redirecting home...", true);
                    setTimeout(function() { 
                        window.location.replace('/'); 
                    }, 2500);                              
                }else{
                    popup_msg(response.msg, false, true);
                }                   
            },
            error: function () {
                popup_msg('Lost communication with the server! Redirecting home...', true);
                window.location.replace('/');  
            }
        });
    }else{
        popup_msg("Error: New password is not the same as confirmed password.", false, true);
    }    
}

function chk_update(){ 
    popup_busy("Checking for update. Please wait.");
    $.ajax({
        type: "GET",
        url: window.location.protocol + "//" + window.location.host + "/api/chk_update",
        data: {},
        cache: false,
        success: function (response) {
            close_busy();
            popup_msg(response, false, true);
        },
        error: function () {
            close_busy();
            console.log('Lost communication with the server!');
        }
    });
}

function restart(){     
    $.ajax({
        type: "GET",
        url: window.location.protocol + "//" + window.location.host + "/api/restart",
        data: {},
        cache: false,
        success: function (response) {
            popup_busy("Please wait while rebooting. You will be automatically redirected when the server is available.");
            window.setInterval(function() { 
                $.ajax({url: window.location.protocol + "//" + window.location.host,
                    type: "HEAD",
                    timeout:4000,
                    statusCode: {
                        200: function (response) {
                            window.location.replace('/'); 
                        },
                        400: function (response) {
                            console.log('Not working!');
                        },
                        0: function (response) {
                            console.log('Not working!');
                        }              
                    }
                });
            }, 5000); 
        },
        error: function () {
            console.log('Lost communication with the server!');
        }
    });
}

window.onload = function() {
    $.ajax({
        type: "GET",
        url: window.location.protocol + "//" + window.location.host + "/api/get_prefs",
        dataType: 'json',
        data: {},
        cache: false,            
        success: function (response) {     
            $('#username').val(response.admin_uname);
            $('#new_pass').val(response.admin_pass);
            $('#confirm_pass').val(response.admin_pass);
            $('#subdomain').val(response.subdomain);
            $('#require_login').prop('checked', response.require_local_pass);
            $('#screen_always_on').prop('checked', response.screen_always_on);
            if(!response.remote_user && !response.require_local_pass){
                // Local user and password not required. Hide login button.
                $('#logout-btn').hide();
            }else{
                $('#logout-btn').show();
            }
        },
        error: function () {
            console.log('Lost communication with the server!');            
        }
    });
}