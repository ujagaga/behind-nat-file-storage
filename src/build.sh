#!/bin/bash

# Make sure we are in the script dir and not working in the caller dir. 
# Also make sure there are no spaces in the current path.
SCRIPT="$(realpath -s $0)"
SCRIPT_DIR="$(dirname $SCRIPT)"
cd "$SCRIPT_DIR"
TARGET="../bin/bnfs"

echo
echo
python3 ./html_source/convert_to_string.py
mv ./html_source/*.h .
gcc web_file_server.c mongoose.c cfg.c -g -W -Wall -Wno-unused-function -DMG_DISABLE_DAV_AUTH -DMG_ENABLE_FAKE_DAVLOCK -pthread -Wno-format-truncation -o $TARGET
