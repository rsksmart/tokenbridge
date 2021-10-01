//Upgradable Contracts
const BridgeV2 = artifacts.require('BridgeV2');
const BridgeV3 = artifacts.require('BridgeV3');
const BridgeProxy = artifacts.require('BridgeProxy');
const ProxyAdmin = artifacts.require('ProxyAdmin');

const UtilsContractV1 = artifacts.require('UtilsV1');

//Normal Contracts
const SideTokenFactoryV1 = artifacts.require('./SideTokenFactoryV1');
const SideTokenFactory = artifacts.require('./SideTokenFactory');
const SideToken = artifacts.require('./SideToken');
const AllowTokensV0 = artifacts.require('./AllowTokensV0');
const AllowTokensV1 = artifacts.require('./AllowTokensV1');
const MainToken = artifacts.require('./MainToken');

const utils = require('./utils');
const toWei = web3.utils.toWei;

contract('Bridge upgrade test', async (accounts) => {
    const deployerAddress = accounts[0];
    const managerAddress = accounts[1];
    const anAccount = accounts[2];
    const otherAccount = accounts[3];
    const federationAddress = accounts[5];

    before(async function () {
        await utils.saveState();
        const utilsContract_old = await UtilsContractV1.new();
        BridgeV2.link(utilsContract_old);
    });

    after(async function () {
        await utils.revertState();
    });

    beforeEach(async () => {
        this.proxyAdmin = await ProxyAdmin.new();
        this.allowTokensV0 = await AllowTokensV0.new(managerAddress);
        await this.allowTokensV0.disableAllowedTokensValidation({from: managerAddress});
        this.sideTokenFactoryV1 = await SideTokenFactoryV1.new();
        this.token = await MainToken.new("MAIN", "MAIN", 18, web3.utils.toWei('1000000'), { from: deployerAddress });
        this.amount = web3.utils.toWei('1000');
    });

    describe('freshly created', async () => {
        it('should create a proxy', async () => {
            const bridgeLogic = await BridgeV2.new()
            const bridgeProxy = await BridgeProxy.new(bridgeLogic.address, this.proxyAdmin.address, '0x');
            const proxy = new web3.eth.Contract(BridgeV2.abi, bridgeProxy.address);
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
            const bridgeLogic = await BridgeV2.new()
            const initData = bridgeLogic.contract.methods.initialize(managerAddress, federationAddress, this.allowTokensV0.address, this.sideTokenFactoryV1.address, 'r').encodeABI();
            const bridgeProxy = await BridgeProxy.new(bridgeLogic.address, this.proxyAdmin.address, initData);
            const proxy = new web3.eth.Contract(BridgeV2.abi, bridgeProxy.address);

            result = await proxy.methods.owner().call();
            assert.equal(result,  managerAddress);
            result = await proxy.methods.allowTokens().call();
            assert.equal(result, this.allowTokensV0.address);
            result = await proxy.methods.sideTokenFactory().call();
            assert.equal(result,  this.sideTokenFactoryV1.address);
            result = await proxy.methods.symbolPrefix().call();
            assert.equal(result,  'r');
            result = await proxy.methods.getFederation().call();
            assert.equal(result,  federationAddress);
        });

        describe('initialized', async () => {
            beforeEach(async() => {
                const bridgeLogic = await BridgeV2.new()
                const initData = bridgeLogic.contract.methods.initialize(managerAddress, federationAddress, this.allowTokensV0.address, this.sideTokenFactoryV1.address, 'r').encodeABI();
                this.bridgeProxy = await BridgeProxy.new(bridgeLogic.address, this.proxyAdmin.address, initData);
                this.proxyBridge = new web3.eth.Contract(BridgeV2.abi, this.bridgeProxy.address);
                const result = await this.proxyBridge.methods.symbolPrefix().call();
                assert.equal(result,  'r');
            });

            it('should set fees pecentage', async () => {
                let feePercentage = '20'; //0.2%
                const tx = await this.proxyBridge.methods.setFeePercentage(feePercentage).send({from: managerAddress});
                assert.equal(tx.status, true);
                utils.checkGas(tx.cumulativeGasUsed);
                const result = await this.proxyBridge.methods.getFeePercentage().call();
                assert.equal(result.toString(), feePercentage);
            });

            it('should receive tokens', async () => {
                const amount = web3.utils.toWei('1');
                await this.token.transfer(anAccount, amount, { from: deployerAddress });
                await this.token.approve(this.proxyBridge.options.address, amount, { from: anAccount });

                const tx = await this.proxyBridge.methods.receiveTokens(this.token.address, amount).send({ from: anAccount, gas: 200_000});
                assert.equal(tx.status, true);
                utils.checkGas(tx.cumulativeGasUsed);

                assert.equal(tx.events.Cross.event, 'Cross');
                const balance = await this.token.balanceOf(this.proxyBridge.options.address);
                assert.equal(balance, amount);
                const isKnownToken = await this.proxyBridge.methods.knownTokens(this.token.address).call();
                assert.equal(isKnownToken, true);
            });

            it('should update it', async () => {
                let result = await this.proxyBridge.methods.version().call();
                assert.equal(result, 'v2');

                /* Upgrade the contract at the address of our instance to the new logic */
                const bridgeLogic = await BridgeV3.new()
                await this.proxyAdmin.upgrade(this.proxyBridge.options.address, bridgeLogic.address)
                const newProxy = new web3.eth.Contract(BridgeV3.abi, this.proxyBridge.options.address);

                result = await newProxy.methods.version().call();
                assert.equal(result, 'v3');

                result = await newProxy.methods.owner().call();
                assert.equal(result,  managerAddress);
                result = await newProxy.methods.allowTokens().call();
                assert.equal(result, this.allowTokensV0.address);
                result = await newProxy.methods.sideTokenFactory().call();
                assert.equal(result,  this.sideTokenFactoryV1.address);
                result = await newProxy.methods.getFederation().call();
                assert.equal(result,  federationAddress);
            });

            it('should have new method setFeePercentage after update', async () => {
                let feePercentage = '20'; //0.2%
                await this.proxyBridge.methods.setFeePercentage(feePercentage).send({from: managerAddress});
                result = await this.proxyBridge.methods.getFeePercentage().call();
                assert.equal(result.toString(), feePercentage);

                const bridgeLogic = await BridgeV3.new();
                await this.proxyAdmin.upgrade(this.proxyBridge.options.address, bridgeLogic.address);
                const newProxy = new web3.eth.Contract(BridgeV3.abi, this.proxyBridge.options.address);

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
                    const admin = await this.proxyAdmin.getProxyAdmin(this.proxyBridge.options.address);
                    assert.equal(admin, this.proxyAdmin.address);
                });

                it('should renounce ownership', async () => {
                    let owner = await this.proxyAdmin.owner();
                    assert.equal(owner, deployerAddress);

                    await this.proxyAdmin.renounceOwnership();

                    owner = await this.proxyAdmin.owner();
                    assert.equal(owner, 0);

                    const bridgeLogic = await BridgeV3.new();
                    await utils.expectThrow(this.proxyAdmin.upgrade(this.proxyBridge.options.address, bridgeLogic.address));
                });

                it('should transfer ownership', async () => {
                    let owner = await this.proxyAdmin.owner();
                    assert.equal(owner, deployerAddress);

                    await this.proxyAdmin.transferOwnership(anAccount);

                    owner = await this.proxyAdmin.owner();
                    assert.equal(owner, anAccount);

                    const bridgeLogic = await BridgeV3.new();
                    await utils.expectThrow(this.proxyAdmin.upgrade(this.proxyBridge.options.address, bridgeLogic.address));
                });

            });// end upgrade governance

            describe('after upgrade', async () => {
                beforeEach(async () => {
                    this.typeId = 0;
                    const bridgeLogic = await BridgeV3.new();
                    await this.proxyAdmin.upgrade(this.proxyBridge.options.address, bridgeLogic.address);
                    this.proxyBridge = new web3.eth.Contract(BridgeV3.abi, this.proxyBridge.options.address);
                    this.sideTokenFactory = await SideTokenFactory.new();
                    await this.sideTokenFactory.transferPrimary(this.proxyBridge.options.address);
                    this.allowTokensV1 = await AllowTokensV1.new();
                    await this.allowTokensV1.methods['initialize(address,address,uint256,uint256,uint256,(string,(uint256,uint256,uint256,uint256,uint256))[])'](
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
                    await this.allowTokensV1.setToken(this.token.address, this.typeId, { from: managerAddress });
                    await this.allowTokensV1.transferPrimary(this.proxyBridge.options.address);
                    const result = await this.proxyBridge.methods.version().call();
                    assert.equal(result, 'v3');
                });

                it('should have new method changeSideTokenFactory', async () => {
                    await this.proxyBridge.methods.changeSideTokenFactory(this.sideTokenFactory.address).call({from: managerAddress});
                });

                it('should have new method changeAllowTokens', async () => {
                    await this.proxyBridge.methods.changeAllowTokens(this.allowTokensV1.address).call({from: managerAddress});
                });

                describe('after changeSideTokenFactory and changeAllowTokens', async () => {
                    beforeEach(async () => {
                        await this.proxyBridge.methods.changeSideTokenFactory(this.sideTokenFactory.address).send({from: managerAddress});
                        await this.proxyBridge.methods.changeAllowTokens(this.allowTokensV1.address).send({from: managerAddress});
                    });

                    it('should have removed the method tokenFallback', async () => {
                        await utils.expectThrow(
                            this.token.transferAndCall(this.proxyBridge.options.address, web3.utils.toWei('1000'), '0x'),
                            { from: deployerAddress }
                        );
                    });

                    it('should receive tokens', async () => {
                        const amount = web3.utils.toWei('1000');
                        await this.token.transfer(anAccount, amount, { from: deployerAddress });
                        await this.token.approve(this.proxyBridge.options.address, amount, { from: anAccount });

                        const tx = await this.proxyBridge.methods.receiveTokensTo(this.token.address, anAccount, amount).send({ from: anAccount, gas: 200_000});
                        assert.equal(Number(tx.status), 1, "Should be a succesful Tx");

                        assert.equal(tx.events.Cross.event, 'Cross');
                        const balance = await this.token.balanceOf(this.proxyBridge.options.address);
                        assert.equal(balance, amount);
                        const isKnownToken = await this.proxyBridge.methods.knownTokens(this.token.address).call();
                        assert.equal(isKnownToken, true);
                    });

                    it('should accept Transfer', async () => {
                        await this.proxyBridge.methods.createSideToken(
                            this.typeId,
                            this.token.address,
                            18,
                            'MAIN',
                            'MAIN'
                        ).send({from: managerAddress, gas: 4_000_000});

                        const sideTokenAddress = await this.proxyBridge.methods.mappedTokens(this.token.address).call();
                        let sideToken = await SideToken.at(sideTokenAddress);
                        const sideTokenSymbol = await sideToken.symbol();
                        assert.equal(sideTokenSymbol, "rMAIN");

                        const originalTokenAddress = await this.proxyBridge.methods.originalTokens(sideTokenAddress).call();
                        assert.equal(originalTokenAddress, this.token.address);

                        const blockHash = utils.getRandomHash();
                        const txHash = utils.getRandomHash();
                        const logIndex = 0;
                        const tx = await this.proxyBridge.methods.acceptTransfer(
                            this.token.address,
                            anAccount,
                            otherAccount,
                            this.amount,
                            blockHash,
                            txHash,
                            logIndex
                        ).send({ from: federationAddress, gas: 200_000});
                        assert.equal(Number(tx.status), 1, "Should be a succesful Tx");

                        await this.proxyBridge.methods.claim(
                            {
                                to: otherAccount,
                                amount: this.amount,
                                blockHash: blockHash,
                                transactionHash: txHash,
                                logIndex: logIndex
                            }
                        ).send({ from: federationAddress, gas: 200_000 });

                        const hasBeenClaimed = await this.proxyBridge.methods.hasBeenClaimed(txHash).call();
                        assert.equal(hasBeenClaimed, true);

                        const mirrorBridgeBalance = await sideToken.balanceOf(this.proxyBridge.options.address);
                        assert.equal(mirrorBridgeBalance, 0);
                        const mirrorAnAccountBalance = await sideToken.balanceOf(otherAccount);
                        assert.equal(mirrorAnAccountBalance, this.amount);
                    });
                }); // end after changeSideTokenFactory
            }); //end after upgrade

        }); // end initialized
    }); // end freshly created
});