// How to run the script: npx hardhat run ./hardhat/script/createRifToken.js --network bsctestnet
const hre = require("hardhat");

async function main() {
    const {getNamedAccounts, deployments} = hre;
    const {deployer} = await getNamedAccounts();
    const network = hre.network.name;

    let newWalletAddress = null;

    switch (network){
        case "rsktestnet":
            newWalletAddress = '0x51591ec8f296ef3e4deebe32c392c706aef42133';
            break;
        case "sepolia":
            newWalletAddress = '0x0d4FC5C4847Eab6e5759656a8e0740Ea64A9582d';
            break;
        default:
            newWalletAddress = null;
            break;
    }

    if (newWalletAddress === null) {
        console.log('No new owner founded');
        return;
    }

    const Bridge = await deployments.get('BridgeV3');
    const BridgeProxy = await deployments.get('BridgeProxy');

    const Federation = await deployments.get('FederationV2');
    const FederationProxy = await deployments.get('FederationProxy');

    const AllowTokens = await deployments.get('AllowTokens');
    const AllowTokensProxy = await deployments.get('AllowTokensProxy');

    const MultiSigWallet = await deployments.get('MultiSigWallet');

    const bridge = new web3.eth.Contract(Bridge.abi, BridgeProxy.address);
    const federation = new web3.eth.Contract(Federation.abi, FederationProxy.address);
    const allowTokens = new web3.eth.Contract(AllowTokens.abi, AllowTokensProxy.address);
    const multiSigContract = new web3.eth.Contract(MultiSigWallet.abi, MultiSigWallet.address);

    const bridgeOwner = await bridge.methods.owner().call();
    const federationOwner = await federation.methods.owner().call();
    const allowTokensOwner = await allowTokens.methods.owner().call();
    const multiSigOwners = await multiSigContract.methods.getOwners().call();

    console.log('Current Deployer address: ', deployer);
    console.log('Current Multisig address: ', MultiSigWallet.address);
    console.log('Current Bridge Owner: ', bridgeOwner);
    console.log('List of multisig owners: ', multiSigOwners);

    if(!multiSigOwners.includes(deployer)) {
        console.log('You should be a owner in the multisig wallet to perform this transaction');
        return;
    }

    if (bridgeOwner === MultiSigWallet.address) {
        const changeBridgeOwnerMethod = bridge.methods
            .transferOwnership(newWalletAddress);
        await changeBridgeOwnerMethod.call({ from: MultiSigWallet.address });
        await multiSigContract.methods.submitTransaction(
            BridgeProxy.address,
            0,
            changeBridgeOwnerMethod.encodeABI()
        ).send({ from: deployer, gasLimit: 3000000 });

        const newOwner = await bridge.methods.owner().call();

        if(newOwner.toLowerCase() === newWalletAddress.toLowerCase()) {
            console.log('Bridge owner changed successfully, the new owner now is: ', newOwner);
        } else {
            console.log('Error changing the bridge owner, owner is: ', newOwner);
        }
    } else {
        console.log('Multisig is not the bridge owner');
    }

    if (federationOwner === MultiSigWallet.address) {
        const changeFederationOwnerMethod = federation.methods
            .transferOwnership(newWalletAddress);
        await changeFederationOwnerMethod.call({ from: MultiSigWallet.address });
        await multiSigContract.methods.submitTransaction(
            FederationProxy.address,
            0,
            changeFederationOwnerMethod.encodeABI()
        ).send({ from: deployer, gasLimit: 3000000 });

        const newOwner = await federation.methods.owner().call();

        if(newOwner.toLowerCase() === newWalletAddress.toLowerCase()) {
            console.log('Federation owner changed successfully, the new owner now is: ', newOwner);
        } else {
            console.log('Error changing the federation owner, owner is: ', newOwner);
        }
    } else {
        console.log('Multisig is not the Federation owner');
    }

    if (allowTokensOwner === MultiSigWallet.address) {
        const changeAllowTokensOwnerMethod = allowTokens.methods
            .transferOwnership(newWalletAddress);
        await changeAllowTokensOwnerMethod.call({ from: MultiSigWallet.address });
        await multiSigContract.methods.submitTransaction(
            AllowTokensProxy.address,
            0,
            changeAllowTokensOwnerMethod.encodeABI()
        ).send({ from: deployer, gasLimit: 3000000 });

        const newOwner = await allowTokens.methods.owner().call();

        if(newOwner.toLowerCase() === newWalletAddress.toLowerCase()) {
            console.log('Allow Tokens owner changed successfully, the new owner now is: ', newOwner);
        } else {
            console.log('Error changing the Allow Tokens owner, owner is: ', newOwner);
        }
    } else {
        console.log('Multisig is not the Allow tokens owner');
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
