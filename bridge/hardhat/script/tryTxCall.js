
// How to run the script: npx hardhat run ./hardhat/script/getFeeConfig.js --network rsktestnetbsc
const hre = require("hardhat");

async function main() {

  // Use the from, to and data sent in the transaction to see what is the revert reason
  // In this example we use https://explorer.rsk.co/tx/0xddcdc5e6917b1f92069fe67585d288b42f1ee11f195597b73e00b206a42d20a3

  const to = "0x9d11937E2179dC5270Aa86A3f8143232D6DA0E69";
  const data = "0x7813bea2000000000000000000000000e700691da7b9851f2f35f8b8182c69c53ccad9db000000000000000000000000ad0eca47df3c9a226daaa62b1d8a1986c9e1a64b0000000000000000000000000000000000000000000000056bc75e2d63100000";
  const from = "0xad0EcA47DF3C9a226dAAA62B1D8A1986c9e1A64b";

  const result = await web3.eth.call({
    to:to.toLowerCase(), // contract address
    data: data,
    from: from.toLowerCase() 
  });
  console.log('Call successfull', result);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });