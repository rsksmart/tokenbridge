// How to run the script: npx hardhat run ./hardhat/script/getFeeConfig.js --network rsktestnetbsc
const hre = require("hardhat");

async function main() {
  const {deployments} = hre;

  const Bridge = await deployments.get('Bridge');
  const BridgeProxy = await deployments.get('BridgeProxy');

  const bridgeContract = new web3.eth.Contract(Bridge.abi, BridgeProxy.address);

  const methodCallGetFeePercentage = bridgeContract.methods.getFeePercentage();
  const result = await methodCallGetFeePercentage.call();
  console.log("Method call result", result);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
