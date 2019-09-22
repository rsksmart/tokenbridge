const fs = require('fs');
const Web3 = require('web3');
const MMRTree = require('./MMRTree');
const CustomError = require('../CustomError');

const initialSeries = 1000;

module.exports = class MMRController {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        //TODO this class should not be glued to rsk as we will use it for ethereum as well
        this.rskMMRPath = `${config.rskMMRStoragePath || __dirname}/mmrDB.json`;
        this.requiredConfirmations = config.mmrBlockConfirmations || 10;

        this.web3 = new Web3(this.config.rsk.host);
        this.mmrTree = this._restoreMMRTree();
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
            throw new CustomError('Error retrieving mmr backup file', err);
        }
    }

    async updateMMRTree() {
        try {
            let nextMRRBlock = this._getNextMMRBlock();
            let lastBlock = await this.web3.eth.getBlockNumber();
            let blockAcceptance = lastBlock - this.requiredConfirmations;

            let series = initialSeries;

            this.logger.debug(`Available blocks from ${nextMRRBlock} to ${blockAcceptance}`);

            while (nextMRRBlock < blockAcceptance) {
                if (nextMRRBlock + series > blockAcceptance) {
                    series = blockAcceptance  - nextMRRBlock;
                }

                let calls = [];
                for (let i = 0; i < series; i++) {
                    calls.push({ fn: this.web3.eth.getBlock, blockNumber: nextMRRBlock + i });
                }

                let blockSeries = await this._makeBatchRequest(calls);

                blockSeries.forEach(async block => {
                    await this.mmrTree.appendBlock(block);
                });

                this.logger.debug(`Added blocks from ${nextMRRBlock} to ${nextMRRBlock + series}`);

                nextMRRBlock = nextMRRBlock + series;
            }
            await this._save();
        } catch (err) {
            throw new CustomError('Exception updating MRRTree', err);
        }
    }

    _makeBatchRequest(calls) {
        let batch = new this.web3.eth.BatchRequest();

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

    _getNextMMRBlock() {
        let root = this.mmrTree.getRoot();
        if (root) {
            return root.end_height + 1;
        }
        return 0;
    }

    async  _save() {
        try {
            let serializedTree = this.mmrTree.serialize();
            await this._writeToFile(this.rskMMRPath, serializedTree); // TODO append new blocks only

            this.logger.debug('MMRTree saved');
        } catch (err) {
            throw new CustomError('Failed to save mmr tree', err);
        }
    }

    _writeToFile(filePath, arr) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filePath);
            for (const row of arr) {
                file.write(JSON.stringify(row) + '\n');
            }
            file.on('finish', () => { resolve(true); });
            file.on('error', reject);
            file.end();
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