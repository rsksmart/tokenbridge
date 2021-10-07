// How to run the script: npx hardhat run ./hardhat/script/createSideNftToken.js --network rsktestnetrinkeby
const hre = require("hardhat");
const chains = require('../helper/chains');

async function main() {
  const {getNamedAccounts, deployments, network} = hre;
  const {deployer} = await getNamedAccounts();

  if (chains.isMainnet(network)) {
    console.log('This is mainnet, are you sure? remove this check then .-.');
    return;
  }

  const transactionEtherValue = 0;

  const nftTokens = [
    {
      name: 'The Drops',
      symbol: 'drop',
      originalTokenAddress: '0xf0c541ab4e8b780f3e4f5e32d2ba4f2149d8baec',
      baseUri: '',
      contractUri: '',
    },
  ];

  const NftBridge = await deployments.get('NFTBridge');
  const NftBridgeProxy = await deployments.get('NftBridgeProxy');
  const MultiSigWallet = await deployments.get('MultiSigWallet');

  const nftBridge = new web3.eth.Contract(NftBridge.abi, NftBridgeProxy.address);
  const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, MultiSigWallet.address);

  for (const nftToken of nftTokens) {
    console.log("Token", nftToken);
    console.log("deployer", deployer);
    console.log("\nNFT Bridge", NftBridge.address);
    console.log("\nNFT BridgeProxy", NftBridgeProxy.address);
    console.log("\nMultiSigWallet", MultiSigWallet.address);

    const methodCallCreateSideNftToken = nftBridge.methods.createSideNFTToken(
      nftToken.originalTokenAddress,
      nftToken.symbol,
      nftToken.name,
      nftToken.baseUri,
      nftToken.contractUri,
    );
    const result = await methodCallCreateSideNftToken.call({ from: MultiSigWallet.address});
    console.log("Method call result", result);

    const receipt = await multiSigContract.methods.submitTransaction(
      NftBridgeProxy.address,
      transactionEtherValue,
      methodCallCreateSideNftToken.encodeABI()
    ).send({
      from: deployer,
      gasLimit: 3000000
    });
    console.log("Transaction worked", receipt.transactionHash);

    const sideTokenAddress = await nftBridge.methods.sideTokenAddressByOriginalTokenAddress(nftToken.originalTokenAddress).call({from: MultiSigWallet.address});
    console.log("Token address Mapped for", nftToken.name, ":", sideTokenAddress);
    const originalTokenAddress = await nftBridge.methods.originalTokenAddressBySideTokenAddress(nftToken.originalTokenAddress).call({from: MultiSigWallet.address});
    console.log("Token address Original for", nftToken.name, ":", originalTokenAddress);
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
