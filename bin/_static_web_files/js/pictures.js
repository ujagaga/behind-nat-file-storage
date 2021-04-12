var selected = 0;

function display_thumbnails(){    
    var tbl_rows = document.getElementsByTagName("table")[0].rows;
    for (i = tbl_rows.length - 1; i > 0; i--){
        var cell = tbl_rows[i].cells[1];
        var path = cell.getElementsByTagName('a')[0].innerHTML;
        
        if(path.endsWith(".jpg") || path.endsWith(".jpeg") || path.endsWith(".png") || path.endsWith(".gif")){
            cell.innerHTML = "<img class='thumb' src='" + path + "'>" + cell.innerHTML;
        }
    }
}

function setPreview(){   
    $('.selected').removeClass("selected");
    var tbl_rows = document.getElementsByTagName("table")[0].rows;
    var cell = tbl_rows[selected + 1].cells[1];
    cell.classList.add("selected");
    try{
        var img = cell.getElementsByTagName('img')[0];
        var preview = $('#preview img');
        preview.attr('src', img.src);                  
        $('#prev-blank').hide();
        preview.show();
    }catch{
        $('#preview img').hide();
        $('#prev-blank').show();
    }    
}


function previewUp(){
    selected--;
    if(selected < 0){
        selected = document.getElementsByTagName("table")[0].rows.length - 2;
    }
    setPreview();
}

function previewDown(){
    selected++;
    if(selected > (document.getElementsByTagName("table")[0].rows.length - 2)){
        selected = 0;
    }
    setPreview();
}


function process_pictures(){   
    $("#table-div").addClass("imgtable");

    display_thumbnails();

    // Add previous and next image preview buttons
    $('#tool-bar').append('<p id="prev-back-btn" title="Preview previous image" onclick="previewUp();">' +
                          '<i class="far fa-arrow-alt-circle-left fa-lg"></i></p>' +
                          '<p id="prev-fwd-btn" title="Preview next image" onclick="previewDown();">' +
                          '<i class="far fa-arrow-alt-circle-right fa-lg"></i></p>');
    
    $('#prev-back-btn').show();
    $('#prev-fwd-btn').show();

    // Add image preview placeholder
    if(!$('#preview').length){
        $('.container').prepend('<div id="preview">' +
                                '<img src="#"/>' +
                                '<p id="prev-blank"><i class="far fa-images"></i></p>' +
                                '</div>');            
    }
    $('#preview img').hide();
    $('#prev-blank').show();

    $('.thumb').click(function() {
        selected = $(this).closest('td').parent()[0].sectionRowIndex;
        setPreview();
    });    
}

