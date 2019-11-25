const { TestHelper } = require('@openzeppelin/cli');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');

ZWeb3.initialize(web3.currentProvider);

//Upgradable Contracts
const Bridge_v0 = Contracts.getFromLocal('Bridge_v0');
const Bridge_upgrade_test = Contracts.getFromLocal('Bridge_upgrade_test');

//Normal Contracts
const SideTokenFactory = artifacts.require('./SideTokenFactory');
const SideToken = artifacts.require('./SideToken');
const AllowTokens = artifacts.require('./AllowTokens');
const MainToken = artifacts.require('./MainToken');

const utils = require('./utils');
const randomHex = web3.utils.randomHex;

contract('Bridge_upgrade_test', async (accounts) => {
    const deployerAddress = accounts[0];
    const managerAddress = accounts[1];
    const anAccount = accounts[2];

    beforeEach(async () => {
        this.project = await TestHelper();
        this.allowTokens = await AllowTokens.new(managerAddress);
        this.sideTokenFactory = await SideTokenFactory.new();
        this.token = await MainToken.new("MAIN", "MAIN", 18, 10000, { from: deployerAddress });
        this.amount = 1000;
    });

    describe('before upgrade', async () => {
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
                { initMethod: 'initialize', initArgs: [managerAddress, this.allowTokens.address, this.sideTokenFactory.address, 'r'.charCodeAt()] });

            result = await proxy.methods.owner().call();
            assert.equal(result,  managerAddress);
            result = await proxy.methods.allowTokens().call();
            assert.equal(result, this.allowTokens.address);
            result = await proxy.methods.sideTokenFactory().call();
            assert.equal(result,  this.sideTokenFactory.address);
            result = await proxy.methods.symbolPrefix().call();
            assert.equal(result,  'r'.charCodeAt());
        });

        describe('with proxy created and initialized', async () => {
            beforeEach(async() => {
                this.proxy = await this.project.createProxy(Bridge_v0, 
                    { initMethod: 'initialize', initArgs: [managerAddress, this.allowTokens.address, this.sideTokenFactory.address, 'r'.charCodeAt()] });
            });

            it('should accept send Transaction', async () => {
                let tx = await this.proxy.methods.mapAddress(anAccount).send({ from: deployerAddress });
                utils.checkGas(tx.cumulativeGasUsed);
                let mappedAddress = await this.proxy.methods.getMappedAddress(deployerAddress).call();
                assert.equal(mappedAddress, anAccount);
            });

            it('should receive tokens', async () => {
                const amount = 1000;
                
                await this.token.transfer(anAccount, amount, { from: deployerAddress });
                await this.token.approve(this.proxy.address, amount, { from: anAccount });
                let tx = await this.proxy.methods.receiveTokens(this.token.address, amount).send({ from: anAccount});
                utils.checkGas(tx.cumulativeGasUsed);

                let balance = await this.token.balanceOf(this.proxy.address);
                assert.equal(balance, amount);
            });

            it('should update it', async () => {
                let result = await this.proxy.methods.version().call();
                assert.equal(result, 'v0');

                /* Upgrade the contract at the address of our instance to the new logic, and initialize with a call to add. */
                let newProxy = await this.project.upgradeProxy(this.proxy.address, Bridge_upgrade_test);
                result = await newProxy.methods.version().call();
                assert.equal(result, 'test');
                
                result = await newProxy.methods.owner().call();
                assert.equal(result,  managerAddress);
                result = await newProxy.methods.allowTokens().call();
                assert.equal(result, this.allowTokens.address);
                result = await newProxy.methods.sideTokenFactory().call();
                assert.equal(result,  this.sideTokenFactory.address);
            });

            describe('after upgrade', () => {
                beforeEach(async () => {
                    this.proxy = await this.project.upgradeProxy(this.proxy.address, Bridge_upgrade_test);
                });

                it('should have new method', async () => {
                    let result = await this.proxy.methods.newMethodTest().call();
                    assert.equal(result,  true);
                });

                it('should have removed the method', async () => {
                    try{
                        await this.proxy.methods.getSymbolPrefix().call();
                        assert.isTrue(false);
                    } catch(err) {
                        assert.isTrue(true);
                    }
                });

                it('should accept Transfer', async () => {
                    await this.sideTokenFactory.transferOwnership(this.proxy.address, { from: deployerAddress })
                    let tx = await this.proxy.methods.acceptTransfer(this.token.address, anAccount, this.amount, "MAIN",
                    randomHex(32), randomHex(32), 0).send({ from: managerAddress });
                    utils.checkGas(tx.cumulativeGasUsed);
                });
                
            });
        });
    });
});