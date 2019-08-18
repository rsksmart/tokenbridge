#!/bin/bash
truffle compile
truffle exec deployDaiBridge.js --network kovan
truffle exec deployRDaiBridge.js --network testnet
