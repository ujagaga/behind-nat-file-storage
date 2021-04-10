var items = [];

function count_selected(){
    var checkBoxes = document.getElementById("sharelist").getElementsByTagName("INPUT");
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
        $('#tool-bar').hide();
    }else{
        $('#tool-bar').show();        
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

            document.querySelector('#sharelist').onclick = function(ev) {
                if(ev.target.value) {
                    // Checkbox is clicked
                    count_selected();           
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

window.onload = function() {    
    $('#tool-bar').hide();
    $('#del-btn').show();

    load_items();    
}
