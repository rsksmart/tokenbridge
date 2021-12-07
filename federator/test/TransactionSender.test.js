const fs = require('fs');
const path = require('path');

const TransactionSender = require('../src/lib/TransactionSender');
const eth = require('./web3Mock/eth.js');
const mockData = require('./web3Mock/mockData.json');


const logger = {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
const web3Mock = jest.fn();

describe('TransactionSender module tests', () => {
    beforeEach(async function () {
        jest.clearAllMocks();
        web3Mock.eth = jest.fn();
    });

    it('should getNonce', async () => {
        let expected = '213';
        web3Mock.eth.getTransactionCount = jest.fn().mockReturnValue(Promise.resolve(expected));
        let sender = new TransactionSender.default(web3Mock, logger, {});
        let result = await sender.getNonce();
        expect(result).toEqual(expected);
    });

    it('should getAddress From privateKey', async () => {
        const pk = '3f28f888373e9ad1651a1227a5efdc0d7ea55bce6de3b5448de56c8588c6bd4d';
        const expectedAddr = '0x3444f14CbC7081ADEd7203E32E65304D17fe3bdA';
        let sender = new TransactionSender.default(web3Mock, logger, {});
        let result = await sender.getAddress(pk); //Rsk Testnet
        expect(result).toEqual(expectedAddr.toLocaleLowerCase());

        web3Mock.eth.getAccounts = jest.fn().mockReturnValue(Promise.resolve([expectedAddr.toLocaleLowerCase()]));
        sender = new TransactionSender.default(web3Mock, logger, {});
        result = await sender.getAddress('');
        expect(result).toEqual(expectedAddr.toLocaleLowerCase());
        result = await sender.getAddress(undefined);
        expect(result).toEqual(expectedAddr.toLocaleLowerCase());
    });

});