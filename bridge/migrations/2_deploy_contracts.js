const Bridge = artifacts.require("Bridge");
const MMR = artifacts.require("MMR");
const MMRProver = artifacts.require("MMRProver");
const MainToken = artifacts.require('MainToken');
const BlockRecorder = artifacts.require('BlockRecorder');
const ReceiptProver = artifacts.require('ReceiptProver');
const EventsProcessor = artifacts.require('EventsProcessor');

const fs = require('fs');

const blocksBetweenCrossEvents = 0;
const minimumPedingTransfersCount = 0;

function shouldDeployToken(network) {
    return !network.toLowerCase().includes('mainnet');
}

module.exports = function(deployer, network) {
    const crossTopic = web3.utils.sha3('Cross(address,address,uint256)');
    const tokenTopic = web3.utils.sha3('Token(address,string)');
    let mmrInstance = null;

    deployer.deploy(MMR)
    .then(() => MMR.deployed())
    .then((mmr)=>{ mmrInstance = mmr; })
    .then(() => deployer.deploy(MMRProver))
    .then(() => MMRProver.deployed())
    .then(() => deployer.deploy(BlockRecorder, MMRProver.address))
    .then(() => BlockRecorder.deployed())
    .then(() => deployer.deploy(ReceiptProver, BlockRecorder.address))
    .then(() => ReceiptProver.deployed())
    .then(() => BlockRecorder.deployed())
    .then(() => deployer.deploy(EventsProcessor, ReceiptProver.address, crossTopic, tokenTopic))
    .then(() => EventsProcessor.deployed())
    .then(() => { 
        let symbol = 'e';
        if(network == 'regtest' || network == 'testnet')
            symbol = 'r';
        
        return deployer.deploy(Bridge, EventsProcessor.address, symbol.charCodeAt(), blocksBetweenCrossEvents, minimumPedingTransfersCount);
    })
    .then(() => Bridge.deployed())
    .then(() => EventsProcessor.deployed())
    .then((processorInstance) => {
        processorInstance.setTransferable(Bridge.address)
    })
    .then(() => MMRProver.deployed())
    .then((mmrProverInstance) => {
        mmrProverInstance.setBlockRecorder(BlockRecorder.address)
    })
    .then( () => {
        if(shouldDeployToken(network)) {
            return deployer.deploy(MainToken, 'MAIN', 'MAIN', 18, web3.utils.toWei('1000'))
                .then(() => MainToken.deployed());
        }
    })
    .then(async () => {
        const blockNumber = await mmrInstance.initialBlock();
        const currentProvider = deployer.networks[network];
        const config = {
            mmr: MMR.address,
            mmrProver: MMRProver.address,
            bridge: Bridge.address,
            fromBlock: '0x' + blockNumber,
            privateKey: "",
            blockRecorder: BlockRecorder.address,
            receiptProver: ReceiptProver.address,
            eventsProcessor: EventsProcessor.address
        };
        if(shouldDeployToken(network)) {
            config.testToken = MainToken.address;
        }
        if (currentProvider.host) {
            let host = currentProvider.host.indexOf('http') == 0 ? '': 'http://';
            host += currentProvider.host + ((currentProvider.port) ? `:${currentProvider.port}` : '');
            config.host = host;
        }
        
        fs.writeFileSync(`../submitter/${network}.json`, JSON.stringify(config, null, 4));
    });
};