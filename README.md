# SmartBCH Token Bridge

SmartBCH Token Bridge that allows to move ERC20 tokens from Ethereum / Binance Smart Chain to the other.

## Overview

Forked from [RSK Token Bridge](https://tokenbridge.rsk.co/), deployment codes modified for SmartBCH use without modifying contract codes.

## Contracts deployed on SmartBCH, Ethereum, and Binance Smart Chain

### SmartBCH - Ethereum Bridge

#### SmartBCH side

[bridge](https://www.smartscan.cash/address/0xf0b94070fd55b74a766cc0cef961944e5c4c3493)

[federation](https://www.smartscan.cash/address/0xe6eb40300e2666c57fe09660420021edbb3bb638)

[multisig](https://www.smartscan.cash/address/0x4b535dc383a34b0dadbfc161fab9c7c71ad2c95c)

[allowtokens](https://www.smartscan.cash/address/0x58218b74548ac223cb90392177a42d371a94279c)

#### Ethereum side

[bridge](https://etherscan.io/address/0x0fa0b4cc33d5a4f0ed073ca7f88259ab75c7a98b)

[federation](https://etherscan.io/address/0x18a6d00b2e7fe50c7cbdd3ed9b2fc00a6630e7e2)

[multisig](https://etherscan.io/address/0x319b64a5ebee44d270d79b5bd478f8e0aa28d182)

[allowtokens](https://etherscan.io/address/0x900fb32d746d4ee1cc3d500f3eafb02a89783047)

### SmartBCH - Binance Smart Chain Bridge

#### SmartBCH side

[bridge](https://www.smartscan.cash/address/0x5634e72c9c20ae2b2f3094303e7b18bb817c88cf)

[federation](https://www.smartscan.cash/address/0x792ed489fcd28c52a4502dcf08326822479b12e2)

[multisig](https://www.smartscan.cash/address/0x50eef54fe616a7d92e41b2f47486bb9e03393767)

[allowtokens](https://www.smartscan.cash/address/0xcd067b74c3bee97b448f57d7e686d6fe66c1809a)

#### Binance Smart Chain side

[bridge](https://bscscan.com/address/0x6658010f8eb89889e5fcec7178f87a219f076166)

[federation](https://bscscan.com/address/0x5e507fc0304a01e90fef894db3833196a3c43013)

[multisig](https://bscscan.com/address/0x9e163d98c09da4debae442b070b04be217d97bcb)

[allowtokens](https://bscscan.com/address/0x06587228b1b848e6c23ffd454a5944872b151fb4)

### How to deploy Federation node

### Preparing server instance for federation node.

It is recommended to use at least 2 cores VPS with enough ram and swap memory space to ensure that the federation node works fine without crashing.

For example, spinning up clean AWS / DigitalOcean / Linode / Vultr / Bitlaunch.io Ubuntu 20 instance and logging on root / non-root sudo permission.

```bash
# Update ubuntu system libraries
sudo apt-get update && sudo apt-get -y upgrade && sudo apt-get -y dist-upgrade
# Reboot server to apply updates
sudo reboot
# Install docker-ce
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null && sudo apt-get update && sudo apt-get install -y build-essential docker-ce docker-ce-cli containerd.io && sudo systemctl enable docker
# Clone this repository
git clone --depth 1 https://github.com/tokenbridgecash/tokenbridge
# Copy configuration file to spin up bch-eth bridge
cd tokenbridge && cp federator/config/config.eth-example.js federator/config/config.js
# Replace d909047b7115a8f7e100d31f33b71fce4e2ff07cc8f0e7fba959e214265dfd21 to your validator address's private key.
sed -i 's/<your-private-key-here>/d909047b7115a8f7e100d31f33b71fce4e2ff07cc8f0e7fba959e214265dfd21/g' federator/config/config.js
# Build docker image
sudo docker build . -t fed-tokenbridge
# Run validation docker node
sudo docker run -d \
    --network host \
    --restart always \
    -v $PWD/federator/config:/app/federator/config \
    --name=fed-tokenbridge \
    fed-tokenbridge:latest
# Clone another repository for bch-bsc bridge
cd .. && git clone --depth 1 https://github.com/tokenbridgecash/tokenbridge tokenbridge-bsc
# Copy configuration file
cd tokenbridge-bsc && cp federator/config/config.bsc-example.js federator/config/config.js
# Replace d909047b7115a8f7e100d31f33b71fce4e2ff07cc8f0e7fba959e214265dfd21 to your other validator address's private key.
sed -i 's/<your-private-key-here>/d909047b7115a8f7e100d31f33b71fce4e2ff07cc8f0e7fba959e214265dfd21/g' federator/config/config.js
# Replace default port 5000 to another one in order to avoid conflict.
sed -i 's/5000/5001/g' federator/config/config.js
# Build docker image
sudo docker build . -t fed-tokenbridge-bsc
# Run validation docker node
sudo docker run -d \
    --network host \
    --restart always \
    -v $PWD/federator/config:/app/federator/config \
    --name=fed-tokenbridge-bsc \
    fed-tokenbridge-bsc:latest
# Check logs if the spinned up federators work fine
sudo docker logs fed-tokenbridge && sudo docker logs fed-tokenbridge-bsc
```

### config

To run the federator using Docker first, go to the /federator/config folder and copy `config.eth-sample.js` or `config.bsc-sample.js` to `config.js`. In that file you will decide the networks the federate must be listening, for example for the bridge in bsc-bch a federator config.js will look like

```js
const fs = require('fs');
module.exports = {
    mainchain: require('./bchforbscmainnet.json'), //the json containing the smart contract addresses in bch
    sidechain: require('./bscmainnet.json'), //the json containing the smart contract addresses in eth
    runEvery: 1, // In minutes,
    confirmations: 120, // Number of blocks before processing it, if working with ganache set as 0
    privateKey: '<your-private-key-here>',
    storagePath: './db',
    runHeartbeatEvery: 1, // In hours
    endpointsPort: 5000, // Server port
}
```

You need to change '<your-private-key-here>' part to your validation wallet's private key. (For example, the format should be `d909047b7115a8f7e100d31f33b71fce4e2ff07cc8f0e7fba959e214265dfd21` without 0x prefix at front.)

Make sure the wallet address has enough funds to cover gas fees for validation (submitting cross-chain events). Also, the wallet address must be added as a member of federation and multi-sig wallet owner.

In case running multiple bridge validators at a single instance, change port for different validation instances!

Also, it is recommended to use different wallet address between validation bridges to avoid submitting duplicated nonces!

### Latest block

The federator will use the block number in  `./federator/db/latestBlock.txt` for the main chain and `./federator/db/side-fed/latestBlock.txt` for the side chain as starting point. This is important as the federator will increase the number each time it successfully polls for blocks, and indicates the last block run.
If this files don't exist, the program will automatically create them using the `config.fromBlock` number. This is ok, but the default config number is the creation of the contract and may be too far from the current block number, having a negative impact in performance even preventing the program from running. This is way it should be as closest as the current block number minus the confirmations blocks as posible.

### Docker image

Once you have  changed this configurations create the **docker image from the root folder** using.
`docker build . -t fed-tokenbridge`

Then run :

```sh
docker run --rm \
    --network host \
    -v $PWD/federator/config:/app/federator/config \
    -v $PWD/federator/db:/app/federator/db \
    --name=fed-tokenbridge \
    fed-tokenbridge:latest
```

to start the image.

### Status endpoint

This endpoint is introduced, in order to better monitor health status on the Federator processes running.

* **<DOMAIN:PORT>/isAlive**

* **Method:**

  `GET`

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `{ "status" : "ok" }`
