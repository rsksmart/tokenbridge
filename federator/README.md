# Federator

Presents the event and necesary information to validate it on the other network
The federator is an off-chain process which performs voting actions to validate transactions between a Mainchain (source) and a Sidechain (target) network. These transactions are obtained from the Bridge contract on the Mainchain using event logs and voted in the Sidechain through a Federation contract. Once all required signers (federators) vote for a transaction the Federation contract starts the process to release the funds on the Sidechain.
The federators will be the owners of the contracts willing to allow to cross their tokens, and by doing so staking they reputation.

## Config

Go to /federator/config copy `config.sample.js` file and rename it to `config.js` set mainchain and sidechain to point to the json files of the networks you are using, for example rsktestnet-kovan.json and kovan.json, `make sure to set the host parameter of those files`. Create the file `federator.key` inside the config folder, and add the private key of the member of the Federation contract. The members of the federation are controled by the MultiSig contract, same that is owner of the Bridge and AllowedTokens contracts.
You will also need to add an [etherscan api key](https://etherscan.io/myapikey) in this config file.
## Usage

Run `npm install` to install the dependencies, make sure you followed the previous config step. Then to start the service run `npm start` which will start a single federator that listen to both networks. Check the logs to see that everything is working properly.

## Test

To run an integration test use `npm run integrationTest`. The integration test will use a preconfigured private key (from `config.js`) which is assumed to be the only member of the Federation contract.
In order to test with multiple federators, ensure they're added as members of the Federation contract and pass their private keys as a comma separated string for both chains as arguments of the integration test script. For instance:
`node integrationTest.js "privKeyM1, privKeyM2, privKeyMN" "privKeyS1, privKeyS2, privKeySN"`

## Run a Federator

### config

To run the federator using Docker, go to the /federator/config folder and rename `config.sample.js` to `config.js`. In that file you will determine the networks the federate must be listening to, for example for the bridge in testnet a federator config.js will look like

```js
module.exports = {
    mainchain: require('./rsktestnet-kovan.json'),
    sidechain: require('./kovan.json'),
    runEvery: 1, // In minutes,
    confirmations: 10,// Number of blocks before processing it,
    privateKey: require('federator.key'),
    storagePath: './db',
    etherscanApiKey: '<YOUR ETHERSCAN API KEY>',
    runHeartbeatEvery: 1, // Frequency for emitting HeartBeat events
    endpointsPort: 5000, // Server port health status endpoint listens on
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

### Development
- In your development environment you must have 2 blockchains running (ganache is ok)
- To start, go to the `bridge` directory and run
```shell
$ npm run ganache
```

- Open another shell and run the other chain
```shell
$ npm run ganache-mirror
```

- Still in the `bridge` directory you will need to deploy the contracts to the chains
```shell
$ npm run deployLocalIntegrationTest
```

- After that got to the `federator` directory then compile and run the federator
```shell
$ npm run build-start
```

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

### Status endpoint

This endpoint is introduced, in order to better monitor health status on the Federator processes running.

* **<DOMAIN:PORT>/isAlive**

* **Method:**

  `GET`

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `{ "status" : "ok" }`

# Datadog

## Datadog metric tracking

A `DATADOG_API_KEY` environment variable should be available for this to work (**only an error log will let you know if this is not configured - the app will run either way**).
This should be a valid API key associated to the Datadog account in which you're going to be tracking the metrics.
Example for setting it: `export DATADOG_API_KEY=08e436512591258b12bf1781ebe`

## Running a local Datadog agent

If you're interested in the metrics to be tracked in a particular account (might be a personal test account), you can follow the instructions [here](https://docs.datadoghq.com/agent/docker/?tab=standard).
Either way, at the time of writing this (mid-October 2021), running a Docker container as follows should suffice:
```
docker run -d --name dd-agent -v /var/run/docker.sock:/var/run/docker.sock:ro -v /proc/:/host/proc/:ro -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro -e DD_API_KEY=08e436512591258b12bf1781ebe -e DD_SITE="datadoghq.com" -e DD_DOGSTATSD_NON_LOCAL_TRAFFIC="true" gcr.io/datadoghq/agent:7
```

## Datadog dashboard metadata

The following is a basic dashboard that collects metrics tracked by the Federators - just copying it and pasting it into a new timeboard in Datadog should be enough for it to look like the following:
![image](https://user-images.githubusercontent.com/7085857/137196235-dbdc5877-8072-4390-857a-f937ce0122fd.png)

```json
{
  "title": "Federator PoC",
  "description": "",
  "widgets": [{
    "id": 3267013605690894,
    "definition": {
      "title": "Heartbeat",
      "type": "group",
      "show_title": true,
      "layout_type": "ordered",
      "widgets": [{
        "id": 3281955858405340,
        "definition": {
          "title": "Main chain heartbeat",
          "title_size": "16",
          "title_align": "left",
          "type": "query_table",
          "requests": [{
            "formulas": [{
              "alias": "latest block",
              "conditional_formats": [],
              "limit": {
                "count": 500,
                "order": "desc"
              },
              "cell_display_mode": "number",
              "formula": "query1"
            }],
            "response_format": "scalar",
            "queries": [{
              "query": "min:interoperability.token_bridge.heartbeat.main_chain.emission{*} by {host,address,fed_version,node_info,chain_id}",
              "data_source": "metrics",
              "name": "query1",
              "aggregator": "last"
            }]
          }],
          "has_search_bar": "auto"
        }
      }, {
        "id": 4101321670212740,
        "definition": {
          "title": "Main chain latest block processed",
          "title_size": "16",
          "title_align": "left",
          "type": "query_value",
          "requests": [{
            "formulas": [{
              "formula": "query1"
            }],
            "response_format": "scalar",
            "queries": [{
              "query": "avg:interoperability.token_bridge.heartbeat.main_chain.emission{*}",
              "data_source": "metrics",
              "name": "query1",
              "aggregator": "avg"
            }]
          }],
          "autoscale": false,
          "precision": 0
        }
      }, {
        "id": 1917582770012226,
        "definition": {
          "title": "Side chain heartbeat",
          "title_size": "16",
          "title_align": "left",
          "type": "query_table",
          "requests": [{
            "formulas": [{
              "alias": "latest block",
              "conditional_formats": [],
              "limit": {
                "count": 500,
                "order": "desc"
              },
              "cell_display_mode": "number",
              "formula": "query1"
            }],
            "response_format": "scalar",
            "queries": [{
              "query": "min:interoperability.token_bridge.heartbeat.side_chain.emission{*} by {host,address,fed_version,node_info,chain_id}",
              "data_source": "metrics",
              "name": "query1",
              "aggregator": "last"
            }]
          }],
          "has_search_bar": "auto"
        }
      }, {
        "id": 577916112954332,
        "definition": {
          "title": "Side chain latest block processed",
          "title_size": "16",
          "title_align": "left",
          "type": "query_value",
          "requests": [{
            "formulas": [{
              "formula": "query1"
            }],
            "response_format": "scalar",
            "queries": [{
              "query": "avg:interoperability.token_bridge.heartbeat.side_chain.emission{*}",
              "data_source": "metrics",
              "name": "query1",
              "aggregator": "avg"
            }]
          }],
          "autoscale": false,
          "precision": 0
        }
      }]
    }
  }, {
    "id": 6945469758716188,
    "definition": {
      "title": "ERC721",
      "type": "group",
      "show_title": true,
      "layout_type": "ordered",
      "widgets": [{
        "id": 8265548757769668,
        "definition": {
          "title": "Votes per address and chain id",
          "title_size": "16",
          "title_align": "left",
          "show_legend": true,
          "legend_layout": "auto",
          "legend_columns": ["avg", "min", "max", "value", "sum"],
          "type": "timeseries",
          "requests": [{
            "formulas": [{
              "formula": "query1"
            }],
            "response_format": "timeseries",
            "on_right_yaxis": false,
            "queries": [{
              "query": "sum:interoperability.token_bridge.federator.voting{type:erc721} by {address,chain_id,result}.as_count()",
              "data_source": "metrics",
              "name": "query1"
            }],
            "style": {
              "palette": "dog_classic",
              "line_type": "solid",
              "line_width": "normal"
            },
            "display_type": "bars"
          }],
          "yaxis": {
            "include_zero": true,
            "scale": "linear",
            "label": "",
            "min": "auto",
            "max": "auto"
          },
          "markers": []
        }
      }, {
        "id": 878136284410596,
        "definition": {
          "title": "Votes per address and chain id",
          "title_size": "16",
          "title_align": "left",
          "type": "query_table",
          "requests": [{
            "formulas": [{
              "formula": "query1",
              "limit": {
                "count": 500,
                "order": "desc"
              }
            }],
            "response_format": "scalar",
            "queries": [{
              "query": "sum:interoperability.token_bridge.federator.voting{type:erc721} by {address,chain_id,result}.as_count()",
              "data_source": "metrics",
              "name": "query1",
              "aggregator": "sum"
            }]
          }]
        }
      }]
    }
  }, {
    "id": 3588165781267182,
    "definition": {
      "title": "ERC20",
      "type": "group",
      "show_title": true,
      "layout_type": "ordered",
      "widgets": [{
        "id": 3218485023565918,
        "definition": {
          "title": "Votes per address and chain id",
          "title_size": "16",
          "title_align": "left",
          "show_legend": true,
          "legend_layout": "auto",
          "legend_columns": ["avg", "min", "max", "value", "sum"],
          "type": "timeseries",
          "requests": [{
            "formulas": [{
              "formula": "query1"
            }],
            "response_format": "timeseries",
            "on_right_yaxis": false,
            "queries": [{
              "query": "sum:interoperability.token_bridge.federator.voting{type:erc20} by {address,chain_id}.as_count()",
              "data_source": "metrics",
              "name": "query1"
            }],
            "style": {
              "palette": "dog_classic",
              "line_type": "solid",
              "line_width": "normal"
            },
            "display_type": "area"
          }],
          "yaxis": {
            "include_zero": true,
            "scale": "linear",
            "label": "",
            "min": "auto",
            "max": "auto"
          },
          "markers": []
        }
      }, {
        "id": 2598946470976434,
        "definition": {
          "title": "Votes per address and chain id",
          "title_size": "16",
          "title_align": "left",
          "type": "query_table",
          "requests": [{
            "formulas": [{
              "formula": "query1",
              "limit": {
                "count": 500,
                "order": "desc"
              }
            }],
            "response_format": "scalar",
            "queries": [{
              "query": "sum:interoperability.token_bridge.federator.voting{type:erc20} by {address,chain_id,result}.as_count()",
              "data_source": "metrics",
              "name": "query1",
              "aggregator": "sum"
            }]
          }]
        }
      }]
    }
  }],
  "template_variables": [],
  "layout_type": "ordered",
  "is_read_only": false,
  "notify_list": [],
  "reflow_type": "auto",
  "id": "wsr-524-c9q"
}
```