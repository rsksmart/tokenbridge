const fs = require('fs');

const allowTokensBuild = require('./build/contracts/AllowTokens');
fs.writeFileSync('../abis/AllowTokens.json', JSON.stringify(allowTokensBuild.abi, null, 4));

const bridgeBuild = require('./build/contracts/Bridge');
fs.writeFileSync('../abis/Bridge.json', JSON.stringify(bridgeBuild.abi, null, 4));

const federationBuild = require('./build/contracts/Federation');
fs.writeFileSync('../abis/Federation.json', JSON.stringify(federationBuild.abi, null, 4));

const sideTokenBuild = require('./build/contracts/SideToken');
fs.writeFileSync('../abis/SideToken.json', JSON.stringify(sideTokenBuild.abi, null, 4));

const allowTokensBuild_old = require('./build/contracts/AllowTokens_old');
fs.writeFileSync('../abis/AllowTokens_old.json', JSON.stringify(allowTokensBuild_old.abi, null, 4));

const bridgeBuild_old = require('./build/contracts/Bridge_old');
fs.writeFileSync('../abis/Bridge_old.json', JSON.stringify(bridgeBuild_old.abi, null, 4));

const federationBuild_old = require('./build/contracts/Federation_old');
fs.writeFileSync('../abis/Federation_old.json', JSON.stringify(federationBuild_old.abi, null, 4));