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

This Windows command deploys the contract to mainchain and sidechain (both points
to local ganache-cli instance)
```
deploy
```

[TBD]: Explain deploy of other configurations (RSK regtest, symmetric vs asymmetric deploy)

## To Do

- Prevent federator vote transactions that are not processed, filling storage space
- Federated manager change custodian manager using votes






