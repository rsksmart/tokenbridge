const fs = require('fs')

function isMainnet(network) {
  return network.toLowerCase().includes('mainnet')
}

function isLocalNetwork(network) {
  return !network.toLowerCase().includes('mainnet')
    && !network.toLowerCase().includes('goerli')
    && !network.toLowerCase().includes('testnet');
}

function getDeployed(network) {
  try {
    const deployedString = fs.readFileSync(`${__dirname}/${network}.json`, 'utf8');
    return JSON.parse(deployedString);
  } catch(err) {
    if(!err.message.includes('ENOENT')) {
      throw err;
    }
    return { network };
  }
}

function saveDeployed(deployJson) {
  fs.writeFileSync(`${__dirname}/${deployJson.network}.json`, JSON.stringify(deployJson, null, 4));
}

module.exports = {
  isLocalNetwork: isLocalNetwork,
  getDeployed: getDeployed,
  saveDeployed: saveDeployed,
  isMainnet: isMainnet,
};
