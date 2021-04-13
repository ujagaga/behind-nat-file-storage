#pragma once

#include "mongoose.h"
#include <string.h>

extern char ext_response[1024];

int FO_run_operation(const char* root_dir, struct mg_str* operation, struct mg_str* source, struct mg_str* destination, struct mg_str* items);
int FO_is_link(const char *link_path);
bool FO_is_file(const char *path);
bool FO_is_dir(const char *path);
int FO_share(const char* root_dir, struct mg_str* source, struct mg_str* items);
void FO_rm_dir(char* src);