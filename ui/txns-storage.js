class TXN_Storage {
    
    static Storage;

    static isStorageAvailable(type) {
        
        try {
            this.Storage = window[type];
            let x = '__storage_test__';
            this.Storage.setItem(x, x);
            this.Storage.removeItem(x);
            return true;
        }
        catch(e) {
            return e instanceof DOMException && (
                // everything except Firefox
                e.code === 22 ||
                // Firefox
                e.code === 1014 ||
                // test name field too, because code might not be present
                // everything except Firefox
                e.name === 'QuotaExceededError' ||
                // Firefox
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
                // acknowledge QuotaExceededError only if there's something already stored
                (storage && storage.length !== 0);
        }
    }

    static getAllTxns4Address(accountAddress = "", networkName = "") {
        let key = `${accountAddress}-${networkName.toLowerCase().replace(" ", '-')}`;
        let { _, txns } = this.unserializeTxns(key);
        return txns;
    }
 
    static addTxn(accountAddress, networkName = "", data = {}) {
        delete data.transactionIndex;
        delete data.cumulativeGasUsed;
        delete data.gasUsed;
        delete data.contractAddress;
        delete data.logs;
        delete data.to;
        delete data.root;
        delete data.logsBloom;

        let key = `${accountAddress}-${networkName.toLowerCase().replace(" ", '-')}`;
        let { txns } = this.unserializeTxns(key);
        this.serializeTxns(key, [...txns, data]);
    }

    static deleteTxn(accountAddress, txnId = "") {
        let key = `${accountAddress}-txns`;
        let {_, txns = []} = this.unserializeTxns(key);
        let toKeepTransactions = txns.filter(tx => txnId != tx.transactionHash);
        this.serializeTxns(key, toKeepTransactions);
    }

    static unserializeTxns(key = "") {
        let rawTxns = this.Storage.getItem(key.toLowerCase());
        let returnObj = { key, txns: JSON.parse(rawTxns) || [] };
        return returnObj;
    }

    static serializeTxns(key, transactions = []) {
        this.Storage.removeItem(key.toLowerCase());
        this.Storage.setItem(key.toLowerCase(), JSON.stringify(transactions));
    }

}