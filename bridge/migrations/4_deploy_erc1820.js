const { deploy1820 } = require('@thinkanddev/deploy-eip-1820-web3-rsk')
const deployHelper = require("../deployed/deployHelper");

module.exports = async (deployer, networkName, accounts) => {
  // In a test environment an ERC777 token requires deploying an ERC1820 registry
    if (deployHelper.isLocalNetwork(networkName)) {
      // The wallet must have at least 0.08 Ether
      return await deploy1820(web3);
    }
};
