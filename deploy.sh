#!/bin/bash

UPDATE=0
DEST_DIR=""
FED_KEY=""
MAIN_BLOCK_NUMBER=""
SIDE_BLOCK_NUMBER=""
MAIN_BLOCK=""
SIDE_BLOCK=""
ETH_HOST=""
RSK_HOST=""
PROGRAMS="docker npm nodejs jq"

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
        sed -i "s|rsktestnet-goerly|rskmainnet|g" $DEST_DIR/federator/config/config.js &&
        sed -i "s|goerly|ethmainnet|g" $DEST_DIR/federator/config/config.js &&
        return 0
    quit 1 "There was a problem setting the configuration, please verify."
}

check_required_programs() {
    echo "Checking for required programs..."
    rc=0
    for program in $PROGRAMS; do
        if ! command -v "$program" >/dev/null 2>&1; then
            rc=1
            echo "$program: command not found"
        fi
    done
    if [ $rc -ne 0 ]; then
        quit 1 "Requirements not acomplished"
    fi
}

dependencies() {
    echo "Installing required packages ..."
    npm install &&
        echo "Packages installed" &&
        return 0
    quit 1 "There was an error installing the needed packages, please check"
}

key() {
    while [ ! -f $DEST_DIR/federator/config/federator.key ]; do
        read -p "Please move your private key to $DEST_DIR/federator/config/federator.key, then press any key to continue " FED_KEY
        continue
    done
    echo ""
    echo "Private key placed on $DEST_DIR/federator/config/federator.key"
    return 0
}

block_exists() {
    grep -q '^[0-9]*$' "$DEST_DIR/federator/db/lastBlock.txt" 2>/dev/null &&
        grep -q '^[0-9]*$' "$DEST_DIR/federator/db/side-fed/lastBlock.txt" 2>/dev/null &&
        return 0
    return 1
}

eth_host(){
    read -p "Please enter your ETH host address along with the RPC port, (https://127.0.0.1:8545) " ETH_HOST
    [ ! -z "${ETH_HOST}" ] &&
        sed -i "s|<YOUR HOST URL AND PORT>|$ETH_HOST|g" $DEST_DIR/federator/config/ethmainnet.json &&
        return 0
    quit 1 "There was an error setting the ETH host and port"
}

rsk_host(){
    read -p "Please enter your RSK host address along with the RPC port, (https://127.0.0.1:4444) " RSK_HOST
    [ ! -z "${RSK_HOST}" ] &&
        sed -i "s|<YOUR HOST URL AND PORT>|$RSK_HOST|g" $DEST_DIR/federator/config/rskmainnet.json &&
        return 0
    quit 1 "There was an error setting the RSK host and port"
}

last_block_rsk() {
    MAIN_BLOCK_NUMBER=$(curl -fSs 'https://backend.explorer.rsk.co/api?module=blocks&action=getBlocks&limit=1' |
        jq -r '.data[0].number')
    [ "$MAIN_BLOCK_NUMBER" != "null" ]
}

last_block_eth() {
    SIDE_BLOCK_NUMBER=$(curl -fSs  https://api.blockcypher.com/v1/eth/main | jq -r '.height')
    [ "$SIDE_BLOCK_NUMBER" != "null" ]
}

block() {
    last_block_eth &&
        last_block_rsk &&
        read -p "Enter the block number of RSK mainchain to start syncing [$MAIN_BLOCK_NUMBER] " MAIN_BLOCK &&
        read -p "Enter the block number from Eth chain to start syncing [$SIDE_BLOCK_NUMBER] " SIDE_BLOCK
    MAIN_BLOCK_NUMBER=${MAIN_BLOCK:-$MAIN_BLOCK_NUMBER}
    SIDE_BLOCK_NUMBER=${SIDE_BLOCK:-$SIDE_BLOCK_NUMBER}
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
    docker build -t fed-tokenbridge . &&
        echo "Docker image created suscessfully" &&
        return 0
    quit 1 "There was a problem creating the docker image"
}

run_message() {
    RUN_MESSAGE="docker run -d --rm \
    --network host \
    -v $DEST_DIR/federator/config:/app/federator/config \
    -v $DEST_DIR/federator/db:/app/federator/db \
    --name=fed-tokenbridge \
    fed-tokenbridge:latest"
}

setup() {
    dependencies &&
        build &&
        run_message &&
        echo "To run the federate node container execute: " &&
        quit 0 "$RUN_MESSAGE"
}

if [ ! -z $1 ]; then
    UPDATE=$1
else
    quit 1 "Undefinied parameter. 0 for install, 1 to update."
fi

if [ ! -z $2 ]; then
    DEST_DIR=$2
else
    quit 1 "Undefined DEST_DIR"
fi

check_required_programs

cd $DEST_DIR/federator

if [ $UPDATE -eq 1 ]; then
    echo "Installing the token bridge federate node"
    rsk_host &&
        eth_host &&
        config &&
        key &&
        block &&
        setup &&
        quit 0
    quit 1 "Error installing the token bridge federate node"
elif [ $UPDATE -eq 0 ]; then
    echo "Updating the token bridge federate node"
    setup &&
        quit 0
    quit 1 "Error updating the token bridge federate node"
else
    quit 1 "The valid values for the script are 0 to install and 1 to update"
fi
