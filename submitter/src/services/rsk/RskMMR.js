const Web3 = require('web3');
const fs = require('fs');
const MMRTree = require('../../lib/mmr/MMRTree');
const abiMMR = require('../../abis/MMR.json');
const TransactionSender = require('../../lib/TransactionSender.js');

const initialSeries = 1000;

module.exports = class RskMMR {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;

        this.rskMMRPath = `${config.rskMMRStoragePath || __dirname}/RskMMR.json`;
        this.requiredConfirmations = config.mmrBlockConfirmations || 10;

        this.rskWeb3 = new Web3(this.config.rsk.host);
        this.mmrTree = this._restoreMMRTree();
    }

    async run() {
        try {
            let transactionSender = new TransactionSender(this.rskWeb3, this.logger);
            let mmrAddress = this.config.rsk.mmr;
            let mmrContract = new this.rskWeb3.eth.Contract(abiMMR, mmrAddress);
            await mmrContract.methods.calculate().call(); //Dry run
            let data = mmrContract.methods.calculate().encodeABI();
            await transactionSender.sendTransaction(mmrAddress, data, 0, this.config.rsk.privateKey);
            await this._updateMRRTree();
            return true;
        } catch(err) {
            this.logger.error('Exception calling MMR.calculate()', err);
            process.exit();
        }
    }

    _restoreMMRTree() {
        try {
            let mmrTree = new MMRTree();

            if (fs.existsSync(this.rskMMRPath)) {
                let serialized = this._readFromFile(this.rskMMRPath);
                mmrTree.deserialize(serialized);

                this.logger.debug('MMRTree restored');
            }

            return mmrTree;
        } catch (err) {
            this.logger.error('Error retrieving mmr backup file', err);
        }
    }

    async _updateMRRTree() {
        try {
            let lastMRRBlock = this._getLastMMRBlock();
            let lastBlock = await this.rskWeb3.eth.getBlockNumber();
            let blockAcceptance = lastBlock - this.requiredConfirmations;

            let series = initialSeries;

            this.logger.debug(`Available blocks from ${lastMRRBlock} to ${blockAcceptance}`);

            while (lastMRRBlock < blockAcceptance) {
                if (lastMRRBlock + series > blockAcceptance) {
                    series = blockAcceptance  - lastMRRBlock;
                }

                let calls = [];
                for (let i = 0; i < series; i++) {
                    calls.push({ fn: this.rskWeb3.eth.getBlock, blockNumber: lastMRRBlock + i });
                }

                let blockSeries = await this._makeBatchRequest(calls);

                blockSeries.forEach(async block => {
                    await this.mmrTree.appendBlock(block);
                });

                this.logger.debug(`Added blocks from ${lastMRRBlock} to ${lastMRRBlock + series}`);

                lastMRRBlock = lastMRRBlock + series;
            }

        } catch (err) {
            this.logger.error('Exception updating MRRTree ', err);
        }
    }

    _makeBatchRequest(calls) {
        let batch = new this.rskWeb3.eth.BatchRequest();

        let promises = calls.map(call => {
            return new Promise((res, rej) => {
                let req = call.fn.request(call.blockNumber, (err, data) => {
                    if (err) {
                        rej(err);
                    } else {
                        res(data);
                    }
                });
                batch.add(req)
            })
        })
        batch.execute();

        return Promise.all(promises);
    }

    _getLastMMRBlock() {
        let root = this.mmrTree.getRoot();
        if (root) {
            return root.end_height;
        }
        return 0;
    }

    async exitHandler() {
        try {
            let serializedTree = this.mmrTree.serialize();
            await this._writeToFile(this.rskMMRPath, serializedTree); // TODO append new blocks only

            this.logger.debug('MMRTree saved');
        } catch (err) {
            this.logger.error('Failed to save mmr tree', err);
        }
    }

    _writeToFile(filePath, arr) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filePath);
            for (const row of arr) {
                file.write(JSON.stringify(row) + '\n');
            }
            file.end();
            file.on('finish', () => { resolve(true); });
            file.on('error', reject);
        });
    }

    _readFromFile(filePath) {
        let result = [];
        let file = fs.readFileSync(filePath, 'utf-8');
        let lines = file.split('\n');
        lines.pop(); // Remove last \n

        for (let line of lines) {
            result.push(JSON.parse(line));
        }
        return result;
    }

}
