#pragma once

#include "mongoose.h"
#include <string.h>

extern char ext_response[1024];

int FO_run_operation(const char* root_dir, struct mg_str* operation, struct mg_str* source, struct mg_str* destination, struct mg_str* items);