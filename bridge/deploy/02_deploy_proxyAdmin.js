const address = require('../hardhat/helper/address');

module.exports = async function(hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments} = hre;
  const {deployer, proxyAdmin} = await getNamedAccounts();
  const {deploy, log, execute} = deployments;

  if (proxyAdmin) {
    return;
  }

  const deployResult = await deploy('ProxyAdmin', {
    from: deployer,
    log: true
  });

  if (!deployResult.newlyDeployed) {
    return;
  }

  const multiSigAddress = await address.getMultiSigAddress(hre);
  log(`Contract ProxyAdmin deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`);
  await execute('ProxyAdmin', {from: deployer}, 'transferOwnership', multiSigAddress);
  log(`Transfered Ownership to MultiSig`);

  if(network.live && !chains.isRSK(network)) {
    log(`Startig Verification of ${deployResult.address}`);
    await hre.run("verify:verify", {
      address: deployResult.address,
      constructorArguments: [],
    });
  }
};
module.exports.id = 'deploy_proxyAdmin'; // id required to prevent reexecution
module.exports.tags = ['ProxyAdmin', 'DeployFromScratch', 'IntegrationTest'];
module.exports.dependencies = ['MultiSigWallet'];
