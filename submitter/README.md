# Submitter
Presents the event and necesary information to validate it on the other network

## Config
Copy the config.sample.js and rename it to config.js
Set the host of the RSK and ETH networks that will be used.

## Usage
Go to /bridge and deploy using `truffle migrate --reset --network <network name>` this will deploy the contracts and create a json file with the addresses of the contracts
Go to /submitter copy config.sample.js file and rename it to config.js set rsk and eth to point to the json file created in the previous step
Start the service running `npm start`
When running the rsk node make sure you are using rskj branch https://github.com/rsksmart/rskj/tree/add-rpc-blockinfo  as it adds json rpc methods needed for this project
Also you cant run an integration with `node integrationTest.js`