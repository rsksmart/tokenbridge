// How to run the script: npx hardhat run ./hardhat/script/isTokenAllowed.js --network rsktestnet
const hre = require("hardhat");

async function main() {
  const {deployments} = hre;

  const allowedTokenAddr = "0x50F2CD4e18428e1c8C73b7638d5DA32975663e16"

  const AllowTokens = await deployments.get('AllowTokens');
  const AllowTokensProxy = await deployments.get('AllowTokensProxy');
  const MultiSigWallet = await deployments.get('MultiSigWallet');

  const allowTokens = new web3.eth.Contract(AllowTokens.abi, AllowTokensProxy.address);

  console.log("\nAllowTokens", AllowTokens.address);
  console.log("\nAllowTokensProxy", AllowTokensProxy.address);
  console.log("\nMultiSigWallet", MultiSigWallet.address);

  const methodCallGetAllowToken = allowTokens.methods.isTokenAllowed(allowedTokenAddr);
  const result = await methodCallGetAllowToken.call({ from: MultiSigWallet.address});
  console.log("isTokenAllowed", allowedTokenAddr, ":", result);

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
