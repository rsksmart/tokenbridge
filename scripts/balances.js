
const rskapi = require('rskapi');
const sasync = require('simpleasync');

const chainname = process.argv[2];
const chain = process.argv[3];

var config = require('../bridge/' + chainname + 'conf.json');
var host = rskapi.host(chain);

console.log('chain', chainname);
console.log('token', config.token);

sasync()
.exec(function (next) {
    host.getAccounts(next);
})
.then(function (data, next) {
    console.log('accounts');
    console.dir(data);
    next(null, null);
});

