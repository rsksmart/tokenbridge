// How to run the script: npx hardhat run ./hardhat/script/createTokensERC20Rsk.js --network rsktestnet goerly bsctestnet rsktestnet rsktestnetbsc
const hre = require("hardhat");

async function main() {
  const {getNamedAccounts, deployments} = hre;
  const {deployer} = await getNamedAccounts();

  const transactionEtherValue = 0;
  const tokenDecimals = 18;

  const tokens = [
    {
      name: 'Side Ethereum Test BTC (WTBTC)',
      symbol: 'RWTBTC',
      typeId: 1,
      originalTokenAddress: '0x4ccc35c8f2e780203c5dc4b605f495acea9255bc',
    }
  ];

  const Bridge = await deployments.get('Bridge');
  const BridgeProxy = await deployments.get('BridgeProxy');
  const MultiSigWallet = await deployments.get('MultiSigWallet');

  const bridge = new web3.eth.Contract(Bridge.abi, BridgeProxy.address);
  const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, MultiSigWallet.address);


  for (const token of tokens) {
    console.log("Token", token);
    console.log("deployer", deployer);
    console.log("\nBridge", Bridge.address);
    console.log("\nBridgeProxy", BridgeProxy.address);
    console.log("\nMultiSigWallet", MultiSigWallet.address);

    const methodCallCreateSideToken = bridge.methods.createSideToken(
      token.typeId,
      token.originalTokenAddress,
      tokenDecimals,
      token.symbol,
      token.name
    );
    const result = await methodCallCreateSideToken.call({ from: MultiSigWallet.address});
    console.log("Method call result", result);

    const receipt = await multiSigContract.methods.submitTransaction(
      BridgeProxy.address,
      transactionEtherValue,
      methodCallCreateSideToken.encodeABI()
    ).send({
      from: deployer,
      gasLimit: 3000000
    });
    console.log("Transaction worked", receipt.transactionHash);

    const mappedTokenAddress = await bridge.methods.mappedTokens(token.originalTokenAddress).call({from: MultiSigWallet.address});
    console.log("Mapped Token address for", token.name, ":", mappedTokenAddress);
    const originalTokenAddress = await bridge.methods.originalTokens(token.originalTokenAddress).call({from: MultiSigWallet.address});
    console.log("Original Token address for", token.name, ":", originalTokenAddress);
  }

  console.log("finish");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors. 1.4539
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
