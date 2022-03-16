// How to run the script: npx hardhat run ./hardhat/script/changeSideTokenFactoryNFT.js --network bsctestnet
const hre = require("hardhat");

async function main() {
  const {getNamedAccounts, deployments} = hre;
  const {deployer} = await getNamedAccounts();

  const NFTBridge = await deployments.get('NFTBridge');
  const NftBridgeProxy = await deployments.get('NftBridgeProxy');
  const SideNFTTokenFactory = await deployments.get('SideNFTTokenFactory');
  const multiSigWalletDeployment = await deployments.get('MultiSigWallet');


  const nftBridge = new web3.eth.Contract(NFTBridge.abi, NftBridgeProxy.address);
  const methodCallSetNftSideTokenFactory = nftBridge.methods.changeSideTokenFactory(SideNFTTokenFactory.address);
  await methodCallSetNftSideTokenFactory.call({ from: multiSigWalletDeployment.address});

  const multiSigContract = new web3.eth.Contract(multiSigWalletDeployment.abi, multiSigWalletDeployment.address);
  await multiSigContract.methods.submitTransaction(NftBridgeProxy.address, 0, methodCallSetNftSideTokenFactory.encodeABI())
    .send({ from: deployer });
  console.log("Updated changeSideTokenFactory to:", SideNFTTokenFactory.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
