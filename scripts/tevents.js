
const rskapi = require('rskapi');

const events = require('./lib/events');

const chainname = process.argv[2];
const chain = process.argv[3];

const config = require('../bridge/' + chainname + 'conf.json');
const host = rskapi.host(chain);

console.log('chain', chainname);
console.log('token', config.token);

events.getLogs(host, config.token, {}, 
    function (err, logs) {
        if (err) {
            console.log(err);
            return;
        }
        
        for (var k = 0; k < logs.length; k++) {
            var log = logs[k];
            console.dir(log);
        }
    }
);

