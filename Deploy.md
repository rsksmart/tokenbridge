# Deploying the contracts

The deploy scripts resides in `bridge` folder. First, compile the
contracts using truffle:

```
cd bridge`
truffle compile
```

Edit the `truffle-config.js` file to define the networks and accounts to use.
Usually, you must define an account and use its private key to sign transactions.
An example:
```
var PrivateKeyProvider = require("truffle-privatekey-provider");
var privateKey = "<yourprivatekey>";
 
module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!met
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" // Match any network id
    },
    testnet: {
        provider: function () {
            return new PrivateKeyProvider(privateKey, "<yourhostentrypoint>");
        },
        gasPrice: 1,
        gas: 0x67c280,
        from: "0x<yourpublickey>",
        network_id: "*" // Match any network id
    }
  },
  compilers: {
      solc: {
          version: "0.4.24"
      }
  }
};
```

ie, if you are using a local host listening JSON RPC request on port `4444` using
`http` as transport, your host string is `http://localhost:4444`. Notice that
your private key should be written using hexadecimal digits WITHOUT `0x` prefix, and
your public key needs the `0x` prefix. In the above example, you are using
an additional module to sign the transactions, and it should be installed with:

```
npm install truffle-privatekey-provider
```

You can use another provider, the above one is not mandatory.

The contracts to deploy are:

- `Bridge.sol`: the contract that locks and releases the tokens (deployed twice, in both networks)
- `Manager.sol`: the contract that manage the bridge and receive the transaction votes from
federators (oracles) (deployed in both network)
- `MainToken.sol`: a simple ERC token implementation, to be deployed on the sidechain. It could
be deployed on the mainchain too, but usually you use the already existing token in that chain.

Both federations need a set of federator accounts. They should be defined
in `../mainfeds.json` and `../sidefeds.json` files, residing in the main folder of the project.
Each one should be an array of accounts info, like:

```js
[
    {
        "privateKey": "0x<privatekey>",
        "publicKey": "0x<publicKey>",
        "address": "0x<address>"
    }
    ,
    {
        "privateKey": "0x<privatekey>",
        "publicKey": "0x<publicKey>",
        "address": "0x<address>"
    }
    ,
///
]
```

The addresses will be used to declare the allowed federator
to participate in the manager contracts.

Run the symmetric deploy script:

```
./deploysymm.sh <mainchain> <sidechain>
```

ie:

```
./deploysymm.sh kovan testnet
```

The script will deploy the contracts to each chain (mainchain
and sidechain).

At the end of the deploy process, two new files will be
created in the project main folder: `mainconf.json` and `sideconf.json`.

These files will be used by the federators scripts. You should
complete these files adding a `host` property, describing the
machine to use in each chain:

```js
{
    "host": "http://localhost:4444",
    "block": 87902,
///
}
```

The other properties:

- `block`: the block number where the bridge contract was deployed.
- `accounts`: private keys, public keys, addresses of user
accounts (only to be used in some demo dapp and not mandatory scripts).
- `members`: private keys, public keys, addresses of federators
- `bridge`: the bridge contract address.
- `token`: the token contract address.
- `manager`: the manager contract address.

For demo purpose, the federator accounts information is
in these files. In production, these info should be protected and
should contain only one federator per machine.

