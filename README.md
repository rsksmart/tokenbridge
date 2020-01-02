# RSK <-> ETH Token Bridge

Ethereum/RSK Bridge that allows to move ERC20 tokens from one chain to the other.

## Rationale
Cross chain events are very important in the future of crypto. Exchanging tokens between networks allows the token holders to use them in their favorite chain without beeing restricted to the contract owner network choice. Moreover this also allows layer 2 solutions to use the same tokens on different chains, this concept together with stable coins creates a great way of payment with low volatility across networks.

## Overview
We have a smart contract bridge on each network, the bridge on one chain will receive and lock the tokens, then it will emmit an event that will be served to the bridge on the other chain. There is a Federation in charge of sending the event from one contract to the other.
See the [FAQ](./docs/FAQ.md) to know more about how it works!

The bridge contracts are upgradeable as we want to move to a decentralized bridge in the future. Here is the first 
[POC of the trustless decentralized bridge](https://github.com/rsksmart/tokenbridge/releases/tag/decentralized-poc-v0.1)

## Usage
You can use the ['Token Bridge Dapp'](https://tokenbridge.rsk.co/) together with [Nifty Wallet](https://chrome.google.com/webstore/detail/nifty-wallet/jbdaocneiiinmjbjlgalhcelgbejmnid) or [Metamask with custom network](https://github.com/rsksmart/rskj/wiki/Configure-Metamask-to-connect-with-RSK) to move tokens between networks. This is the [Dapp guide](./docs/DappGuide.md) if you don't know how to use it.
Or you can use a wallet or web3js with the abi of the contracts. See the ['interaction guide using MyCrypto'](./docs/UsingMyCrypto.md) for more information on how to use the bridge.


## Developers

### Contracts
The smart contracts used by the bridge and the deploy instructions are on the ['bridge folder'](./bridge/README.md)
The ABI to interact with the contracts are in the ['abis folder'](./abis)
Here are the ['addresses'](./docs/ContractAdddresses.md) of the deployed contrats in the different networks.

### Federation
There is a federation  in charge of notifying the events that happend in the bridge of one chain to the other. The federation is composed by creators of the token contracts that wants to enable their token for crossing.
See the ['federator'](./federator/README.md) for more information about the federator.

To run the federator using Docker first, go to the /federator/config folder and rename `config.sample.js` to `config.js`. In that file you will dedcide the networks the federate must be listening, for example for the bridge in testnet a federator config.js will look like
```
module.exports = {
    mainchain: require('./rsktestnet-kovan.json'),
    sidechain: require('./kovan.json'),
    runEvery: 1, // In minutes,
    confirmations: 10,// Number of blocks before processing it,
    privateKey: require('federator.key'),
    storagePath: './db'
}
```
where the mainchain is rsktestnet and the sidechain is kovan, the .json files are in the /federator/config folder and includes the addresses of the contracts in that network and the block number when they where deployed.
The order of sidechain and mainchain is not important is just which one is going to be checked first, as federators are bi directionals.
Inside the .json files there is also the host to that network, for example this is the rsktestnet-kovan.json
```
{
    "bridge": "0x684a8a976635fb7ad74a0134ace990a6a0fcce84",
    "federation": "0x36c893a955399cf15a4a2fbef04c0e06d4d9b379",
    "testToken": "0x5d248f520b023acb815edecd5000b98ef84cbf1b",
    "multisig": "0x88f6b2bc66f4c31a3669b9b1359524abf79cfc4a",
    "allowTokens": "0x952b706a9ab5fd2d3b36205648ed7852676afbe7",
    "host": ""<YOUR NODE HOST AND RPC PORT>"",
    "fromBlock": 434075
}
```
You need to change `"<YOUR NODE HOST AND RPC PORT>"` for the url of your node for that network and the json rpc port. `Remember to do it for both networks`.
Also you need to create a `federetaros.key` file with the federator private in it.
Once you have  changed this configurations create the docker image using.
`docker build . -t fed-tokenbridge`

Then run `docker run --rm -v $PWD/federator/config:/app/federator/config --name=fed-tokenbridge fed-tokenbridge:latest` to start the image.
