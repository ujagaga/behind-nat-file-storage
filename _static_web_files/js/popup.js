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
    $('.popup-rename').remove();
}

function close_rename_dialog(){
    $('.popup-rename').fadeOut();
    setTimeout(function() {
        $('.popup-rename').remove();
    }, 2000);
}

function popup_shared(message){
    var htmlmsg = '<div class="popup-shared"><div class="center-div">' +
    '<p class="close-icon" onclick="close_share_dialog();"><i class="fa fa-times-circle fa-lg"></i></p>' +
    '<h2>Folder shared via url</h2>' +
    '<p>has been copied to clipboard.</p>' +
    '<input type="text" id="shared-url"><br>' +
    '</div></div>';
    $('body').append(htmlmsg);
    var shared = $('#shared-url');
    shared.val(message);
    $('.popup-shared').fadeIn("slow");
    shared.focus();
    shared.select();
    document.execCommand('copy');
    shared.prop('disabled', true);
}

function close_share_dialog(){
    $('.popup-shared').fadeOut();
    setTimeout(function() {
        $('.popup-shared').remove();
    }, 2000);
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

function popup_busy(){  
    var htmlmsg = '<div class="popup-busy"><div class="lds-dual-ring"></div></div>';
    $('body').append(htmlmsg);
} 

function close_busy(){
    $('.popup-busy').remove();   
}