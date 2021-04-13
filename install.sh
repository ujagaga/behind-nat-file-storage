#!/bin/bash

INSTALL_DIR="/opt/bnfs"
CFG_LOCATION=/root/.bnfs
PROJECT_NAME=behind-nat-file-storage
GIT_URL=https://github.com/ujagaga/$PROJECT_NAME.git
GIT_BRANCH=master
TEMP_DIR="/tmp"
UPDATES_FILE="update.info"
APP_NAME=bnfs
SRC_DIR=src
USB_MOUNT_PACKET=usbmount_0.0.24_all.deb
LOGFILE="install.log"

# Make sure we are in the script dir and not working in the caller dir.
SCRIPT="$(realpath -s $0)"
SCRIPT_DIR="$(dirname $SCRIPT)"
rm -rf $INSTALL_DIR

redecho(){
  echo "$(tput setaf 1)${1}$(tput sgr0)"
}

logwrite(){
  echo "${1}" >> "$INSTALL_DIR/$LOGFILE"
}

logecho(){
  echo "$(tput setaf 1)${1}$(tput sgr0)"
  echo "${1}" >> $INSTALL_DIR/$LOGFILE
  echo "Log saved to $INSTALL_DIR/$LOGFILE"
}

# Make sure we are running as root so we can install dependencies.
if (( $EUID != 0 )); then
  redecho "Please run as root!"
  exit 1
fi

echo
echo "------------------------------------------------------------------"
echo '*************** "Behind NAT File Server" installer ***************'
echo "------------------------------------------------------------------"

OK=n
while [ $OK != "y" ]
do
  echo
  echo "Please setup parameters"
  read -r -p "Port for HTTP server (ENTER for default: 80): " PORT
  PORT=${PORT:-80}

  read -r -p "Folder to serve (default: /media/usb0): " SERVE_DIR
  SERVE_DIR=${SERVE_DIR:-/media/usb0}

  echo
  read -r -p "Is this setup acceptable (N/y)? " OK
  OK=${OK:-n}
done

mkdir $INSTALL_DIR
echo
echo "*************** Installing dependencies ***************"
apt install -y python3-pip git python3-dev i2c-tools python3-libgpiod nodejs npm libvips libvips-tools
pip3 install OrangePi.GPIO
npm install -g localtunnel

logwrite "Installed python3-pip git python3-dev i2c-tools python3-libgpiod nodejs npm OrangePi.GPIO and localtunnel."
echo
read -r -p "Do you want to install usbmount library to automatically mount usb storage (N/y)? " OK
OK=${OK:-n}
if [ "$OK" == "y" ]; then
  # Install USBMOUNT library from source
  cd $TEMP_DIR || { logecho "ERROR: Could not find temp dir: $TEMP_DIR"; exit 1; }
  apt install -y debhelper build-essential && logwrite "Installed debhelper and build-essential."
  echo "cleaning up if necessary"
  rm -rf usbmount
  git clone https://github.com/rbrito/usbmount
  cd usbmount
  dpkg-buildpackage -us -uc -b
  cd ..
  apt install -y ./usbmount*.deb
  if [[ $? > 0 ]]
  then
      logwrite "Failed to install usb mount package."
  else
      logwrite "Installed usb mount package."
  fi
fi

echo
echo "*************** Downloading app files ***************"
# Fetch the repository.
cd $TEMP_DIR || { redecho "ERROR: Could not find temp dir: $TEMP_DIR"; exit 1; }
echo "cleaning up if necessary"
rm -rf $PROJECT_NAME
git clone $GIT_URL
cd $PROJECT_NAME || { redecho "ERROR: Could not find repository folder: $PROJECT_NAME. Are you sure the configured repository exists"; exit 1; }
git checkout $GIT_BRANCH

$SRC_DIR/build.sh

while read p; do
    if [[ -d $p ]]; then
        cp -rf $p $INSTALL_DIR
    elif [[ -f $p ]]; then
        mv -f $p $INSTALL_DIR
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
if [ "$OK" == "y" ]; then
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
    echo ExecStart=/opt/bnfs/bin/tunnel_starter.sh $PORT $CFG_LOCATION
    echo
    echo "[Install]"
    echo WantedBy=multi-user.target
  } > $TUNNEL_FILE
  systemctl enable $TUNNEL_FILE
  logwrite "Enabled external access tunnel."
else
  logwrite "External access tunnel not enabled."
fi

echo
read -r -p "Enable 16x2 LCD driver at startup (N/y)? " OK
OK=${OK:-n}
if [ "$OK" == "y" ]; then
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
    echo ExecStart=/opt/bnfs/bin/LCD_Driver.py
    echo
    echo "[Install]"
    echo WantedBy=multi-user.target
  } > $LCD_FILE
  systemctl enable $LCD_FILE
  logwrite "Enabled LCD display driver."
else
  logwrite "LCD display driver not enabled."
fi

echo
read -r -p "Enable Behind NAT file server at startup (N/y)? " OK
OK=${OK:-n}
if [ "$OK" == "y" ]; then
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
    echo ExecStart=/opt/bnfs/bin/bnfs -p $PORT -d $SERVE_DIR
    echo
    echo "[Install]"
    echo WantedBy=multi-user.target
  } > $BNFS_FILE
  systemctl enable $BNFS_FILE
  logwrite "Enabled BNFS at startup."
else
  logwrite "BNFS not enabled at startup."
fi

echo "Full log is available at:  $INSTALL_DIR/$LOGFILE"
