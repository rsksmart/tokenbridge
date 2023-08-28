const { tokensByChainId } = require("../hardhat/helper/tokens");
const address = require('../hardhat/helper/address');

function formatToken(token) {
  return  {token: token.address, typeId: token.typeId};
}

module.exports = async function(hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments, network} = hre;
  const {deployer, allowTokensProxy} = await getNamedAccounts();
  const {log} = deployments;

  if (allowTokensProxy) {
    return;
  }

  const AllowTokens = await deployments.getArtifact('AllowTokensV1');
  const AllowTokensProxy = await deployments.get('AllowTokensProxy');
  const allowTokens = new web3.eth.Contract(AllowTokens.abi, AllowTokensProxy.address);
  const multiSigAddress = await address.getMultiSigAddress(hre);

  const owner = await allowTokens.methods.owner().call({from: deployer});
  if (owner === multiSigAddress) {
    return
  }

  const chainID = network.config.network_id;
  const tokensToSet = [];
  const tokens = tokensByChainId(chainID);

  for (const token in tokens) {
    tokensToSet.push(formatToken(tokens[token]));
  }

  if(tokensToSet.length > 0 ) {
    await allowTokens.methods.setMultipleTokens(tokensToSet).send({from: deployer});
    log(`AllowTokens Setted Tokens`);
  } else {
    if(network.live) {
      log(`Set AllowTokens empty tokens to allow`);
    }
  }
  // Set multisig as the owner
  await allowTokens.methods.transferOwnership(multiSigAddress).send({from: deployer});
  log(`AllowTokens Transfered Ownership to MultiSigWallet`);
};
module.exports.id = 'transfer_set_tokens_allow_tokens'; // id required to prevent reexecution
module.exports.tags = ['TransferSetTokens', 'DeployFromScratch', 'IntegrationTest'];
module.exports.dependencies = ['MultiSigWallet', 'AllowTokens', 'AllowTokensProxy'];
