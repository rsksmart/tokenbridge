// How to run the script: npx hardhat run ./hardhat/script/addFederatorMemeber.js --network rsktestnetbsc
const hre = require("hardhat");
const {getFederation} = require('./utils');

async function main() {
  const {getNamedAccounts, deployments} = hre;
  const {deployer} = await getNamedAccounts();
  const transactionEtherValue = 0;
  const memberFederatorAddress = "0x6f15dCB432c2f5570c247f5CAcb1F1EAfa351f89";

  const Federation = await deployments.get(getFederation(network.name));
  const FederationProxy = await deployments.get('FederationProxy');
  const MultiSigWallet = await deployments.get('MultiSigWallet');

  const federator = new web3.eth.Contract(Federation.abi, FederationProxy.address);
  const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, MultiSigWallet.address);

  const methodCallAddNewMember = federator.methods.addMember(
    memberFederatorAddress
  );
  const result = await methodCallAddNewMember.call({ from: MultiSigWallet.address});
  console.log("Method call result", result);

  const receipt = await multiSigContract.methods.submitTransaction(
    FederationProxy.address,
    transactionEtherValue,
    methodCallAddNewMember.encodeABI()
  ).send({
    from: deployer,
    gasLimit: 3000000
  });
  console.log("Transaction worked, member added, txHash:", receipt.transactionHash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
