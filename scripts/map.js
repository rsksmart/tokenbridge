
const rskapi = require('rskapi');
const sabi = require('simpleabi');

const getMappedAddressHash = '0x96e609f8';
const mapAddressHash = '0x4a270f47';

const fromchainname = process.argv[2];
const tochainname = process.argv[3];

const fromconfig = require('../' + fromchainname + 'conf.json');
const host = rskapi.host(fromconfig.host);

console.log('from chain', fromchainname);
console.log('from host', fromconfig.host);

const toconfig = require('../' + tochainname + 'conf.json');

console.log('to chain', tochainname);
console.log('to host', toconfig.host);

const naccounts = Math.min(fromconfig.accounts.length, toconfig.accounts.length);

(async function() {
    for (var k = 0; k < naccounts; k++) {
        const fromaccount = fromconfig.accounts[k];
        const toaccount = toconfig.accounts[k];

        const abi = sabi.encodeValue(toaccount);
        console.log(abi);
        
        await host.sendTransaction({
            from: fromaccount,
            to: fromconfig.bridge,
            value: '0x00',
            gas: 6700000,
            data: mapAddressHash + abi
        });
    }
})();

