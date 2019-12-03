const Federation = artifacts.require("Federation");

module.exports = function(deployer, networkName, accounts) {
    deployer
        .then(async () => {
            return deployer.deploy(Federation, [accounts[0]], 1);
        });
};