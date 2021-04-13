// Copyright (c) 2020 Cesanta Software Limited
// All rights reserved

#include <string.h>
#include <stdlib.h>
#include <libgen.h>
#include <unistd.h>
#include <time.h>
#include <sys/reboot.h>
#include "mongoose.h"
#include "cfg.h"
#include "login.h"
#include "logout.h"
#include "preferences.h"
#include "file_ops_helper.h"
#include "share_list.h"


// Path to files like js, css, fonts,... This same path will not be usable in shared user folder, 
// so you might want to use something more random, but make sure you adjust html files accordingly.
#define STATIC_PATH         "_static_web_files"
#define FAVICON_PATH        "/"STATIC_PATH
#define MIN_USERNAME_LEN    5
#define MIN_PASS_LEN        5
#define UNAME_ERR_MSG       "Error: Username too short. Min. 5 characters."
#define PASS_ERR_MSG        "Error: Password too short. Min. 5 characters."
#define SHARE_CODE_LEN      32
#define SHARE_URL_LEN       SHARE_CODE_LEN + 5

static const char* STATIC_PATTERN = "/"STATIC_PATH"/#";
static const char* s_debug_level = "2";
static const char* s_root_dir = ".";
static char s_listening_address[32] = {0};
static const char* s_ssi_pattern = "#.shtml";
static const char* HTTP_NEW_USER = "username";
static const char* HTTP_NEW_PASS = "newpass";
static const char* HTTP_REQ_LOGIN = "reqlogin";
static const char* HTTP_LCD_ON = "lcdalwayson";
static const char* HTTP_SUBDOMAIN = "subdomain";
static const char* HTTP_DESTINATION = "destination";
static const char* HTTP_SHARE = "share";
static const char* HTTP_PATH = "path";
static const char* updater = "/../updater.sh";
char ext_response[1024] = {0};
static char listen_port[7] = {0};
static time_t last_op_at = 0;
static char current_path[PATH_MAX] = {0};
static const char* QUICK_UPLOAD_PATH = "/upload/";
static const char* THUMB_PATH = "/tmp/bnfsthumb/";


void gen_random(char *s) {  
    static const char alphanum[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    for (int i = 0; i < MAX_USER_DATA_LEN - 1; ++i) {
        s[i] = alphanum[rand() % (sizeof(alphanum) - 1)];
    }

    s[MAX_USER_DATA_LEN - 1] = 0;
}

// Parse HTTP requests, return true if authorized, false otherwise
static bool check_authorized(struct mg_http_message *hm) {
  
  char user[256], pass[256];

  mg_http_creds(hm, user, sizeof(user), pass, sizeof(pass));

  if (user[0] != '\0' && pass[0] != '\0') {    
    // Both user and password is set, search by user/password    
    if (strcmp(user, admin_user_name) == 0 && strcmp(pass, admin_user_pass) == 0) {  
      gen_random(admin_user_token);     
      return true;
    }      
  } else if (user[0] == '\0') {
    // Only password is set, search by token    
    if (strcmp(pass, admin_user_token) == 0) return true;
  }
  return false;
}

/* Finds the location of a delimiter ';' or '\n' */
static int find_data_len(char* start, int maxlen){
  int i;
  for(i = 0; i < maxlen; i++){
    if((*(start + i) == ';') || (*(start + i) == '\n')){
      return i;
    }
  }
  return maxlen;
}

static bool get_cookie(struct mg_str* buffer, const char* key, struct mg_str* result){  
  char* start;
  
  start = strstr(buffer->ptr, key);
  if(start != NULL){ 
    start += strlen(key);
     
    result->len = find_data_len(start, buffer->ptr + buffer->len - start);
    result->ptr = start;
    return true;    
  }

  return false;
}

static void check_update(){
  
  char command[MG_PATH_MAX] = {};
  strcpy(command, current_path);
  strcat(command, updater);

  FILE *fp;  
  /* Open the command for reading. */
  fp = popen(command, "r");
  if (fp == NULL) {
    sprintf(ext_response, "Unknown error.");  
  }else{    
    while (fgets(ext_response, sizeof(ext_response), fp) != NULL){
      printf("\t %s", ext_response);
    }
    pclose(fp);
  }
}

static int count_dir_items(char* path){
  int file_count = 0;
  DIR * dirp;
  struct dirent * entry;

  if(FO_is_dir(path)){
    dirp = opendir(path); 
    while ((entry = readdir(dirp)) != NULL) {
        if (entry->d_type == DT_REG) { 
            file_count++;
        }
    }
    closedir(dirp);
  } 

  return file_count;
}

static int create_thumbnail(char* img_path, char* img_name){
  char thumb_path[255] = {0};
  strcpy(thumb_path, THUMB_PATH);

  if(count_dir_items(thumb_path) > 1000){
    FO_rm_dir(thumb_path);
  }

  struct stat st = {0};
  if (stat(THUMB_PATH, &st) == -1) {
      // dir does not exist. Create it.
      mkdir(THUMB_PATH, 0700);        
  }
  
  char command[MG_PATH_MAX] = {};
  sprintf(command, "vipsthumbnail -s 100 -o %s%s %s", THUMB_PATH, img_name, img_path);

  FILE *fp;  
  /* Open the command for reading. */
  fp = popen(command, "r");
  if (fp == NULL) {
    sprintf(ext_response, "Unknown error.");  
    return EXIT_FAILURE;
  }else{    
    while (fgets(ext_response, sizeof(ext_response), fp) != NULL){
      printf("\t %s", ext_response);
    }
    pclose(fp);
  }

  sprintf(ext_response, "%s%s", THUMB_PATH, img_name);
  return EXIT_SUCCESS;
}

bool is_dir(const char *path) {
  mg_stat_t st;
  return mg_stat(path, &st) == 0 && S_ISDIR(st.st_mode);
}

static void cb(struct mg_connection *c, int ev, void *ev_data, void *fn_data) {
  if (ev == MG_EV_HTTP_MSG) {
    
    struct mg_http_message *hm = (struct mg_http_message *) ev_data;        
    struct mg_str *clientIP = mg_http_get_header(hm, "X-Forwarded-For");

    bool userIsRemote = (clientIP != NULL);
    if(userIsRemote){
      // printf("Request from: %.*s\n", (int)clientIP->len, clientIP->ptr);
      c->label[0] = 'R';
    }else{
      // printf("Request from local user\n");
      c->label[0] = 'L';
    }    

    bool u = check_authorized(hm);
    if(u){
      c->label[1] = 'A';
    }else{
      c->label[1] = 'U';
    }

    u = u || (!userIsRemote && !require_pass_in_lan);

    if(require_pass_in_lan){
      c->label[2] = 'Y';
    }else{
      c->label[2] = 'N';
    }

    bool set_timestamp_flag = true;

    if (mg_http_match_uri(hm, STATIC_PATTERN)) {
      // Requesting a static file. This is open to all.
      struct mg_http_serve_opts opts = {current_path, s_ssi_pattern};
      mg_http_serve_dir(c, ev_data, &opts);

    }else if (mg_http_match_uri(hm, "/favicon.ico")) { 
      // Browsers tend to ask for favicon at load. Do not wish to count this as operation, but lets serve it to avoid 404.
      static char favicon_path[PATH_MAX] = {0};
      strcpy(favicon_path, current_path);
      strcat(favicon_path, FAVICON_PATH);

      struct mg_http_serve_opts opts = {favicon_path, s_ssi_pattern};
      mg_http_serve_dir(c, ev_data, &opts);  
      set_timestamp_flag = false;   

    }else if (mg_http_match_uri(hm, "/api/status")) {      

      mg_printf(c, "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n");
      mg_http_printf_chunk(c, "{\"last_op_at\":\"%ld\"}\n", last_op_at);
      mg_http_printf_chunk(c, "");   

      set_timestamp_flag = false;   

    }else if (mg_http_match_uri(hm, "/api/resolve")){
      char url[2048] = {0}; 
      char target_path[MG_PATH_MAX] = {0};
      bool err = false;

      mg_http_get_var(&(hm->message), HTTP_PATH, url, sizeof(url));
      if(url[0] == 0){ 
        err = true;        
      }else{
        char link_path[MG_PATH_MAX] = {0};
        strcpy(link_path, s_root_dir);
        strcat(link_path, url);     

        /* Attempt to read the target of the symbolic link. */
        int len = readlink (link_path, target_path, sizeof (target_path));

        if (len == -1) {
            err = true;
        }  
      }

      mg_printf(c, "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n");
      if(err){
        mg_http_printf_chunk(c, "ERR\n");
      }else{
        mg_http_printf_chunk(c, &target_path[strlen(s_root_dir)]);
      }          
      mg_http_printf_chunk(c, "");
      
    }else if (!u) {
      if (mg_http_match_uri(hm, "/share/#") && ((uint)hm->uri.len > SHARE_URL_LEN)){

        // Serve shared content without any credentials, but with no admin features. 
        char thumb[8] = {0};
        mg_http_get_var(&hm->query, "thumb", thumb, sizeof(thumb) - 1);

        bool finished = false;
        if(thumb[0] != 0){
          // Thumbnail requested. Check if target is file.
          char destination[MG_PATH_MAX] = {0};
          strcpy(destination, s_root_dir); 
          strncat(destination, hm->uri.ptr, (int)hm->uri.len);

          if(FO_is_file(destination)){
            // It is a file. Create thumbnail.
            char* img_name = strrchr( destination, '/');
            if(create_thumbnail(destination, ++img_name) == EXIT_SUCCESS){
              // Serve the file THUMB_PATH
              mg_http_serve_file(c, hm, ext_response, guess_content_type(ext_response), NULL);
              finished = true;
            }else{
              printf("THUMB FAIL: %s\n", ext_response);
            }
          }          
        }

        // printf("JUST SERVE: %s\n", thumb);
        if(!finished){
          struct mg_http_serve_opts opts = {s_root_dir, s_ssi_pattern};
          mg_http_serve_dir(c, ev_data, &opts);
        }

      }else if (mg_http_match_uri(hm, "/")){
        if(strncmp("PUT", hm->method.ptr, 3) == 0){
          // Upload requested. Use with: curl IP:PORT/?name=<file_name> -T <path/to/file>
          char destination[MG_PATH_MAX] = {0};
          strcpy(destination, s_root_dir); 
          // strncat(destination, hm->uri.ptr, (int)hm->uri.len);
          strcat(destination, QUICK_UPLOAD_PATH);
          printf("DEST: %s\n", destination);
          struct stat st = {0};
          if (stat(destination, &st) == -1) {
              // dir does not exist. Create it.
              mkdir(destination, 0700);        
          }
          char sharerequest[4] = {0};
          mg_http_get_var(&(hm->message), HTTP_SHARE, sharerequest, sizeof(sharerequest));     
          if((sharerequest[0] == 0) || (sharerequest[0] == 'y')){
            // Sharing not specificaly forbidden
            ext_response[0] = 0;
            char uploadname[200] = {0};
            mg_http_get_var(&hm->query, "name", uploadname, sizeof(uploadname));

            if(uploadname[0] != 0){
              char itemsData[256] = {0};
              strcat(itemsData, "\"/");
              strcat(itemsData, uploadname);
              strcat(itemsData, "\"");                        
              
              struct mg_str items = {itemsData, strlen(itemsData)};
              struct mg_str upload_path = {QUICK_UPLOAD_PATH, strlen(QUICK_UPLOAD_PATH)};
              FO_share(s_root_dir, &upload_path, &items);
            }    

            char msg[256] = {0};
            snprintf(msg, sizeof(msg), "\n==========\nhttps://%s.loca.lt/share/%s\n==========\n", subdomain, ext_response);
            mg_quick_http_upload(c, hm, destination, msg);    
          }else{
            mg_quick_http_upload(c, hm, destination, NULL);
          } 
        }else{
          // Just serve the (probably get) request
          mg_printf(c, "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n");
          mg_http_printf_chunk(c, login_html);
          mg_http_printf_chunk(c, "");
        }

      }else if (mg_http_match_uri(hm, "/api/login")) {
        // tried to authorize but failed
        mg_printf(c, "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n");
        mg_http_printf_chunk(c, "{\"result\":\"FAIL\"}\n", admin_user_name, admin_user_token);
        mg_http_printf_chunk(c, "");
        
      }else {
        // All URIs must be authenticated, so login
        if(strncmp("PUT", hm->method.ptr, 3) == 0){
          mg_http_reply(c, 403, "", "\n==========\nForbidden. Only root upload allowed.\n==========\n");
        }else{
          mg_printf(c, "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n");
          mg_http_printf_chunk(c, logout_html);
          mg_http_printf_chunk(c, "");
        }
      }      
    } else if (mg_http_match_uri(hm, "/api/login")) {

      mg_printf(c, "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n");
      mg_http_printf_chunk(c, "{\"result\":\"OK\",\"token\":\"%s\"}\n", admin_user_token);
      mg_http_printf_chunk(c, "");
      
    }else if (mg_http_match_uri(hm, "/api/preferences")) {

      mg_printf(c, "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n");
      mg_http_printf_chunk(c, preferences_html);
      mg_http_printf_chunk(c, "");

    }else if (mg_http_match_uri(hm, "/api/save_prefs")) {

      char target[1024] = {0}; 
      int retVal = 0;
      char *errMsg = "OK";

      int ret = mg_http_get_var(&(hm->message), HTTP_NEW_USER, target, sizeof(target));
      if((ret == 0) || (strlen(target) < MIN_USERNAME_LEN)){ 
        retVal = 1;
        errMsg = UNAME_ERR_MSG;
      }else{
        strncpy ( admin_user_name, target, MAX_USER_DATA_LEN - 1);

        int ret = mg_http_get_var(&(hm->message), HTTP_NEW_PASS, target, sizeof(target));
        if((ret == 0) || (strlen(target) < MIN_PASS_LEN)){ 
          retVal = 1;
          errMsg = PASS_ERR_MSG;
        }else{
          strncpy ( admin_user_pass, target, MAX_USER_DATA_LEN - 1);

          ret = mg_http_get_var(&(hm->message), HTTP_REQ_LOGIN, target, sizeof(target));
          if(ret == 0){ 
            retVal = 1;
            errMsg = "ERROR: Require login flag not found!";
          }else if(strcmp(target, "true") == 0){
            require_pass_in_lan = true;
          }else if(strcmp(target, "false") == 0){
            require_pass_in_lan = false;
          }else{
            retVal = 1;
            errMsg = "ERROR: Require login flag invalid value!";
          }

          ret = mg_http_get_var(&(hm->message), HTTP_LCD_ON, target, sizeof(target));
          if(ret == 0){ 
            retVal = 1;
            errMsg = "ERROR: Require login flag not found!";
          }else if(strcmp(target, "true") == 0){
            screen_always_on = true;
          }else if(strcmp(target, "false") == 0){
            screen_always_on = false;
          }else{
            retVal = 1;
            errMsg = "ERROR: Display always on flag invalid value!";
          }

          if(ret != 0){
            ret = mg_http_get_var(&(hm->message), HTTP_SUBDOMAIN, target, sizeof(target));
            if(ret != 0){ 
              strncpy ( subdomain, target, MAX_USER_DATA_LEN - 1);
            }else{
              subdomain[0] = 0;
            }
          }
        }
      }

      if(retVal == 0){
        settings_writeSetupFile();
      }

      mg_printf(c, "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n");
      mg_http_printf_chunk(c, "{\"result\":\"%d\",\"msg\":\"%s\"}\n", retVal, errMsg);
      mg_http_printf_chunk(c, "");

    }else if (mg_http_match_uri(hm, "/api/op")){

      struct mg_str operation = {NULL, 0};
      struct mg_str items = {NULL, 0};
      struct mg_str source = {NULL, 0};
      struct mg_str destination = {NULL, 0};
      const char* op_key = "operation=";
      const char* item_key = "items=";
      const char* source_key = "source=";
      const char* destination_key = "destination=";

      mg_printf(c, "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n");

      // Get cookie
      struct mg_str *v = mg_http_get_header(hm, "Cookie");

      if(get_cookie(v, op_key, &operation) && get_cookie(v, item_key, &items) &&
        get_cookie(v, source_key, &source) && get_cookie(v, destination_key, &destination)){
        FO_run_operation(s_root_dir, &operation, &source, &destination, &items);

        char temp[255] = {0};
        strncpy(temp, operation.ptr, operation.len);
        if(strstr(temp, "SHARE") == temp){
          // temp starts with "SHARE"
          mg_http_printf_chunk(c, "SHARE https://%s.loca.lt/share/", subdomain);  
        }        
      }else{
        printf("\n\t ERR:\n");
        printf("\t OP: %.*s\n", (int)operation.len, operation.ptr);
        printf("\t ITEMS: %.*s\n", (int)items.len, items.ptr);
        printf("\t SRC: %.*s\n", (int)source.len, source.ptr);
        printf("\t DST: %.*s\n\n", (int)destination.len, destination.ptr);
      } 
      
      mg_http_printf_chunk(c, "%s", ext_response);   
      mg_http_printf_chunk(c, "");

    }else if (mg_http_match_uri(hm, "/api/logout")) {      

      mg_printf(c, "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n");
      mg_http_printf_chunk(c, logout_html);
      mg_http_printf_chunk(c, "");
      gen_random(admin_user_token);  // Change user token

    }else if (mg_http_match_uri(hm, "/api/restart")) { 
      sync();
      system("/sbin/reboot");
    }else if (mg_http_match_uri(hm, "/api/chk_update")) {      
      
      check_update();
      mg_printf(c, "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n");
      mg_http_printf_chunk(c, "%s", ext_response);   
      mg_http_printf_chunk(c, "");

    }else if (mg_http_match_uri(hm, "/api/get_prefs")) {      

      mg_printf(c, "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n");
      mg_http_printf_chunk(c, "{\"screen_always_on\":%d, \"require_local_pass\":%d,\"admin_uname\":\"%s\", \"admin_pass\":\"%s\", \"subdomain\":\"%s\", \"remote_user\":%d}\n", 
      screen_always_on, require_pass_in_lan, admin_user_name, admin_user_pass, subdomain, userIsRemote);  
      mg_http_printf_chunk(c, "");

    }else if (mg_http_match_uri(hm, "/share/")){
      // static char html_path[PATH_MAX] = {0};
      // strcpy(html_path, current_path);
      // strcat(html_path, "/");
      // strcat(html_path, STATIC_PATH);
      // strcat(html_path, "/share_list.html");
      // printf("html_path: %s\n", html_path);
      // mg_http_serve_file(c, hm, html_path, guess_content_type(html_path), NULL);

      mg_printf(c, "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n");
      mg_http_printf_chunk(c, "%s", share_list_html);   
      mg_http_printf_chunk(c, "");

    }else if (mg_http_match_uri(hm, "/api/get_shared")){
      
      char destination[MG_PATH_MAX] = {0};
      strcpy(destination, s_root_dir);
      strcat(destination, "/share/");
      mg_listshare(c, destination);

    }else if (mg_http_match_uri(hm, "/chunkupload")){
      char destination[MG_PATH_MAX] = {0};
      strcpy(destination, s_root_dir);
      int destLen = strlen(destination);
      destination[destLen] = '/';
      destination[destLen + 1] = 0;
      destLen++;

      int ret = mg_http_get_var(&(hm->message), HTTP_DESTINATION, &destination[destLen], sizeof(destination) - destLen);
      if(ret > 0){
        mg_http_upload(c, hm, destination); 
      }
    
    }else{
      // Authorized. serve!
      if(strncmp("PUT", hm->method.ptr, 3) == 0){
        // Upload requested. Use with: curl IP:PORT/<path>?name=<file_name> -T <path/to/file>

        char destination[MG_PATH_MAX] = {0};
        strcpy(destination, s_root_dir); 
        strncat(destination, hm->uri.ptr, (int)hm->uri.len);
        struct stat st = {0};
        if (stat(destination, &st) == -1) {
            // dir does not exist. Create it.
            mkdir(destination, 0700);        
        }
        char sharerequest[4] = {0};
        mg_http_get_var(&(hm->message), HTTP_SHARE, sharerequest, sizeof(sharerequest));     
        if((sharerequest[0] == 0) || (sharerequest[0] == 'y')){
          // Sharing not specificaly forbidden
          ext_response[0] = 0;
          char uploadname[200] = {0};
          mg_http_get_var(&hm->query, "name", uploadname, sizeof(uploadname));

          if(uploadname[0] != 0){
            char itemsData[256] = {0};
            strcat(itemsData, "\"/");
            strcat(itemsData, uploadname);
            strcat(itemsData, "\"");
                      
            struct mg_str items = {itemsData, strlen(itemsData)};
            FO_share(s_root_dir, &hm->uri, &items);
          }    

          char msg[256] = {0};
          snprintf(msg, sizeof(msg), "\n==========\nhttps://%s.loca.lt/share/%s\n==========\n", subdomain, ext_response);
          mg_quick_http_upload(c, hm, destination, msg);    
        }else{
          mg_quick_http_upload(c, hm, destination, NULL);
        }        

      }else{
        // Just serve the (probably get) request
        char thumb[8] = {0};
        mg_http_get_var(&hm->query, "thumb", thumb, sizeof(thumb) - 1);

        bool finished = false;
        if(thumb[0] != 0){
          // Thumbnail requested. Check if target is file.
          char destination[MG_PATH_MAX] = {0};
          strcpy(destination, s_root_dir); 
          strncat(destination, hm->uri.ptr, (int)hm->uri.len);

          if(FO_is_file(destination)){
            // It is a file. Create thumbnail.
            char* img_name = strrchr( destination, '/');
            if(create_thumbnail(destination, ++img_name) == EXIT_SUCCESS){
              // Serve the file THUMB_PATH
              mg_http_serve_file(c, hm, ext_response, guess_content_type(ext_response), NULL);
              finished = true;
            }else{
              printf("THUMB FAIL: %s\n", ext_response);
            }
          }          
        }

        // printf("JUST SERVE: %s\n", thumb);
        if(!finished){
          struct mg_http_serve_opts opts = {s_root_dir, s_ssi_pattern};
          mg_http_serve_dir(c, ev_data, &opts);
        }        
      }      
    }   

    if(set_timestamp_flag){
      last_op_at = time(NULL);
    }
    
  }
  (void) fn_data;
}

static void usage(const char *prog) {
  fprintf(stderr,
          "Behind NAT File Storage.\nBased on Mongoose v.%s, built " __DATE__ " " __TIME__
          "\n\nUsage: %s OPTIONS\n"
          "  -d DIR        - directory to serve\n"
          "  -p PORT       - optional listening port, default: %s\n"
          "  -v LEVEL      - optional debug level, from 0 to 4, default: %s\n"
          "  -c CFG_PATH   - optional configuration file location. Defaults to $HOME/.bnfs/\n",
          MG_VERSION, prog, listen_port, s_debug_level);
  exit(EXIT_FAILURE);
}

int main(int argc, char *argv[]) {
  struct mg_mgr mgr;
  struct mg_connection *c;
  int i;

  // Set defaults
  strcpy(s_listening_address, "http://0.0.0.0:8000");
  strcpy(listen_port, "8000");

  // Parse command-line flags
  if(argc < 3){
    usage(argv[0]);
  }

  bool dirSetFlag = false;
  
  for (i = 1; i < argc; i++) {
    if (strcmp(argv[i], "-d") == 0) {
      s_root_dir = argv[++i];
      dirSetFlag = true;
    } else if (strcmp(argv[i], "-p") == 0) {
      strncpy(listen_port, argv[++i], sizeof(listen_port) - 1);

      strcpy(s_listening_address, "http://0.0.0.0:");
      strcat(s_listening_address, listen_port);
      strcat(s_listening_address, "  ");      
    } else if (strcmp(argv[i], "-v") == 0) {
      s_debug_level = argv[++i];
    }  else if (strcmp(argv[i], "-c") == 0) {
      settings_dir = argv[++i];
    } else {
      usage(argv[0]);
    }
  }

  if(!dirSetFlag){
    usage(argv[0]);
  }

  // Get current dir
  size_t len = sizeof(current_path);
  int bytes = readlink("/proc/self/exe", current_path, len);
  if(bytes >= 0){
    current_path[bytes] = 0;
  }
  // find last occurence of '/' to remove program name and leave just folder.
  char* fn = strrchr(current_path, '/');
  if(fn != NULL){
    fn[0] = 0;
  }

  // get config
  int res = settings_readSetupFile();
  if(res != 0){
    // Setup file probably does not exist. Write defaults.
    strcpy(admin_user_name, "admin");
    strcpy(admin_user_pass, "admin");
    require_pass_in_lan = false;

    res = settings_writeSetupFile();
    if(res != 0){
      fprintf(stderr,"Cannot write settings file.");
    }else{
      // Try again
      res = settings_readSetupFile();
      if(res != 0){
        fprintf(stderr,"Cannot read settings file.");
      }
    }
  } 

  // Generate a random admin token to prevent no token access
  gen_random(admin_user_token); 

  // Initialise stuff
  mg_log_set(s_debug_level);
  mg_mgr_init(&mgr);
  if ((c = mg_http_listen(&mgr, s_listening_address, cb, &mgr)) == NULL) {
    LOG(LL_ERROR, ("Cannot listen on %s.", s_listening_address));
    exit(EXIT_FAILURE);
  }  

  // Start infinite event loop
  printf("Starting Behind NAT File Server, based on Mongoose v%s.\nServing: %s\n", MG_VERSION, s_root_dir);
  for (;;) mg_mgr_poll(&mgr, 1000);
  mg_mgr_free(&mgr);
  return 0;
}
