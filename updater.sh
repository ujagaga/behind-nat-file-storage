#!/bin/bash

# https://github.com/ujagaga/behind-nat-file-storage.git
# Global variables
VERSION_FILE="current_version.info"
PROJECT_NAME=behind-nat-file-storage
GIT_URL=https://github.com/ujagaga/$PROJECT_NAME.git
GIT_BRANCH=master
TEMP_DIR="/tmp"    # Use /tmp in RAM to reduce file system wear. The repo should never be too big anyway.
UPDATES_FILE="./update.info"

# Make sure we are in the script dir and not working in the caller dir.
SCRIPT="$(realpath -s $0)"
SCRIPT_DIR="$(dirname $SCRIPT)"
cd $SCRIPT_DIR

# Get current version
CURRENT_V="$(cat $VERSION_FILE)"
if [ "$?" -eq "1" ]; then
    # Operation failed
    CURRENT_V=0
fi

# Fetch the repository. Use /tmp/ to reduce file system wear
cd $TEMP_DIR
git clone $GIT_URL
cd $PROJECT_NAME
git checkout $GIT_BRANCH

# Check last commit timestamp 
GIT_LOG="$(git log -1 --date=raw | grep Date)"
GIT_TIMESTAMP="$(echo $GIT_LOG | cut -d ' ' -f 2)"

# Compare current with available
echo Current: $CURRENT_V
echo Available: $GIT_TIMESTAMP

if [ "$GIT_TIMESTAMP" -gt "$CURRENT_V" ]; then
    echo "Updating..."

    src/build.sh

    while read p; do
        if [[ -d $p ]]; then
            cp -rf $p $SCRIPT_DIR
        elif [[ -f $p ]]; then
            mv -f $p $SCRIPT_DIR
        fi
    done < $UPDATES_FILE

    echo "Update finished. Please restart to apply changes"
    cd $SCRIPT_DIR
    echo $GIT_TIMESTAMP > current_version.info
else
    echo "No new updates."
    cd $SCRIPT_DIR
fi
# Remove cloned repository
rm -rf $TEMP_DIR/$PROJECT_NAME
