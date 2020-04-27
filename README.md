# RSK <-> ETH Token Bridge

Ethereum/RSK Bridge that allows to move ERC20 tokens from one chain to the other.

## Rationale

Cross chain events are very important in the future of crypto. Exchanging tokens between networks allows the token holders to use them in their favorite chain without beeing restricted to the contract owner network choice. Moreover this also allows layer 2 solutions to use the same tokens on different chains, this concept together with stable coins creates a great way of payment with low volatility across networks.

## Overview

We have a bridge smart contract on each network, the bridge on one chain will receive and lock the ERC20 tokens, then it will emit an event that will be served to the bridge on the other chain. There is a Federation in charge of sending the event from one contract to the other. Once the bridge on the other chain receives the event from the Federation, it mints the tokens on the mirror ERC20 contract.
See the [FAQ](./docs/FAQ.md) to know more about how it works!

<p align="center">
  <img src="./docs/images/token-bridge-diagram.png"/>
</p>

The bridge contracts are upgradeable as we want to move to a decentralized bridge in the future. Here is the first.
[POC of the trustless decentralized bridge](https://github.com/rsksmart/tokenbridge/releases/tag/decentralized-poc-v0.1)

## Usage

You can use the ['Token Bridge Dapp'](https://tokenbridge.rsk.co/) together with [Nifty Wallet](https://chrome.google.com/webstore/detail/nifty-wallet/jbdaocneiiinmjbjlgalhcelgbejmnid) or [Metamask with custom network](https://github.com/rsksmart/rskj/wiki/Configure-Metamask-to-connect-with-RSK) to move tokens between networks. This is the [Dapp guide](./docs/DappGuide.md) if you don't know how to use it.
Or you can use a wallet with the abi of the contracts. See the ['interaction guide using MyCrypto'](./docs/UsingMyCrypto.md) for more information on how to use the bridge.

## Contracts deployed on RSK, Ethereum, RSK Testnet and Kovan

Here are the ['addresses'](./docs/ContractAdddresses.md) of the deployed contrats in the different networks.

## Report Security Vulnerabilities

We have a [vulnerability reporting guideline](./SECURITY.md) for details on how to contact us to report a vulnerability.

## Developers

### Contracts

The smart contracts used by the bridge and the deploy instructions are in the ['bridge folder'](./bridge/README.md)
The ABI to interact with the contracts are in the ['abis folder'](./abis)

### Dapp

The dapp of the token bridge is in the ['ui folder'](./ui)


### Federation

There is a federation in charge of notifying the events that happend in the bridge of one chain to the other. The federation is composed by oracles listening the events created in one chain and sending it to the other chain. When the majority of the federators voted an event, the bridge accepts the event as valid and releases the tokens on the other side.
See the ['federator'](./federator/README.md) for more information about the federator.