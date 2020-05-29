const Utils = artifacts.require("Utils");

module.exports = function(deployer) {
    return deployer.deploy(Utils);
};