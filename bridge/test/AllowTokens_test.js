
const MainToken = artifacts.require('./MainToken');
const AllowTokens = artifacts.require('./AllowTokens_v1');
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
        this.typeId = 0;
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

        it('add token type', async function() {
            await this.allowTokens.addTokenType('RIF', toWei('10000'), toWei('1'), toWei('100000'), { from: manager });
        });

        it('validates whitelisted token', async function() {
            let isValidatingAllowedTokens = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidatingAllowedTokens, true);
            await this.allowTokens.addTokenType('RIF', toWei('10000'), toWei('1'), toWei('100000'), { from: manager });
            let typeId = 0;
            await this.allowTokens.setToken(this.token.address, typeId, { from: manager });
            let isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, true);
        });

        it('fail if setToken caller is not the owner', async function() {
            let previousIsTokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            await this.allowTokens.addTokenType('RIF', toWei('10000'), toWei('1'), toWei('100000'), { from: manager });
            let typeId = 0;
            await utils.expectThrow(this.allowTokens.setToken(this.token.address, typeId, { from: tokenDeployer }));

            let isTokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isTokenAllowed, previousIsTokenAllowed);
        });

        it('fail if setToken address is empty', async function() {
            await this.allowTokens.addTokenType('RIF', toWei('10000'), toWei('1'), toWei('100000'), { from: manager });
            let typeId = 0;
            await utils.expectThrow(this.allowTokens.setToken('0x', typeId, { from: manager }));
        });

        it('setToken type even if address was already added', async function() {
            let result = await this.allowTokens.getInfoAndLimits(this.token.address);
            assert.equal(result.info.typeId.toString(), '0');
            assert.equal(result.info.allowed, false);

            await this.allowTokens.addTokenType('RIF', toWei('10000'), toWei('1'), toWei('100000'), { from: manager });
            let typeId = 0;
            await this.allowTokens.setToken(this.token.address, typeId, { from: manager });
            result = await this.allowTokens.getInfoAndLimits(this.token.address);
            assert.equal(result.info.typeId.toString(), typeId.toString());
            assert.equal(result.info.allowed, true);

            await this.allowTokens.addTokenType('DOC', toWei('20000'), toWei('2'), toWei('200000'), { from: manager });
            typeId = 1;
            await this.allowTokens.setToken(this.token.address, typeId, { from: manager });
            result = await this.allowTokens.getInfoAndLimits(this.token.address);
            assert.equal(result.info.typeId.toString(), typeId.toString());
            assert.equal(result.info.allowed, true);
        });

        it('removes allowed token', async function() {
            let isValidatingAllowedTokens = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidatingAllowedTokens, true);
            await this.allowTokens.addTokenType('RIF', toWei('10000'), toWei('1'), toWei('100000'), { from: manager });
            let typeId = 0;
            await this.allowTokens.setToken(this.token.address, typeId, { from: manager });
            let isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, true);

            await this.allowTokens.removeAllowedToken(this.token.address, { from: manager });
            isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, false);
        });

        it('fail if removeAllowedToken caller is not the owner', async function() {
            await this.allowTokens.addTokenType('RIF', toWei('10000'), toWei('1'), toWei('100000'), { from: manager });
            let typeId = 0;
            await this.allowTokens.setToken(this.token.address, typeId, { from: manager });
            let previousIsTokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            await utils.expectThrow(this.allowTokens.removeAllowedToken(this.token.address, { from: tokenDeployer }));

            let isTokenAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isTokenAllowed, previousIsTokenAllowed);
        });

        it('fail if removeAllowedToken address is not in the whitelist', async function() {
            await utils.expectThrow(this.allowTokens.removeAllowedToken(this.token.address, { from: manager }));
        });


    });

    describe('Limits of tokens allowed', async function() {
        beforeEach(async function () {
            await this.allowTokens.addTokenType('RIF', toWei('10000'), toWei('1'), toWei('100000'), { from: manager });
        });

        it('should set initial values', async function() {
            let limits = await this.allowTokens.typeLimits(this.typeId);
            assert.equal(limits.max.toString(), web3.utils.toWei('10000'));
            assert.equal(limits.min.toString(), web3.utils.toWei('1'));
            assert.equal(limits.daily.toString(), web3.utils.toWei('100000'));
        });

        it ('sets new limits for tokens', async function() {
            let newMaxTokens = web3.utils.toWei('50000');
            let newMinTokens = web3.utils.toWei('10');
            let newDailyLimit = web3.utils.toWei('50000');

            await this.allowTokens.setTypeLimits(this.typeId, newMaxTokens, newMinTokens, newDailyLimit, { from: manager });
            let limits = await this.allowTokens.typeLimits(this.typeId);

            assert.equal(limits.max.toString(), newMaxTokens.toString());
            assert.equal(limits.min.toString(), newMinTokens.toString());
            assert.equal(limits.daily.toString(), newDailyLimit.toString());
        });

        it('fail if not the owner', async function() {
            let newMaxTokens = web3.utils.toWei('50000');
            let newMinTokens = web3.utils.toWei('10');
            let newDailyLimit = web3.utils.toWei('50000');

            let previousLimits = await this.allowTokens.typeLimits(this.typeId);
            await utils.expectThrow(this.allowTokens.setTypeLimits(this.typeId, newMaxTokens, newMinTokens, newDailyLimit, { from: tokenDeployer }));

            let limits = await this.allowTokens.typeLimits(this.typeId);
            assert.equal(limits.max.toString(), previousLimits.max.toString());
            assert.equal(limits.min.toString(), previousLimits.min.toString());
            assert.equal(limits.daily.toString(), previousLimits.daily.toString());
        });

        it('fail if max is smaller than min', async function() {
            let newMaxTokens = web3.utils.toWei('9');
            let newMinTokens = web3.utils.toWei('10');
            let newDailyLimit = web3.utils.toWei('50000');

            await utils.expectThrow(this.allowTokens.setTypeLimits(this.typeId, newMaxTokens, newMinTokens, newDailyLimit, { from: manager }));
        });

        it ('fail daily limit smaller than max', async function() {
            let newMaxTokens = web3.utils.toWei('100');
            let newMinTokens = web3.utils.toWei('10');
            let newDailyLimit = web3.utils.toWei('99');

            await utils.expectThrow(this.allowTokens.setTypeLimits(this.typeId, newMaxTokens, newMinTokens, newDailyLimit, { from: manager }));
        });

        it('calcMaxWithdraw', async function() {
            let newMaxTokens = web3.utils.toWei('10000');
            let newMinTokens = web3.utils.toWei('1');
            let newDailyLimit = web3.utils.toWei('12000');

            await this.allowTokens.setTypeLimits(this.typeId, newMaxTokens, newMinTokens, newDailyLimit, { from: manager });
            await this.allowTokens.setToken(this.token.address, this.typeId, { from: manager });

            let maxWithdraw = await this.allowTokens.calcMaxWithdraw(this.token.address);
            assert.equal(maxWithdraw, newMaxTokens);

            await this.allowTokens.updateTokenTransfer(this.token.address, newMaxTokens, false);
            maxWithdraw = await this.allowTokens.calcMaxWithdraw(this.token.address);
            let expected = web3.utils.toWei('2000');
            assert.equal(maxWithdraw.toString(), expected);

            await this.allowTokens.updateTokenTransfer(this.token.address, expected, false);
            maxWithdraw = await this.allowTokens.calcMaxWithdraw(this.token.address);
            assert.equal(maxWithdraw.toString(), '0');
        });
    });


    describe('updateTokenTransfer', async function() {

        it('should check max value', async function() {
            let maxLimit = toWei('10000');
            await this.allowTokens.addTokenType('RIF', maxLimit, toWei('1'), toWei('100000'), { from: manager });
            await this.allowTokens.setToken(this.token.address, this.typeId, { from: manager });

            await this.allowTokens.updateTokenTransfer(this.token.address, maxLimit, true);

            await utils.expectThrow(this.allowTokens.updateTokenTransfer(this.token.address, new BN(maxLimit).add(new BN('1')), true));
        });

        it('should check min value', async function() {
            let minLimit = toWei('1');
            await this.allowTokens.addTokenType('RIF', toWei('10000'), minLimit, toWei('100000'), { from: manager });
            await this.allowTokens.setToken(this.token.address, this.typeId, { from: manager });

            await this.allowTokens.updateTokenTransfer(this.token.address, minLimit, true);

            await utils.expectThrow(this.allowTokens.updateTokenTransfer(this.token.address, new BN(minLimit).sub(new BN('1')), true));
        });

        it('should check daily limit', async function() {
            let minLimit = toWei('1');
            let dailyLimit = toWei('1');
            await this.allowTokens.addTokenType('RIF', toWei('1'), minLimit, dailyLimit, { from: manager });
            await this.allowTokens.setToken(this.token.address, this.typeId, { from: manager });

            await this.allowTokens.updateTokenTransfer(this.token.address, minLimit, true);

            await utils.expectThrow(this.allowTokens.updateTokenTransfer(this.token.address, minLimit, dailyLimit, true));
        });

        it('should allow side and whitelisted tokens', async function() {
            let maxLimit = toWei('10000');
            await this.allowTokens.addTokenType('RIF', maxLimit, toWei('1'), toWei('100000'), { from: manager });
            await this.allowTokens.setToken(this.token.address, this.typeId, { from: manager });

            await this.allowTokens.updateTokenTransfer(this.token.address, maxLimit, true);

            await this.allowTokens.disableAllowedTokensValidation({ from: manager });
            await this.allowTokens.updateTokenTransfer(this.token.address, maxLimit, false);

            await this.allowTokens.enableAllowedTokensValidation({ from: manager });
            await this.allowTokens.setToken(this.token.address, this.typeId, { from: manager });
            await this.allowTokens.updateTokenTransfer(this.token.address, maxLimit, false);
        });

        it('should check allowed token if not side or allowed token', async function() {
            let maxTokensAllowed = toWei('10000');
            //Token not allowed
            await utils.expectThrow(this.allowTokens.updateTokenTransfer(this.token.address, maxTokensAllowed, false));

            // await this.allowTokens.addTokenType('RIF', maxTokensAllowed, toWei('1'), toWei('100000'), { from: manager });
            // //Token without limits set
            // await utils.expectThrow(this.allowTokens.updateTokenTransfer(this.token.address, maxTokensAllowed, false));

            //await this.allowTokens.setToken(this.token.address, this.typeId, { from: manager });
            await this.allowTokens.disableAllowedTokensValidation({ from: manager });
            await this.allowTokens.updateTokenTransfer(this.token.address, maxTokensAllowed, false);

            await this.allowTokens.enableAllowedTokensValidation({ from: manager });
            await this.allowTokens.addTokenType('RIF', maxTokensAllowed, toWei('1'), toWei('100000'), { from: manager });
            await this.allowTokens.setToken(this.token.address, this.typeId, { from: manager });

            await this.allowTokens.updateTokenTransfer(this.token.address, maxTokensAllowed, true);
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

    describe('Calls from MultiSig', async function() {
        const multiSigOnwerA = accounts[2];
        const multiSigOnwerB = accounts[3];

        beforeEach(async function () {
            this.multiSig = await MultiSigWallet.new([multiSigOnwerA, multiSigOnwerB], 2);
            this.allowTokens = await AllowTokens.new(this.multiSig.address);
            let data = this.allowTokens.contract.methods.addTokenType('RIF', toWei('10000'), toWei('1'), toWei('100000')).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex = 0
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });
        });

        it('should fail to add a new allowed token due to missing signatures', async function() {
            let data = this.allowTokens.contract.methods.setToken(this.token.address, this.typeId).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            let tx = await this.multiSig.transactions(this.txIndex);
            assert.equal(tx.executed, false);

            let isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, false);
        });

        it('should add a new allowed token', async function() {
            let data = this.allowTokens.contract.methods.setToken(this.token.address, this.typeId).encodeABI();

            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            let isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, true);
        });

        it('should fail to remove an allowed token due to missing signatures', async function() {
            let data = this.allowTokens.contract.methods.setToken(this.token.address, this.typeId).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });
            let tx = await this.multiSig.transactions(this.txIndex);
            assert.equal(tx.executed, true);

            data = this.allowTokens.contract.methods.removeAllowedToken(this.token.address).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            tx = await this.multiSig.transactions(this.txIndex);
            assert.equal(tx.executed, false);

            isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, true);
        });

        it('should remove an allowed token', async function() {
            let data = this.allowTokens.contract.methods.setToken(this.token.address, this.typeId).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            data = this.allowTokens.contract.methods.removeAllowedToken(this.token.address).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(this.txIndex);
            assert.equal(tx.executed, true);

            isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, false);
        });

        it('should fail to disable tokens validation due to missing signatures', async function() {
            let data = this.allowTokens.contract.methods.disableAllowedTokensValidation().encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;

            let tx = await this.multiSig.transactions(this.txIndex);
            assert.equal(tx.executed, false);

            let isValidating = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidating, true);
        });

        it('should disable tokens validation', async function() {
            let data = this.allowTokens.contract.methods.disableAllowedTokensValidation().encodeABI();

            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            let isValidating = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidating, false);
        });

        it('should fail to enable tokens validation due to missing signatures', async function() {
            let data = this.allowTokens.contract.methods.disableAllowedTokensValidation().encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            let isValidating = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidating, false);

            data = this.allowTokens.contract.methods.enableAllowedTokensValidation().encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;

            let tx = await this.multiSig.transactions(this.txIndex);
            assert.equal(tx.executed, false);

            isValidating = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidating, false);
        });

        it('should enable tokens validation', async function() {
            let data = this.allowTokens.contract.methods.disableAllowedTokensValidation().encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            let isValidating = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidating, false);

            data = this.allowTokens.contract.methods.enableAllowedTokensValidation().encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(this.txIndex);
            assert.equal(tx.executed, true);

            isValidating = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidating, true);
        });

        it('should fail to set max tokens due to missing signatures', async function() {
            let result = await this.allowTokens.getInfoAndLimits(this.token.address);
            let limit = result.limit;
            let maxTokens = limit.max.toString();
            let newMax = web3.utils.toWei('1000');

            let data = this.allowTokens.contract.methods.setTypeLimits(result.info.typeId.toString(), newMax, limit.min.toString(), limit.daily.toString()).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;

            let tx = await this.multiSig.transactions(this.txIndex);
            assert.equal(tx.executed, false);

            result = await this.allowTokens.getInfoAndLimits(this.token.address);
            let maxTokensAfter = result.limit.max;
            assert.equal(maxTokensAfter.toString(), maxTokens);
        });

        it('should set max tokens', async function() {
            let newMax = web3.utils.toWei('1000');
            let result = await this.allowTokens.getInfoAndLimits(this.token.address);
            let limit = result.limit;
            let data = this.allowTokens.contract.methods.setTypeLimits(result.info.typeId.toString(), newMax, limit.min.toString(), limit.daily.toString()).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(this.txIndex);
            assert.equal(tx.executed, true);

            result = await this.allowTokens.getInfoAndLimits(this.token.address);
            assert.equal(result.limit.max.toString(), newMax);
        });

        it('should set min tokens', async function() {
            let limit = await this.allowTokens.typeLimits(this.typeId);
            let newMin = web3.utils.toWei('10');
            let data = this.allowTokens.contract.methods.setTypeLimits(this.typeId, limit.max.toString(), newMin.toString(), limit.daily.toString()).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(this.txIndex);
            assert.equal(tx.executed, true);

            limit = await this.allowTokens.typeLimits(this.typeId);
            assert.equal(limit.min.toString(), newMin.toString());
        });

        it('should change daily limit', async function() {
            let limit = await this.allowTokens.typeLimits(this.typeId);
            let newDailyLimit = web3.utils.toWei('50000');
            console.log('newDailyLimit',newDailyLimit);
            let data = this.allowTokens.contract.methods.setTypeLimits(this.typeId, limit.max.toString(), limit.min.toString(), newDailyLimit).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            this.txIndex++;
            await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(this.txIndex);
            assert.equal(tx.executed, true);

            limit = await this.allowTokens.typeLimits(this.typeId);
            console.log('limit.daily',limit.daily.toString());
            assert.equal(limit.daily.toString(), newDailyLimit);
        });
    });
});
