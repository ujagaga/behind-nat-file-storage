var ro_flag;
var showHidden = 'n';

// Split path and set links for navigation
function split_path(){    
    var dpt = document.getElementById('dirpath').value;
    var chunks = dpt.split("/");

    var data = "";
    var link = "/";
    for (i = 0; i < chunks.length; i++){
        if(chunks[i].length > 0){
            link += chunks[i] + "/";
            data += "/<a class='path-part' href='" + link + "'><strong>" + unescape(chunks[i]) + "</strong></a>";
        }        
    }
    document.getElementById('path').innerHTML = data;
}

// Prepend folder icons
function prepend_icons(){    
    var tbl_rows = document.getElementsByTagName("table")[0].rows;
    for (i = tbl_rows.length - 1; i > 0; i--){
        var path_type = tbl_rows[i].cells[3];
        if(path_type){
            var data = tbl_rows[i].cells[1];
            var ext = "";
            try{
                ext = data.innerHTML.split('.').pop().split('<')[0];
            }catch(e){}

            var hidden = data.innerHTML.split('>')[1].startsWith('.');
            if(hidden && (showHidden == 'n')){
                document.getElementsByTagName("table")[0].deleteRow(i);
            }else{
                var type_icon = ""; 
                if(path_type.innerHTML.includes("[DIR]")){ 
                    type_icon = "fa-folder";

                    // Remove slash from folder names
                    var name = data.getElementsByTagName('a')[0];
                    name.innerHTML = name.innerHTML.replace('/', '');
                    if(name.innerHTML == "share"){                    
                        document.getElementsByTagName("table")[0].deleteRow(i);
                    }
                }else if(ext === "zip" || ext === "rar" || ext === "tar" || ext === "gz" || ext === "deb"){
                    type_icon = "fa-file-archive"
                } 
                
                data.innerHTML = "<i class='far " + type_icon + " type-icon'></i>" + data.innerHTML;
            }
        }   
    }
}

function browseForFile(){
    $('#uploadf').click();
}

function show_hidden(){
    if(showHidden === 'y'){
        document.cookie = "showhidden=n;path=/";
    }else{
        document.cookie = "showhidden=y;path=/";
    }
    location.reload();
}

// Send a large blob of data chunk by chunk
var sendFileData = function(name, data, chunkSize) {
    var sendChunk = function(offset) {
        var chunk = data.subarray(offset, offset + chunkSize) || '';
        var opts = {method: 'POST', body: chunk};
        var url = '/chunkupload?destination=' + $('#dirpath').val() + '&offset=' + offset + '&name=' + encodeURIComponent(name);

        var percent = Math.round((offset * 100)/data.length);
        update_progress(percent);
        fetch(url, opts).then(function(res) {
            if (chunk.length > 0) sendChunk(offset + chunk.length);
        });
    };
    sendChunk(0);
  };

function resolve(){ 
    var url_parts = window.location.pathname.split("/");
    if(url_parts[0] === ""){
        url_parts.shift();
    }
    if(url_parts[0] == "share"){
        var path = "/share/" + url_parts[1];

        $.ajax({
            type: "GET",
            url: window.location.protocol + "//" + window.location.host + "/api/resolve",
            data: {
                "path": path,
                "dummy":"end"
            },
            success: function (response) {
                if(response.startsWith("/Pictures")){
                    process_pictures();
                }
            },
            error: function () {
                console.log('Lost communication with the server!');
            }
        });
    }
}

window.onload = function() {
    split_path();

    showHidden = getCookie("showhidden");
    if(showHidden === 'y'){
        $('#hidden-show-btn').hide();
        $('#hidden-hide-btn').show();
    }else{
        showHidden = 'n'
        $('#hidden-hide-btn').hide();
        $('#hidden-show-btn').show();        
    }

    ro_flag = $('#ro_flag').val();

    $('#upload-btn').show();
    $('#newdir-btn').show();
    if(ro_flag[0] === 'L'){
        // Local user.
        $('#tool-bar').show();
        $('#preferences-btn').show();
        $('#shared-btn').show();
        if(ro_flag[2] === 'Y'){
            // Password is required. Aparently logged in since here. Show logout.
            $('#logout-btn').show();
        }else{
            // Password not required, so no logout button.
            $('#logout-btn').hide();
        }
    }else{
        // Remote user. 
        if(ro_flag[1] === 'A'){
            // Logged in. Show preferences and logout.
            $('#preferences-btn').show();
            $('#shared-btn').show();
            $('#logout-btn').show();
            $('#tool-bar').show();
            
        }else{
            // Not logged in. read only access. Hide preferences and logout.            
            $('#preferences-btn').hide();
            $('#shared-btn').hide();
            $('#logout-btn').hide();
            $('#tool-bar').hide();

            // Hide checkboxes since no operations are allowed
            $('tr td:nth-child(1)').hide();
            $('tr th:nth-child(1)').hide();
        }        
    }    
    
    prepend_icons();
    
    sortTableByName();

    document.querySelector('#flist').onclick = function(ev) {
        if(ev.target.value) {
            // Checkbox is clicked
            count_selected();           
        }
    }

    chk_cookie(); 

    // If user selected a file, read it into memory and trigger sendFileData()
    var input = document.getElementById('uploadf');
    input.onchange = function(ev) {
        if (!ev.target.files[0]) return; 
        var f = ev.target.files[0], r = new FileReader();
        popup_progress("Uploading: " + f.name);

        r.readAsArrayBuffer(f);
        r.onload = function() {
            ev.target.value = '';
            sendFileData(f.name, new Uint8Array(r.result), 4096);
        };
    };

    if($('#dirpath').val().startsWith("/Pictures/")){        
        process_pictures();
    }else{
        resolve();
    }

}
