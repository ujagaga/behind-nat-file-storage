var items = [];

function get_selected(){
    var checkBoxes = document.getElementById("sharelist").getElementsByTagName("INPUT");
    items = [];
    //Loop through the CheckBoxes.
    for (var i = 0; i < checkBoxes.length; i++) {
        if (checkBoxes[i].checked) {
            var row = checkBoxes[i].parentNode.parentNode;       
            var data =  row.cells[1].innerHTML;
            try{
                var path = data.split('href="').pop().split('"')[0];           
                items.push(path);
            }catch(e){
                console.log("ERR: " + e);
            }            
        }
    }
    if(items.length == 0){
        $('#tool-bar').hide();
    }else{
        $('#tool-bar').show();        
    }   
}

function sortTableByName() {
    var table, rows, switching, i, x, y, shouldSwitch;
    table = document.getElementById("sharelist");
    switching = true;
    /*Make a loop that will continue until
    no switching has been done:*/
    while (switching) {
        //start by saying: no switching is done:
        switching = false;
        rows = table.rows;
        /*Loop through all table rows (except the
        first, which contains table headers):*/
        for (i = 1; i < (rows.length - 1); i++) {
            //start by saying there should be no switching:
            shouldSwitch = false;
            /*Get the two elements you want to compare,
            one from current row and one from the next:*/
            x = rows[i].getElementsByTagName("TD");        
            y = rows[i + 1].getElementsByTagName("TD");
            //check if the two rows should switch place:            
            if(!x[1].innerHTML.includes("fa-folder") && y[1].innerHTML.includes("fa-folder")){
                // x is a file and y is dir
                shouldSwitch = true;
                break;
            }else if(x[1].innerHTML.includes("fa-folder") && !y[1].innerHTML.includes("fa-folder")){
                // x is a dir and y is file. This should stay as is.
            }else{
                if((x[1].getElementsByTagName('a')[0].innerHTML.toLowerCase() > y[1].getElementsByTagName('a')[0].innerHTML.toLowerCase())){
                    shouldSwitch = true;
                    break;
                }
            }                   
        }
        if (shouldSwitch) {
            /*If a switch has been marked, make the switch
            and mark that a switch has been done:*/
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
        }
    }
}

// Prepend folder icons
function prepend_icons(){        
    var tbl_rows = document.getElementsByTagName("table")[0].rows;
    for (i = tbl_rows.length - 1; i >= 0; i--){
        try{        
            var cell = tbl_rows[i].cells[1];
            var path = cell.getElementsByTagName('a')[0].innerHTML;
            var type_icon = "";

            if(path.endsWith('/')){
                type_icon = "fa-folder";
                // remove slash
                cell.innerHTML = cell.innerHTML.replace("/", "");
            }else if(path.endsWith('.zip') || path.endsWith('.tar') || path.endsWith('.gz') || path.endsWith('.deb')){
                type_icon = "fa-file-archive"
            }

            cell.innerHTML = "<i class='far " + type_icon + " type-icon'></i>" + cell.innerHTML;
        }catch{}
    }
}

function load_items(){ 
    $.ajax({
        type: "GET",
        url: window.location.protocol + "//" + window.location.host + "/api/get_shared",
        data: {},
        cache: false,
        success: function (response) {
            var tbldata = "<tbody id=\"tb\">" + response + "</tbody>";
            $('#sharelist thead').after(tbldata);

            prepend_icons();   
            sortTableByName();
            document.querySelector('#sharelist').onclick = function(ev) {
                if(ev.target.value) {
                    // Checkbox is clicked
                    get_selected();
                }
            }
        },
        error: function () {
            console.log('Lost communication with the server!');
        }
    });
}

function delete_sel(){
    if(items.length > 0){
        document.cookie = "operation=DELETE;path=/";
        document.cookie = "items=" + JSON.stringify(items) + ";path=/";
        document.cookie = "source=/share/;path=/";
        document.cookie = "destination=/share/;path=/";
        
        $.ajax({
            type: "GET",
            url: window.location.protocol + "//" + window.location.host + "/api/op",
            data: {},
            cache: false,            
            success: function (response) {
                console.log(response);
                if(response.startsWith("OK")){
                    location.reload();
                }else{
                    popup_msg(response, false, true);
                }
            },
            error: function () {
                console.log('Lost communication with the server!');      
            }
        });
    }else{
        document.cookie = "operation=;path=/";
        document.cookie = "items=;path=/";
    }
}

function select_all(){    

    var checkBoxes = document.getElementById("sharelist").getElementsByTagName("INPUT");
    var do_select;

    if(checkBoxes.length == items.length){
        do_select = false;
        $('#tool-bar').hide();
    }else{
        do_select = true;
        $('#tool-bar').show();      
    }

    //Loop through the CheckBoxes.
    for (var i = 0; i < checkBoxes.length; i++) {
        checkBoxes[i].checked = do_select;  
    }

    get_selected();

    document.cookie = "operation=;path=/"; 
    document.cookie = "items=;path=/"; 
}

window.onload = function() {    
    $('#tool-bar').hide();
    $('#del-btn').show();

    load_items();    
}
