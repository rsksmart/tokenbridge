const ethUtils = require('ethereumjs-util');

async function waitBlocks(client, numberOfBlocks) {
    var startBlock = await client.eth.getBlockNumber();
    var currentBlock = startBlock;
    while(numberOfBlocks > currentBlock - startBlock) {
        var newBlock = await client.eth.getBlockNumber();
        if(newBlock != currentBlock){
            currentBlock = newBlock;
        } else {
            await sleep(20000);
        }
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve,ms));
}

function hexStringToBuffer(hexString) {
    return ethUtils.toBuffer(ethUtils.addHexPrefix(hexString));
}

function stripHexPrefix(str) {
    return (str.indexOf('0x') == 0) ? str.slice(2) : str;
  }

function privateToAddress(privateKey) {
    return ethUtils.bufferToHex(ethUtils.privateToAddress(this.hexStringToBuffer(privateKey)));
}

// Returns current memory allocated in MB
function memoryUsage() {
    let { heapUsed } = process.memoryUsage();
    return Math.round(heapUsed / (1024 * 1024));
}

module.exports = {
    waitBlocks: waitBlocks,
    sleep: sleep,
    hexStringToBuffer: hexStringToBuffer,
    privateToAddress: privateToAddress,
    stripHexPrefix: stripHexPrefix,
    memoryUsage: memoryUsage
}