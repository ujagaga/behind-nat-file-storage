#!/bin/bash

temp=$(echo $(cat /sys/devices/virtual/thermal/thermal_zone0/temp) /1000 | bc)
echo $temp

