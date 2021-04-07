# Federator

Presents the event and necesary information to validate it on the other network
The federator is an off-chain process which performs voting actions to validate transactions between a Mainchain (source) and a Sidechain (target) network. These transactions are obtained from the Bridge contract on the Mainchain using event logs and voted in the Sidechain through a Federation contract. Once all required signers (federators) vote for a transaction the Federation contract starts the process to release the funds on the Sidechain.
The federators will be the owners of the contracts willing to allow to cross their tokens, and by doing so staking they reputation.

## Config

Go to /federator/config copy `config.sample.js` file and rename it to `config.js` set mainchain and sidechain to point to the json files of the networks you are suing, for example rsktestnet-kovan.json and kovan.json, `make sure to set the host parameter of those files`. Create the file `federator.key` inside the config folder, and add the private key of the member of the Federation contract. The members of the federation are controled by the MultiSig contract, same that is owner of the Bridge and AllowedTokens contracts.
You will also need to add an [etherscan api key](https://etherscan.io/myapikey) in this config file.
## Usage

Run `npm install` to install the dependencies, make sure you followed the previous config step. Then to start the service run `npm start` which will start a single federator that listen to both networks. Check the logs to see that everything is working properly.

## Test

To run an integration test use `npm run integrationTest`. The integration test will use a preconfigured private key (from `config.js`) which is assumed to be the only member of the Federation contract.
In order to test with multiple federators, ensure they're added as members of the Federation contract and pass their private keys as a comma separated string for both chains as arguments of the integration test script. For instance:
`node integrationTest.js "privKeyM1, privKeyM2, privKeyMN" "privKeyS1, privKeyS2, privKeySN"`

## Run a Federator

### config

To run the federator using Docker first, go to the /federator/config folder and rename `config.sample.js` to `config.js`. In that file you will dedcide the networks the federate must be listening, for example for the bridge in testnet a federator config.js will look like

```js
module.exports = {
    mainchain: require('./rsktestnet-kovan.json'),
    sidechain: require('./kovan.json'),
    runEvery: 1, // In minutes,
    confirmations: 10,// Number of blocks before processing it,
    privateKey: require('federator.key'),
    storagePath: './db',
    etherscanApiKey: '<YOUR ETHERSCAN API KEY>',
}
```

where the mainchain for example is rsktestnet and the sidechain is kovan, the .json files are in the /federator/config folder and includes the addresses of the contracts in that network and the block number when they where deployed.
The order of sidechain and mainchain is not important is just which one is going to be checked first, as federators are bi directionals.
Inside the .json files there is also the host to that network, for example this is the rsktestnet-kovan.json

```json
{
    "bridge": "0x684a8a976635fb7ad74a0134ace990a6a0fcce84",
    "federation": "0x36c893a955399cf15a4a2fbef04c0e06d4d9b379",
    "testToken": "0x5d248f520b023acb815edecd5000b98ef84cbf1b",
    "multisig": "0x88f6b2bc66f4c31a3669b9b1359524abf79cfc4a",
    "allowTokens": "0x952b706a9ab5fd2d3b36205648ed7852676afbe7",
    "host": "<YOUR HOST URL AND PORT>",
    "fromBlock": 434075
}
```

You need to change `"<YOUR NODE HOST AND RPC PORT>"` for the url of your node for that network and the json rpc port,  host can only be `https or localhost`.
`Remember to do it for both networks`.
Also you need to create a `federators.key` file with the federator private in it.

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
