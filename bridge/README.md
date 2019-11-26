# Token Bridge Contracts

## Install Truffle

```
npm install -g truffle@5.0.33
npm install
```

## Running test

```
npm test
npm run coverage
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

Deploy using truffle to the desire network
```
truffle migrate --network <network>
```

Examples
```
truffle migrate --network development
truffle migrate --network regtest
```

This will also generate the json files for that network with the addresses of the deployed contracts that will be called by the federator.







