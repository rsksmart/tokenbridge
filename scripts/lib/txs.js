
const simpleabi = require('simpleabi');

async function callContract(host, address, fnhash, args, options) {
    const tx = {
        from: options.from,
        gas: options.gas || 1000000,
        gasPrice: options.gasPrice || 0,
        value: options.value || 0,
        to: address,
        data: fnhash + simpleabi.encodeValues(args)
    };
    
    return await host.callTransaction(tx);
}

async function invokeContract(host, address, fnhash, args, options) {
    const tx = {
        from: options.from,
        gas: options.gas || 1000000,
        gasPrice: options.gasPrice || 0,
        value: options.value || 0,
        to: address,
        data: fnhash + simpleabi.encodeValues(args)
    };
    
    return await host.sendTransaction(tx);
}

module.exports = {
    call: callContract,
    invoke: invokeContract
};


