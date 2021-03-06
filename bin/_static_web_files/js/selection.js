var dir_path = unescape(document.getElementById("dirpath").value);
var items = [];

function get_selected(){
    var checkBoxes = document.getElementById("flist").getElementsByTagName("INPUT");
    items = [];
    //Loop through the CheckBoxes.
    for (var i = 0; i < checkBoxes.length; i++) {
        if (checkBoxes[i].checked) {
            var row = checkBoxes[i].parentNode.parentNode;       
            var data =  row.cells[1].innerHTML;
            try{
                var path = data.split('href="').pop().split('">')[1].split('</a')[0];
                items.push(path);
            }catch(e){
                console.log("ERR: " + e);
            }            
        }
    }

    if(items.length == 0){
        // Nothing selected. Disable cut, copy, archive, rename, delete, share
        $('#archive-btn').hide();
        $('#del-btn').hide();
        $('#rename-btn').hide();
        $('#copy-btn').hide();
        $('#cut-btn').hide();
        $('#share-btn').hide();
    }else{
        $('#archive-btn').show();
        $('#copy-btn').show();
        $('#cut-btn').show();
        $('#del-btn').show();

        // Show/hide share button
        if(items.length == 1){
            // Only one folder or file selected. Enable sharing and renaming.
            $('#share-btn').show();
            $('#rename-btn').show();
        }else{
            // Sharing or renaming of multiple items not supported.
            $('#share-btn').hide();
            $('#rename-btn').hide();
        }
    }
}

function count_selected(){
    document.cookie = "operation=;path=/"; 
    document.cookie = "items=;path=/"; 
    $('#paste-btn').hide();
    get_selected();  
    blure_none();  
}

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

function blure_selected_items(){   
    try{ 
        var items_cookie = JSON.parse(getCookie("items"));
    }catch(err){
        var items_cookie = items;
    }

    var checkBoxes = document.getElementById("flist").getElementsByTagName("INPUT");
    for (var i = 0; i < checkBoxes.length; i++) {
        
        var row = checkBoxes[i].parentNode.parentNode;       
        var data =  row.cells[1].innerHTML;
        try{
            var path = data.split('href="').pop().split('">')[1].split('</a')[0];
            if(items_cookie.indexOf(path) >= 0){
                row.style.opacity = '0.3';
            }else{
                row.style.opacity = '1';
            }
        }catch(e){
            console.log("ERR: " + e);
        }
    }    
}

function blure_none(){
    var checkBoxes = document.getElementById("flist").getElementsByTagName("INPUT");
    for (var i = 0; i < checkBoxes.length; i++) {        
        var row = checkBoxes[i].parentNode.parentNode;       
        row.style.opacity = '1';       
    }
}

function chk_cookie(){
    
    var items_cookie = getCookie("items");

    if(items_cookie.length > 2){
        var operation_cookie = getCookie("operation");

        $('#copy-btn').hide();
        $('#cut-btn').hide();
        $('#archive-btn').hide();
        $('#share-btn').hide(); 
        $('#del-btn').hide();
        $('#rename-btn').hide();

        if(operation_cookie.includes("COPY")){            
            $('#paste-btn').show();
            blure_none();
            
        }else if(operation_cookie.includes("CUT")){
            var source_cookie = getCookie("source");
            if(source_cookie == dir_path){
                $('#paste-btn').hide();
                // Check which item is to be cut and adjust opacity
                blure_selected_items();
            }else{
                $('#paste-btn').show();
                blure_none();
            }               
        }
    }
}

function copy_sel(){
    blure_none();
    get_selected();    

    if(items.length > 0){        
        // operation = "COPY" 
        document.cookie = "operation=COPY;path=/";
        document.cookie = "items=" + JSON.stringify(items) + ";path=/";
        document.cookie = "source=" + dir_path + ";path=/";

        $('#paste-btn').show();
        blure_none();
    }else{
        document.cookie = "operation=;path=/"; 
        document.cookie = "items=;path=/"; 
    }
}

function cut_sel(){
    get_selected();    
    $('#paste-btn').hide();
    blure_selected_items();

    if(items.length > 0){
        document.cookie = "operation=CUT;path=/";
        document.cookie = "items=" + JSON.stringify(items) + ";path=/";     
        document.cookie = "source=" + dir_path + ";path=/"; 
    }else{
        document.cookie = "operation=;path=/"; 
        document.cookie = "items=;path=/"; 
    }
}

function archive_sel(){
    blure_none();
    get_selected();    
    
    if(items.length > 0){
        document.cookie = "operation=ARCHIVE;path=/";
        document.cookie = "items=" + JSON.stringify(items) + ";path=/";
        document.cookie = "source=" + dir_path + ";path=/";
        document.cookie = "destination=" + dir_path + ";path=/";
        execute_op();
    }else{
        document.cookie = "operation=;path=/";
        document.cookie = "items=;path=/";
    }
}

function share_sel(){
    blure_none();
    get_selected();

    if(items.length == 1){
        document.cookie = "operation=SHARE;path=/";
        document.cookie = "items=" + JSON.stringify(items) + ";path=/";
        document.cookie = "source=" + dir_path + ";path=/";
        document.cookie = "destination=" + dir_path + ";path=/";
        execute_op();
    }else{
        document.cookie = "operation=;path=/";
        document.cookie = "items=;path=/";
    }
}

function delete_sel(){
    blure_none();
    get_selected();

    if(items.length > 0){
        document.cookie = "operation=DELETE;path=/";
        document.cookie = "items=" + JSON.stringify(items) + ";path=/";
        document.cookie = "source=" + dir_path + ";path=/";
        document.cookie = "destination=" + dir_path + ";path=/";
        execute_op();
    }else{
        document.cookie = "operation=;path=/";
        document.cookie = "items=;path=/";
    }
}

function newdir(){
    document.cookie = "operation=NEWDIR;path=/";
    document.cookie = "source=" + dir_path + ";path=/";
    document.cookie = "destination=" + dir_path + ";path=/";
    popup_newdir("Select folder name", "new_dir");
}

function create_new_dir(){
    var newname = $("#newname").val();
    remove_rename();
    if(newname.length > 2){
        items = [newname];
        document.cookie = "items=" + JSON.stringify(items) + ";path=/";      
        execute_op();
    }else{
        popup_newdir("Folder name must be longer than 2 characters.", newname);
    }
}

function rename_sel(){
    blure_none();
    get_selected();

    if(items.length > 0){
        document.cookie = "operation=RENAME;path=/";
        document.cookie = "items=" + JSON.stringify(items) + ";path=/";
        document.cookie = "source=" + dir_path + ";path=/";
        document.cookie = "destination=" + dir_path + ";path=/";
        popup_rename("Select new name", items[0]);
    }else{
        document.cookie = "operation=;path=/";
        document.cookie = "items=;path=/";
    }
}

function do_rename(){
    var newname = $("#newname").val();
    remove_rename();
    if(newname.length > 2){
        document.cookie = "destination=" + newname + ";path=/";        
        execute_op();
    }else{
        popup_rename("New name must be longer than 2 characters.", newname);
    }
}

function paste_sel(){
    document.cookie = "destination=" + dir_path + ";path=/";
    execute_op();
}

function select_all(){
    $('#share-btn').hide();
    $('#paste-btn').hide();
    $('#rename-btn').hide();    

    var checkBoxes = document.getElementById("flist").getElementsByTagName("INPUT");
    var do_select;

    if(checkBoxes.length == items.length){
        do_select = false;
        $('#archive-btn').hide();  
        $('#copy-btn').hide();
        $('#cut-btn').hide();      
    }else{
        do_select = true;
        $('#archive-btn').show();
        $('#copy-btn').show();
        $('#cut-btn').show();
    }

    //Loop through the CheckBoxes.
    for (var i = 0; i < checkBoxes.length; i++) {
        checkBoxes[i].checked = do_select;  
    }

    get_selected();

    document.cookie = "operation=;path=/"; 
    document.cookie = "items=;path=/"; 
}

function select_none(){
    $('#share-btn').hide();
    $('#paste-btn').hide();
    $('#archive-btn').hide();

    var checkBoxes = document.getElementById("flist").getElementsByTagName("INPUT");

    //Loop through the CheckBoxes.
    for (var i = 0; i < checkBoxes.length; i++) {
        checkBoxes[i].checked = false;  
    }

    document.cookie = "operation=;path=/"; 
    document.cookie = "items=;path=/"; 

    get_selected();
}

function execute_op(){
    popup_busy();
    $.ajax({
        type: "GET",
        url: window.location.protocol + "//" + window.location.host + "/api/op",
        data: {},
        cache: false,            
        success: function (response) {
            console.log(response);
            close_busy();
            if(response.startsWith("OK")){
                location.reload();
            }else if(response.startsWith("SHARE")){
                select_none();
                popup_shared(response.split(" ")[1]);
            }else{
                popup_msg(response, false, true);
            }
        },
        error: function () {
            console.log('Lost communication with the server!');      
            close_busy();      
        }
    });
}