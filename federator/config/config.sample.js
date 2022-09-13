const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  mainchain: require("./rsktestnet.json"), //the json containing the smart contract addresses in rsk
  sidechain: [
    require("./goerly.json"), //the json containing the smart contract addresses in eth  SHOULD UPDATED bridge federation allowTokens host
  ],
  runEvery: 2, // In minutes,
  privateKey: process.env.FEDERATOR_KEY || "",
  storagePath: "./db",
  etherscanApiKey: "",
  runHeartbeatEvery: 1, // In hours
  endpointsPort: 5000, // Server port
  checkHttps: false,
};
