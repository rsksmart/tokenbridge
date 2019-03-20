
const simpleabi = require('simpleabi');
const txs = require('../txs');

const getMappedAddressHash = '0x96e609f8';

function Bridge(host, address) {
    this.host = host;
    this.address = address;
    
    this.getMappedAddress = async function (addr, options) {
        return await txs.call(
            host,
            address,
            getMappedAddressHash,
            [ addr ],
            options);
    }
}

function createBridge(host, address) {
    return new Bridge(host, address);
}

module.exports = {
    bridge: createBridge
}

