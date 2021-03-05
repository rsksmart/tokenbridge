const abiFederation = require('../../../abis/Federation.json');

module.exports = class GenericFederation {

    static getInstance(Constructor, ...args) {

        const federationContract = new Constructor(abiFederation, ...args);
        const isV2 = abiFederation.includes('TransactionInfo');
        let instanceClass;

        if (isV2) {
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