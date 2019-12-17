const Federation = artifacts.require("Federation");

module.exports = function(deployer, networkName, accounts) {
    deployer
        .then(async () => {
            return deployer.deploy(Federation, [accounts[0]], 1);

            // Replace with below line to use multiple federators
            // return deployer.deploy(Federation, [accounts[0], accounts[1], accounts[2]], 3);
        });
};