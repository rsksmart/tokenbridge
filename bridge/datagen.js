const fs = require('fs');

const allowTokensBuild = require('./build/contracts/AllowTokens');
fs.writeFileSync('../abis/AllowTokens.json', JSON.stringify(allowTokensBuild.abi));

const bridgeBuild = require('./build/contracts/Bridge');
fs.writeFileSync('../abis/Bridge.json', JSON.stringify(bridgeBuild.abi));

const federationBuild = require('./build/contracts/Federation');
fs.writeFileSync('../abis/Federation.json', JSON.stringify(federationBuild.abi));

const sideTokenBuild = require('./build/contracts/SideToken');
fs.writeFileSync('../abis/SideToken.json', JSON.stringify(sideTokenBuild.abi));