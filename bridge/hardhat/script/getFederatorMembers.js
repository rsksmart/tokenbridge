// How to run the script: npx hardhat run ./hardhat/script/getFederatorMembers.js --network rsktestnetbsc
const hre = require("hardhat");

async function main() {
  const {deployments} = hre;

  const Federation = await deployments.get('FederationV2');
  const FederationProxy = await deployments.get('FederationProxy');
  const MultiSigWallet = await deployments.get('MultiSigWallet');

  const federator = new web3.eth.Contract(Federation.abi, FederationProxy.address);

  const methodCallGetMembers = federator.methods.getMembers();
  const result = await methodCallGetMembers.call({ from: MultiSigWallet.address});
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
