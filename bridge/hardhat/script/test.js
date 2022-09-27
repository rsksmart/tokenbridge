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

  const methodCallAddNewMember = bridge.methods.setSideTokenByOriginalAddressByChain(
    5, '0x326C977E6efc84E512bB9C30f76E30c160eD06FB', '0x8bbbd80981fe76d44854d8df305e8985c19f0e78'
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




//   rKovWETH: {address: '0xd15cdd74dff1a6a81ca639b038839b126bc01ff9', typeId: '1', isSideToken: true, decimals: 18, symbol: 'rKovWETH'}, //rKovWETH
//   rKovSAI: {address: '0x0d86fca9be034a363cf12c9834af08d54a10451c', typeId: '4', isSideToken: true, decimals: 18, symbol: 'rKovSAI'}, //rKovSAI
//   rKovDAI: {address: '0x7b846216a194c69bb1ea52ea8faa92d314866451', typeId: '4', isSideToken: true, decimals: 18, symbol: 'rKovDAI'}, //rKovDAI
//   rKovTUSD: {address: '0x0a8d098e31a60da2b9c874d97de6e6b385c28e9d', typeId: '4', isSideToken: true, decimals: 18, symbol: 'rKovTUSD'}, //rKovTUSD
//   rKovUSDC: {address: '0xed3334adb07a3a5947d268e5a8c67b84f5464963', typeId: '4', isSideToken: true, decimals: 18, symbol: 'rKovUSDC'}, //rKovUSDC
//   rKovUSDT: {address: '0x4cfE225cE54c6609a525768b13F7d87432358C57', typeId: '4', isSideToken: true, decimals: 18, symbol: 'rKovUSDT'}, //rKovUSDT
//   rKovLINK: {address: '0x8bbbd80981fe76d44854d8df305e8985c19f0e78', typeId: '3', isSideToken: true, decimals: 18, symbol: 'rKovLINK'}, //rKovLINK
//   rKovBUND: {address: '0xe95afdfec031f7b9cd942eb7e60f053fb605dfcd', typeId: '3', isSideToken: true, decimals: 18, symbol: 'rKovBUND'}, //rKovBUND
//   rKovWBTC: {address: '0xb8aE2CB769255359190fBcE89d3aD38687da5e65', typeId: '0', isSideToken: true, decimals: 18, symbol: 'rKovWBTC'}, //rKovWBTC

//   const goerli = {
//     WBTC: {address: '0xd1b98b6607330172f1d991521145a22bce793277', typeId: '0', isSideToken: false, decimals: 8, symbol: 'WBTC'}, //WBTC
//     DAI: {address: '0x73967c6a0904aA032C103b4104747E88c566B1A2', typeId: '4', isSideToken: false, decimals: 18, symbol: 'DAI'}, //DAI
//     USDT: {address: '0x509Ee0d083DdF8AC028f2a56731412edD63223B9', typeId: '4', isSideToken: false, decimals: 6, symbol: 'USDT'}, //USDT
//     LINK: {address: '0x326C977E6efc84E512bB9C30f76E30c160eD06FB', typeId: '3', isSideToken: false, decimals: 18, symbol: 'LINK'}, //LINK
// }