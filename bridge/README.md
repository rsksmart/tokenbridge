# Token Bridge Contracts

## Install Truffle

```
npm install -g truffle@4.1.14
```

## Running test

```
truffle test --network test
```

## Configure networks

Edit the truffle configuration file

```js
module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!met
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" // Match any network id
    },
    regtest: {
      host: "127.0.0.1",
      port: 4444,
      network_id: "*" // Match any network id
    },
  }
};
```

## Deploy contracts

Launch the local network

```
ganache-cli --verbose
```

A Windows command deploys the solution to mainchain and sidechain (both points
to truffle development network, usually a ganache-cli instance)
```
deploysymm
```

Another Windows command deploys the solution to mainchain using truffle development network, and sidechain using
truffle regtest network. Usually, there are differente nodes, ie two different ganache-cli instances.
```
deploysymm2
```

TBD: Explain deploy of other configurations (RSK regtest, symmetric vs asymmetric deploy)

## To Do

- Prevent federator vote transactions that are not accepted/processed, filling storage space
- Remove inverse account mapping (no use case)






