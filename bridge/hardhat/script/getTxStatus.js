
// How to run the script: npx hardhat run ./hardhat/script/getFeeConfig.js --network rsktestnetbsc
const hre = require("hardhat");
const BN = web3.utils.BN;

async function main() {
  const {deployments} = hre;

  const Bridge = await deployments.get('Bridge');
  const BridgeProxy = await deployments.get('BridgeProxy');

  const bridgeContract = new web3.eth.Contract(Bridge.abi, BridgeProxy.address);

  const transactionHash = "0x304d2b4366d3a7c08463bd619aff36940ae5931a4d46ee436561ead2b23a1c20" //"0x5befad2a24647508bf848e8500b9be4f0340efd078631ad3de927b264c723267" // "0xba6a21df7b69fffcf00d39b1da003ad8041b41d07887226c8c935ab106fec7e9"

  const hasCrossed = await bridgeContract.methods.hasCrossed(transactionHash).call();
  console.log("Has Crossed", hasCrossed);

  const hasBeenClaimed = await bridgeContract.methods.hasBeenClaimed(transactionHash).call();
  console.log("Has Been Claimed", hasBeenClaimed);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });