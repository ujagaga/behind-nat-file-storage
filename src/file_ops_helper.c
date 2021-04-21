#include <string.h>
#include <stdlib.h>
#include <libgen.h>
#include <unistd.h>
#include <time.h>
#include <sys/reboot.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <stdio.h>
#include "file_ops_helper.h"
#include "cfg.h"


void FO_shell_op(char* command)
{
    FILE *fp;
  
    /* Open the command for reading. */
    fp = popen(command, "r");
    if (fp == NULL) {
        printf(ext_response, "Unknown error.");  
    }else{    
        while (fgets(ext_response, sizeof(ext_response), fp) != NULL){
        printf("\t %s", ext_response);
    }
    pclose(fp);
  }
}

static void generate_code(char* filepath)
{
    char command[MG_PATH_MAX] = {0};
    strcpy(command, "echo -n ");
    strcat(command, filepath);
    strcat(command, " |md5sum");
    FO_shell_op(command);
    char* blank = strchr(ext_response, ' ');
    if(blank != NULL){
        blank[0] = 0;
    }
}

static void move_dir(char* src, char* dst){
    char command[MG_PATH_MAX * 2] = {0};
    strcpy(command, "mv ");
    strcat(command, src);
    strcat(command, " ");
    strcat(command, dst);
    FO_shell_op(command);
}

void FO_rm_dir(char* src){
    char command[MG_PATH_MAX * 2] = {0};
    strcpy(command, "rm -rf ");
    strcat(command, src);    
    FO_shell_op(command);
}

static void delete_file(char* path){
    char source[MG_PATH_MAX];
    strcpy(source, path);
    int last = strlen(source) - 1;
    if(source[last] == '/'){
        source[last] = 0;
    }
    remove(source);
}

static void cp_dir(char* full_src, char* dst){ 
    char command[MG_PATH_MAX * 2] = {0};
    strcpy(command, "cp -rf ");
    strcat(command, full_src);
    strcat(command, " ");
    strcat(command, dst);
    FO_shell_op(command);
}

static void cp_file(char* full_src, char* dst){
    char command[MG_PATH_MAX * 2] = {0};
    strcpy(command, "cp -f ");
    strcat(command, full_src);
    strcat(command, " ");
    strcat(command, dst);
    FO_shell_op(command);
}

static bool path_exists(const char *path)
{
    struct stat path_stat;
    path_stat.st_mode = 0;
    stat(path, &path_stat);
    return (path_stat.st_mode > 0);
}

bool FO_is_file(const char *path)
{
    struct stat path_stat;
    path_stat.st_mode = 0;
    stat(path, &path_stat);
    return S_ISREG(path_stat.st_mode);
}

bool FO_is_dir(const char *path)
{
    struct stat path_stat;
    path_stat.st_mode = 0;
    stat(path, &path_stat);
    return S_ISDIR(path_stat.st_mode);
}

int FO_is_link(const char *link_path){
    char target_path[MG_PATH_MAX];
    char source[MG_PATH_MAX];
    strcpy(source, link_path);
    int last = strlen(source) - 1;
    if(source[last] == '/'){
        source[last] = 0;
    }

    /* Attempt to read the target of the symbolic link. */
    int len = readlink (source, target_path, sizeof (target_path));

    if (len == -1) {
        if (errno == EINVAL){
            // Not a link
            return -1;
        }else{
            // Other problem, probably dead link.
            return 1;
        }
    }
    else {   
        return 0;
    }
}

static bool startsWith(struct mg_str* str, const char* prefix)
{
    size_t lenpre = strlen(prefix);
    if(str->len < lenpre){
        return false;
    }

    size_t i;
    for(i = 0; i < lenpre; i++){
        if(prefix[i] != str->ptr[i]){
            return false;
        }
    }
    return true;
}

static char* findstr(struct mg_str* haystack, const char* needle, const char* startAt)
{    
    const char* limit = haystack->ptr + haystack->len;
    char* location = (char*) startAt;
    int nlen = strlen(needle);

    do{
        int i;
        bool same = true;
        for(i = 0; i < nlen; i++){
            if(location[i] != needle[i]){
                same = false;
                break;
            }
        }

        if(same){
            return location;
        }

        location++;
    }while(location < limit);

    return NULL;
}

/* Extracts items from json array. 
*  @param: struct mg_str* jsonArray, source of data
*  @param: char* result, pointer to destination buffer
*  @param: int startAt, pointer to starting point
*  @return: int index of the next item (-1 if error, 0 if no more items)
*/
static int getNextJsonArrayItem(struct mg_str* jsonArray, char* result, int startAt)
{
    const char* startingPoint = &jsonArray->ptr[startAt];
    char* start = findstr(jsonArray, "\"", startingPoint);

    if(start == NULL){
        return -1;
    }
    start++;

    char* end = findstr(jsonArray, "\"", start);
    if(end == NULL){
        return -1;
    }

    int len =  (int)(end - start);
    strncpy(result, start, len);
    result[len] = 0;

    // Look for next item start
    char* next = findstr(jsonArray, ",", end); 
    if(next == NULL){
        return 0;
    }

    return (int)(next - jsonArray->ptr);
}

static int newdir(const char* root_dir, struct mg_str* destination, struct mg_str* items){
    char full_path[MG_PATH_MAX] = {0};
    strcpy(full_path, root_dir);
    strncat(full_path, destination->ptr, (int)destination->len);

    char* item_start = findstr(items, "\"", items->ptr);
    if(item_start == NULL){
        return EXIT_FAILURE;
    }
    item_start++;

    char* item_end = findstr(items, "\"", item_start);
    if(item_end == NULL){
        return EXIT_FAILURE;
    }

    strncat(full_path, item_start, (int)(item_end - item_start));    

    struct stat st = {0};
    if (stat(full_path, &st) == -1) {
        // dir does not exist. Create it.
        mkdir(full_path, 0700);        
    }

    strcpy(ext_response, "OK");
    return EXIT_SUCCESS;
}

static int delete(const char* root_dir, struct mg_str* source, struct mg_str* items){
    char src_path[MG_PATH_MAX] = {0};
    strcpy(src_path, root_dir);
    strncat(src_path, source->ptr, (int)source->len);    
    
    // Iterate through items
    int next = 0;
    char item[MG_PATH_MAX] = {0};
    do{
        next = getNextJsonArrayItem(items, item, next);
        if(next >= 0){
            // Valid item available
            char full_path[MG_PATH_MAX];
            strcpy(full_path, src_path);
            strcat(full_path, item);

            if(FO_is_link(full_path) >= 0){
                delete_file(full_path);
            }if(FO_is_file(full_path)){
                delete_file(full_path);
            }else if(FO_is_dir(full_path)){
                FO_rm_dir(full_path);
            }
        }
    }while(next > 0);

    strcpy(ext_response, "OK");
    return EXIT_SUCCESS;
}

static int cutcopy(const char* root_dir, struct mg_str* source, struct mg_str* destination, struct mg_str* items, bool keep_original){
    char src_path[MG_PATH_MAX] = {0};
    strcpy(src_path, root_dir);
    strncat(src_path, source->ptr, (int)source->len);   

    char dst_path[MG_PATH_MAX] = {0};
    strcpy(dst_path, root_dir);
    strncat(dst_path, destination->ptr, (int)destination->len);
    
    // Iterate through items
    int next = 0;
    char item[MG_PATH_MAX] = {0};
    do{
        next = getNextJsonArrayItem(items, item, next);
        if(next >= 0){
            // Valid item available
            char full_src_path[MG_PATH_MAX];
            strcpy(full_src_path, src_path);
            strcat(full_src_path, item);

            char full_dst_path[MG_PATH_MAX];
            strcpy(full_dst_path, dst_path);
            strcat(full_dst_path, item); 

            // Check if destination exists
            char last_target_name[256] = {0};
            strcpy(last_target_name, item);             

            while(path_exists(full_dst_path)){ 
                printf("Exists: %s", full_dst_path);

                if(strlen(last_target_name) < 255){
                    char new_target_name[256] = {0};
                    strcpy(new_target_name, "2-");
                    strcat(new_target_name, last_target_name);
                    strcpy(last_target_name, new_target_name);

                    strcpy(full_dst_path, dst_path);
                    strcat(full_dst_path, new_target_name);                    
                    printf("  Selecting new name: %s\n", full_dst_path);  
                }                              
            }
            
            if(FO_is_file(full_src_path)){
                if(keep_original){
                    cp_file(full_src_path, full_dst_path);
                }else{                    
                    rename(full_src_path, full_dst_path);
                }                
            }else if(FO_is_dir(full_src_path)){ 
                if(keep_original){
                    cp_dir(full_src_path, full_dst_path);
                }else{                    
                    move_dir(full_src_path, full_dst_path);
                }                
            }
        }
    }while(next > 0);

    strcpy(ext_response, "OK");
    return EXIT_SUCCESS;
}

static int do_rename(const char* root_dir, struct mg_str* source, struct mg_str* destination, struct mg_str* items){
    char src_path[MG_PATH_MAX] = {0};
    strcpy(src_path, root_dir);
    strncat(src_path, source->ptr, (int)source->len);   

    char dst_path[MG_PATH_MAX] = {0};
    strcpy(dst_path, root_dir);
    strncat(dst_path, source->ptr, (int)source->len); 
    strncat(dst_path, destination->ptr, (int)destination->len);  
    
    char item[MG_PATH_MAX] = {0};    
    int next = getNextJsonArrayItem(items, item, 0);
    if(next >= 0){
        // Valid item available
        strcat(src_path, item);

        // printf("op: RENAME\n    SRC: %s\n    DST: %s\n ITEMS: %.*s\n", src_path, dst_path, (int)items->len, items->ptr);
       
        if(FO_is_file(src_path)){            
            rename(src_path, dst_path);
        }else if(FO_is_dir(src_path)){
            move_dir(src_path, dst_path);               
        }
    }

    strcpy(ext_response, "OK");
    return EXIT_SUCCESS;
}

static int archive(const char* root_dir, struct mg_str* source, struct mg_str* items){
    char src_path[MG_PATH_MAX] = {0};
    strcpy(src_path, root_dir);
    strncat(src_path, source->ptr, (int)source->len); 

    chdir(src_path);  

    char command[MG_PATH_MAX] = {0};
    strcpy(command, "zip -r archive.zip ");    

    // Iterate through items
    int next = 0;
    char item[MG_PATH_MAX] = {0};
    do{
        next = getNextJsonArrayItem(items, item, next);
        if(next >= 0){
            // Valid item available
            strcat(command, item);
            strcat(command, " "); 
        }
    }while(next > 0);

    FO_shell_op(command);

    strcpy(ext_response, "OK");
    return EXIT_SUCCESS;
}

int FO_share(const char* root_dir, struct mg_str* source, struct mg_str* items){
    char command[MG_PATH_MAX] = {0};
    // get one item
    char item[MG_PATH_MAX] = {0}; 
    int next = getNextJsonArrayItem(items, item, 0);
    if(next >= 0){
        // Valid item available. Generate relative path for code.
        char src_path[MG_PATH_MAX] = {0};
        strncat(src_path, source->ptr, (int)source->len);
        strcat(src_path, item);

        generate_code(src_path);
        // Backup the share code
        char backup_code[128] = {0};
        strcpy(backup_code, ext_response);

        // Prepare share folder
        char share_dir[MG_PATH_MAX] = {0}; 
        strcpy(share_dir, root_dir);
        strcat(share_dir, "/share");

        struct stat st = {0};
        if (stat(share_dir, &st) == -1) {
            // dir does not exist. Create it.
            mkdir(share_dir, 0700);        
        } 
        chdir(share_dir);

        // Prepare full source path
        char srcPath[MG_PATH_MAX] = {0};
        strcat(srcPath, root_dir);  
        strncat(srcPath, source->ptr, (int)source->len);
        strcat(srcPath, item);

        // Check if the share link already exists
        if(FO_is_link(ext_response) != 0){
            // Generate link command            
            strcpy(command, "ln -s \"");
            strcat(command, srcPath);
            strcat(command, "\" ");
            strcat(command, ext_response); 
            
            FO_shell_op(command);
            // Restore the share code
            strcpy(ext_response, backup_code);
        }

        // Check if shared item is a folder
        if(FO_is_dir(srcPath)){
            strcat(ext_response, "/");
        }
    }  

    return EXIT_SUCCESS;
}

int FO_run_operation(const char* root_dir, struct mg_str* operation, struct mg_str* source, struct mg_str* destination, struct mg_str* items){
    ext_response[0] = 0;

    if(startsWith(operation, "CUT")){
        return cutcopy(root_dir, source, destination, items, false);
    }else if(startsWith(operation, "COPY")){
        return cutcopy(root_dir, source, destination, items, true);
    }else if(startsWith(operation, "ARCHIVE")){
        return archive(root_dir, source, items);
    }else if(startsWith(operation, "DELETE")){
        return delete(root_dir, source, items);
    }else if(startsWith(operation, "RENAME")){
        return do_rename(root_dir, source, destination, items);
    }else if(startsWith(operation, "SHARE")){
        return FO_share(root_dir, source, items);
    }else if(startsWith(operation, "NEWDIR")){        
        return newdir(root_dir, destination, items);
    }else {
        return EXIT_FAILURE;
    }

    return EXIT_FAILURE;
}