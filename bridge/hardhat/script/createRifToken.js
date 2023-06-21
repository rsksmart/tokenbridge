// How to run the script: npx hardhat run ./hardhat/script/createRifToken.js --network bsctestnet
const hre = require("hardhat");

async function main() {
  const {getNamedAccounts, deployments} = hre;
  const {deployer} = await getNamedAccounts();

  const transactionEtherValue = 0;
  const tokenDecimals = 18;

  const tokens = [
    {
      name: 'RifToken',
      symbol: 'tRIF',
      typeId: 5,
      originalTokenAddress: '0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE',
    }
  ];

  const Bridge = await deployments.get('BridgeV3');
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

    const tokenAddress = await bridge.methods.mappedTokens(token.originalTokenAddress).call({from: MultiSigWallet.address});
    console.log("Token address for", token.name, ":", tokenAddress);
  }

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
