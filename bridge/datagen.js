const fs = require('fs');

const allowTokensBuild = require('./build/contracts/AllowTokens');
fs.writeFileSync('../abis/AllowTokens.json', JSON.stringify(allowTokensBuild.abi));

const bridgeBuild = require('./build/contracts/Bridge_v2');
fs.writeFileSync('../abis/Bridge.json', JSON.stringify(bridgeBuild.abi));

const federationBuild = require('./build/contracts/Federation_v1');
fs.writeFileSync('../abis/Federation.json', JSON.stringify(federationBuild.abi));

const sideTokenBuild = require('./build/contracts/SideToken_v2');
fs.writeFileSync('../abis/SideToken.json', JSON.stringify(sideTokenBuild.abi));