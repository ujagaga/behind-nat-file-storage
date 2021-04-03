#!/bin/bash

CFG_FILE=/root/.bnfs/settings.cfg

# Extract subdomain from config file
subdomain=""
if test -f "$CFG_FILE"; then
  while read p; do
    if [[ $p == "SUBDOMAIN"* ]]; then
      subdomain="$(echo $p | cut -d' ' -f2)"

      sleep 10
      # Wait for internet connectivity to http:
      while ! ping -q -c 1 -W 1 8.8.8.8 > /dev/null; do
        echo No Internet connection
        sleep 10
      done

      /usr/local/bin/lt -p $1 -s $subdomain
    fi
  done < $CFG_FILE
else
  echo "$CFG_FILE not found."
fi


