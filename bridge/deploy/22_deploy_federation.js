module.exports = async function({ getNamedAccounts, deployments, network }) { // HardhatRuntimeEnvironment
  const { deployer, multiSig, proxyAdmin, federatorProxy } = await getNamedAccounts();
  const { deploy, log } = deployments;

  const deployResult = await deploy("Federation", {
    from: deployer,
    log: true
  });

  if (deployResult.newlyDeployed) {
    log(
      `Contract Federation deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed.toString()} gas`
    );
  }

  const Federation = await deployments.get("Federation");
  const ProxyAdmin = await deployments.get("ProxyAdmin");
  const BridgeProxy = await deployments.get("BridgeProxy");
  const MultiSigWallet = await deployments.get("MultiSigWallet");

  let federationsMembers = [deployer];
  let required = 1;
  if (network.name.toLowerCase().includes("testnet") || network.name.toLowerCase().includes("kovan")) {
    federationsMembers = ["0x8f397ff074ff190fc650e5cab4da039a8163e12a"];
  }
  if (network.name.toLowerCase().includes("mainnet")) {
    federationsMembers = [
      "0x5eb6ceca6bdd82f4a38aac0b957e6a4b5b1cceba",
      "0x8a9ec366c1b359fed1a7372cf8607ec52963b550",
      "0xa4398c6ff62e9b93b32b28dd29bd27c6b106245f",
      "0x1089a708b03821b19db9bdf179fbd7ed7ce591d7",
      "0x04237d65eb6cdc9f93db42fef53f7d5aaca2f1d6"
    ];
    required = 2;
  }
  const federationLogic = new web3.eth.Contract(Federation.abi, Federation.address);
  const methodCall = federationLogic.methods.initialize(
    federationsMembers,
    required,
    BridgeProxy.address,
    multiSig ?? MultiSigWallet.address
  );
  methodCall.call({ from: deployer });

  if (!federatorProxy) {
    const deployProxyResult = await deploy("FederationProxy", {
      from: deployer,
      args: [
        Federation.address,
        proxyAdmin ?? ProxyAdmin.address,
        methodCall.encodeABI()
      ],
      log: true
    });
    if (deployProxyResult.newlyDeployed) {
      log(
        `Contract BridgeProxy deployed at ${deployProxyResult.address} using ${deployProxyResult.receipt.gasUsed.toString()} gas`
      );
    }
  }
};
module.exports.id = "deploy_federation"; // id required to prevent reexecution
module.exports.tags = ["Federation", "new"];
module.exports.dependencies = ["MultiSigWallet", "ProxyAdmin"];
