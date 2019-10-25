# Federator
Presents the event and necesary information to validate it on the other network
The federator is an off-chain process which performs voting actions to validate transactions between a Mainchain (source) and a Sidechain (target) network. These transactions are obtained from the Bridge contract on the Mainchain using event logs and voted in the Sidechain through a MultiSig contract. Once all required signers (federators) vote for a transaction the MultiSig contract starts the process to release the funds on the Sidechain.

## Config
Copy the config.sample.js and rename it to config.js

Go to /bridge/truffle-config.js and set the MultiSig wallet contract address which should be previously deployed on the Sidechain network.

Go to /bridge and deploy using `truffle migrate --reset --network <network name>` this will deploy the contracts and create a json file with the addresses of the contracts
Go to /federator copy config.sample.js file and rename it to config.js set mainchain and sidechain to point to the json file created in the previous step. Set other necessary parameters

## Usage
Start the service running `npm start` which will start a single federator. Make sure this federator is one of the signers of the MultiSig contract

## Test
You cant run an integration test with `node transferTest.js` and unit tests using `npm test`
