const fs = require("fs");
module.exports = {
  mainchain: require("./rsktestnet.json"), //the json containing the smart contract addresses in rsk
  sidechain: [
    require("./kovan.json"), //the json containing the smart contract addresses in eth
    require("./bsctestnet.json"), //the json containing the smart contract addresses in binance
  ],
  runEvery: 2, // In minutes,
  privateKey: fs.readFileSync(`${__dirname}/federator.key`, "utf8"),
  storagePath: "./db",
  etherscanApiKey: "",
  runHeartbeatEvery: 1, // In hours
  endpointsPort: 5000, // Server port
  useNft: false,
};
