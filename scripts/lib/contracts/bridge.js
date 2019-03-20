
const simpleabi = require('simpleabi');

const getMappedAddressHash = '0x96e609f8';

function Bridge(host, address) {
    this.host = host;
    this.address = address;
    
    this.getMappedAddress = async function (addr, options) {
        return await host.callTransaction({
            from: options.from,
            to: address,
            value: options.value || 0,
            gas: options.gas || 1000000,
            gasPrice: options.gasPrice || 0,
            data: getMappedAddressHash + simpleabi.encodeValue(addr)
        });
    }
}

function createBridge(host, address) {
    return new Bridge(host, address);
}

module.exports = {
    bridge: createBridge
}

