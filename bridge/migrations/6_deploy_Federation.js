const Federation = artifacts.require('Federation_v1');

module.exports = function(deployer, networkName, accounts) {
    // Replace with below line to use multiple federators
    // deployer.deploy(Federation, [accounts[0], accounts[1], accounts[2]], 3);
    deployer.deploy(Federation, [accounts[0]], 1);
}