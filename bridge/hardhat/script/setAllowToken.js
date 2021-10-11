// How to run the script: npx hardhat run ./hardhat/script/setAllowToken.js --network bsctestnet
const hre = require("hardhat");

async function main() {
  const {getNamedAccounts, deployments} = hre;
  const {deployer} = await getNamedAccounts();

  const transactionEtherValue = 0;

  const WBNB = await deployments.get('WBNB');
  const AllowTokens = await deployments.get('AllowTokens');
  const AllowTokensProxy = await deployments.get('AllowTokensProxy');
  const MultiSigWallet = await deployments.get('MultiSigWallet');

  const allowTokens = new web3.eth.Contract(AllowTokens.abi, AllowTokensProxy.address);
  const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, MultiSigWallet.address);

  console.log("\nAllowTokens", AllowTokens.address);
  console.log("\nAllowTokensProxy", AllowTokensProxy.address);
  console.log("\nMultiSigWallet", MultiSigWallet.address);

  const methodCallSetToken = allowTokens.methods.setToken(WBNB.address, '0');
  const result = await methodCallSetToken.call({ from: MultiSigWallet.address});
  console.log("Method call result", result);

  const receipt = await multiSigContract.methods.submitTransaction(
    AllowTokensProxy.address,
    transactionEtherValue,
    methodCallSetToken.encodeABI()
  ).send({
    from: deployer,
    gasLimit: 3000000
  });
  console.log("Transaction worked", receipt.transactionHash);

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
