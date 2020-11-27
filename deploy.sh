#!/bin/bash

UPDATE=$1
DEST_DIR=$2
FED_KEY=""
MAIN_BLOCK_NUMBER=""
SIDE_BLOCK_NUMBER=""

cd $DEST_DIR/federator

quit() {
    if [ $1 -eq 1 ]; then
        echo "ERROR: "$2
    else
        echo $2
    fi
    exit $1
}

config() {
    cp $DEST_DIR/federator/config/config.sample.js $DEST_DIR/federator/config/config.js &&
        sed -i "s|rsktestnet-kovan|rskmainnet|g" $DEST_DIR/federator/config/config.js &&
        sed -i "s|kovan|ethmainnet|g" $DEST_DIR/federator/config/config.js &&
        return 0
    quit 1 "There was a problem setting the configuration, please verify."
}

dependencies() {
    echo "Installing required packages ..."
    npm install &&
        echo "Packages installed" &&
        return 0
    quit 1 "There was an error installing the needed packages, please check"
}

key() {
    read -sp "Enter the private key of the federator member " $FED_KEY
    echo ""
    echo $FED_KEY > $DEST_DIR/federator/config/federator.key &&
        return 0
    quit 1 "There was an error saving the private key."
}

block_exists() {
    [ -f "$DEST_DIR/federator/db/lastBlock.txt" ] &&
        [ -f "$DEST_DIR/federator/db/side-fed/lastBlock.txt" ] &&
        return 0
    return 1
}

block() {
    read -p "Enter the block number of RSK mainchain to start syncing [2683829] " $MAIN_BLOCK_NUMBER
    MAIN_BLOCK_NUMBER=${MAIN_BLOCK_NUMBER:-"2683829"}
    read -p "Enter the block number from Eth chain to start syncing [10823910] " $SIDE_BLOCK_NUMBER
    SIDE_BLOCK_NUMBER=${SIDE_BLOCK_NUMBER:-"10823910"}
    [ ! -z "${MAIN_BLOCK_NUMBER}" ] &&
        echo $MAIN_BLOCK_NUMBER > $DEST_DIR/federator/db/lastBlock.txt
    [ ! -z "${SIDE_BLOCK_NUMBER}" ] &&
        echo $SIDE_BLOCK_NUMBER > $DEST_DIR/federator/db/side-fed/lastBlock.txt
    block_exists &&
        echo "Blocks number configured suscessfully" &&
        return 0
    quit 1 "There was a problem configuring the block numbers"
}

build() {
    cd $DEST_DIR
    #docker build . -t fed-tokenbridge &&
        echo "Docker image created suscessfully" &&
        return 0
    quit 1 "There was a problem creating the docker image"
}

run_message() {
    RUN_MESSAGE="docker run --rm \
    --network host \
    -v $PWD/federator/config:/app/federator/config \
    -v $PWD/federator/db:/app/federator/db \
    --name=fed-tokenbridge \
    fed-tokenbridge:latest"
}

if [ $UPDATE -eq 1 ]; then
    echo "Installing the token bridge federate node"
    config &&
        key &&
        block &&
        dependencies &&
        build &&
        run_message &&
        echo "To run the federate node container execute: " &&
        quit 0 "$RUN_MESSAGE"
    quit 1 "Error installing the token bridge federate node"
elif [ $UPDATE -eq 0 ]; then
    echo "Updating the token bridge federate node"
    dependencies &&
        build &&
        run_message &&
        echo "To run the federate node container execute: " &&
        quit 0 "$RUN_MESSAGE"
    quit 1 "Error updating the token bridge federate node"
else
    quit 1 "The valid values for the script are 0 to install and 1 to update"
fi