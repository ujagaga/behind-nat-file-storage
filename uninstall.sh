#!/bin/bash

INSTALL_DIR="/opt/bnfs"
CFG_LOCATION=/root/.bnfs

# Make sure we are running as root
if (( $EUID != 0 )); then
  redecho "Please run as root!"
  exit 1
fi

echo
echo "------------------------------------------------------------------"
echo '*************** "Behind NAT File Server" uninstaller ***************'
echo "------------------------------------------------------------------"
echo "This script will only remove installed services and files."
echo "The installed libraries will not be removed."
read -r -p "proceed (N/y)? " OK
if [ "$OK" == "y" ]; then
    sudo rm -rf $INSTALL_DIR
    sudo rm -rf $CFG_LOCATION
    cd /etc/systemd/system/
    systemctl stop lt_tunnel.service
    systemctl disable lt_tunnel.service
    rm -f lt_tunnel.service
    systemctl stop lcd_display.service
    systemctl disable lcd_display.service
    rm -f lcd_display.service
    systemctl stop bnfs.service
    systemctl disable bnfs.service
    rm -f bnfs.service
    echo "Could not remove /opt/bnfs/bin/thumbnail_cleanup.py form crontab. Please check: sudo crontab -e"

else
    echo "Aborted!"
fi

