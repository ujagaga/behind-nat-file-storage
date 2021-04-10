function popup_msg(message, busy, autohide){   
    var htmlmsg = '<div class="popup-msg"><h2>' + message + '<h2><div id="busy-bar"></div></div>';
    $('body').append(htmlmsg); 
    $('.popup-msg').fadeIn("slow");
    if(busy){
        $('#busy-bar').show();
    }else{
        $('#busy-bar').hide();
    }    

    if(autohide){
        setTimeout(function() { 
            $('.popup-msg').fadeOut();
            setTimeout(function() {
                $('.popup-msg').remove();
            }, 2000);
        }, 4000);  
    }
}

function popup_newdir(message, old_name){
    var htmlmsg = '<div class="popup-rename"><div class="center-div">' + '<h2 id="rename_title">' + message + '</h2>' +
    '<input type="text" id="newname" value="' + old_name + '"><br>' +
    '<button onclick="remove_rename();">Cancel</button>' +
    '<button onclick="create_new_dir();">Create</button>' +
    '</div></div>';
    $('body').append(htmlmsg);
    $('.popup-rename').fadeIn("slow");
}

function popup_rename(message, old_name){
    var htmlmsg = '<div class="popup-rename"><div class="center-div">' + '<h2>' + message + '</h2>' +
    '<input type="text" id="newname" value="' + old_name + '"><br>' +
    '<button onclick="remove_rename();">Cancel</button>' +
    '<button onclick="do_rename();">Rename</button>' +
    '</div></div>';
    $('body').append(htmlmsg);
    $('.popup-rename').fadeIn("slow");
}

function remove_rename(){
    var elements = document.getElementsByClassName('popup-rename');

    while(elements[0]) {
        elements[0].parentNode.removeChild(elements[0]);
    }
}

function close_rename_dialog(){
    $('.popup-rename').fadeOut();
    setTimeout(function() {
        remove_rename();
    }, 2000);
}

function popup_shared(message){
    var htmlmsg = '<div class="popup-shared">' +
    '<h2>Share url copied to clipboard.</h2>' +
    '<input type="text" id="shared-url" value="' + message + '">' +
    '</div>';
    $('body').append(htmlmsg);    
    $('.popup-shared').fadeIn("slow");
    var shared = $('#shared-url');
    shared.focus();    
    shared.select();
    document.execCommand('copy');
    shared.prop('disabled', true);

    setTimeout(function() { 
        $('.popup-shared').fadeOut();
        setTimeout(function() {
            $('.popup-shared').remove();
        }, 2000);
    }, 4000);  
}

function popup_description(event, message){
    var htmlmsg = '<div class="popup-desc" onclick="close_description();"><p>' + message + '</p></div>';    
    $('body').append(htmlmsg);
    $('.popup-desc').css('left', event.pageX); 
    $('.popup-desc').css('top',event.pageY);
} 

function close_description(){
    $('.popup-desc').remove();   
}

function popup_progress(message){  
    var htmlmsg = '<div class="popup-progress"><div class="center-div"><p>' + message + '</p>' + 
    '<progress id="file-progress" value="0" max="100">0</progress>' +
    '<button onclick="location.reload();">Cancel</button>' +
    '</div></div>';
    $('body').append(htmlmsg);
} 

function update_progress(percent){  
    $('#file-progress').val(percent);
    if(percent > 99){
        setTimeout(function() {
            $('.popup-progress').remove();
            location.reload();
        }, 500);
    }
} 

function popup_busy(msg){  
    var htmlmsg = '<div class="popup-busy"><p>';
    if(msg){
        htmlmsg += msg;
    }else{
        htmlmsg += 'Please wait';
    }
    htmlmsg += '</p><div class="loader"></div></div>';
    $('body').append(htmlmsg);
} 

function close_busy(){
    $('.popup-busy').remove();   
}