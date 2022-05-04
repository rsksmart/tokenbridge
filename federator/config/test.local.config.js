const fs = require("fs");
module.exports = {
  mainchain: require("./development.json"), //the json containing the smart contract addresses in rsk
  sidechain: require("./mirrorDevelopment.json"), //the json containing the smart contract addresses in eth
  runEvery: 2, // In minutes,
  privateKey: fs.readFileSync(`${__dirname}/test.local.federator.key`, "utf8"),
  storagePath: "./db",
  etherscanApiKey: "",
  runHeartbeatEvery: 1, // In hours
  endpointsPort: 5000, // Server port
  federatorRetries: 3,
  checkHttps: false,
};
