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
var web3Mock = jest.fn();

describe('TransactionSender module tests', () => {
    beforeEach(async function () {
        jest.clearAllMocks();
        web3Mock.eth = jest.fn();
    });

    it('should getNonce', async () => {
        let expected = '213';
        web3Mock.eth.getTransactionCount = jest.fn().mockReturnValue(Promise.resolve(expected));
        let sender = new TransactionSender(web3Mock, logger, {});
        let result = await sender.getNonce();
        expect(result).toEqual(expected);
    });

    it('should getGasPrice Eth', async () => {
        let gasPrice = 111;
        web3Mock.eth.getGasPrice = jest.fn().mockReturnValue(Promise.resolve(gasPrice.toString()));
        let sender = new TransactionSender(web3Mock, logger, {});
        let result = await sender.getGasPrice(42); //Kovna chain id
        expect(result).toEqual(Math.round(gasPrice*1.5));
        result = await sender.getGasPrice(1); //Ethereum mainnet
        expect(result).toEqual(Math.round(gasPrice*1.5));

        web3Mock.eth.getGasPrice = jest.fn().mockReturnValue(Promise.resolve('0'));
        sender = new TransactionSender(web3Mock, logger, {});
        result = await sender.getGasPrice(1);
        expect(result).toEqual(1);
    });

    it('should getGasPrice Rsk', async () => {
        let gasPrice = 111;
        web3Mock.eth.getBlock = jest.fn().mockReturnValue(Promise.resolve({minimumGasPrice: gasPrice}));
        let sender = new TransactionSender(web3Mock, logger, {});
        let result = await sender.getGasPrice(31); //Rsk Testnet
        expect(result).toEqual(Math.round(gasPrice*1.05));
        result = await sender.getGasPrice(30); //Rsk mainnet
        expect(result).toEqual(Math.round(gasPrice*1.05));

        web3Mock.eth.getBlock = jest.fn().mockReturnValue(Promise.resolve({minimumGasPrice: 0}));
        sender = new TransactionSender(web3Mock, logger, {});
        result = await sender.getGasPrice(30);
        expect(result).toEqual(Math.round(1));
    });

    it('should getAddress From privateKey', async () => {
        const pk = '3f28f888373e9ad1651a1227a5efdc0d7ea55bce6de3b5448de56c8588c6bd4d';
        const expectedAddr = '0x3444f14CbC7081ADEd7203E32E65304D17fe3bdA';
        let sender = new TransactionSender(web3Mock, logger, {});
        let result = await sender.getAddress(pk); //Rsk Testnet
        expect(result).toEqual(expectedAddr.toLocaleLowerCase());

        web3Mock.eth.getAccounts = jest.fn().mockReturnValue(Promise.resolve([expectedAddr.toLocaleLowerCase()]));
        sender = new TransactionSender(web3Mock, logger, {});
        result = await sender.getAddress('');
        expect(result).toEqual(expectedAddr.toLocaleLowerCase());
        result = await sender.getAddress(undefined);
        expect(result).toEqual(expectedAddr.toLocaleLowerCase());
    });

    it('should sign the same with HSM and web3', async () => {
        const rawTx = {
          chainId: 5777,
          gasPrice: '0x6fc23ac00',
          value: '0x0',
          to: '0x557b77f7B280006f7732dCc123C3A966F5Fe1372',
          data: '0x7ff4657e000000000000000000000000de451f57d061b915525736937d0f5d24c551edd1000000000000000000000000000000000000000000000000000000000000004000000000000000000000000013263f73dcbe9b123a9ea32c13040b2becfe1e5c00000000000000000000000013263f73dcbe9b123a9ea32c13040b2becfe1e5c000000000000000000000000000000000000000000000000125195019f840000157f354383710432cdc131e73815a179a4e858ea304e4916b0f4d1db6553a7a70612db9f2ee9b8d7078e8f00338f600080ebc2a1e27f39376f54f0f6d7fb73750000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000044d41494e00000000000000000000000000000000000000000000000000000000',
          from: '0x57093C0C2aFEACaF7D677356c3eAC3E99933F7C0',
          nonce: '0x49',
          r: 0,
          s: 0,
          gas: '0x284d8'
        }

        const pk  = `3f28f888373e9ad1651a1227a5efdc0d7ea55bce6de3b5448de56c8588c6bd4d`;
        const pk2 = `dfac7a2bfe2cd7f7fc8caffd65995300eb0e1a652502147da8d7a9e5bce16ac2`;
        const from = `0x3444f14CbC7081ADEd7203E32E65304D17fe3bdA`;
        const sender = new TransactionSender(web3Mock, logger, {
          hsmPort: 6000,
          hsmHost: '127.0.0.1'
        });

        const signedRawTransaction = await sender.signRawTransaction(rawTx, pk2, false);
        const r = signedRawTransaction.r.toString('hex');
        const s = signedRawTransaction.s.toString('hex');
        const v = signedRawTransaction.v.toString('hex');

        const signedHsmRawTransaction = await sender.signRawTransaction(rawTx, pk2, true);
        const rHSM = signedHsmRawTransaction.r.toString('hex');
        const sHSM = signedHsmRawTransaction.s.toString('hex');
        const vHSM = signedHsmRawTransaction.v.toString('hex');

        expect(rHSM).toEqual(r);
        expect(sHSM).toEqual(s);
    });

});
