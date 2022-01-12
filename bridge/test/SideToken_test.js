const SideToken = artifacts.require('./SideToken');
const mockERC677Receiver = artifacts.require('./mockERC677Receiver');
const mockERC777Recipient = artifacts.require('./mockERC777Recipient');

const truffleAssertions = require('truffle-assertions');
const ethUtil = require('ethereumjs-util');

const utils = require('./utils');
const keccak256 = web3.utils.keccak256;

contract('SideToken', async function (accounts) {
    const tokenCreator = accounts[0];
    const anAccount = accounts[1];
    const anotherAccount = accounts[2];

    before(async function () {
        await utils.saveState();
    });

    after(async function () {
        await utils.revertState();
    });

    describe('constructor', async function () {

        it('should create side token', async function () {
            const token = await SideToken.new("SIDE", "SIDE", tokenCreator, 1);
            assert.isNotEmpty(token.address)
        });
        it('should fail empty minter address', async function () {
            await truffleAssertions.fails(SideToken.new("SIDE", "SIDE", utils.NULL_ADDRESS, 1), truffleAssertions.ErrorType.REVERT);
        });

        it('should fail empty granularity', async function () {
            await truffleAssertions.fails(SideToken.new("SIDE", "SIDE", tokenCreator, 0), truffleAssertions.ErrorType.REVERT);
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
            await truffleAssertions.fails(
                this.token.mint(anAccount, 1000, '0x', '0x', { from: anAccount }),
                truffleAssertions.ErrorType.REVERT
            );

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
            await truffleAssertions.fails(
                this.token.transferAndCall(anotherAccount, 400, '0x', { from: anAccount }),
                truffleAssertions.ErrorType.REVERT
            );
        });

        it('transferAndCalls to empty account', async function () {
            await this.token.mint(anAccount, 1000, '0x', '0x', { from: tokenCreator });
            await truffleAssertions.fails(
                this.token.transferAndCall(utils.NULL_ADDRESS, 400, '0x', { from: anAccount }),
                truffleAssertions.ErrorType.REVERT
            );
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
            await truffleAssertions.fails(
                this.token.transferAndCall(receiver.address, 400, '0x000001',{ from: anAccount }),
                truffleAssertions.ErrorType.REVERT
            );
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

        it('mint works if less than granularity', async function () {
            const anAccountBalance = await this.token.balanceOf(anAccount);
            const amount = 100;
            await this.token.mint(anAccount, amount, '0x', '0x', { from: tokenCreator });
            const anAccountNewBalance = await this.token.balanceOf(anAccount);
            assert.equal(Number(anAccountBalance) + amount, Number(anAccountNewBalance));
        });

        it('mint throws if not multiple of granularity', async function () {
            const anAccountBalance = await this.token.balanceOf(anAccount);
            const amount = 1001;
            await this.token.mint(anAccount, 1001, '0x', '0x', { from: tokenCreator });
            const anAccountNewBalance = await this.token.balanceOf(anAccount);
            assert.equal(Number(anAccountBalance) + amount, Number(anAccountNewBalance));
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

        it('transfer works if  less than granularity', async function () {
            const amount = 100;
            await this.token.mint(anAccount, 10000, '0x', '0x', { from: tokenCreator });
            balance = await this.token.balanceOf(anotherAccount);
            await this.token.transfer(anotherAccount, amount, { from: anAccount });
            newBalance = await this.token.balanceOf(anotherAccount);
            assert.equal(Number(newBalance), Number(balance) + amount);
        });

        it('transfer works if not multiple of granularity', async function () {
            const amount = 1100;
            await this.token.mint(anAccount, 10000, '0x', '0x', { from: tokenCreator });
            balance = await this.token.balanceOf(anotherAccount);
            await this.token.transfer(anotherAccount, amount, { from: anAccount });
            newBalance = await this.token.balanceOf(anotherAccount);
            assert.equal(Number(newBalance), Number(balance) + amount);
        });

        it('burn works if not multiple of granularity', async function () {
            const amount = 1;
            await this.token.mint(anAccount, 1000000, '0x', '0x', { from: tokenCreator });
            balance = await this.token.balanceOf(anAccount);
            await this.token.burn(amount, '0x', { from: anAccount });
            newBalance = await this.token.balanceOf(anAccount);
            assert.equal(Number(balance) - amount, Number(newBalance));
        });
    });

    describe('permit', async function() {
        beforeEach(async function () {
            this.token = await SideToken.new("SIDE", "SIDE", tokenCreator, 1);
        });

        it('should have PERMIT_TYPEHASH', async function() {
            const expectedTypeHash = keccak256('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)');
            const PERMIT_TYPEHASH = await this.token.PERMIT_TYPEHASH();
            assert.equal(PERMIT_TYPEHASH, expectedTypeHash);
        });

        it('should have domainSeparator', async function() {
            const name = await this.token.name();
            // Bug ganache treast chainid opcode as 1 https://github.com/trufflesuite/ganache-core/issues/451
            const chainId = await web3.eth.getChainId();

            const expectedTypeHash = keccak256(
                web3.eth.abi.encodeParameters(
                    ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
                    [
                      keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                      keccak256(name),
                      keccak256('1'),
                      chainId,
                      this.token.address
                    ]
                )
            )
            const DOMAIN_SEPARATOR = await this.token.domainSeparator();
            assert.equal(DOMAIN_SEPARATOR, expectedTypeHash);
        });

        async function getApprovalDigest(
            token,
            approve, //{owner: string, spender: string, value: BigNumber},
            nonce,
            deadline
          ) {
            const PERMIT_TYPEHASH = await token.PERMIT_TYPEHASH();
            const DOMAIN_SEPARATOR = await token.domainSeparator();
            return web3.utils.soliditySha3(
                {t:'bytes1', v:'0x19'},
                {t:'bytes1', v:'0x01'},
                {t:'bytes32', v:DOMAIN_SEPARATOR},
                {t:'bytes32', v:keccak256(
                        web3.eth.abi.encodeParameters(
                            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
                            [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]
                        )
                    )
                }
            )
        }

        it('should accept signed permit', async function () {
            const amount = '1001';
            const accountWallet = await web3.eth.accounts.privateKeyToAccount(utils.getRandomHash());
            await this.token.mint(accountWallet.address, amount, '0x', '0x');

            const nonce = (await this.token.nonces(accountWallet.address)).toString();
            const deadline = Number.MAX_SAFE_INTEGER.toString();
            const digest = await getApprovalDigest(
              this.token,
              { owner: accountWallet.address, spender: anotherAccount, value: amount },
              nonce,
              deadline
            );

            const { v, r, s } = ethUtil.ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(accountWallet.privateKey.slice(2), 'hex'));

            const receipt = await this.token.permit(
                accountWallet.address,
                anotherAccount,
                amount,
                deadline,
                v,
                r,
                s
            );

            truffleAssertions.eventEmitted(receipt, 'Approval', (ev) => {
                return ev.owner === accountWallet.address
                && ev.spender === anotherAccount
                && ev.value.toString() === amount
            });

            expect((await this.token.allowance(accountWallet.address, anotherAccount)).toString()).to.eq(amount);
            expect((await this.token.nonces(accountWallet.address)).toString()).to.eq('1');
          })

          it('should fail invalid signature', async function () {
            const amount = '1001';
            const accountWallet = await web3.eth.accounts.privateKeyToAccount(utils.getRandomHash());
            await this.token.mint(accountWallet.address, amount, '0x', '0x');

            const nonce = (await this.token.nonces(accountWallet.address)).toString();
            const deadline = Number.MAX_SAFE_INTEGER.toString();
            const digest = await getApprovalDigest(
              this.token,
              { owner: accountWallet.address, spender: anotherAccount, value: amount },
              nonce,
              deadline
            );

            const { v, r, s } = ethUtil.ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(accountWallet.privateKey.slice(2), 'hex'));

            await truffleAssertions.fails(this.token.permit(
                    accountWallet.address,
                    anotherAccount,
                    amount,
                    deadline,
                    v,
                    s,
                    r
                ),
                truffleAssertions.ErrorType.REVERT
            );
          });

          it('should fail invalid nonce', async function () {
            const amount = '1001';
            const accountWallet = await web3.eth.accounts.privateKeyToAccount(utils.getRandomHash());
            await this.token.mint(accountWallet.address, amount, '0x', '0x');

            const nonce = (await this.token.nonces(accountWallet.address)).toString();
            const deadline = Number.MAX_SAFE_INTEGER.toString();
            const digest = await getApprovalDigest(
              this.token,
              { owner: accountWallet.address, spender: anotherAccount, value: amount },
              nonce,
              deadline
            );

            const { v, r, s } = ethUtil.ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(accountWallet.privateKey.slice(2), 'hex'));

            await this.token.permit(
                accountWallet.address,
                anotherAccount,
                amount,
                deadline,
                v,
                r,
                s
            );

            await truffleAssertions.fails(
                this.token.permit(
                    accountWallet.address,
                    anotherAccount,
                    amount,
                    deadline,
                    v,
                    r,
                    s
                ),
                truffleAssertions.ErrorType.REVERT
            );
          });

          it('should fail expired deadline', async function () {
            const amount = '1001';
            const accountWallet = await web3.eth.accounts.privateKeyToAccount(utils.getRandomHash());
            await this.token.mint(accountWallet.address, amount, '0x', '0x');

            const nonce = (await this.token.nonces(accountWallet.address)).toString();
            const deadline = '1';
            const digest = await getApprovalDigest(
              this.token,
              { owner: accountWallet.address, spender: anotherAccount, value: amount },
              nonce,
              deadline
            );

            const { v, r, s } = ethUtil.ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(accountWallet.privateKey.slice(2), 'hex'));

            await truffleAssertions.fails(this.token.permit(
                    accountWallet.address,
                    anotherAccount,
                    amount,
                    deadline,
                    v,
                    r,
                    s
                ),
                truffleAssertions.ErrorType.REVERT
            );
          });
    });

});

