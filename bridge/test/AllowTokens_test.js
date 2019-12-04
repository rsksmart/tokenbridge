
const MainToken = artifacts.require('./MainToken');
const AllowTokens = artifacts.require('./AllowTokens');
const MultiSigWallet = artifacts.require('./MultiSigWallet');

const utils = require('./utils');
const BN = web3.utils.BN;
const toWei = web3.utils.toWei;

contract('AllowTokens', async function (accounts) {
    const tokenDeployer= accounts[0];
    const manager = accounts[1];

    beforeEach(async function () {
        this.token = await MainToken.new("MAIN", "MAIN", 18, 10000, { from: tokenDeployer });
        this.allowTokens = await AllowTokens.new(manager);
    });

    describe('Tokens whitelist', function () {

        it('should validate allowed tokens with initial values', async function () {
            let isValidatingAllowedTokens = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidatingAllowedTokens, true);
        });

        it('disables tokens whitelist validation', async function() {
            let isValidatingAllowedTokens = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidatingAllowedTokens, true);

            await this.allowTokens.disableAllowedTokensValidation({ from: manager });
            isValidatingAllowedTokens = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidatingAllowedTokens, false);
        });

        it('fail if disableAllowedTokensValidation caller is not the owner', async function() {
            let previousIsTokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            utils.expectThrow(this.allowTokens.disableAllowedTokensValidation({ from: tokenDeployer }));

            let isTokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isTokenAllowed, previousIsTokenAllowed);
        });

        it('enables tokens whitelist validation', async function() {
            await this.allowTokens.disableAllowedTokensValidation({ from: manager });
            let isValidatingAllowedTokens = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidatingAllowedTokens, false);

            await this.allowTokens.enableAllowedTokensValidation({ from: manager });

            isValidatingAllowedTokens = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidatingAllowedTokens, true);
        });

        it('fail if enableAllowedTokensValidation caller is not the owner', async function() {
            await this.allowTokens.disableAllowedTokensValidation({ from: manager });
            let previousIsTokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            utils.expectThrow(this.allowTokens.enableAllowedTokensValidation({ from: tokenDeployer }));

            let isTokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isTokenAllowed, previousIsTokenAllowed);
        });

        it('validates whitelisted token', async function() {
            let isValidatingAllowedTokens = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidatingAllowedTokens, true);

            await this.allowTokens.addAllowedToken(this.token.address, toWei('10000'), toWei('1'), toWei('100000'), { from: manager });
            let isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, true);
        });

        it('fail if addAllowedToken caller is not the owner', async function() {
            let previousIsTokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            utils.expectThrow(this.allowTokens.addAllowedToken(this.token.address, toWei('10000'), toWei('1'), toWei('100000'), { from: tokenDeployer }));

            let isTokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isTokenAllowed, previousIsTokenAllowed);
        });

        it('removes allowed token', async function() {
            let isValidatingAllowedTokens = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidatingAllowedTokens, true);

            await this.allowTokens.addAllowedToken(this.token.address, toWei('10000'), toWei('1'), toWei('100000'), { from: manager });
            let isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, true);

            await this.allowTokens.removeAllowedToken(this.token.address, { from: manager });
            isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, false);
        });

        it('fail if addAllowedToken caller is not the owner', async function() {
            let previousIsTokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            utils.expectThrow(this.allowTokens.removeAllowedToken(this.token.address, { from: tokenDeployer }));

            let isTokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isTokenAllowed, previousIsTokenAllowed);
        });


    });

    describe('After Add to Whitelist', function() {
        beforeEach(async function ()  {
            await this.allowTokens.addAllowedToken(this.token.address, toWei('10000'), toWei('1'), toWei('100000'), { from: manager });
        });
        describe('Limits', function() {
            describe('Max tokens allowed', function() {
                it('should set initial values', async function() {
                    let maxTokens = await this.allowTokens.maxTokensAllowed(this.token.address);
                    assert.equal(maxTokens.toString(), toWei('10000'));
                });

                it ('sets a new amount of max tokens', async function() {
                    let newMaxTokens = toWei('50000');
                    await this.allowTokens.setMaxTokensAllowed(this.token.address, newMaxTokens, { from: manager });

                    let maxTokens = await this.allowTokens.maxTokensAllowed(this.token.address);
                    assert.equal(maxTokens.toString(), newMaxTokens.toString());
                });

                it('fail if not the owner', async function() {
                    let previousMaxTokens = await this.allowTokens.maxTokensAllowed(this.token.address);
                    utils.expectThrow(this.allowTokens.setMaxTokensAllowed(this.token.address, toWei('50000'), { from: tokenDeployer }));

                    let maxTokens = await this.allowTokens.maxTokensAllowed(this.token.address);
                    assert.equal(maxTokens.toString(), previousMaxTokens.toString());
                });
            });

            describe('Min tokens allowed', async function() {

                it('should set initial values', async function() {
                    let minTokens = await this.allowTokens.minTokensAllowed(this.token.address);
                    assert.equal(minTokens.toString(), toWei('1'));
                });

                it ('sets a new amount of min tokens', async function() {
                    let newMinTokens = toWei('10');
                    await this.allowTokens.setMinTokensAllowed(this.token.address, newMinTokens, { from: manager });

                    let minTokens = await this.allowTokens.minTokensAllowed(this.token.address);
                    assert.equal(minTokens.toString(), newMinTokens.toString());
                });

                it('fail if not the owner', async function() {
                    let previousMinTokens = await this.allowTokens.minTokensAllowed(this.token.address);
                    utils.expectThrow(this.allowTokens.setMinTokensAllowed(this.token.address, toWei('10'), { from: tokenDeployer }));

                    let minTokens = await this.allowTokens.minTokensAllowed(this.token.address);
                    assert.equal(minTokens.toString(), previousMinTokens.toString());
                });
            });

            describe('Max Daily Limit tokens', async function() {

                it('should set initial values', async function() {
                    let dailyLimit = await this.allowTokens.dailyLimit(this.token.address);
                    assert.equal(dailyLimit, toWei('100000'));
                });

                it ('change daily limit', async function() {
                    let newDailyLimit = toWei('50000');
                    await this.allowTokens.changeDailyLimit(this.token.address, newDailyLimit, { from: manager });

                    let dailyLimit = await this.allowTokens.dailyLimit(this.token.address);
                    assert.equal(dailyLimit.toString(), newDailyLimit.toString());
                });

                it('fail if not the owner', async function() {
                    let previousDailyLimit = await this.allowTokens.dailyLimit(this.token.address);
                    utils.expectThrow(this.allowTokens.changeDailyLimit(this.token.address, toWei('50000'), { from: tokenDeployer }));

                    let dailyLimit = await this.allowTokens.dailyLimit(this.token.address);
                    assert.equal(dailyLimit.toString(), previousDailyLimit.toString());
                });

                it('calcMaxWithdraw', async function() {
                    let maxTokensAllowed = await this.allowTokens.maxTokensAllowed(this.token.address);
                    let maxWithdraw = await this.allowTokens.calcMaxWithdraw(this.token.address, 0);
                    assert.equal(maxWithdraw.toString(), maxTokensAllowed.toString());

                    maxWithdraw = await this.allowTokens.calcMaxWithdraw(this.token.address, maxTokensAllowed);
                    assert.equal(maxWithdraw.toString(), maxTokensAllowed.toString());

                    let dailyLimit = await this.allowTokens.dailyLimit(this.token.address);
                    maxWithdraw = await this.allowTokens.calcMaxWithdraw(this.token.address, dailyLimit);
                    assert.equal(maxWithdraw.toString(), '0');

                    maxWithdraw = await this.allowTokens.calcMaxWithdraw(this.token.address, new BN(dailyLimit).add(new BN('1')));
                    assert.equal(maxWithdraw.toString(), '0');
                });
            });
        }); // end Limits tests

        describe('isValidTokenTransfer', async function() {
            it('should check max value', async function() {
                let maxTokensAllowed = await this.allowTokens.maxTokensAllowed(this.token.address);
                let result = await this.allowTokens.isValidTokenTransfer(this.token.address, maxTokensAllowed, 0, true);
                assert.equal(result, true);

                result = await this.allowTokens.isValidTokenTransfer(this.token.address, new BN(maxTokensAllowed).add(new BN('1')), 0, true);
                assert.equal(result, false);
            });

            it('should check min value', async function() {
                let minTokensAllowed = await this.allowTokens.minTokensAllowed(this.token.address);
                let result = await this.allowTokens.isValidTokenTransfer(this.token.address, minTokensAllowed, 0, true);
                assert.equal(result, true);
                result = await this.allowTokens.isValidTokenTransfer(this.token.address, new BN(minTokensAllowed).sub(new BN('1')), 0, true);
                assert.equal(result, false);
            });

            it('should check daily limit', async function() {
                let minTokensAllowed = await this.allowTokens.minTokensAllowed(this.token.address);
                let dailyLimit = await this.allowTokens.dailyLimit(this.token.address);
                let result = await this.allowTokens.isValidTokenTransfer(this.token.address, minTokensAllowed, new BN(dailyLimit).sub(new BN(minTokensAllowed)), true);
                assert.equal(result, true);

                result = await this.allowTokens.isValidTokenTransfer(this.token.address, minTokensAllowed, dailyLimit, true);
                assert.equal(result, false);
            });

            it('should allow side token', async function() {
                let maxTokensAllowed = await this.allowTokens.maxTokensAllowed(this.token.address);
                await this.allowTokens.removeAllowedToken(this.token.address, { from: manager });
                let result = await this.allowTokens.isValidTokenTransfer(this.token.address, maxTokensAllowed, 0, true);
                assert.equal(result, true);

                await this.allowTokens.disableAllowedTokensValidation({ from: manager });
                result = await this.allowTokens.isValidTokenTransfer(this.token.address, maxTokensAllowed, 0, true);
                assert.equal(result, true);

                await this.allowTokens.enableAllowedTokensValidation({ from: manager });
                await this.allowTokens.addAllowedToken(this.token.address, toWei('10000'), toWei('1'), toWei('100000'), { from: manager });
                result = await this.allowTokens.isValidTokenTransfer(this.token.address, maxTokensAllowed, 0, true);
                assert.equal(result, true);
            });

            it('should check allowed token if not side token', async function() {
                await this.allowTokens.removeAllowedToken(this.token.address, { from: manager });
                let maxTokensAllowed = await this.allowTokens.maxTokensAllowed(this.token.address);
                let result = await this.allowTokens.isValidTokenTransfer(this.token.address, maxTokensAllowed, 0, false);
                assert.equal(result, false);

                await this.allowTokens.disableAllowedTokensValidation({ from: manager });
                result = await this.allowTokens.isValidTokenTransfer(this.token.address, maxTokensAllowed, 0, false);
                assert.equal(result, true);

                await this.allowTokens.enableAllowedTokensValidation({ from: manager });
                await this.allowTokens.addAllowedToken(this.token.address, toWei('10000'), toWei('1'), toWei('100000'), { from: manager });

                result = await this.allowTokens.isValidTokenTransfer(this.token.address, maxTokensAllowed, 0, false);
                assert.equal(result, true);
            });

            it('should not check limits if allowTokens is disabled', async function() {
                await this.allowTokens.removeAllowedToken(this.token.address, { from: manager });
                await this.allowTokens.disableAllowedTokensValidation({ from: manager });
                //should accept any max limit
                let result = await this.allowTokens.isValidTokenTransfer(this.token.address, toWei('999999999999'), 0, false);
                assert.equal(result, true);

                //should accept any min limit
                result = await this.allowTokens.isValidTokenTransfer(this.token.address, 1, 0, false);
                assert.equal(result, true);

                 //should accept any daily limit
                 result = await this.allowTokens.isValidTokenTransfer(this.token.address, toWei('999999999999'), toWei('999999999999'), false);
                 assert.equal(result, true);

            });


        });
    });//End Add to Whitelist

    describe('Calls from MultiSig', async function() {
        const multiSigOnwerA = accounts[2];
        const multiSigOnwerB = accounts[3];

        beforeEach(async function () {
            this.multiSig = await MultiSigWallet.new([multiSigOnwerA, multiSigOnwerB], 2);
            this.allowTokens = await AllowTokens.new(this.multiSig.address);
        });

        it('should fail to add a new allowed token due to missing signatures', async function() {
            let data = this.allowTokens.contract.methods.addAllowedToken(this.token.address, toWei('10000'), toWei('1'), toWei('100000'),).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, false);

            let isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, false);
        });

        it('should add a new allowed token', async function() {
            let data = this.allowTokens.contract.methods.addAllowedToken(this.token.address, toWei('10000'), toWei('1'), toWei('100000'),).encodeABI();

            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, true);
        });

        it('should fail to remove an allowed token due to missing signatures', async function() {
            let data = this.allowTokens.contract.methods.addAllowedToken(this.token.address, toWei('10000'), toWei('1'), toWei('100000')).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            data = this.allowTokens.contract.methods.removeAllowedToken(this.token.address).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });

            tx = await this.multiSig.transactions(1);
            assert.equal(tx.executed, false);

            isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, true);
        });

        it('should remove an allowed token', async function() {
            let data = this.allowTokens.contract.methods.addAllowedToken(this.token.address, toWei('10000'), toWei('1'), toWei('100000')).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            data = this.allowTokens.contract.methods.removeAllowedToken(this.token.address).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(1, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(1);
            assert.equal(tx.executed, true);

            isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, false);
        });

        it('should fail to disable tokens validation due to missing signatures', async function() {
            let data = this.allowTokens.contract.methods.disableAllowedTokensValidation().encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, false);

            let isValidating = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidating, true);
        });

        it('should disable tokens validation', async function() {
            let data = this.allowTokens.contract.methods.disableAllowedTokensValidation().encodeABI();

            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let isValidating = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidating, false);
        });

        it('should fail to enable tokens validation due to missing signatures', async function() {
            let data = this.allowTokens.contract.methods.disableAllowedTokensValidation().encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let isValidating = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidating, false);

            data = this.allowTokens.contract.methods.enableAllowedTokensValidation().encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });

            let tx = await this.multiSig.transactions(1);
            assert.equal(tx.executed, false);

            isValidating = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidating, false);
        });

        it('should enable tokens validation', async function() {
            let data = this.allowTokens.contract.methods.disableAllowedTokensValidation().encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let isValidating = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidating, false);

            data = this.allowTokens.contract.methods.enableAllowedTokensValidation().encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(1, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(1);
            assert.equal(tx.executed, true);

            isValidating = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidating, true);
        });

        it('should fail to set max tokens due to missing signatures', async function() {
            let maxTokens = await this.allowTokens.maxTokensAllowed(this.token.address);

            let data = this.allowTokens.contract.methods.setMaxTokensAllowed(this.token.address, toWei('1000')).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, false);

            let maxTokensAfter = await this.allowTokens.maxTokensAllowed(this.token.address);
            assert.equal(maxTokensAfter.toString(), maxTokens.toString());
        });

        describe('with token added', async function () {
            beforeEach(async function () {
                let data = this.allowTokens.contract.methods.addAllowedToken(this.token.address, toWei('10000'), toWei('1'), toWei('100000')).encodeABI();
                await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
                await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

                let tx = await this.multiSig.transactions(0);
                assert.equal(tx.executed, true);
            });

            it('should set max tokens', async function() {
                let newMax = toWei('1000');
                let data = this.allowTokens.contract.methods.setMaxTokensAllowed(this.token.address, newMax).encodeABI();
                await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
                await this.multiSig.confirmTransaction(1, { from: multiSigOnwerB });
    
                let tx = await this.multiSig.transactions(1);
                assert.equal(tx.executed, true);
    
                let maxTokensAfter = await this.allowTokens.maxTokensAllowed(this.token.address);
                assert.equal(maxTokensAfter.toString(), newMax);
            });
    
            it('should set min tokens', async function() {
                let newMin = toWei('10');
                let data = this.allowTokens.contract.methods.setMinTokensAllowed(this.token.address, newMin).encodeABI();
                await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
                await this.multiSig.confirmTransaction(1, { from: multiSigOnwerB });
    
                let tx = await this.multiSig.transactions(1);
                assert.equal(tx.executed, true);
    
                let minTokensAfter = await this.allowTokens.minTokensAllowed(this.token.address);
                assert.equal(minTokensAfter.toString(), newMin.toString());
            });
    
            it('should change daily limit', async function() {
                let newDailyLimit = toWei('50000');
                let data = this.allowTokens.contract.methods.changeDailyLimit(this.token.address, newDailyLimit).encodeABI();
                await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
                await this.multiSig.confirmTransaction(1, { from: multiSigOnwerB });
    
                let tx = await this.multiSig.transactions(1);
                assert.equal(tx.executed, true);
    
                let dailyLimit = await this.allowTokens.dailyLimit(this.token.address);
                assert.equal(dailyLimit.toString(), newDailyLimit.toString());
            });

        });
        
    });

    describe('Ownable methods', async function() {
        const anotherOwner = accounts[3];

        it('Should renounce ownership', async function() {
            await this.allowTokens.renounceOwnership({ from: manager });
            let owner = await this.allowTokens.owner();
            assert.equal(BigInt(owner), 0);
        });

        it('Should not renounce ownership when not called by the owner', async function() {
            let owner = await this.allowTokens.owner();
            await utils.expectThrow(this.allowTokens.renounceOwnership());
            let ownerAfter = await this.allowTokens.owner();

            assert.equal(owner, ownerAfter);
        });

        it('Should transfer ownership', async function() {
            await this.allowTokens.transferOwnership(anotherOwner, { from: manager });
            let owner = await this.allowTokens.owner();
            assert.equal(owner, anotherOwner);
        });

        it('Should not transfer ownership when not called by the owner', async function() {
            let owner = await this.allowTokens.owner();
            await utils.expectThrow(this.allowTokens.transferOwnership(anotherOwner));
            let ownerAfter = await this.allowTokens.owner();

            assert.equal(owner, ownerAfter);
        });

    })
});
