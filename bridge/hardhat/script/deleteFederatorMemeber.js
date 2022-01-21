// How to run the script: npx hardhat run ./hardhat/script/deleteFederatorMemeber.js --network rsktestnetbsc
const hre = require("hardhat");

async function main() {
  const {getNamedAccounts, deployments} = hre;
  const {deployer} = await getNamedAccounts();

  const oldFederatorAddress = "0x00.....";

  const Federation = await deployments.get('FederationV2');
  const FederationProxy = await deployments.get('FederationProxy');
  const MultiSigWallet = await deployments.get('MultiSigWallet');

  const federator = new web3.eth.Contract(Federation.abi, FederationProxy.address);
  const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, MultiSigWallet.address);

  const methodCallRemoveOldMember = federator.methods.removeMember(
    oldFederatorAddress
  );
  const result = await methodCallRemoveOldMember.call({ from: MultiSigWallet.address});
  console.log("Method call result", result);

  const receipt = await multiSigContract.methods.submitTransaction(
    FederationProxy.address,
    0,
    methodCallRemoveOldMember.encodeABI()
  ).send({
    from: deployer,
    gasLimit: 3000000
  });
  console.log("Transaction worked, member removed, txHash:", receipt.transactionHash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
