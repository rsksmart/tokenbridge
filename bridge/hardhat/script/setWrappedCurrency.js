// How to run the script: npx hardhat run ./hardhat/script/setWrappedCurrency.js --network rsktestnetbsc
const hre = require("hardhat");

async function main() {
  const {getNamedAccounts, deployments} = hre;
  const {deployer} = await getNamedAccounts();

  const wrappedCurrencyAddress = "0x50f2cd4e18428e1c8c73b7638d5da32975663e16"
  const transactionEtherValue = 0;

  const Bridge = await deployments.get('Bridge');
  const BridgeProxy = await deployments.get('BridgeProxy');
  const MultiSigWallet = await deployments.get('MultiSigWallet');

  const bridge = new web3.eth.Contract(Bridge.abi, BridgeProxy.address);
  const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, MultiSigWallet.address);


  console.log("\nBridge", Bridge.address);
  console.log("\nBridgeProxy", BridgeProxy.address);
  console.log("\nMultiSigWallet", MultiSigWallet.address);

  const methodCallSetWrappedCurrency = bridge.methods.setWrappedCurrency(
    wrappedCurrencyAddress
  );
  const result = await methodCallSetWrappedCurrency.call({ from: MultiSigWallet.address});
  console.log("Method call result", result);

  const receipt = await multiSigContract.methods.submitTransaction(
    BridgeProxy.address,
    transactionEtherValue,
    methodCallSetWrappedCurrency.encodeABI()
  ).send({
    from: deployer,
    gasLimit: 3000000
  });
  console.log("Transaction worked", receipt.transactionHash);

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
