const fs = require('fs');

const allowTokensBuild = require('./build/contracts/AllowTokens');
fs.writeFileSync('../abis/AllowTokens.json', JSON.stringify(allowTokensBuild.abi, null, 4));

const bridgeBuild = require('./build/contracts/Bridge');
fs.writeFileSync('../abis/Bridge.json', JSON.stringify(bridgeBuild.abi, null, 4));

const federationBuild = require('./build/contracts/Federation');
fs.writeFileSync('../abis/Federation.json', JSON.stringify(federationBuild.abi, null, 4));

const sideTokenBuild = require('./build/contracts/SideToken');
fs.writeFileSync('../abis/SideToken.json', JSON.stringify(sideTokenBuild.abi, null, 4));