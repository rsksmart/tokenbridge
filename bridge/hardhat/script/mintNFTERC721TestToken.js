// How to run the script: npx hardhat run ./hardhat/script/mintNFTERC721TestToken.js --network rinkeby
const hre = require("hardhat");

async function main() {
  const {getNamedAccounts, deployments} = hre;
  const {deployer} = await getNamedAccounts();
  const tokenUri = 'https://creatures-api.opensea.io/api/creature/2';

  const NFTERC721TestToken = await deployments.get('NFTERC721TestToken');
  const nftErc721TestToken = new web3.eth.Contract(NFTERC721TestToken.abi, NFTERC721TestToken.address);

  console.log("\nNFTERC721TestToken", NFTERC721TestToken.address);

  const totalSupply = await nftErc721TestToken.methods.totalSupply().call();
  console.log('total supply is', totalSupply);

  const receipt = await nftErc721TestToken.methods.safeMint(deployer, totalSupply).send({
    from: deployer,
  });
  console.log('token minted txHash', receipt.transactionHash);

  const receiptTokenUri = await nftErc721TestToken.methods.setTokenURI(totalSupply, tokenUri).send({
    from: deployer,
  });
  console.log('token URI set txHash', receiptTokenUri.transactionHash);
  console.log(`Addr: ${NFTERC721TestToken.address}, tokenId: ${totalSupply}`);
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
