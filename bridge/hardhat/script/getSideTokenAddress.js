// How to run the script: npx hardhat run ./hardhat/script/getFeeConfig.js --network rsktestnetbsc
const hre = require("hardhat");

const { bscTestnet } = require('../../hardhat/helper/tokens');

async function main() {
  const {deployments} = hre;

  const Bridge = await deployments.get('Bridge');
  const BridgeProxy = await deployments.get('BridgeProxy');

  const bridgeContract = new web3.eth.Contract(Bridge.abi, BridgeProxy.address);

  const sideTokenByOriginalToken = async (_originalChainId, _originalTokenAddress) => {
    const sideTokenAddress = await bridgeContract.methods.sideTokenByOriginalToken(_originalChainId, _originalTokenAddress).call();
    console.log("_originalChainId", _originalChainId, "_originalTokenAddress", _originalTokenAddress, "sideTokenAddress", sideTokenAddress);
  }

  const originalChainId = 97
  for(const symbol in bscTestnet) {
    await sideTokenByOriginalToken(originalChainId, bscTestnet[symbol].address);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
