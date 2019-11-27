
const MainToken = artifacts.require('./MainToken');
const AllowTokens = artifacts.require('./AllowTokens');
const MultiSigWallet = artifacts.require('./MultiSigWallet');

contract('AllowTokens', async function (accounts) {
    const tokenOwner = accounts[0];
    const manager = accounts[1];

    beforeEach(async function () {
        this.token = await MainToken.new("MAIN", "MAIN", 18, 10000, { from: tokenOwner });
        this.allowTokens = await AllowTokens.new(manager);
    });

    describe('Tokens whitelist', async function () {

        it('should validate allowed tokens with initial values', async function () {
            let isValidatingAllowedTokens = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidatingAllowedTokens, true);
        });

        it('enables tokens whitelist validation', async function() {
            await this.allowTokens.enableAllowedTokensValidation({ from: manager });
            let isValidatingAllowedTokens = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidatingAllowedTokens, true);
        });

        it('disables tokens whitelist validation', async function() {
            await this.allowTokens.enableAllowedTokensValidation({ from: manager });
            let isValidatingAllowedTokens = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidatingAllowedTokens, true);

            await this.allowTokens.disableAllowedTokensValidation({ from: manager });
            isValidatingAllowedTokens = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidatingAllowedTokens, false);
        });

        it('validates whitelisted token', async function() {
            await this.allowTokens.enableAllowedTokensValidation({ from: manager });
            let isValidatingAllowedTokens = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidatingAllowedTokens, true);

            await this.allowTokens.addAllowedToken(this.token.address, { from: manager });
            let isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, true);
        });

        it('removes allowed token', async function() {
            await this.allowTokens.enableAllowedTokensValidation({ from: manager });
            let isValidatingAllowedTokens = await this.allowTokens.isValidatingAllowedTokens();
            assert.equal(isValidatingAllowedTokens, true);

            await this.allowTokens.addAllowedToken(this.token.address, { from: manager });
            let isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, true);

            await this.allowTokens.removeAllowedToken(this.token.address, { from: manager });
            isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, false);
        });
    });

    describe('Max tokens allowed', async function() {

        it('should set initial values', async function() {
            let maxTokens = await this.allowTokens.getMaxTokensAllowed();
            assert.equal(maxTokens, 10000000000000000000000); // 10000 ether in wei
        });

        it ('sets a new amount of max tokens', async function() {
            let newMaxTokens = 50000;
            await this.allowTokens.setMaxTokensAllowed(newMaxTokens, { from: manager });

            let maxTokens = await this.allowTokens.getMaxTokensAllowed();
            assert.equal(maxTokens, newMaxTokens);
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

            let data = this.allowTokens.contract.methods.setMaxTokensAllowed(1000).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, false);

            let maxTokensAfter = await this.allowTokens.getMaxTokensAllowed();
            assert.equal(BigInt(maxTokensAfter), BigInt(maxTokens));
        });

        it('should set max tokens', async function() {
            let data = this.allowTokens.contract.methods.setMaxTokensAllowed(1000).encodeABI();
            await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
            await this.multiSig.confirmTransaction(0, { from: multiSigOnwerB });

            let tx = await this.multiSig.transactions(0);
            assert.equal(tx.executed, true);

            let maxTokensAfter = await this.allowTokens.getMaxTokensAllowed();
            assert.equal(BigInt(maxTokensAfter), BigInt(1000));
        });
    });
});
