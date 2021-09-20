#!/bin/sh

docker build --no-cache -t tokenbridge:latest .

FEDERATOR=$PWD/federator
FEDERATOR_DB=$FEDERATOR/db
FEDERATOR_LOG=$FEDERATOR/federator.log
FEDERATOR_HEART=$FEDERATOR/heartbeat.log

mkdir -p $FEDERATOR
test -f $FEDERATOR_DB || touch $FEDERATOR_DB
test -f $FEDERATOR_HEART || touch $FEDERATOR_HEART
test -f $FEDERATOR_LOG || touch $FEDERATOR_LOG

docker run --rm \
	-v $PWD/federator/db:/app/federator/db \
	-v $PWD/federator/heartbeat.log:/app/federator/heartbeat.log \
	-v $PWD/federator/config/config.js:/app/federator/built/federator/config/config.js \
	-v $PWD/federator/federator.log:/app/federator/federator.log \
	tokenbridge:latest
