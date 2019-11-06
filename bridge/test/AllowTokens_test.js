const MainToken = artifacts.require('./MainToken');
const AllowTokens = artifacts.require('./AllowTokens');

contract('Bridge', async function (accounts) {
    const tokenOwner = accounts[0];
    const manager = accounts[1];

    beforeEach(async function () {
        this.token = await MainToken.new("MAIN", "MAIN", 18, 10000, { from: tokenOwner });
        this.allowTokens = await AllowTokens.new(manager);
    });

    describe('Tokens whitelist', async function () {

        it('should allow tokens transfer with initial values', async function () {
            let validateAllowedTokens = await this.allowTokens.validateAllowedTokens();
            assert.equal(validateAllowedTokens, false);
        });

        it('enables tokens whitelist validation', async function() {
            await this.allowTokens.enableAllowedTokensValidation({ from: manager });
            let validateAllowedTokens = await this.allowTokens.validateAllowedTokens();
            assert.equal(validateAllowedTokens, true);
        });

        it('disables tokens whitelist validation', async function() {
            await this.allowTokens.enableAllowedTokensValidation({ from: manager });
            let validateAllowedTokens = await this.allowTokens.validateAllowedTokens();
            assert.equal(validateAllowedTokens, true);

            await this.allowTokens.disableAllowedTokensValidation({ from: manager });
            validateAllowedTokens = await this.allowTokens.validateAllowedTokens();
            assert.equal(validateAllowedTokens, false);
        });

        it('validates whitelisted token', async function() {
            await this.allowTokens.enableAllowedTokensValidation({ from: manager });
            let validateAllowedTokens = await this.allowTokens.validateAllowedTokens();
            assert.equal(validateAllowedTokens, true);

            await this.allowTokens.addAllowedToken(this.token.address, { from: manager });
            let isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, true);
        });

        it('removes allowed token', async function() {
            await this.allowTokens.enableAllowedTokensValidation({ from: manager });
            let validateAllowedTokens = await this.allowTokens.validateAllowedTokens();
            assert.equal(validateAllowedTokens, true);

            await this.allowTokens.addAllowedToken(this.token.address, { from: manager });
            let isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, true);

            await this.allowTokens.removeAllowedToken(this.token.address, { from: manager });
            isAllowed = await this.allowTokens.isTokenAllowed(this.token.address);
            assert.equal(isAllowed, false);
        });
    });
});
