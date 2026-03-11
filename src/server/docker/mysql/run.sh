#!/bin/sh
# This script is used to run the MySQL container with 
#the necessary environment variables and volume mounts.
# It also ensures that the initialization scripts are properly mounted to the container.

QUERY="$1"
# Run the MySQL container with the specified environment variables and volume mounts
mysql -uroot -proot -sandbox -e "$QUERY"

#ofc for linux you dummy