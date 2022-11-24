// How to run the script: npx hardhat run ./hardhat/script/addFederatorMemeber.js --network rsktestnetbsc
const hre = require("hardhat");

async function main() {
  const {getNamedAccounts, deployments} = hre;
  const {deployer} = await getNamedAccounts();
  const transactionEtherValue = 0;
  const Bridge = await deployments.get('Bridge');
  const BridgeProxy = await deployments.get('BridgeProxy');
  const MultiSigWallet = await deployments.get('MultiSigWallet');
  const bridge = new web3.eth.Contract(Bridge.abi, BridgeProxy.address);
  const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, MultiSigWallet.address);

// -------------------SCRIPT TO MAP TOKEN BETWEEN BRIDGES

  const methodCallAddNewMember = bridge.methods.setOriginalTokenBySideTokenByChain(
    '0x4cfE225cE54c6609a525768b13F7d87432358C57', ['0xC2C527C0CACF457746Bd31B2a698Fe89de2b6d49', 5]
  );

  const result = await methodCallAddNewMember.call({ from: MultiSigWallet.address});
  console.log("Method call result", result);

  const receipt = await multiSigContract.methods.submitTransaction(
    BridgeProxy.address,
    transactionEtherValue,
    methodCallAddNewMember.encodeABI()
  ).send({
    from: deployer,
    gasLimit: 3000000
  });

  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });