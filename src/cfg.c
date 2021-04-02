#include "cfg.h"

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <unistd.h>
#include <pwd.h>
#include <sys/types.h>
#include <sys/stat.h>


#define MAX_BUF_LEN     1024

const char* SETTINGS_FILE = "settings.cfg";
char* settings_dir = ".bnfs";
static struct passwd *pw;    // Structure to hold user id and home folder
static char CFG_FILE_FULL_PATH[4096];


// User credentials. NOTE: We only have one user, the administrator.
char admin_user_name[MAX_USER_DATA_LEN] = {0};
char admin_user_pass[MAX_USER_DATA_LEN] = {0};
char admin_user_token[MAX_USER_DATA_LEN] = {0};
char subdomain[MAX_USER_DATA_LEN] = {0};
bool require_pass_in_lan = false;


static char* my_strcpy(char* dst, char* src){

  while(*src != '\0'){
    *dst++ = *src++;
  }

  *dst = '\0';

  return dst;
}

static void getCfgFullPath(){
  
  pw = getpwuid(getuid());

  strcpy(CFG_FILE_FULL_PATH, pw->pw_dir);
  strcat(CFG_FILE_FULL_PATH, "/");
  strcat(CFG_FILE_FULL_PATH, settings_dir);

  struct stat st = {0};

  if (stat(CFG_FILE_FULL_PATH, &st) == -1) {
    // SFG dir does not exist. Create it.
      mkdir(CFG_FILE_FULL_PATH, 0700);
  }

  strcat(CFG_FILE_FULL_PATH, "/");
  strcat(CFG_FILE_FULL_PATH, SETTINGS_FILE); 
}

int settings_readSetupFile(void) {
  getCfgFullPath();

  FILE *fp; 

  if ((fp=fopen(CFG_FILE_FULL_PATH, "r")) == NULL) {
    fprintf(stderr, "Failed to open config file %s\n", CFG_FILE_FULL_PATH);
    return EXIT_FAILURE;
  }

  ssize_t line_size = 0;

  while(line_size >= 0) { 
    char *buf = NULL;    
    char *val;
    size_t line_buf_size = 0;    

    line_size = getline(&buf, &line_buf_size, fp);    
    if(line_size < 0){
      break;
    }

    // printf("chars=%06zd, buf size=%06zu, contents: %s\n", line_size, line_buf_size, buf);
  
    val = strstr(buf, "USERNAME ");
    if (val != NULL) {
      strncpy ( admin_user_name, val + strlen("USERNAME "), MAX_USER_DATA_LEN - 1);
      admin_user_name[strlen(admin_user_name) - 2] = 0;
    }
    
    val = strstr(buf, "PASSWORD ");
    if (val != NULL) {
      strncpy ( admin_user_pass, val + strlen("PASSWORD "), MAX_USER_DATA_LEN - 1);
      admin_user_pass[strlen(admin_user_pass) - 2] = 0;
    }

    val = strstr(buf, "SUBDOMAIN ");
    if (val != NULL) {
      strncpy ( subdomain, val + strlen("SUBDOMAIN "), MAX_USER_DATA_LEN - 1);
      subdomain[strlen(subdomain) - 2] = 0;
    }

    val = strstr(buf, "PASS_IN_LAN ");
    if (val != NULL) {      
      val += strlen("PASS_IN_LAN ");

      if(*val == 'y'){
        require_pass_in_lan = true;
      }else{
        require_pass_in_lan = false;
      }
    }
   
    free(buf);
  }
  
  fclose(fp);

  return EXIT_SUCCESS;
}

int settings_writeSetupFile(void){
  getCfgFullPath();

  FILE *fp;
  int result;
  char buf[MAX_BUF_LEN];
  char *next;

  if ((fp=fopen(CFG_FILE_FULL_PATH, "w")) == NULL) {
    fprintf(stderr, "Failed to write to config file %s\n", CFG_FILE_FULL_PATH);
    return EXIT_FAILURE;
  }

  // Write user name
  next = my_strcpy(buf, "USERNAME ");
  next = my_strcpy(next, admin_user_name);
  my_strcpy(next, "\r\n");
  
  result = fputs( buf, fp );
  if(result == EOF){
    fprintf(stderr, "Config write failed.\n");
    return EXIT_FAILURE;
  }

  // Write password
  next = my_strcpy(buf, "PASSWORD ");
  next = my_strcpy(next, admin_user_pass);
  my_strcpy(next, "\r\n");

  result = fputs( buf, fp );
  if(result == EOF){
    fprintf(stderr, "Config write failed.\n");
    return EXIT_FAILURE;
  }

  // Write require_pass_in_lan
  next = my_strcpy(buf, "PASS_IN_LAN ");
  
  if(require_pass_in_lan){
    next = my_strcpy(next, "y\r\n");    
  }else{
    next = my_strcpy(next, "n\r\n");    
  }  
  
  result = fputs( buf, fp );
  if(result == EOF){
    fprintf(stderr, "Config write failed.\n");
    return EXIT_FAILURE;
  }

  // Write subdomain
  next = my_strcpy(buf, "SUBDOMAIN ");
  next = my_strcpy(next, subdomain);
  my_strcpy(next, "\r\n");

  result = fputs( buf, fp );
  if(result == EOF){
    fprintf(stderr, "Config write failed.\n");
    return EXIT_FAILURE;
  }

  fclose(fp);

  return EXIT_SUCCESS;
}

