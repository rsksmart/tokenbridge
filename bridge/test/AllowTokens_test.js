
const MainToken = artifacts.require('./MainToken');
const AllowTokens = artifacts.require('./AllowTokens');
const MultiSigWallet = artifacts.require('./MultiSigWallet');

const utils = require('./utils');
const BN = web3.utils.BN;

contract('AllowTokens', async function (accounts) {
    const tokenDeployer= accounts[0];
    const manager = accounts[1];

    beforeEach(async function () {
        this.token = await MainToken.new("MAIN", "MAIN", 18, 10000, { from: tokenDeployer });
        this.allowTokens = await AllowTokens.new(manager);
    });

    describe('Tokens whitelist', async function () {

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

        it('fails isTokenAllowed if null address provided', async function() {
            await utils.expectThrow(this.allowTokens.isTokenAllowed(utils.NULL_ADDRESS));
        })

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

            await this.allowTokens.addAllowedToken(this.token.address, { from: manager });
            let isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, true);
        });

        it('fail if addAllowedToken caller is not the owner', async function() {
            let previousIsTokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            utils.expectThrow(this.allowTokens.addAllowedToken(this.token.address, { from: tokenDeployer }));

            let isTokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isTokenAllowed, previousIsTokenAllowed);
        });

        it('fail if addAllowedToken address is empty', async function() {
            utils.expectThrow(this.allowTokens.addAllowedToken('0x', { from: manager }));
        });

        it('fail if addAllowedToken address was already added', async function() {
            await this.allowTokens.addAllowedToken(this.token.address, { from: manager });
            utils.expectThrow(this.allowTokens.addAllowedToken(this.token.address, { from: manager }));
        });

        it('removes allowed token', async function() {
            let isValidatingAllowedTokens = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidatingAllowedTokens, true);

            await this.allowTokens.addAllowedToken(this.token.address, { from: manager });
            let isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, true);

            await this.allowTokens.removeAllowedToken(this.token.address, { from: manager });
            isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, false);
        });

        it('fail if removeAllowedToken caller is not the owner', async function() {
            await this.allowTokens.addAllowedToken(this.token.address, { from: manager });
            let previousIsTokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            utils.expectThrow(this.allowTokens.removeAllowedToken(this.token.address, { from: tokenDeployer }));

            let isTokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isTokenAllowed, previousIsTokenAllowed);
        });

        it('fail if removeAllowedToken address is not in the whitelist', async function() {
            utils.expectThrow(this.allowTokens.removeAllowedToken(this.token.address, { from: manager }));
        });


    });

    describe('Max tokens allowed', async function() {

        it('should set initial values', async function() {
            let maxTokens = await this.allowTokens.getMaxTokensAllowed();
            assert.equal(maxTokens.toString(), web3.utils.toWei('10000'));
        });

        it ('sets a new amount of max tokens', async function() {
            let newMaxTokens = web3.utils.toWei('50000');
            await this.allowTokens.setMaxTokensAllowed(newMaxTokens, { from: manager });

            let maxTokens = await this.allowTokens.getMaxTokensAllowed();
            assert.equal(maxTokens.toString(), newMaxTokens.toString());
        });

        it('fail if not the owner', async function() {
            let previousMaxTokens = await this.allowTokens.getMaxTokensAllowed();
            utils.expectThrow(this.allowTokens.setMaxTokensAllowed(web3.utils.toWei('50000'), { from: tokenDeployer }));

            let maxTokens = await this.allowTokens.getMaxTokensAllowed();
            assert.equal(maxTokens.toString(), previousMaxTokens.toString());
        });

        it('fail if max is lesser than min', async function() {
            await this.allowTokens.setMinTokensAllowed(web3.utils.toWei('10'), { from: manager });
            utils.expectThrow(this.allowTokens.setMaxTokensAllowed(web3.utils.toWei('9'), { from: manager }));
        });
    });

    describe('Min tokens allowed', async function() {

        it('should set initial values', async function() {
            let minTokens = await this.allowTokens.getMinTokensAllowed();
            assert.equal(minTokens.toString(), web3.utils.toWei('1'));
        });

        it ('sets a new amount of min tokens', async function() {
            let newMinTokens = web3.utils.toWei('10');
            await this.allowTokens.setMinTokensAllowed(newMinTokens, { from: manager });

            let minTokens = await this.allowTokens.getMinTokensAllowed();
            assert.equal(minTokens.toString(), newMinTokens.toString());
        });

        it('fail if not the owner', async function() {
            let previousMinTokens = await this.allowTokens.getMinTokensAllowed();
            utils.expectThrow(this.allowTokens.setMinTokensAllowed(web3.utils.toWei('10'), { from: tokenDeployer }));

            let minTokens = await this.allowTokens.getMinTokensAllowed();
            assert.equal(minTokens.toString(), previousMinTokens.toString());
        });

        it('fail if min is bigger than max', async function() {
            await this.allowTokens.setMaxTokensAllowed(web3.utils.toWei('1'), { from: manager });
            utils.expectThrow(this.allowTokens.setMinTokensAllowed(web3.utils.toWei('10'), { from: manager }));
        });
    });

    describe('Max Daily Limit tokens', async function() {

        it('should set initial values', async function() {
            let dailyLimit = await this.allowTokens.dailyLimit();
            assert.equal(dailyLimit, web3.utils.toWei('100000'));
        });

        it ('change daily limit', async function() {
            let newDailyLimit = web3.utils.toWei('50000');
            await this.allowTokens.changeDailyLimit(newDailyLimit, { from: manager });

            let dailyLimit = await this.allowTokens.dailyLimit();
            assert.equal(dailyLimit.toString(), newDailyLimit.toString());
        });

        it('fail if not the owner', async function() {
            let previousDailyLimit = await this.allowTokens.dailyLimit();
            utils.expectThrow(this.allowTokens.changeDailyLimit(web3.utils.toWei('50000'), { from: tokenDeployer }));

            let dailyLimit = await this.allowTokens.dailyLimit();
            assert.equal(dailyLimit.toString(), previousDailyLimit.toString());
        });

        it ('fail daily limit lesser than max', async function() {
            let newDailyLimit = web3.utils.toWei('4999');
            await this.allowTokens.setMaxTokensAllowed(web3.utils.toWei('5000'), { from: manager });
            await utils.expectThrow(this.allowTokens.changeDailyLimit(newDailyLimit, { from: manager }));
        });

        it('calcMaxWithdraw', async function() {
            let maxTokensAllowed = await this.allowTokens.getMaxTokensAllowed();
            let maxWithdraw = await this.allowTokens.calcMaxWithdraw(0);
            assert.equal(maxWithdraw.toString(), maxTokensAllowed.toString());

            maxWithdraw = await this.allowTokens.calcMaxWithdraw(maxTokensAllowed);
            assert.equal(maxWithdraw.toString(), maxTokensAllowed.toString());

            let dailyLimit = await this.allowTokens.dailyLimit();
            maxWithdraw = await this.allowTokens.calcMaxWithdraw(dailyLimit);
            assert.equal(maxWithdraw.toString(), '0');

            maxWithdraw = await this.allowTokens.calcMaxWithdraw(new BN(dailyLimit).add(new BN('1')));
            assert.equal(maxWithdraw.toString(), '0');
        });
    });

    describe('isValidTokenTransfer', async function() {

        it('should check max value', async function() {
            let maxTokensAllowed = await this.allowTokens.getMaxTokensAllowed();
            let result = await this.allowTokens.isValidTokenTransfer(this.token.address, maxTokensAllowed, 0, true);
            assert.equal(result, true);

            result = await this.allowTokens.isValidTokenTransfer(this.token.address, new BN(maxTokensAllowed).add(new BN('1')), 0, true);
            assert.equal(result, false);
        });

        it('should check min value', async function() {
            let minTokensAllowed = await this.allowTokens.getMinTokensAllowed();
            let result = await this.allowTokens.isValidTokenTransfer(this.token.address, minTokensAllowed, 0, true);
            assert.equal(result, true);
            result = await this.allowTokens.isValidTokenTransfer(this.token.address, new BN(minTokensAllowed).sub(new BN('1')), 0, true);
            assert.equal(result, false);
        });

        it('should check daily limit', async function() {
            let minTokensAllowed = await this.allowTokens.getMinTokensAllowed();
            let dailyLimit = await this.allowTokens.dailyLimit({ from: manager });
            let result = await this.allowTokens.isValidTokenTransfer(this.token.address, minTokensAllowed, new BN(dailyLimit).sub(new BN(minTokensAllowed)), true);
            assert.equal(result, true);

            result = await this.allowTokens.isValidTokenTransfer(this.token.address, minTokensAllowed, dailyLimit, true);
            assert.equal(result, false);
        });

        it('should allow side token', async function() {
            let maxTokensAllowed = await this.allowTokens.getMaxTokensAllowed();
            let result = await this.allowTokens.isValidTokenTransfer(this.token.address, maxTokensAllowed, 0, true);
            assert.equal(result, true);

            await this.allowTokens.disableAllowedTokensValidation({ from: manager });
            result = await this.allowTokens.isValidTokenTransfer(this.token.address, maxTokensAllowed, 0, true);
            assert.equal(result, true);

            await this.allowTokens.enableAllowedTokensValidation({ from: manager });
            await this.allowTokens.addAllowedToken(this.token.address, { from: manager });
            result = await this.allowTokens.isValidTokenTransfer(this.token.address, maxTokensAllowed, 0, true);
            assert.equal(result, true);
        });

        it('should check allowed token if not side token', async function() {
            let maxTokensAllowed = await this.allowTokens.getMaxTokensAllowed();
            let result = await this.allowTokens.isValidTokenTransfer(this.token.address, maxTokensAllowed, 0, false);
            assert.equal(result, false);

            await this.allowTokens.disableAllowedTokensValidation({ from: manager });
            result = await this.allowTokens.isValidTokenTransfer(this.token.address, maxTokensAllowed, 0, false);
            assert.equal(result, true);

            await this.allowTokens.enableAllowedTokensValidation({ from: manager });
            await this.allowTokens.addAllowedToken(this.token.address, { from: manager });

            result = await this.allowTokens.isValidTokenTransfer(this.token.address, maxTokensAllowed, 0, false);
            assert.equal(result, true);
        });


    });

    describe('Calls from MultiSig', async function() {
        const multiSigOnwerA = accounts[2];
        const multiSigOnwerB = accounts[3];

        beforeEach(async function () {
            this.multiSig = await MultiSigWallet.new([multiSigOnwerA, multiSigOnwerB], 2);
            this.allowTokens = await AllowTokens.new(this.multiSig.address);
        });

        it('should fail to add a new allowed token due to missing signatures', async function() {
            let data = this.allowTokens.contract.methods.addAllowedToken(this.token.address).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, false);

            let isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, false);
        });

        it('should add a new allowed token', async function() {
            let data = this.allowTokens.contract.methods.addAllowedToken(this.token.address).encodeABI();

            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, true);
        });

        it('should fail to remove an allowed token due to missing signatures', async function() {
            let data = this.allowTokens.contract.methods.addAllowedToken(this.token.address).encodeABI();
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
            let data = this.allowTokens.contract.methods.addAllowedToken(this.token.address).encodeABI();
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
            let maxTokens = await this.allowTokens.getMaxTokensAllowed();

            let data = this.allowTokens.contract.methods.setMaxTokensAllowed(web3.utils.toWei('1000')).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, false);

            let maxTokensAfter = await this.allowTokens.getMaxTokensAllowed();
            assert.equal(maxTokensAfter.toString(), maxTokens.toString());
        });

        it('should set max tokens', async function() {
            let newMax = web3.utils.toWei('1000');
            let data = this.allowTokens.contract.methods.setMaxTokensAllowed(newMax).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            let maxTokensAfter = await this.allowTokens.getMaxTokensAllowed();
            assert.equal(maxTokensAfter.toString(), newMax);
        });

        it('should set min tokens', async function() {
            let newMin = web3.utils.toWei('10');
            let data = this.allowTokens.contract.methods.setMinTokensAllowed(newMin).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            let maxTokensAfter = await this.allowTokens.getMinTokensAllowed();
            assert.equal(maxTokensAfter.toString(), newMin.toString());
        });

        it('should change daily limit', async function() {
            let newDailyLimit = web3.utils.toWei('50000');
            let data = this.allowTokens.contract.methods.changeDailyLimit(newDailyLimit).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            let dailyLimit = await this.allowTokens.dailyLimit();
            assert.equal(dailyLimit.toString(), newDailyLimit.toString());
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
