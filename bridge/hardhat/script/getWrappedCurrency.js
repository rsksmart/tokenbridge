// How to run the script: npx hardhat run ./hardhat/script/getWrappedCurrency.js --network kovan bsctestnet rsktestnet rsktestnetbsc
const hre = require("hardhat");

async function main() {
  const {deployments} = hre;

  const Bridge = await deployments.get('Bridge');
  const BridgeProxy = await deployments.get('BridgeProxy');
  const MultiSigWallet = await deployments.get('MultiSigWallet');

  const bridge = new web3.eth.Contract(Bridge.abi, BridgeProxy.address);

  console.log("\nBridge", Bridge.address);
  console.log("\nBridgeProxy", BridgeProxy.address);
  console.log("\nMultiSigWallet", MultiSigWallet.address);

  const wrappedTokenAddress = await bridge.methods.wrappedCurrency().call({from: MultiSigWallet.address});
  console.log("Wrapped currency address", wrappedTokenAddress);

  console.log("finish");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
