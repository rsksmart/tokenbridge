const SideToken = artifacts.require('./SideToken_v1');
const mockERC677Receiver = artifacts.require('./mockERC677Receiver');
const mockERC777Recipient = artifacts.require('./mockERC777Recipient');

const utils = require('./utils');
const expectThrow = utils.expectThrow;

contract('SideToken_v1', async function (accounts) {
    const tokenCreator = accounts[0];
    const anAccount = accounts[1];
    const anotherAccount = accounts[2];

    describe('constructor', async function () {

        it('should create side token', async function () {
            let token = await SideToken.new("SIDE", "SIDE", tokenCreator, 1);
            assert.isNotEmpty(token.address)
        });
        it('should fail empty minter address', async function () {
            await utils.expectThrow(SideToken.new("SIDE", "SIDE", '0x', 1));
        });

        it('should fail empty granularity', async function () {
            await utils.expectThrow(SideToken.new("SIDE", "SIDE", tokenCreator, 0));
        });
    });

    describe('granularity 1', async function () {
        beforeEach(async function () {
            this.token = await SideToken.new("SIDE", "SIDE", tokenCreator, 1);
        });

        it('initial state', async function () {
            const creatorBalance = await this.token.balanceOf(tokenCreator);
            assert.equal(creatorBalance, 0);

            const tokenBalance = await this.token.balanceOf(this.token.address);
            assert.equal(tokenBalance, 0);

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 0);

            const totalSupply = await this.token.totalSupply();
            assert.equal(totalSupply, 0);

            const granularity = await this.token.granularity();
            assert.equal(granularity, 1);
        });

        it('mint', async function () {
            let receipt = await this.token.mint(anAccount, 1000, '0x', '0x', { from: tokenCreator });
            utils.checkRcpt(receipt);
            
            const creatorBalance = await this.token.balanceOf(tokenCreator);
            assert.equal(creatorBalance, 0);

            const tokenBalance = await this.token.balanceOf(this.token.address);
            assert.equal(tokenBalance, 0);

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 1000);

            const totalSupply = await this.token.totalSupply();
            assert.equal(totalSupply, 1000);
        });

        it('mint only default operators', async function () {
            await expectThrow(this.token.mint(anAccount, 1000, '0x', '0x', { from: anAccount }));

            const creatorBalance = await this.token.balanceOf(tokenCreator);
            assert.equal(creatorBalance, 0);

            const tokenBalance = await this.token.balanceOf(this.token.address);
            assert.equal(tokenBalance, 0);

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 0);

            const totalSupply = await this.token.totalSupply();
            assert.equal(totalSupply, 0);
        });

        it('transfer account to account', async function () {
            await this.token.mint(anAccount, 1000, '0x', '0x', { from: tokenCreator });
            let receipt = await this.token.transfer(anotherAccount, 400, { from: anAccount });
            utils.checkRcpt(receipt);

            const creatorBalance = await this.token.balanceOf(tokenCreator);
            assert.equal(creatorBalance, 0);

            const tokenBalance = await this.token.balanceOf(this.token.address);
            assert.equal(tokenBalance, 0);

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 600);

            const anotherAccountBalance = await this.token.balanceOf(anotherAccount);
            assert.equal(anotherAccountBalance, 400);

            const totalSupply = await this.token.totalSupply();
            assert.equal(totalSupply, 1000);
        });

        it('send to ERC777 contract', async function () {
            await this.token.mint(anAccount, 1000, '0x', '0x', { from: tokenCreator });

            let receiver = await mockERC777Recipient.new();
            let result = await this.token.send(receiver.address, 400, '0x000001',{ from: anAccount });
            utils.checkRcpt(result);

            let eventSignature = web3.eth.abi.encodeEventSignature('Success(address,address,address,uint256,bytes,bytes)');

            let decodedLog = web3.eth.abi.decodeLog([
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "operator",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "from",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "bytes",
                    "name": "userData",
                    "type": "bytes"
                },
                {
                    "indexed": false,
                    "internalType": "bytes",
                    "name": "operatorData",
                    "type": "bytes"
                }
              ], result.receipt.rawLogs[2].data, result.receipt.rawLogs[2].topics.slice(1));

            assert.equal(result.receipt.rawLogs[2].topics[0], eventSignature);
            assert.equal(decodedLog.operator, anAccount);
            assert.equal(decodedLog.from, anAccount);
            assert.equal(decodedLog.to, receiver.address);
            assert.equal(decodedLog.amount, 400);
            assert.equal(decodedLog.userData, '0x000001');

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 600);

            const anotherAccountBalance = await this.token.balanceOf(receiver.address);
            assert.equal(anotherAccountBalance, 400);

            const totalSupply = await this.token.totalSupply();
            assert.equal(totalSupply, 1000);
        });

        it('transferAndCall to account', async function () {
            await this.token.mint(anAccount, 1000, '0x', '0x', { from: tokenCreator });
            await expectThrow(this.token.transferAndCall(anotherAccount, 400, '0x', { from: anAccount }));
        });

        it('transferAndCalls to empty account', async function () {
            await this.token.mint(anAccount, 1000, '0x', '0x', { from: tokenCreator });
            await expectThrow(this.token.transferAndCall('0x', 400, '0x', { from: anAccount }));
        });
        
        it('transferAndCalls to contract', async function () {
            await this.token.mint(anAccount, 1000, '0x', '0x', { from: tokenCreator });

            let receiver = await mockERC677Receiver.new();
            const data = '0x000001';
            let result = await this.token.transferAndCall(receiver.address, 400, data,{ from: anAccount });
            utils.checkRcpt(result);

            let eventSignature = web3.eth.abi.encodeEventSignature('Success(address,uint256,bytes)');
            let decodedLog = web3.eth.abi.decodeLog([
                {
                  "indexed": false,
                  "internalType": "address",
                  "name": "_sender",
                  "type": "address"
                },
                {
                  "indexed": false,
                  "internalType": "uint256",
                  "name": "_value",
                  "type": "uint256"
                },
                {
                  "indexed": false,
                  "internalType": "bytes",
                  "name": "_data",
                  "type": "bytes"
                }
              ], result.receipt.rawLogs[3].data, result.receipt.rawLogs[2].topics.slice(1));
            assert.equal(result.receipt.rawLogs[3].topics[0], eventSignature);
            assert.equal(decodedLog._sender, anAccount);
            assert.equal(decodedLog._value, 400);
            assert.equal(decodedLog._data, data);

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance, 600);

            const anotherAccountBalance = await this.token.balanceOf(receiver.address);
            assert.equal(anotherAccountBalance, 400);

            const totalSupply = await this.token.totalSupply();
            assert.equal(totalSupply, 1000);
        });

        it('transferAndCalls throws if receiver does not implement IERC677Receiver', async function () {
            await this.token.mint(anAccount, 1000, '0x', '0x', { from: tokenCreator });

            let receiver = await SideToken.new("SIDE", "SIDE", tokenCreator, '1');
            await expectThrow(this.token.transferAndCall(receiver.address, 400, '0x000001',{ from: anAccount }));
        });

    });

    describe('granularity 1000', async function () {
        beforeEach(async function () {
            this.granularity = '1000';
            this.token = await SideToken.new("SIDE", "SIDE", tokenCreator, this.granularity);
        });

        it('initial state', async function () {
            const granularity = await this.token.granularity();
            assert.equal(granularity.toString(), this.granularity);
        });

        it('mint', async function () {
            await this.token.mint(anAccount, this.granularity, '0x', '0x', { from: tokenCreator });

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance.toString(), this.granularity);

            const totalSupply = await this.token.totalSupply();
            assert.equal(totalSupply, this.granularity);
        });

        it('mint throws if less than granularity', async function () {
            await expectThrow(this.token.mint(anAccount, 100, '0x', '0x', { from: tokenCreator }));
        });

        it('mint throws if not multiple of granularity', async function () {
            await expectThrow(this.token.mint(anAccount, 1001, '0x', '0x', { from: tokenCreator }));
        });

        it('transfer account to account', async function () {
            await this.token.mint(anAccount, 10000, '0x', '0x', { from: tokenCreator });
            await this.token.transfer(anotherAccount, 1000, { from: anAccount });

            const anAccountBalance = await this.token.balanceOf(anAccount);
            assert.equal(anAccountBalance.toString(), '9000');

            const anotherAccountBalance = await this.token.balanceOf(anotherAccount);
            assert.equal(anotherAccountBalance.toString(), '1000');

            const totalSupply = await this.token.totalSupply();
            assert.equal(totalSupply.toString(), '10000');
        });

        it('transfer throws if  less tan hgranularity', async function () {
            await this.token.mint(anAccount, 10000, '0x', '0x', { from: tokenCreator });
            await expectThrow(this.token.transfer(anotherAccount, 100, { from: anAccount }));
        });

        it('transfer throws if not multiple of granularity', async function () {
            await this.token.mint(anAccount, 10000, '0x', '0x', { from: tokenCreator });
            await expectThrow(this.token.transfer(anotherAccount, 1100, { from: anAccount }));
        });

        it('burn throws if not multiple of granularity', async function () {
            await this.token.mint(anAccount, 1000000, '0x', '0x', { from: tokenCreator });

            await expectThrow(this.token.burn(anAccount, 1, '0x', '0x', { from: tokenCreator }));
        });
        
    });

});

