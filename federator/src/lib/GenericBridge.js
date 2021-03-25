const abiBridgeOld = require('../../../abis/Bridge_old.json');
const abiBridgeNew = require('../../../abis/Bridge.json');
const BridgeInterface = require('./IBridge.js');

module.exports = class GenericBridge {

    static async getVersion(bridgeContract) {
        try {
            return await bridgeContract.methods.version().call();
        } catch(err) {
            console.log(err);
            return "v2";
        }
    }

    static async getInstance(Constructor, ...args) {
        let bridgeContract = new Constructor(abiBridgeNew, ...args);    
        const version = await this.getVersion(bridgeContract);
        
        if (version === 'v3') {
            bridgeContract = new Constructor(abiBridgeNew, ...args);
            return new BridgeInterface(bridgeContract);
        } else {
            bridgeContract = new Constructor(abiBridgeOld, ...args);
            return new BridgeInterface(bridgeContract);
        }
    } 
}