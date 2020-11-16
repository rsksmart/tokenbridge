const fs = require('fs');
const path = require('path');

const Validator = require('../src/lib/Validator');
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

describe('Validator module tests', () => {
    beforeEach(async function () {
        jest.clearAllMocks();
        if(fs.existsSync(testPath)) {
            fs.unlinkSync(testPath);
        }
    });

    it('Runs the main validator process sucessfully', async () => {
        let validator = new Validator(testConfig, logger, web3Mock);
        let result = await validator.run();

        expect(result).toBeTruthy();
    });

    it('Runs the main validator process with pagination', async () => {
        let currentBlock = testConfig.mainchain.fromBlock + 2002 + 120;
        let validator = new Validator(testConfig, logger, web3Mock);
        validator.mainWeb3.eth.getBlockNumber = () => Promise.resolve(currentBlock);
        validator.mainWeb3.eth.net.getId = () => Promise.resolve(1);
        const _processLogsSpy = jest.spyOn(validator, '_processLogs');

        let result = await validator.run();

        expect(result).toBeTruthy();
        let value = fs.readFileSync(testPath, 'utf8');
        expect(parseInt(value)).toEqual(currentBlock-120);
        expect(_processLogsSpy).toHaveBeenCalledTimes(3);
    });

    it('Runs the main validator process with pagination limit', async () => {
        let currentBlock = testConfig.mainchain.fromBlock + 1001 + 120; // The +1 one is because it starts with fromBlock +1 
        let validator = new Validator(testConfig, logger, web3Mock);
        validator.mainWeb3.eth.getBlockNumber = () => Promise.resolve(currentBlock);
        validator.mainWeb3.eth.net.getId = () => Promise.resolve(1);
        const _processLogsSpy = jest.spyOn(validator, '_processLogs');

        let result = await validator.run();

        expect(result).toBeTruthy();
        let value = fs.readFileSync(testPath, 'utf8');
        expect(parseInt(value)).toEqual(currentBlock-120);
        expect(_processLogsSpy).toHaveBeenCalledTimes(1);
    });

    it('Saves the progress in a file path', async () => {
        let validator = new Validator(testConfig, logger, web3Mock);

        validator._saveProgress(testPath, 'test');

        expect(fs.existsSync(testPath)).toBeTruthy();

        let value = fs.readFileSync(testPath, 'utf8');
        expect(value).toEqual('test');
    });

    it('Should no vote for empty log and receiver', async () => {
        eth.sendSignedTransaction = jest.fn().mockImplementation(() => { throw new Error("Some Error") });

        let validator = new Validator(testConfig, logger, web3Mock);
        try{
            await validator._voteTransaction(null, null);
            expect(false).toBeTruthy();
        } catch (err) {
            expect(err).not.toBeNull();
        }
        expect(fs.existsSync(testPath)).toBeFalsy();
    })

    it('Votes a transaction from a log entry', async () => {
        let validator = new Validator(testConfig, logger, web3Mock);
        let log = {
            logIndex: 2,
            blockNumber: 2557,
            blockHash:
                '0x5d3752d14223348e0df325ea0c3bd62f76195127762621314ff5788ccae87a7a',
            transactionHash:
                '0x79fcac96ebe7642c3258143f91a94be443e0dfc214199372542df940670166a6',
            transactionIndex: 0,
            address: '0x1eD614cd3443EFd9c70F04b6d777aed947A4b0c4',
            id: 'log_a755a817',
            returnValues:{
                '0': '0x5159345aaB821172e795d56274D0f5FDFdC6aBD9',
                '1': '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                '2': '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                '3': '1000000000000000000',
                '4': 'MAIN',
                '5': '18',
                '6': '1',
                _tokenAddress: '0x5159345aaB821172e795d56274D0f5FDFdC6aBD9',
                _from: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                _to: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                _amount: '1000000000000000000',
                _symbol: 'MAIN',
                _decimals: '18',
                _granularity: '1',
            },
            event: 'Cross',
            signature:
                '0x958c783f2c825ef71ab3305ab602850535bb04833f5963c7a39a82a390642d47',
            raw: {
                data:
                    '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000044d41494e00000000000000000000000000000000000000000000000000000000',
                topics:[
                    '0x958c783f2c825ef71ab3305ab602850535bb04833f5963c7a39a82a390642d47',
                    '0x0000000000000000000000005159345aab821172e795d56274d0f5fdfdc6abd9',
                    '0x000000000000000000000000cd2a3d9f938e13cd947ec05abc7fe734df8dd826'
                ]
            }
        }

        let result = await validator._voteTransaction(log, '0x0');
        expect(result).toBeTruthy();
    });

    it('Should process a list of logs', async () => {
        let validator = new Validator(testConfig, logger, web3Mock);
        let logs = [{
            logIndex: 2,
            blockNumber: 2557,
            blockHash:
                '0x5d3752d14223348e0df325ea0c3bd62f76195127762621314ff5788ccae87a7a',
            transactionHash:
                '0x79fcac96ebe7642c3258143f91a94be443e0dfc214199372542df940670166a6',
            transactionIndex: 0,
            address: '0x1eD614cd3443EFd9c70F04b6d777aed947A4b0c4',
            id: 'log_a755a817',
            returnValues:{
                '0': '0x5159345aaB821172e795d56274D0f5FDFdC6aBD9',
                '1': '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                '2': '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                '3': '1000000000000000000',
                '4': 'MAIN',
                '5': '18',
                '6': '1',
                _tokenAddress: '0x5159345aaB821172e795d56274D0f5FDFdC6aBD9',
                _from: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                _to: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                _amount: '1000000000000000000',
                _symbol: 'MAIN',
                _decimals: '18',
                _granularity: '1',
            },
            event: 'Cross',
            signature:
                '0x958c783f2c825ef71ab3305ab602850535bb04833f5963c7a39a82a390642d47',
            raw: {
                data:
                    '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000044d41494e00000000000000000000000000000000000000000000000000000000',
                topics:[
                    '0x958c783f2c825ef71ab3305ab602850535bb04833f5963c7a39a82a390642d47',
                    '0x0000000000000000000000005159345aab821172e795d56274d0f5fdfdc6abd9',
                    '0x000000000000000000000000cd2a3d9f938e13cd947ec05abc7fe734df8dd826'
                ]
            }
        }]

        let result = await validator._processLogs(logs);
        expect(result).toBeTruthy();
    });
})
