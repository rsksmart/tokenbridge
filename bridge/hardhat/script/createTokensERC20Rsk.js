// How to run the script: npx hardhat run ./hardhat/script/createTokensERC20Rsk.js --network rsktestnetbsc
const hre = require("hardhat");

async function main() {
  const {getNamedAccounts, deployments} = hre;
  const {deployer} = await getNamedAccounts();

  const transactionEtherValue = 0;
  const tokenDecimals = 18;

  const tokens = [
    {
      name: 'BSC-Binance Token',
      symbol: 'WBNB',
      typeId: 1,
      originalTokenAddress: '0xae13d989dac2f0debff460ac112a837c89baa7cd',
    },
    {
      name: 'BSC-BUSD Token',
      symbol: 'BUSD',
      typeId: 1,
      originalTokenAddress: '0x110887fc420292dce51c08504cee377872d0db66',
    },
    {
      name: 'BSC-DAI Token',
      symbol: 'DAI',
      typeId: 1,
      originalTokenAddress: '0x13878644c0f2c9c5c8a85da43ebc3bb74bbc05a9',
    },
    {
      name: 'BSC-ETH Token',
      symbol: 'ETH',
      typeId: 1,
      originalTokenAddress: '0x8babbb98678facc7342735486c851abd7a0d17ca',
    },
    {
      name: 'BSC-USDC Token',
      symbol: 'USDC',
      typeId: 1,
      originalTokenAddress: '0x5d47b6e7edfc82e2ecd481b3db70d0f6600fdef8',
    },
    {
      name: 'BSC-Tether Token',
      symbol: 'USDT',
      typeId: 1,
      originalTokenAddress: '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd',
    },
    {
      name: 'BSC-BTC Token',
      symbol: 'BTCB',
      typeId: 1,
      originalTokenAddress: '0x6ce8da28e2f864420840cf74474eff5fd80e65b8',
    },
    {
      name: 'BSC-XRP Token',
      symbol: 'XRP',
      typeId: 1,
      originalTokenAddress: '0xa83575490d7df4e2f47b7d38ef351a2722ca45b9',
    },
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
