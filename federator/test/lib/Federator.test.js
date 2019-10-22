const expect = require('chai').expect;
const log4js = require('log4js');
const fs = require('fs');

const Federator = require('../../src/lib/Federator');
const web3Mock = require('../web3Mock');
const config = require('../../config.js');

const logger = log4js.getLogger('test');
const storagePath = `${__dirname}`;
let testConfig = { ...config, storagePath };

describe('Federator module tests', () => {
    it('Confirms pending transactions and saves progress', async () => {
        let federator = new Federator(testConfig, logger, web3Mock);

        await federator._confirmPendingTransactions();

        let path = `${storagePath}/lastTxCount.txt`;
        expect(fs.existsSync(path)).to.eq(true);

        let count = fs.readFileSync(path, 'utf8');
        expect(count).to.eq('10');
    });

    it.only('Saves the progress in a file path', async () => {
        let federator = new Federator(testConfig, logger, web3Mock);
        let path = `${storagePath}/testPath.txt`;

        federator._saveProgress(path, 'test');

        expect(fs.existsSync(path)).to.eq(true);

        let value = fs.readFileSync(path, 'utf8');
        expect(value).to.eq('test');
    })
})
