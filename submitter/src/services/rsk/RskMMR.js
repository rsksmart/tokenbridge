const Web3 = require('web3');
const fs = require('fs');
const MMRTree = require('../../lib/mmr/MMRTree');
const abiMMR = require('../../abis/MMR.json');
const TransactionSender = require('../../lib/TransactionSender.js');
const { memoryUsage } = require('../../lib/utils');

const initialSeries = 50;

module.exports = class RskMMR {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;

        this.rskWeb3 = new Web3(this.config.rsk.host);
        this.mmrTree = this._restoreMMRTree();
        this.rskMMRPath = `${config.rskMMRStoragePath || __dirname}/RskMMR.json`;
        this.requiredConfirmations = config.mmrBlockConfirmations || 10;
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
                let serialized = fs.readFileSync(this.rskMMRPath);
                mmrTree.deserialize(JSON.parse(serialized));

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

            this.logger.debug(`Getting blocks from ${lastMRRBlock} to ${blockAcceptance}`);
            console.time('MMR Sync');

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

                lastMRRBlock = lastMRRBlock + series;
            }

            console.timeEnd('MMR Sync');
            this.logger.debug(`Current allocated memory: ${memoryUsage()} MB`);

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

    exitHandler() {
        try {
            let serializedTree = this.mmrTree.serialize();
            fs.writeFileSync(this.rskMMRPath, JSON.stringify(serializedTree));
            this.logger.debug('MMRTree saved');
        } catch (err) {
            this.logger.error('Failed to save mmr tree', err);
        }
    }

}
