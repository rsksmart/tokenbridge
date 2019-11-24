const MultiSigWallet = artifacts.require("MultiSigWallet");
const AllowTokens = artifacts.require('AllowTokens');
const SideTokenFactory = artifacts.require('SideTokenFactory');


require('@openzeppelin/test-helpers/configure')({ provider: web3.currentProvider, environment: 'truffle' });
//const { singletons } = require('@openzeppelin/test-helpers');

module.exports = function(deployer, networkName, accounts) {
    deployer.deploy(MultiSigWallet, [accounts[0]], 1)
    .then(() => MultiSigWallet.deployed())
    .then(() => deployer.deploy(AllowTokens, MultiSigWallet.address))
    .then(() => {
        if (networkName == 'development' || networkName == 'regtest') {
            // In a test environment an ERC777 token requires deploying an ERC1820 registry
            // return singletons.ERC1820Registry(accounts[0]); //use a modified version cause RSK returns 0x00 whtn eth_Code is empty
            return ERC1820Registry(accounts[0]); //REmove this and use singletons.ERC1820Registry(accounts[0]); when the nre version of RSKJ is released
        }
    })
    .then(() => deployer.deploy(SideTokenFactory));
};

//This will be removed when the new RSKJ version is released
const testHelperNodeMulesPath = '../node_modules/@openzeppelin/test-helpers/src';
const ether = require(testHelperNodeMulesPath+'/ether');
const send = require(testHelperNodeMulesPath+'/send');

const { getSingletonsConfig } = require(testHelperNodeMulesPath+'/config/singletons');

const { setupLoader } = require('@openzeppelin/contract-loader');

const {
  ERC1820_REGISTRY_ABI,
  ERC1820_REGISTRY_ADDRESS,
  ERC1820_REGISTRY_DEPLOY_TX,
} = require(testHelperNodeMulesPath+'/data');

async function ERC1820Registry (funder) {
  // Read https://eips.ethereum.org/EIPS/eip-1820 for more information as to how the ERC1820 registry is deployed to
  // ensure its address is the same on all chains.

  if ((await web3.eth.getCode(ERC1820_REGISTRY_ADDRESS)).length > '0x00'.length) {
    return getDeployedERC1820Registry();
  }

  // 0.08 ether is needed to deploy the registry, and those funds need to be transferred to the account that will deploy
  // the contract.
  await send.ether(funder, '0xa990077c3205cbDf861e17Fa532eeB069cE9fF96', ether('0.08'));

  await web3.eth.sendSignedTransaction(ERC1820_REGISTRY_DEPLOY_TX);

  return getDeployedERC1820Registry();
}

async function getDeployedERC1820Registry () {
  const config = getSingletonsConfig();
  const loader = setupLoader({
    provider: web3.currentProvider,
    defaultGas: config.defaultGas,
    defaultSender: config.defaultSender,
  });

  if (config.abstraction === 'truffle') {
    const registry = loader.truffle.fromABI(ERC1820_REGISTRY_ABI);
    return registry.at(ERC1820_REGISTRY_ADDRESS);

  } else if (config.abstraction === 'web3') {
    const registry = loader.web3.fromABI(ERC1820_REGISTRY_ABI);
    registry.options.address = ERC1820_REGISTRY_ADDRESS;

    return new web3.eth.Contract(ERC1820_REGISTRY_ABI, ERC1820_REGISTRY_ADDRESS);

  } else {
    throw new Error(`Unknown contract abstraction: '${config.abstraction}'`);
  }
}
