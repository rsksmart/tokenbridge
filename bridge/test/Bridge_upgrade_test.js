const { TestHelper } = require('@openzeppelin/cli');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');

ZWeb3.initialize(web3.currentProvider);

//Upgradable Contracts
const Bridge_v1 = Contracts.getFromLocal('Bridge_v1');
const Bridge_v2 = Contracts.getFromLocal('Bridge_v2');

const UtilsContract = artifacts.require('Utils');

//Normal Contracts
const SideTokenFactory_v0 = artifacts.require('./SideTokenFactory_v0');
const SideTokenFactory = artifacts.require('./SideTokenFactory');
const SideToken = artifacts.require('./SideToken');
const AllowTokens = artifacts.require('./AllowTokens');
const MainToken = artifacts.require('./MainToken');

const utils = require('./utils');
const randomHex = web3.utils.randomHex;

contract('Bridge upgrade test', async (accounts) => {
    const deployerAddress = accounts[0];
    const managerAddress = accounts[1];
    const anAccount = accounts[2];
    const otherAccount = accounts[3];
    const validatorsAddress = accounts[5];

    beforeEach(async () => {
        this.project = await TestHelper();
        this.allowTokens = await AllowTokens.new(managerAddress);
        this.utilsContract = await UtilsContract.deployed();
        Bridge_v1.link({ "Utils": this.utilsContract.address });
        Bridge_v2.link({ "Utils": this.utilsContract.address });
        await this.allowTokens.disableAllowedTokensValidation({from: managerAddress});
        this.sideTokenFactory_v0 = await SideTokenFactory_v0.new();
        this.token = await MainToken.new("MAIN", "MAIN", 18, web3.utils.toWei('10000'), { from: deployerAddress });
        this.amount = web3.utils.toWei('1000');
    });

    describe('freshly created', async () => {
        it('should create a proxy', async () => {
            const proxy = await this.project.createProxy(Bridge_v1);
            let result = await proxy.methods.version().call();
            assert.equal(result, 'v1');

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
            const proxy = await this.project.createProxy(Bridge_v1,
                { initMethod: 'initialize', initArgs: [managerAddress, validatorsAddress, this.allowTokens.address, this.sideTokenFactory_v0.address, 'r'] });

            result = await proxy.methods.owner().call();
            assert.equal(result,  managerAddress);
            result = await proxy.methods.allowTokens().call();
            assert.equal(result, this.allowTokens.address);
            result = await proxy.methods.sideTokenFactory().call();
            assert.equal(result,  this.sideTokenFactory_v0.address);
            result = await proxy.methods.symbolPrefix().call();
            assert.equal(result,  'r');
            result = await proxy.methods.getFederation().call();
            assert.equal(result,  validatorsAddress);
        });

        describe('initialized', async () => {
            beforeEach(async() => {
                this.proxy = await this.project.createProxy(Bridge_v1,
                    { initMethod: 'initialize', initArgs: [managerAddress, validatorsAddress, this.allowTokens.address, this.sideTokenFactory_v0.address, 'r'] });
            });

            it('should accept send Transaction', async () => {
                let feePercentage = '20'; //0.2%
                const tx = await this.proxy.methods.setFeePercentage(feePercentage).send({from: managerAddress});
                assert.equal(tx.status, true);
                utils.checkGas(tx.cumulativeGasUsed);
                const result = await this.proxy.methods.getFeePercentage().call();
                assert.equal(result.toString(), feePercentage);
            });

            it('should receive tokens', async () => {
                const amount = web3.utils.toWei('1000');
                await this.token.transfer(anAccount, amount, { from: deployerAddress });
                await this.token.approve(this.proxy.address, amount, { from: anAccount });

                let tx = await this.proxy.methods.receiveTokens(this.token.address, amount).send({ from: anAccount});
                assert.equal(tx.status, true);
                utils.checkGas(tx.cumulativeGasUsed);

                assert.equal(tx.events.Cross.event, 'Cross');
                const balance = await this.token.balanceOf(this.proxy.address);
                assert.equal(balance, amount);
                const isKnownToken = await this.proxy.methods.knownTokens(this.token.address).call();
                assert.equal(isKnownToken, true);
            });

            it('should update it using OZ CLI', async () => {
                let result = await this.proxy.methods.version().call();
                assert.equal(result, 'v1');

                /* Upgrade the contract at the address of our instance to the new logic */
                let newProxy = await this.project.upgradeProxy(this.proxy.address, Bridge_v2);
                result = await newProxy.methods.version().call();
                assert.equal(result, 'v2');

                result = await newProxy.methods.owner().call();
                assert.equal(result,  managerAddress);
                result = await newProxy.methods.allowTokens().call();
                assert.equal(result, this.allowTokens.address);
                result = await newProxy.methods.sideTokenFactory().call();
                assert.equal(result,  this.sideTokenFactory_v0.address);
                result = await newProxy.methods.getValidators().call();
                assert.equal(result,  validatorsAddress);
            });

            it('should have new method setFeePercentage after update', async () => {
                let feePercentage = '20'; //0.2%
                await this.proxy.methods.setFeePercentage(feePercentage).send({from: managerAddress});
                result = await this.proxy.methods.getFeePercentage().call();
                assert.equal(result.toString(), feePercentage);

                const newProxy = await this.project.upgradeProxy(this.proxy.address, Bridge_v2);

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

                    await utils.expectThrow(this.project.upgradeProxy(this.proxy.address, Bridge_v2));
                });

                it('should transfer ownership', async () => {
                    let owner = await this.project.proxyAdmin.contract.methods.owner().call();
                    assert.equal(owner, deployerAddress);

                    let tx = await this.project.proxyAdmin.contract.methods.transferOwnership(anAccount).send({from: deployerAddress});
                    utils.checkGas(tx.cumulativeGasUsed);

                    owner = await this.project.proxyAdmin.contract.methods.owner().call();
                    assert.equal(owner, anAccount);

                    await utils.expectThrow(this.project.upgradeProxy(this.proxy.address, Bridge_v2));
                });

            });// end upgrade governance

            describe('after upgrade using OZ', () => {
                beforeEach(async () => {
                    this.proxy = await this.project.upgradeProxy(this.proxy.address, Bridge_v2);
                    this.sideTokenFactory_v1 = await SideTokenFactory_v1.new();
                    await this.sideTokenFactory_v1.transferPrimary(this.proxy.address);
                });

                it('should have new method changeSideTokenFactory', async () => {
                    let result = await this.proxy.methods.changeSideTokenFactory(this.sideTokenFactory.address).call({from: managerAddress});
                    assert.equal(result, true);
                });


                describe('after changeSideTokenFactory', () => {
                    beforeEach(async () => {
                        await this.proxy.methods.changeSideTokenFactory(this.sideTokenFactory.address).send({from: managerAddress});
                    });

                    it('should have removed the method tokenFallback', async () => {
                        await utils.expectThrow(this.token.transferAndCall(this.proxy.address, web3.utils.toWei('1000'), '0x'), { from: deployerAddress });
                    });

                    it('should receive tokens', async () => {
                        const amount = web3.utils.toWei('1000');
                        await this.token.transfer(anAccount, amount, { from: deployerAddress });
                        await this.token.approve(this.proxy.address, amount, { from: anAccount });

                        let tx = await this.proxy.methods.receiveTokens(this.token.address, anAccount, amount).send({ from: anAccount});
                        assert.equal(Number(tx.status), 1, "Should be a succesful Tx");

                        assert.equal(tx.events.Cross.event, 'Cross');
                        const balance = await this.token.balanceOf(this.proxy.address);
                        assert.equal(balance, amount);
                        const isKnownToken = await this.proxy.methods.knownTokens(this.token.address).call();
                        assert.equal(isKnownToken, true);
                    });

                    it('should accept Transfer', async () => {
                        let tx = await this.proxy.methods.acceptTransfer(this.token.address, anAccount, otherAccount, this.amount, "MAIN",
                        randomHex(32), randomHex(32), 0, 18, 1).send({ from: validatorsAddress });
                        assert.equal(Number(tx.status), 1, "Should be a succesful Tx");

                        let sideTokenAddress = await this.proxy.methods.mappedTokens(this.token.address).call();
                        let sideToken = await SideToken.at(sideTokenAddress);
                        const sideTokenSymbol = await sideToken.symbol();
                        assert.equal(sideTokenSymbol, "rMAIN");

                        let originalTokenAddress = await this.proxy.methods.originalTokens(sideTokenAddress).call();
                        assert.equal(originalTokenAddress, this.token.address);

                        const mirrorBridgeBalance = await sideToken.balanceOf(this.proxy.address);
                        assert.equal(mirrorBridgeBalance, 0);
                        const mirrorAnAccountBalance = await sideToken.balanceOf(otherAccount);
                        assert.equal(mirrorAnAccountBalance, this.amount);
                    });
                }); // end after changeSideTokenFactory
            }); //end after upgrade

            describe('Change the owner and upgrade calling AdminUpgradeabilityProxy', () => {
                it('should update it', async () => {
                    let result = await this.proxy.methods.version().call();
                    assert.equal(result, 'v1');

                    result = await this.project.proxyAdmin.contract.methods.owner().call();
                    assert.equal(result, deployerAddress);

                    //See the open zeppelin SDK admin contracts https://docs.openzeppelin.com/upgrades/2.8/api#ProxyAdmin-changeProxyAdmin-contract-AdminUpgradeabilityProxy-address-
                    /* Upgrade the contract at the address of our instance to the new logic */
                    let bridge_v2 = await Bridge_v2.new();
                    await this.project.proxyAdmin.contract.methods.upgrade(this.proxy.address, bridge_v2.address).send({from: deployerAddress});

                    //Check the Proxy Adminis still the AdminUpgradeabilityProxy  admin
                    //We need this because if the deployerAddress was the admin it couldn't call the bridge methods from the proxy
                    // this is because of the transparent proxy pattern https://docs.openzeppelin.com/cli/2.8/contracts-architecture
                    // https://docs.openzeppelin.com/upgrades/2.8/proxies#transparent-proxies-and-function-clashes
                    result = await this.project.proxyAdmin.contract.methods.getProxyAdmin(this.proxy.address).call();
                    assert.equal(result, this.project.proxyAdmin.address);

                    result = await this.project.proxyAdmin.contract.methods.getProxyImplementation(this.proxy.address).call();
                    assert.equal(result, bridge_v2.address);

                    this.proxy= await Bridge_v2.at(this.proxy.address);

                    result = await this.proxy.methods.version().call();
                    assert.equal(result, 'v2');
                    result = await this.proxy.methods.owner().call();
                    assert.equal(result,  managerAddress);
                    result = await this.proxy.methods.allowTokens().call();
                    assert.equal(result, this.allowTokens.address);
                    result = await this.proxy.methods.sideTokenFactory().call();
                    assert.equal(result,  this.sideTokenFactory_v0.address);
                    result = await this.proxy.methods.getValidators().call();
                    assert.equal(result,  validatorsAddress);
                });
            });

            describe('after upgrade calling AdminUpgradeabilityProxy', () => {
                beforeEach(async () => {
                    //Change the ProxyAdmin owner to the ManagerAccount
                    //await this.project.transferAdminOwnership(deployerAddress);
                    await this.project.proxyAdmin.contract.methods.transferOwnership(managerAddress).send({from: deployerAddress});
                    /* Upgrade the contract at the address of our instance to the new logic */
                    let bridge_v2 = await Bridge_v2.new();
                    await this.project.proxyAdmin.contract.methods.upgrade(this.proxy.address, bridge_v2.address).send({from: managerAddress});
                    this.proxy = await Bridge_v2.at(this.proxy.address);

                    //this.proxy = await this.project.upgradeProxy(this.proxy.address, bridge_v2);
                    this.sideTokenFactory_v1 = await SideTokenFactory_v1.new();
                    await this.sideTokenFactory_v1.transferPrimary(this.proxy.address);
                    this.utilsContract = await UtilsContract.new();
                });

                it('should have new method changeSideTokenFactory', async () => {
                    let result = await this.proxy.methods.changeSideTokenFactory(this.sideTokenFactory.address).call({from: managerAddress});
                    assert.equal(result, true);
                });

                describe('after changeSideTokenFactory', () => {
                    beforeEach(async () => {
                        await this.proxy.methods.changeSideTokenFactory(this.sideTokenFactory.address).send({from: managerAddress});
                    });

                    it('should have removed the method tokenFallback', async () => {
                        await utils.expectThrow(this.token.transferAndCall(this.proxy.address, web3.utils.toWei('1000'), '0x'), { from: deployerAddress });
                    });

                    it('should receive tokens', async () => {
                        const amount = web3.utils.toWei('1000');
                        await this.token.transfer(anAccount, amount, { from: deployerAddress });
                        await this.token.approve(this.proxy.address, amount, { from: anAccount });

                        let tx = await this.proxy.methods.receiveTokens(this.token.address, anAccount, amount).send({ from: anAccount});
                        assert.equal(Number(tx.status), 1, "Should be a succesful Tx");

                        assert.equal(tx.events.Cross.event, 'Cross');
                        const balance = await this.token.balanceOf(this.proxy.address);
                        assert.equal(balance, amount);
                        const isKnownToken = await this.proxy.methods.knownTokens(this.token.address).call();
                        assert.equal(isKnownToken, true);
                    });

                    it('should accept Transfer', async () => {
                        let tx = await this.proxy.methods.acceptTransfer(this.token.address, anAccount, otherAccount, this.amount, "MAIN",
                        randomHex(32), randomHex(32), 0, 18, 1).send({ from: validatorsAddress });
                        assert.equal(Number(tx.status), 1, "Should be a succesful Tx");

                        let sideTokenAddress = await this.proxy.methods.mappedTokens(this.token.address).call();
                        let sideToken = await SideToken.at(sideTokenAddress);
                        const sideTokenSymbol = await sideToken.symbol();
                        assert.equal(sideTokenSymbol, "rMAIN");

                        let originalTokenAddress = await this.proxy.methods.originalTokens(sideTokenAddress).call();
                        assert.equal(originalTokenAddress, this.token.address);

                        const mirrorBridgeBalance = await sideToken.balanceOf(this.proxy.address);
                        assert.equal(mirrorBridgeBalance, 0);
                        const mirrorOtherAccountBalance = await sideToken.balanceOf(otherAccount);
                        assert.equal(mirrorOtherAccountBalance, this.amount);
                    });
                }); // end after changeSideTokenFactory
            }); //end after upgrade

        }); // end initialized
    }); // end freshly created
});