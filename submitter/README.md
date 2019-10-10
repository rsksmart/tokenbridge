# Submitter
Presents the event and necesary information to validate it on the other network

## Config
Copy the config.sample.js and rename it to config.js
Set the host of the RSK and ETH networks that will be used.

## Usage
Go to /bridge and deploy using `truffle migrate --reset --network <network name>` this will deploy the contracts and create a json file with the addresses of the contracts
Go to /submitter copy config.sample.js file and rename it to config.js set rsk and eth to point to the json file created in the previous step
Start the service running `npm start`. This command uses `pm2` as process manager which helps to keep the application online. For local development you might prefer `npm run dev` which runs a basic service that will exit in case of errors.
When running the rsk node make sure you are using rskj branch https://github.com/rsksmart/rskj/tree/add-rpc-blockinfo  as it adds json rpc methods needed for this project
Also you cant run an integration with `node integrationTest.js`