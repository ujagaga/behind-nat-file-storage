#!/bin/bash

INSTALL_DIR=/opt/bnfs
PROJECT_NAME=behind-nat-file-storage
GIT_URL=https://github.com/ujagaga/$PROJECT_NAME.git
GIT_BRANCH=master
TEMP_DIR="/tmp"
UPDATES_FILE="./update.info"
APP_NAME=bnfs
SRC_DIR=src

# Make sure we are in the script dir and not working in the caller dir.
SCRIPT="$(realpath -s $0)"
SCRIPT_DIR="$(dirname $SCRIPT)"

redecho(){
    echo "$(tput setaf 1)${1}$(tput sgr0)"
}

# Make sure we are running as root so we can install dependencies.
if (( $EUID != 0 )); then
    redecho "Please run as root!"
    exit 1
fi

echo
echo '*************** "Behind NAT File Server" installer ***************'

OK=n
while [ $OK != "y" ]
do
  echo
  echo "Please setup parameters"
  read -r -p "Port for HTTP server (ENTER for default: 80): " PORT
  PORT=${PORT:-80}

  read -r -p "Folder to serve (default: /media/usb0): " SERVE_DIR
  SERVE_DIR=${SERVE_DIR:-/media/usb0}

  SAMPLE=$(cat /dev/urandom | tr -dc 'a-z' | fold -w 8 | head -n 1)
  read -r -p "Subdomain for external access (default, random, can be changed later: $SAMPLE): " SUBDOMAIN
  SUBDOMAIN=${SUBDOMAIN:-$SAMPLE}

  echo
  read -r -p "Is this setup acceptable (N/y)? " OK
  OK=${OK:-n}
done

echo "*************** Installing dependencies ***************"
apt install python3-pip git python3-dev i2c-tools python3-libgpiod nodejs npm
pip3 install OrangePi.GPIO
npm install -g localtunnel
echo
echo "*************** Downloading app files ***************"
mkdir $INSTALL_DIR
# Fetch the repository.
cd $TEMP_DIR || { redecho "ERROR: Could not find temp dir: $TEMP_DIR"; exit 1; }
echo cleaning up if necessary
rm -rf $PROJECT_NAME
git clone $GIT_URL
cd $PROJECT_NAME || { redecho "ERROR: Could not find repository folder: $PROJECT_NAME. Are you sure the configured repository exists"; exit 1; }
git checkout $GIT_BRANCH

cd $SRC_DIR || { rm -rf $INSTALL_DIR; redecho "ERROR: Directory $TEMP_DIR/$PROJECT_NAME/$SRC_DIR DOES NOT exist. Can not continue."; exit 1; }
./build.sh

if [ ! -f "$APP_NAME" ];then
    redecho "ERROR: Application file $APP_NAME DOES NOT exist. Can not continue."
    rm -rf $INSTALL_DIR
    exit 1
fi

mv $APP_NAME $INSTALL_DIR
cd ..
while read p; do
    if [[ -d $p ]]; then
        cp -rf $p $SCRIPT_DIR
    elif [[ -f $p ]]; then
        mv -f $p $SCRIPT_DIR
    fi
done < $UPDATES_FILE

# Check last commit timestamp
GIT_LOG="$(git log -1 --date=raw | grep Date)"
GIT_TIMESTAMP="$(echo $GIT_LOG | cut -d ' ' -f 2)"
echo $GIT_TIMESTAMP > $INSTALL_DIR/current_version.info

# Remove cloned repository
rm -rf $TEMP_DIR/$PROJECT_NAME

echo
read -r -p "Enable external tunnel at startup (N/y)? " OK
OK=${OK:-n}
if [ "$OK" != "y" ]; then
  cd /etc/systemd/system/ || { redecho "ERROR: Could not find /etc/systemd/system/. Are you sure this is a compatible platform?"; exit 1; }

  # Create external tunnel service
  TUNNEL_FILE=lt_tunnel.service
  {
    echo "[Unit]"
    echo Description=External access tunnel
    echo
    echo "[Service]"
    echo Type=simple
    echo RemainAfterExit=yes
    echo ExecStart=/opt/bnfs/tunnel_starter.sh
    echo
    echo "[Install]"
    echo WantedBy=multi-user.target
  } > $TUNNEL_FILE
  systemctl enable $TUNNEL_FILE
fi

echo
read -r -p "Enable 16x2 LCD driver at startup (N/y)? " OK
OK=${OK:-n}
if [ "$OK" != "y" ]; then
  cd /etc/systemd/system/ || { redecho "ERROR: Could not find /etc/systemd/system/. Are you sure this is a compatible platform?"; exit 1; }

  # Create 16x2 LCD service
  LCD_FILE=lcd_display.service
  {
    echo "[Unit]"
    echo Description=LCD service to display IP and external address
    echo
    echo "[Service]"
    echo Type=simple
    echo Restart=always
    echo RestartSec=10
    echo RemainAfterExit=yes
    echo ExecStart=/opt/bnfs/LCD_Driver.py
    echo
    echo "[Install]"
    echo WantedBy=multi-user.target
  } > $LCD_FILE
  systemctl enable $LCD_FILE
fi

echo
read -r -p "Enable Behind NAT file server at startup (N/y)? " OK
OK=${OK:-n}
if [ "$OK" != "y" ]; then
  cd /etc/systemd/system/ || { redecho "ERROR: Could not find /etc/systemd/system/. Are you sure this is a compatible platform?"; exit 1; }

  # Create BNFS service
  BNFS_FILE=bnfs.service
  {
    echo "[Unit]"
    echo Description=Behind NAT file service
    echo After=network-online.target
    echo Wants=network-online.target
    echo
    echo "[Service]"
    echo Type=simple
    echo Restart=always
    echo RestartSec=10
    echo RemainAfterExit=yes
    echo User=root
    echo ExecStart=/opt/bnfs/$APP_NAME -p $PORT -d $SERVE_DIR
    echo
    echo "[Install]"
    echo WantedBy=multi-user.target
  } > $BNFS_FILE
  systemctl enable $BNFS_FILE
fi




