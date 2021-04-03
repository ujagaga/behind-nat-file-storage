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