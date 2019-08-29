var Bridge = artifacts.require("Bridge");
var Manager = artifacts.require("Manager");
var Verifier = artifacts.require("Verifier");
var MMR = artifacts.require("MMR");

module.exports = function(deployer, network) {
    deployer.deploy(MMR)
    .then(() => MMR.deployed())
    .then(() => deployer.deploy(Verifier))
    .then(() => Verifier.deployed())
    .then(() => deployer.deploy(Manager, Verifier.address))
    .then(() => Manager.deployed())
    .then(() => { 
        let symbol = 'e';
        if(network == 'regtest' || network.toLowerCase().indexOf('rsk') == 0)
            symbol = 'r';
        return deployer.deploy(Bridge, Manager.address, symbol.charCodeAt());
    })
    .then(() => Bridge.deployed());
    
};