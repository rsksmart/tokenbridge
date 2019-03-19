
const rskapi = require('rskapi');

const events = require('./lib/allevents');

const chainname = process.argv[2];
const chain = process.argv[3];

const config = require('../' + chainname + 'conf.json');
const host = rskapi.host(chain);

console.log('chain', chainname);
console.log('token', config.token);

(async function() { 
    console.log('init');
    
    const logs = await events.getLogs(host, config.token, {});

    console.log('logs');
    console.dir(logs);
    
    for (var k = 0; k < logs.length; k++) {
        var log = logs[k];
        console.dir(log);
    }
})();
