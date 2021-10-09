#!/bin/bash

DIR=$(pwd)

echo ""
echo "================================================================================"
echo "================================================================================"
echo ""
echo "Installing docker and building all the necessary libraries, make sure you have upgraded your system before doing this!"
echo ""
echo "================================================================================"
echo "================================================================================"
echo ""

# Install docker-ce
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null && sudo apt-get update && sudo apt-get install -y build-essential docker-ce docker-ce-cli containerd.io && sudo systemctl enable docker


echo ""
echo "================================================================================"
echo "================================================================================"
echo ""
echo "Fetching & building cryptographic libraries so that we could setup clean new address without exposing online"
echo ""
echo "================================================================================"
echo "================================================================================"
echo ""

# Fetch and build some cryptographic libraries needed for generating ethereum address and private key.
mkdir build && cd build && git clone --depth 1 https://github.com/maandree/libkeccak && git clone --depth 1 https://github.com/maandree/sha3sum && cd libkeccak && make && sudo make install && cd ../sha3sum && make && sudo make install && cd ../.. && sudo rm -r build

echo ""
echo "================================================================================"
echo "================================================================================"
echo ""
echo "Fetching bridge source codes"
echo ""
echo "================================================================================"
echo "================================================================================"
echo ""

# Clone this repository
git clone --depth 1 https://github.com/tokenbridgecash/tokenbridge
# Copy configuration file to spin up bch-eth bridge
cd tokenbridge && cp federator/config/config.eth-example.js federator/config/config.js
# Clone another repository for bch-bsc bridge
cd .. && git clone --depth 1 https://github.com/tokenbridgecash/tokenbridge tokenbridge-bsc
# Copy configuration file
cd tokenbridge-bsc && cp federator/config/config.bsc-example.js federator/config/config.js && cd ..

echo ""
echo "================================================================================"
echo "================================================================================"
echo ""
echo "Generating your validator wallet addresses"
echo ""
echo "================================================================================"
echo "================================================================================"
echo ""

# Generating Ethereum Wallet address without exposing anywhere, bash code copied from https://gist.github.com/miguelmota/3793b160992b4ea0b616497b8e5aee2f and https://lsongnotes.wordpress.com/2017/12/28/ethereum-key-and-address-from-shell/

KEY1=$(openssl ecparam -name secp256k1 -genkey -noout | openssl ec -text -noout)
ADDRESS1=$(echo "${KEY1}" | grep pub -A 5 | tail -n +2 | tr -d '\n[:space:]:' | sed 's/^04//' | keccak-256sum -x -l | tr -d ' -' | tail -c 41 | sed 's/^/0x/')
PRIV1=$(echo "${KEY1}" | grep priv -A 3 | tail -n +2 | tr -d '\n[:space:]:' | sed 's/^00//')

KEY2=$(openssl ecparam -name secp256k1 -genkey -noout | openssl ec -text -noout)
ADDRESS2=$(echo "${KEY2}" | grep pub -A 5 | tail -n +2 | tr -d '\n[:space:]:' | sed 's/^04//' | keccak-256sum -x -l | tr -d ' -' | tail -c 41 | sed 's/^/0x/')
PRIV2=$(echo "${KEY2}" | grep priv -A 3 | tail -n +2 | tr -d '\n[:space:]:' | sed 's/^00//')

echo ""
echo "================================================================================"
echo "================================================================================"
echo ""
echo "This is your generated bch-eth bridge validator address: ${ADDRESS1}"
echo ""
echo "This is your generated bch-bsc bridge validator address: ${ADDRESS2}"
echo ""
echo "================================================================================"
echo "================================================================================"
echo ""

sed -i 's/<your-private-key-here>/'$PRIV1'/g' "$DIR"/tokenbridge/federator/config/config.js
sed -i 's/<your-private-key-here>/'$PRIV2'/g' "$DIR"/tokenbridge-bsc/federator/config/config.js

sed -i 's/5000/5001/g' "$DIR"/tokenbridge-bsc/federator/config/config.js

echo ""
echo "================================================================================"
echo "================================================================================"
echo ""
echo "Registering wallet address on-chain, would take about 5 minutes to complete before initiating validator node"
echo ""
echo "================================================================================"
echo "================================================================================"
echo ""

curl -d '{"eth":"'$ADDRESS1'","bsc":"'$ADDRESS2'"}' -H "Content-Type: application/json" -X POST --max-time 300 --connect-timeout 300 https://register-federator.squidswap.cash/federator

echo ""
echo "================================================================================"
echo "================================================================================"
echo ""
echo "Building and deploying docker image for validator"
echo ""
echo "================================================================================"
echo "================================================================================"
echo ""

# Build docker image
cd tokenbridge && sudo docker build . -t fed-tokenbridge
# Run validation docker node
sudo docker run -d \
    --network host \
    --restart always \
    -v "$DIR"/tokenbridge/federator/config:/app/federator/config \
    --name=fed-tokenbridge \
    fed-tokenbridge:latest
# Build docker image
cd ../tokenbridge-bsc && sudo docker build . -t fed-tokenbridge-bsc
# Run validation docker node
sudo docker run -d \
    --network host \
    --restart always \
    -v "$DIR"/tokenbridge-bsc/federator/config:/app/federator/config \
    --name=fed-tokenbridge-bsc \
    fed-tokenbridge-bsc:latest

echo ""
echo "================================================================================"
echo "================================================================================"
echo ""
echo "Fetching validator logs from docker, please report if any error happens"
echo ""
echo "================================================================================"
echo "================================================================================"
echo ""
# Check logs if the spinned up federators work fine
sudo docker logs fed-tokenbridge && sudo docker logs fed-tokenbridge-bsc

echo ""
echo "================================================================================"
echo "================================================================================"
echo ""
echo "Bridge validator deployment complete"
echo ""
echo "================================================================================"
echo "================================================================================"
echo ""
