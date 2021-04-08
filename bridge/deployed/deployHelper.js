const fs = require('fs')

function isLocalNetwork(network) {
    return !['mainnet', 'kovan', 'testnet'].includes(network.toLowerCase());
}

function getDeployed(network) {
    try {
        const deployedString = fs.readFileSync(`${__dirname}/${network}.json`, 'utf8');
        return JSON.parse(deployedString);
    } catch(err) {
        console.error(err)
        return { network };
    }
}

function saveDeployed(deployJson) {
    fs.writeFileSync(`${__dirname}/${deployJson.network}.json`, JSON.stringify(deployJson, null, 4));
}

module.exports = {
    isLocalNetwork: isLocalNetwork,
    getDeployed: getDeployed,
    saveDeployed: saveDeployed
};
