const { TestHelper } = require('@openzeppelin/cli');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');

ZWeb3.initialize(web3.currentProvider);

//Upgradable Contracts
const Bridge_v0 = Contracts.getFromLocal('Bridge_v0');
const Bridge_v1 = Contracts.getFromLocal('Bridge_v1');

//Normal Contracts
const SideTokenFactory_v0 = artifacts.require('./SideTokenFactory_v0');
const SideTokenFactory_v1 = artifacts.require('./SideTokenFactory_v1');
const SideToken_v1 = artifacts.require('./SideToken_v1');
const AllowTokens = artifacts.require('./AllowTokens');
const MainToken = artifacts.require('./MainToken');
const UtilsContract = artifacts.require('./Utils');

const utils = require('./utils');
const randomHex = web3.utils.randomHex;

contract('Bridge upgrade test', async (accounts) => {
    const deployerAddress = accounts[0];
    const managerAddress = accounts[1];
    const anAccount = accounts[2];
    const federationAddress = accounts[5];

    beforeEach(async () => {
        this.project = await TestHelper();
        this.allowTokens = await AllowTokens.new(managerAddress);
        await this.allowTokens.disableAllowedTokensValidation({from: managerAddress});
        this.sideTokenFactory_v0 = await SideTokenFactory_v0.new();
        this.token = await MainToken.new("MAIN", "MAIN", 18, web3.utils.toWei('10000'), { from: deployerAddress });
        this.amount = web3.utils.toWei('1000');
    });

    describe('freshly created', async () => {
        it('should create a proxy', async () => {
            const proxy = await this.project.createProxy(Bridge_v0);
            let result = await proxy.methods.version().call();
            assert.equal(result, 'v0');

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
            const proxy = await this.project.createProxy(Bridge_v0,
                { initMethod: 'initialize', initArgs: [managerAddress, federationAddress, this.allowTokens.address, this.sideTokenFactory_v0.address, 'r'] });

            result = await proxy.methods.owner().call();
            assert.equal(result,  managerAddress);
            result = await proxy.methods.allowTokens().call();
            assert.equal(result, this.allowTokens.address);
            result = await proxy.methods.sideTokenFactory().call();
            assert.equal(result,  this.sideTokenFactory_v0.address);
            result = await proxy.methods.symbolPrefix().call();
            assert.equal(result,  'r');
            result = await proxy.methods.getFederation().call();
            assert.equal(result,  federationAddress);
        });

        describe('initialized', async () => {
            beforeEach(async() => {
                this.proxy = await this.project.createProxy(Bridge_v0, 
                    { initMethod: 'initialize', initArgs: [managerAddress, federationAddress, this.allowTokens.address, this.sideTokenFactory_v0.address, 'r'] });
            });

            it('should accept send Transaction', async () => {
                const anAmount = web3.utils.toWei('5000');
                let tx = await this.proxy.methods.setCrossingPayment(anAmount).send({ from: managerAddress });
                utils.checkGas(tx.cumulativeGasUsed);
                let crossingPayment = await this.proxy.methods.getCrossingPayment().call();
                assert.equal(crossingPayment, anAmount);
            });

            it('should receive tokens', async () => {
                const amount = web3.utils.toWei('1000');
                await this.token.transfer(anAccount, amount, { from: deployerAddress });
                await this.token.approve(this.proxy.address, amount, { from: anAccount });

                let tx = await this.proxy.methods.receiveTokens(this.token.address, amount).send({ from: anAccount});
                utils.checkGas(tx.cumulativeGasUsed);

                assert.equal(tx.events.Cross.event, 'Cross');
                const balance = await this.token.balanceOf(this.proxy.address);
                assert.equal(balance, amount);
                const isKnownToken = await this.proxy.methods.knownTokens(this.token.address).call();
                assert.equal(isKnownToken, true);
                
            });

            it('should update it', async () => {
                let result = await this.proxy.methods.version().call();
                assert.equal(result, 'v0');

                /* Upgrade the contract at the address of our instance to the new logic, and initialize with a call to add. */
                let newProxy = await this.project.upgradeProxy(this.proxy.address, Bridge_v1);
                result = await newProxy.methods.version().call();
                assert.equal(result, 'v1');
                
                result = await newProxy.methods.owner().call();
                assert.equal(result,  managerAddress);
                result = await newProxy.methods.allowTokens().call();
                assert.equal(result, this.allowTokens.address);
                result = await newProxy.methods.sideTokenFactory().call();
                assert.equal(result,  this.sideTokenFactory_v0.address);
                result = await newProxy.methods.getFederation().call();
                assert.equal(result,  federationAddress);
            });

            describe('upgrade governance', () => {
                it('proxy owner', async () => {
                    let owner = await this.project.proxyAdmin.contract.methods.owner().call();
                    assert.equal(owner, deployerAddress);
                });

                it('proxy admin', async () => {
                    let admin = await this.project.proxyAdmin.contract.methods.getProxyAdmin(this.proxy.address).call();
                    assert.equal(admin, this.project.proxyAdmin.contract.address);
                });

                it('should renounce ownership', async () => {
                    let owner = await this.project.proxyAdmin.contract.methods.owner().call();
                    assert.equal(owner, deployerAddress);

                    let tx = await this.project.proxyAdmin.contract.methods.renounceOwnership().send({from: deployerAddress});
                    utils.checkGas(tx.cumulativeGasUsed);

                    owner = await this.project.proxyAdmin.contract.methods.owner().call();
                    assert.equal(owner, 0);

                    await utils.expectThrow(this.project.upgradeProxy(this.proxy.address, Bridge_v1));
                });

                it('should transfer ownership', async () => {
                    let owner = await this.project.proxyAdmin.contract.methods.owner().call();
                    assert.equal(owner, deployerAddress);

                    let tx = await this.project.proxyAdmin.contract.methods.transferOwnership(anAccount).send({from: deployerAddress});
                    utils.checkGas(tx.cumulativeGasUsed);

                    owner = await this.project.proxyAdmin.contract.methods.owner().call();
                    assert.equal(owner, anAccount);

                    await utils.expectThrow(this.project.upgradeProxy(this.proxy.address, Bridge_v1));
                });

            });

            describe('after upgrade', () => {
                beforeEach(async () => {
                    this.proxy = await this.project.upgradeProxy(this.proxy.address, Bridge_v1);
                    this.sideToken_v1 = await SideToken_v1.new();
                    this.sideTokenFactory_v1 = await SideTokenFactory_v1.new(this.sideToken_v1.address);
                    await this.sideTokenFactory_v1.transferPrimary(this.proxy.address);
                    this.utilsContract = await UtilsContract.new();
                });

                it('should have new method changeSideTokenFactory', async () => {
                    let result = await this.proxy.methods.changeSideTokenFactory(this.sideTokenFactory_v1.address).call({from: managerAddress});
                    assert.equal(result, true);
                });

                it('should have new method changeUtils', async () => {
                    let result = await this.proxy.methods.changeUtils(this.utilsContract.address).call({from: managerAddress});
                    assert.equal(result, true);
                });

                describe('after changeSideTokenFactory', () => {
                    beforeEach(async () => {
                        await this.proxy.methods.changeSideTokenFactory(this.sideTokenFactory_v1.address).send({from: managerAddress});
                        await this.proxy.methods.changeUtils(this.utilsContract.address).send({from: managerAddress});
                    });

                    it('should have removed the method tokenFallback', async () => {
                        await utils.expectThrow(this.token.transferAndCall(this.proxy.address, web3.utils.toWei('1000'), '0x'), { from: deployerAddress });
                    });

                    it('should receive tokens', async () => {
                        const amount = web3.utils.toWei('1000');
                        await this.token.transfer(anAccount, amount, { from: deployerAddress });
                        await this.token.approve(this.proxy.address, amount, { from: anAccount });
        
                        let tx = await this.proxy.methods.receiveTokens(this.token.address, amount).send({ from: anAccount});
                        assert.equal(Number(tx.status), 1, "Should be a succesful Tx");
        
                        assert.equal(tx.events.Cross.event, 'Cross');
                        const balance = await this.token.balanceOf(this.proxy.address);
                        assert.equal(balance, amount);
                        const isKnownToken = await this.proxy.methods.knownTokens(this.token.address).call();
                        assert.equal(isKnownToken, true);
                        
                    });

                    it('should accept Transfer', async () => {
                        let tx = await this.proxy.methods.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                        randomHex(32), randomHex(32), 0, 18, 1).send({ from: federationAddress });
                        assert.equal(Number(tx.status), 1, "Should be a succesful Tx");

                        let sideTokenAddress = await this.proxy.methods.mappedTokens(this.token.address).call();
                        let sideToken = await SideToken_v1.at(sideTokenAddress);
                        const sideTokenSymbol = await sideToken.symbol();
                        assert.equal(sideTokenSymbol, "rMAIN");

                        let originalTokenAddress = await this.proxy.methods.originalTokens(sideTokenAddress).call();
                        assert.equal(originalTokenAddress, this.token.address);

                        const mirrorBridgeBalance = await sideToken.balanceOf(this.proxy.address);
                        assert.equal(mirrorBridgeBalance, 0);
                        const mirrorAnAccountBalance = await sideToken.balanceOf(anAccount);
                        assert.equal(mirrorAnAccountBalance, this.amount);
                    });
                });
                
            }); // end after upgrade
        }); // end initialized
    }); // end freshly created
});