#!/bin/bash

# This script is intended for quick folder serve.

SCRIPT_RELATIVE_PATH=$(dirname "$0")
SCRIPT_FULL_PATH="$(realpath -s $0)"
SCRIPT_DIR="$(dirname $SCRIPT_FULL_PATH)"
cd $SCRIPT_DIR

# Helper script for quick folder serve to also display the IP address before the file server starts.
# If using xfce, call from thunar using:
# exo-open --launch TerminalEmulator /opt/bnfs/bin/share_files.sh %f
# To use manually, run like: ./opt/bnfs/bin/share_files.sh <folder/to/share>

# To use on your computer just change the WIFI name accordingly. Check the wifi card name by running "ip a"
WIFI_CARD_NAME="enp6s0"


#ip="$(ip a | grep -A 1 'wlp1s0' | tail -1)"
myip="$(ip a | grep -A 1 $WIFI_CARD_NAME | grep -A 1 'inet' | grep -oE '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b')"
firstip="$(echo $myip | cut -d ' ' -f 1)"

echo
echo "Sharing files from: $1" 
echo "URL: http://$firstip:8000"
echo
echo
echo
./tunnel_starter.sh 8000 $HOME &
./bnfs -p 8000 -d $1

