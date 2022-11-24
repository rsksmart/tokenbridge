const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  mainchain: require("./rsktestnet.json"), //the json containing the smart contract addresses in rsk
  sidechain: [
    require("./goerli.json"), //the json containing the smart contract addresses in eth
  ],
  runEvery: 2, // In minutes,
  privateKey: process.env.FEDERATOR_KEY || "",
  storagePath: "./db",
  etherscanApiKey: "",
  runHeartbeatEvery: 1, // In hours
  endpointsPort: 3000, // Server port
  useNft: false,
  checkHttps: false,
};
