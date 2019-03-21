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
deploysymm <mainnetwork> <sidenetwork>
```

Examples
```
deploysymm development development
deploysymm development regtest
```

## To Do

- Prevent federator vote transactions that are not accepted/processed, filling storage space
- Remove inverse account mapping (no use case)






