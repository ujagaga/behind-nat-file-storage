var user_field = document.getElementById('username');
var pass_field = document.getElementById('password');

function login(user, pass){
    var username = user_field.value;
    var password = pass_field.value;

    $.ajax({
        type: "GET",
        url: window.location.protocol + "//" + window.location.host + "/api/login",
        dataType: 'json',
        data: { },
        cache: true,
        headers: {
            "Authorization": "Basic " + btoa(username + ":" + password)
          },
        success: function (response) {
            try {
                if(response.result == "OK"){
                    var date = new Date();
                    date.setTime(date.getTime()+(1*24*60*60*1000));
                    document.cookie = "access_token=" + response.token + ";expires=" + date;
                    window.location.replace('/');  
                }else{
                    popup_msg('Error: User name or password not correct!', false, true);
                }                
            }
            catch (e) {
                console.log('Error parsing response.');
            }
        },
        error: function () {
            popup_msg('Error: Lost connection to server! Reloading...', true, true);
            setTimeout(function() { 
                window.location.replace('/'); 
            }, 2500);
        }
    });
}

function get_external_url(){
    $.ajax({
        type: "GET",
        url: window.location.protocol + "//" + window.location.host + "/api/status",
        dataType: 'json',
        data: {},
        cache: false,            
        success: function (response) {    
            var url = response.subdomain + ".loca.lt";
            var link = $("<a />", {
                href : url,
                text : url
            });
            var tips = "<div class='bottom-row'><hr><h2>Tips:</h2>" +
            "<p>External access url: <b><a href='https://" + url + "'>https://" + url + "</a></b></p>" +
            '<p>Upload from therminal: <b>curl "' + url + '/?name=&lt;file_name&gt;" -T &lt;path_to_file&gt;</b></p>' +
            '</div>';
            $('body').append(tips);  
            
        },
        error: function () {
            console.log('Lost communication with the server!');            
        }
    });
}

user_field.addEventListener("keyup", function(event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
      event.preventDefault();
      login();
    }
});

pass_field.addEventListener("keyup", function(event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
      event.preventDefault();
      login();
    }
});

window.addEventListener("keyup", function(event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
      event.preventDefault();
      login();
    }
});

window.onload = function() {
    get_external_url();
}
