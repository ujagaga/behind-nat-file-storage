#!/bin/bash

TARGET_DIR=/opt/bnfs
SCRIPT_FULL_PATH="$(realpath -s $0)"
SCRIPT_DIR="$(dirname $SCRIPT_FULL_PATH)"
SRC_DIR=$SCRIPT_DIR/..

cd $SCRIPT_DIR

sudo mkdir $TARGET_DIR
sudo cp $SRC_DIR/updater.sh $TARGET_DIR

sudo chmod +x $TARGET_DIR/updater.sh
$TARGET_DIR/updater.sh

cp lt_tunnel.service /etc/systemd/system/
systemctl enable lt_tunnel.service

cp lcd_display.service /etc/systemd/system/
systemctl enable lcd_display.service

cp bnfs.service /etc/systemd/system/
systemctl enable bnfs.service
