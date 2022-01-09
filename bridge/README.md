# Token Bridge Contracts

## Contract coverage

[![Coverage Status](https://coveralls.io/repos/github/rsksmart/tokenbridge/badge.svg)](https://coveralls.io/github/rsksmart/tokenbridge)

## Install dependencies
Use node 16.
Install node https://nodejs.org/es/
Then install dependencies
```
npm install
```


## Running test

```
npm run test
npm run lint
npm run coverage
```

## Configure networks

Edit the hardhat configuration file

```js
module.exports = {
  // See https://hardhat.org/config/
  // to customize your hardhat configuration
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" // Match any network id
    },
    rskregtest: {
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

Deploy using hardhat to the desire network
```
npm run deploy --network <network>
```

Examples
```
npm run  deploy --network development
npm run  deploy --network rskregtest
```

This will also generate the json files for that network with the addresses of the deployed contracts that will be called by the federator.


#### Using HardHat

After the deployments usign hardhat deploy, you will be able to verify all the deployed contracts using an script
```shell
$~ verify-script -n <networkName>
```
> The network name is defined at `hardhat.config.js`

## Contracts

- All the contracts to be deployed from now on should use the [abidecoder v2](https://docs.soliditylang.org/en/v0.8.0/080-breaking-changes.html)
- So, at the `.sol` contracts add the `pragma abicoder v2;` at the top, right after the pragma solidity version, like this:
![image](https://user-images.githubusercontent.com/17556614/132871251-29416b98-a6f4-4384-b70a-956e9d1bdf29.png)
