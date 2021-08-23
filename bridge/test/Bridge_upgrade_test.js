//Upgradable Contracts
const Bridge_old = artifacts.require('Bridge_old');
const Bridge = artifacts.require('Bridge');
const BridgeProxy = artifacts.require('BridgeProxy');
const ProxyAdmin = artifacts.require('ProxyAdmin');

const UtilsContract_old = artifacts.require('Utils_old');

//Normal Contracts
const SideTokenFactory_old = artifacts.require('./SideTokenFactory_old');
const SideTokenFactory = artifacts.require('./SideTokenFactory');
const SideToken = artifacts.require('./SideToken');
const AllowTokens_old = artifacts.require('./AllowTokens_old');
const AllowTokens = artifacts.require('./AllowTokens');
const MainToken = artifacts.require('./MainToken');

const utils = require('./utils');
const randomHex = web3.utils.randomHex;
const toWei = web3.utils.toWei;

contract('Bridge upgrade test', async (accounts) => {
    const deployerAddress = accounts[0];
    const managerAddress = accounts[1];
    const anAccount = accounts[2];
    const otherAccount = accounts[3];
    const federationAddress = accounts[5];

    before(async function () {
        await utils.saveState();
        this.utilsContract_old = await UtilsContract_old.new();
        Bridge_old.link(this.utilsContract_old);
    });

    after(async function () {
        await utils.revertState();
    });

    beforeEach(async () => {
        this.proxyAdmin = await ProxyAdmin.new();
        this.allowTokens_old = await AllowTokens_old.new(managerAddress);
        await this.allowTokens_old.disableAllowedTokensValidation({from: managerAddress});
        this.sideTokenFactory_old = await SideTokenFactory_old.new();
        this.token = await MainToken.new("MAIN", "MAIN", 18, web3.utils.toWei('1000000'), { from: deployerAddress });
        this.amount = web3.utils.toWei('1000');
    });

    describe('freshly created', async () => {
        it('should create a proxy', async () => {
            const bridgeLogic = await Bridge_old.new()
            const bridgeProxy = await BridgeProxy.new(bridgeLogic.address, this.proxyAdmin.address, '0x');
            const proxy = new web3.eth.Contract(Bridge_old.abi, bridgeProxy.address);
            let result = await proxy.methods.version().call();
            assert.equal(result, 'v2');

            result = await proxy.methods.owner().call();
            assert.equal(result,  "0x0000000000000000000000000000000000000000");
            result = await proxy.methods.allowTokens().call();
            assert.equal(result,  "0x0000000000000000000000000000000000000000");
            result = await proxy.methods.sideTokenFactory().call();
            assert.equal(result,  "0x0000000000000000000000000000000000000000");
            result = await proxy.methods.symbolPrefix().call();
            assert.equal(result,  0);
        });

        it('should initialize it', async () => {
            const bridgeLogic = await Bridge_old.new()
            const initData = bridgeLogic.contract.methods.initialize(managerAddress, federationAddress, this.allowTokens_old.address, this.sideTokenFactory_old.address, 'r').encodeABI();
            const bridgeProxy = await BridgeProxy.new(bridgeLogic.address, this.proxyAdmin.address, initData);
            const proxy = new web3.eth.Contract(Bridge_old.abi, bridgeProxy.address);

            result = await proxy.methods.owner().call();
            assert.equal(result,  managerAddress);
            result = await proxy.methods.allowTokens().call();
            assert.equal(result, this.allowTokens_old.address);
            result = await proxy.methods.sideTokenFactory().call();
            assert.equal(result,  this.sideTokenFactory_old.address);
            result = await proxy.methods.symbolPrefix().call();
            assert.equal(result,  'r');
            result = await proxy.methods.getFederation().call();
            assert.equal(result,  federationAddress);
        });

        describe('initialized', async () => {
            beforeEach(async() => {
                const bridgeLogic = await Bridge_old.new()
                const initData = bridgeLogic.contract.methods.initialize(managerAddress, federationAddress, this.allowTokens_old.address, this.sideTokenFactory_old.address, 'r').encodeABI();
                this.bridgeProxy = await BridgeProxy.new(bridgeLogic.address, this.proxyAdmin.address, initData);
                this.proxy = new web3.eth.Contract(Bridge_old.abi, this.bridgeProxy.address);
                const result = await this.proxy.methods.symbolPrefix().call();
                assert.equal(result,  'r');
            });

            it('should set fees pecentage', async () => {
                let feePercentage = '20'; //0.2%
                const tx = await this.proxy.methods.setFeePercentage(feePercentage).send({from: managerAddress});
                assert.equal(tx.status, true);
                utils.checkGas(tx.cumulativeGasUsed);
                const result = await this.proxy.methods.getFeePercentage().call();
                assert.equal(result.toString(), feePercentage);
            });

            it('should receive tokens', async () => {
                const amount = web3.utils.toWei('1');
                await this.token.transfer(anAccount, amount, { from: deployerAddress });
                await this.token.approve(this.proxy.options.address, amount, { from: anAccount });

                let tx = await this.proxy.methods.receiveTokens(this.token.address, amount).send({ from: anAccount, gas: 200_000});
                assert.equal(tx.status, true);
                utils.checkGas(tx.cumulativeGasUsed);

                assert.equal(tx.events.Cross.event, 'Cross');
                const balance = await this.token.balanceOf(this.proxy.options.address);
                assert.equal(balance, amount);
                const isKnownToken = await this.proxy.methods.knownTokens(this.token.address).call();
                assert.equal(isKnownToken, true);
            });

            it('should update it', async () => {
                let result = await this.proxy.methods.version().call();
                assert.equal(result, 'v2');

                /* Upgrade the contract at the address of our instance to the new logic */
                const bridgeLogic = await Bridge.new()
                await this.proxyAdmin.upgrade(this.proxy.options.address, bridgeLogic.address)
                const newProxy = new web3.eth.Contract(Bridge.abi, this.proxy.options.address);

                result = await newProxy.methods.version().call();
                assert.equal(result, 'v3');

                result = await newProxy.methods.owner().call();
                assert.equal(result,  managerAddress);
                result = await newProxy.methods.allowTokens().call();
                assert.equal(result, this.allowTokens_old.address);
                result = await newProxy.methods.sideTokenFactory().call();
                assert.equal(result,  this.sideTokenFactory_old.address);
                result = await newProxy.methods.getFederation().call();
                assert.equal(result,  federationAddress);
            });

            it('should have new method setFeePercentage after update', async () => {
                let feePercentage = '20'; //0.2%
                await this.proxy.methods.setFeePercentage(feePercentage).send({from: managerAddress});
                result = await this.proxy.methods.getFeePercentage().call();
                assert.equal(result.toString(), feePercentage);

                const bridgeLogic = await Bridge.new();
                await this.proxyAdmin.upgrade(this.proxy.options.address, bridgeLogic.address);
                const newProxy = new web3.eth.Contract(Bridge.abi, this.proxy.options.address);

                result = await newProxy.methods.getFeePercentage().call();
                // This is the previous value from getCRossingPayment
                assert.equal(result.toString(), feePercentage);

                feePercentage = '300'; //3%
                await newProxy.methods.setFeePercentage(feePercentage).send({from: managerAddress});
                result = await newProxy.methods.getFeePercentage().call();
                assert.equal(result.toString(), feePercentage);
            });

            describe('upgrade governance', () => {
                it('proxy owner', async () => {
                    let owner = await this.proxyAdmin.owner();
                    assert.equal(owner, deployerAddress);
                });

                it('proxy admin', async () => {
                    let admin = await this.proxyAdmin.getProxyAdmin(this.proxy.options.address);
                    assert.equal(admin, this.proxyAdmin.address);
                });

                it('should renounce ownership', async () => {
                    let owner = await this.proxyAdmin.owner();
                    assert.equal(owner, deployerAddress);

                    await this.proxyAdmin.renounceOwnership();

                    owner = await this.proxyAdmin.owner();
                    assert.equal(owner, 0);

                    const bridgeLogic = await Bridge.new();
                    await utils.expectThrow(this.proxyAdmin.upgrade(this.proxy.options.address, bridgeLogic.address));
                });

                it('should transfer ownership', async () => {
                    let owner = await this.proxyAdmin.owner();
                    assert.equal(owner, deployerAddress);

                    await this.proxyAdmin.transferOwnership(anAccount);

                    owner = await this.proxyAdmin.owner();
                    assert.equal(owner, anAccount);

                    const bridgeLogic = await Bridge.new();
                    await utils.expectThrow(this.proxyAdmin.upgrade(this.proxy.options.address, bridgeLogic.address));
                });

            });// end upgrade governance

            describe('after upgrade', async () => {
                beforeEach(async () => {
                    this.typeId = 0;
                    const bridgeLogic = await Bridge.new();
                    await this.proxyAdmin.upgrade(this.proxy.options.address, bridgeLogic.address);
                    this.proxy = new web3.eth.Contract(Bridge.abi, this.proxy.options.address);
                    this.sideTokenFactory = await SideTokenFactory.new();
                    await this.sideTokenFactory.transferPrimary(this.proxy.options.address);
                    this.allowTokens = await AllowTokens.new();
                    await this.allowTokens.methods['initialize(address,address,uint256,uint256,uint256,(string,(uint256,uint256,uint256,uint256,uint256))[])'](
                        managerAddress,
                        deployerAddress,
                        '0',
                        '0',
                        '0',
                        [{
                            description:'MAIN',
                            limits: {
                                max:toWei('10000'),
                                min:toWei('1'),
                                daily:toWei('100000'),
                                mediumAmount:toWei('2'),
                                largeAmount:toWei('3')
                            }
                        }]
                    );
                    await this.allowTokens.setToken(this.token.address, this.typeId, { from: managerAddress });
                    await this.allowTokens.transferPrimary(this.proxy.options.address);
                    const result = await this.proxy.methods.version().call();
                    assert.equal(result, 'v3');
                });

                it('should have new method changeSideTokenFactory', async () => {
                    await this.proxy.methods.changeSideTokenFactory(this.sideTokenFactory.address).call({from: managerAddress});
                });

                it('should have new method changeAllowTokens', async () => {
                    await this.proxy.methods.changeAllowTokens(this.allowTokens.address).call({from: managerAddress});
                });

                describe('after changeSideTokenFactory and changeAllowTokens', async () => {
                    beforeEach(async () => {
                        await this.proxy.methods.changeSideTokenFactory(this.sideTokenFactory.address).send({from: managerAddress});
                        await this.proxy.methods.changeAllowTokens(this.allowTokens.address).send({from: managerAddress});
                    });

                    it('should have removed the method tokenFallback', async () => {
                        await utils.expectThrow(
                            this.token.transferAndCall(this.proxy.options.address, web3.utils.toWei('1000'), '0x'),
                            { from: deployerAddress }
                        );
                    });

                    it('should receive tokens', async () => {
                        const amount = web3.utils.toWei('1000');
                        await this.token.transfer(anAccount, amount, { from: deployerAddress });
                        await this.token.approve(this.proxy.options.address, amount, { from: anAccount });

                        let tx = await this.proxy.methods.receiveTokensTo(this.token.address, anAccount, amount).send({ from: anAccount, gas: 200_000});
                        assert.equal(Number(tx.status), 1, "Should be a succesful Tx");

                        assert.equal(tx.events.Cross.event, 'Cross');
                        const balance = await this.token.balanceOf(this.proxy.options.address);
                        assert.equal(balance, amount);
                        const isKnownToken = await this.proxy.methods.knownTokens(this.token.address).call();
                        assert.equal(isKnownToken, true);
                    });

                    it('should accept Transfer', async () => {
                        await this.proxy.methods.createSideToken(
                            this.typeId,
                            this.token.address,
                            18,
                            'MAIN',
                            'MAIN'
                        ).send({from: managerAddress, gas: 4_000_000});

                        let sideTokenAddress = await this.proxy.methods.mappedTokens(this.token.address).call();
                        let sideToken = await SideToken.at(sideTokenAddress);
                        const sideTokenSymbol = await sideToken.symbol();
                        assert.equal(sideTokenSymbol, "rMAIN");

                        let originalTokenAddress = await this.proxy.methods.originalTokens(sideTokenAddress).call();
                        assert.equal(originalTokenAddress, this.token.address);

                        const blockHash = randomHex(32);
                        const txHash = randomHex(32);
                        const logIndex = 0;
                        let tx = await this.proxy.methods.acceptTransfer(
                            this.token.address,
                            anAccount,
                            otherAccount,
                            this.amount,
                            blockHash,
                            txHash,
                            logIndex
                        ).send({ from: federationAddress, gas: 200_000});
                        assert.equal(Number(tx.status), 1, "Should be a succesful Tx");

                        await this.proxy.methods.claim(
                            {
                                to: otherAccount,
                                amount: this.amount,
                                blockHash: blockHash,
                                transactionHash: txHash,
                                logIndex: logIndex
                            }
                        ).send({ from: federationAddress, gas: 200_000 });

                        const hasBeenClaimed = await this.proxy.methods.hasBeenClaimed(txHash).call();
                        assert.equal(hasBeenClaimed, true);

                        const mirrorBridgeBalance = await sideToken.balanceOf(this.proxy.options.address);
                        assert.equal(mirrorBridgeBalance, 0);
                        const mirrorAnAccountBalance = await sideToken.balanceOf(otherAccount);
                        assert.equal(mirrorAnAccountBalance, this.amount);
                    });
                }); // end after changeSideTokenFactory
            }); //end after upgrade

        }); // end initialized
    }); // end freshly created
});