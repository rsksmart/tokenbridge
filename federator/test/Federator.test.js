const fs = require('fs');
const path = require('path');

const Federator = require('../src/lib/Federator');
const eth = require('./web3Mock/eth.js');
const web3Mock = require('./web3Mock');

const configFile = fs.readFileSync(path.join(__dirname,'config.js'), 'utf8');
const config = JSON.parse(configFile);

const logger = {
    trace: jest.fn(),
    debug: jest.fn(),
    info: console.log,
    warn: jest.fn(),
    error: console.log,
};
const storagePath = `${__dirname}`;
const testPath = `${storagePath}/lastBlock.txt`;
let testConfig = { ...config, storagePath };

describe('Federator module tests', () => {
    beforeEach(async function () {
        jest.clearAllMocks();
        if(fs.existsSync(testPath)) {
            fs.unlinkSync(testPath);
        }
    });

    it('Saves the progress in a file path', async () => {
        let federator = new Federator.default(testConfig, logger, web3Mock);

        federator._saveProgress(testPath, 'test');

        expect(fs.existsSync(testPath)).toBeTruthy();

        let value = fs.readFileSync(testPath, 'utf8');
        expect(value).toEqual('test');
    });

    it('Should no vote for empty log and receiver', async () => {
        eth.sendSignedTransaction = jest.fn().mockImplementation(() => { throw new Error("Some Error") });

        let federator = new Federator.default(testConfig, logger, web3Mock);
        try{
            await federator._voteTransaction(null, null);
            expect(false).toBeTruthy();
        } catch (err) {
            expect(err).not.toBeNull();
        }
        expect(fs.existsSync(testPath)).toBeFalsy();
    })

})
