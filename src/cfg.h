#pragma once

#include <string.h>
#include <stdbool.h>

#define MAX_USER_DATA_LEN   30

extern char admin_user_name[MAX_USER_DATA_LEN];
extern char admin_user_pass[MAX_USER_DATA_LEN];
extern char admin_user_token[MAX_USER_DATA_LEN];
extern char subdomain[MAX_USER_DATA_LEN];
extern bool require_pass_in_lan;
extern char* settings_dir;

int settings_readSetupFile(void);
int settings_writeSetupFile(void);

