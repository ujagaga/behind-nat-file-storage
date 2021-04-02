var ro_flag;

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
function prepend_icon_and_chkbox(){    
    var tbl_rows = document.getElementsByTagName("table")[0].rows;
    for (i = tbl_rows.length - 1; i >= 0; i--){
        var toBeRemoved = false;
        var path_type = tbl_rows[i].cells[2];
        if(path_type){
            var data = tbl_rows[i].cells[0];
            var ext = "";
            try{
                ext = data.innerHTML.split('.').pop().split('<')[0];
            }catch(e){}
            
            if(path_type.innerHTML.includes("[DIR]")){ 
                data.innerHTML = "<i class='far fa-folder path-icon'></i>" + data.innerHTML;

                // Remove slash from folder names
                var name = data.getElementsByTagName('a')[0];
                name.innerHTML = name.innerHTML.replace('/', '');
                if(name.innerHTML == "share"){
                    toBeRemoved = true;
                    document.getElementsByTagName("table")[0].deleteRow(i);
                }
            }else if(ext === "zip" || ext === "rar" || ext === "tar" || ext === "gz" || ext === "deb"){
                data.innerHTML = "<i class='far fa-file-archive path-icon'></i>" + data.innerHTML;
            }

            
        }    
        
        if(!toBeRemoved){           
            var selCell = tbl_rows[i].insertCell(0);
            if((ro_flag[1] === 'A') || ((ro_flag[2] === 'N') && (ro_flag[0] === 'L'))){
                if(i == 0){
                    selCell.innerHTML = '<i id="select-all-btn" title="Select/de-select all." onclick="select_all();" class="fa fa-check-square fa-lg"></i>'
                }else if(i > 0){
                    var checkbox = document.createElement("INPUT");
                    checkbox.type = "checkbox";
                    selCell.appendChild(checkbox);
                }
            }
        }
    }
}

function browseForFile(){
    $('#uploadf').click();
}

// Send a large blob of data chunk by chunk
var sendFileData = function(name, data, chunkSize) {
    var sendChunk = function(offset) {
        var chunk = data.subarray(offset, offset + chunkSize) || '';
        var opts = {method: 'POST', body: chunk};
        var url = '/upload?destination=' + $('#dirpath').val() + '&offset=' + offset + '&name=' + encodeURIComponent(name);

        var percent = Math.round((offset * 100)/data.length);
        update_progress(percent);
        fetch(url, opts).then(function(res) {
            if (chunk.length > 0) sendChunk(offset + chunk.length);
        });
    };
    sendChunk(0);
  };

window.onload = function() {
    split_path();

    ro_flag = $('#ro_flag').val();

    $('#upload-btn').show();
    if(ro_flag[0] === 'L'){
        // Local user.
        $('#tool-bar').show();
        $('#preferences-btn').show();
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
            $('#logout-btn').show();
            $('#tool-bar').show();
            
        }else{
            // Not logged in. read only access. Hide preferences and logout.            
            $('#preferences-btn').hide();
            $('#logout-btn').hide();
            $('#tool-bar').hide();
        }        
    }    
    
    prepend_icon_and_chkbox();
    
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
}
