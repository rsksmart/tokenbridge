
const simpleabi = require('simpleabi');
const Tx = require('ethereumjs-tx');

async function callContract(host, address, fnhash, args, options) {
    const tx = {
        from: options.from.address ? options.from.address : options.from,
        gas: options.gas || 1000000,
        gasPrice: options.gasPrice || 0,
        value: options.value || 0,
        to: address,
        data: fnhash + simpleabi.encodeValues(args)
    };
    
    return await host.callTransaction(tx);
}

async function invokeContract(host, address, fnhash, args, options) {
    if (options.from.privateKey) {
        const nonce = await host.getTransactionCount(options.from.address, 'latest');
        
        const tx = {
            gas: options.gas || 1000000,
            gasPrice: options.gasPrice || 0,
            value: options.value || 0,
            to: address,
            nonce: nonce,
            data: fnhash + simpleabi.encodeValues(args)
        };
        
        console.dir(tx);
        
        const xtx = new Tx(tx);
        const privateKey = new Buffer(options.from.privateKey.substring(2), 'hex');
        xtx.sign(privateKey);
        const serializedTx = xtx.serialize();
        
        await host.sendRawTransaction('0x' + serializedTx.toString('hex'));
    }
    else {
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
}

async function transferValue(host, receiver, amount, options) {
    const tx = {
        from: options.from,
        gas: options.gas || 1000000,
        gasPrice: options.gasPrice || 0,
        value: amount || 0,
        to: receiver
    };
    
    return await host.sendTransaction(tx);
}

module.exports = {
    call: callContract,
    invoke: invokeContract,
    transfer: transferValue
};


