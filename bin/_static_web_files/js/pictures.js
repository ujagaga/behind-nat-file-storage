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
        $('#preview img').attr('src', img.src);
    }catch{}    
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
   
    $('.thumb').click(function() {
        if(!$('#preview').length){
            $('.container').prepend('<div id="preview">'+
            '<p onclick="previewDown();" id="prev-btn-down"><i class="far fa-arrow-alt-circle-left"></i></p>' +
            '<p onclick="previewUp();" id="prev-btn-up"><i class="far fa-arrow-alt-circle-right"></i></p>' + 
            '<img src="#"/>' +            
            '</div>');
        }

        $('#preview img').attr('src', $(this).attr('src'));
        selected = $(this).closest('td').parent()[0].sectionRowIndex;
        $('.thumb').closest('td').removeClass("selected");
        $(this).closest('td').addClass("selected");
    });    
}

