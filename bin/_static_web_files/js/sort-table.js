var nameAscending = false;
var modifiedAscending = false;
var sizeAscending = false;

function sortTableByName() {
    nameAscending = !nameAscending;

    var table, rows, switching, i, x, y, shouldSwitch;
    table = document.getElementById("flist");
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
            if(nameAscending){
                if(!x[3].innerHTML.includes("DIR") && y[3].innerHTML.includes("DIR")){
                    // x is a file and y is dir
                    shouldSwitch = true;
                    break;
                }else if(x[3].innerHTML.includes("DIR") && !y[3].innerHTML.includes("DIR")){
                    // x is a dir and y is file. This should stay as is.
                }else{
                    if((x[1].getElementsByTagName('a')[0].innerHTML.toLowerCase() > y[1].getElementsByTagName('a')[0].innerHTML.toLowerCase())){
                        shouldSwitch = true;
                        break;
                    }
                }  
            }else{
                if(x[3].innerHTML.includes("DIR") && !y[3].innerHTML.includes("DIR")){
                    // x is a file and y is dir
                    shouldSwitch = true;
                    break;
                }else if(!x[3].innerHTML.includes("DIR") && y[3].innerHTML.includes("DIR")){
                    // x is a dir and y is file. This should stay as is.
                }else{
                    if((x[1].getElementsByTagName('a')[0].innerHTML.toLowerCase() < y[1].getElementsByTagName('a')[0].innerHTML.toLowerCase())){
                        shouldSwitch = true;
                        break;
                    }
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

function sortTableByFileSize() {
    sizeAscending = !sizeAscending;

    var table, rows, switching, i, x, y, shouldSwitch;
    table = document.getElementById("flist");
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
            if(sizeAscending){
                if(!x[3].innerHTML.includes("DIR") && y[3].innerHTML.includes("DIR")){
                    // x is a file and y is dir
                    shouldSwitch = true;
                    break;
                }else if(x[3].innerHTML.includes("DIR") && y[3].innerHTML.includes("DIR")){
                    // Both rows contain dirs. Sort by name.
                    if((x[1].getElementsByTagName('a')[0].innerHTML.toLowerCase() > y[1].getElementsByTagName('a')[0].innerHTML.toLowerCase())){
                        shouldSwitch = true;
                        break;
                    }
                }else if(!x[3].innerHTML.includes("DIR") && !y[3].innerHTML.includes("DIR")){
                    // Both rows contain files. Compare file sizes.
                    if(x[3].innerHTML < y[3].innerHTML){
                        shouldSwitch = true;
                        break;
                    }
                }
            }else{
                if(!x[3].innerHTML.includes("DIR") && y[3].innerHTML.includes("DIR")){
                    // x is a file and y is dir
                    shouldSwitch = true;
                    break;
                }else if(x[3].innerHTML.includes("DIR") && y[3].innerHTML.includes("DIR")){
                    // Both rows contain dirs. Sort by name.
                    if((x[1].getElementsByTagName('a')[0].innerHTML.toLowerCase() > y[1].getElementsByTagName('a')[0].innerHTML.toLowerCase())){
                        shouldSwitch = true;
                        break;
                    }
                }else if(!x[3].innerHTML.includes("DIR") && !y[3].innerHTML.includes("DIR")){
                    // Both rows contain files. Compare file sizes.
                    if(x[3].innerHTML > y[3].innerHTML){
                        shouldSwitch = true;
                        break;
                    }
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

function sortTableByModified() {
    modifiedAscending = ! modifiedAscending;

    var table, rows, switching, i, x, y, shouldSwitch;
    table = document.getElementById("flist");
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
            if(modifiedAscending){
                if(x[2].innerHTML > y[2].innerHTML){
                    shouldSwitch = true;
                    break;
                }    
            }else{
                if(x[2].innerHTML < y[2].innerHTML){
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