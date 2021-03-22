const abiFederation = require('../../../abis/Federation.json');

module.exports = class GenericFederation {

    static async getVersion(federationContract) {
        try {
            return await federationContract.methods.version().call();
        } catch(err) {
            return "v1";
        }
    }

    static async getInstance(Constructor, ...args) {
        const federationContract = new Constructor(abiFederation, ...args);
        const version = await this.getVersion(federationContract);
        let instanceClass;

        if (version === 'v2') {
            instanceClass = class {
                getTransactionId(paramsObj = {}) {
                    const {
                        originalTokenAddress
                    } = paramsObj;

                    delete paramsObj.originalTokenAddress;

                    return federationContract.methods.getTransactionId(
                        originalTokenAddress,
                        paramsObj
                    );
                }

                transactionWasProcessed(txId) {
                    return federationContract.methods.transactionWasProcessed(txId);
                }

                hasVoted(txId) {
                    return federationContract.methods.hasVoted(txId);
                }

                isMember(from) {
                    return federationContract.methods.isMember(from);
                }

                getAddress() {
                    return federationContract.options.address;
                }
                
                voteTransaction(paramsObj = {}) {
                    const {
                        originalTokenAddress
                    } = paramsObj;

                    delete paramsObj.originalTokenAddress;
                    
                    return federationContract.methods.voteTransaction(
                        originalTokenAddress,
                        paramsObj
                    );
                }
            }
        } else {
            instanceClass = class {
                getTransactionId(paramsObj = {}) {
                    delete paramsObj.sender;

                    return federationContract.methods.getTransactionId(
                        ...Object.values(paramsObj)
                    );
                }
                
                transactionWasProcessed(txId) {
                    return federationContract.methods.transactionWasProcessed(txId);
                }

                hasVoted(txId) {
                    return federationContract.methods.hasVoted(txId);
                }

                isMember(from) {
                    return federationContract.methods.isMember(from);
                }
                
                getAddress() {
                    return federationContract.options.address;
                }

                voteTransaction(paramsObj = {}) {
                    return federationContract.methods.voteTransaction(
                        ...Object.values(paramsObj)
                    );
                } 
            }
        }

        return new instanceClass();
    } 
}
