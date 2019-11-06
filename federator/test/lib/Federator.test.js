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

    it('Runs the main federator process sucessfully', async () => {
        let federator = new Federator(testConfig, logger, web3Mock);
        let result = await federator.run();

        expect(result).to.be.true;
    });

    it('Saves the progress in a file path', async () => {
        let federator = new Federator(testConfig, logger, web3Mock);
        let path = `${storagePath}/testPath.txt`;

        federator._saveProgress(path, 'test');

        expect(fs.existsSync(path)).to.be.true;

        let value = fs.readFileSync(path, 'utf8');
        expect(value).to.eq('test');
    });

    it('Should no vote for empty log and receiver', async () => {
        let federator = new Federator(testConfig, logger, web3Mock);
        let result1 = await federator._voteTransaction(null, null);
        let result2 = await federator._voteTransaction({}, null);
        let result3 = await federator._voteTransaction(null, '0x0');

        expect(result1).to.be.false;
        expect(result2).to.be.false;
        expect(result3).to.be.false;
    })

    it('Votes a transaction from a log entry', async () => {
        let federator = new Federator(testConfig, logger, web3Mock);
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
                '2': '1000000000000000000',
                '3': 'MAIN',
                _tokenAddress: '0x5159345aaB821172e795d56274D0f5FDFdC6aBD9',
                _to: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                _amount: '1000000000000000000',
                _symbol: 'MAIN'
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

        let result = await federator._voteTransaction(log, '0x0');
        expect(result).to.be.true;
    });

    it('Should process a list of logs', async () => {
        let federator = new Federator(testConfig, logger, web3Mock);
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
                '2': '1000000000000000000',
                '3': 'MAIN',
                _tokenAddress: '0x5159345aaB821172e795d56274D0f5FDFdC6aBD9',
                _to: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                _amount: '1000000000000000000',
                _symbol: 'MAIN'
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

        let result = await federator._processLogs(logs);
        expect(result).to.be.true;
    });
})
