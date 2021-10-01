
const MainToken = artifacts.require('./MainToken');
const AllowTokens = artifacts.require('./AllowTokens');
const MultiSigWallet = artifacts.require('./MultiSigWallet');

const utils = require('./utils');
const chains = require('../hardhat/helper/chains');
const BN = web3.utils.BN;
const toWei = web3.utils.toWei;

contract('AllowTokens', async function (accounts) {
    const tokenDeployer= accounts[0];
    const manager = accounts[1];
    const anotherAccount = accounts[2];
    const anotherOwner = accounts[3];

    before(async function () {
        await utils.saveState();
    });

    after(async function () {
        await utils.revertState();
    });

    describe('AllowTokens creation', async () => {
        it('should initialize correctly', async () => {
            const smallConfirmations = '100';
            const mediumConfirmations = '200';
            const largeConfirmations = '300';
            const typesInfo = [
                { description: 'BTC', limits: {
                    min:toWei('0.001'),
                    max:toWei('25'),
                    daily:toWei('100'),
                    mediumAmount:toWei('0.1'),
                    largeAmount:toWei('1') }
                },
                { description: 'ETH', limits: {
                    min:toWei('0.01'),
                    max:toWei('750'),
                    daily:toWei('3000'),
                    mediumAmount:toWei('3'),
                    largeAmount:toWei('30') }
                }
            ];
            const allowTokens = await AllowTokens.new();
            await allowTokens.methods['initialize(address,address,uint256,uint256,uint256,(string,(uint256,uint256,uint256,uint256,uint256))[])'](
                manager,
                anotherOwner,
                smallConfirmations,
                mediumConfirmations,
                largeConfirmations,
                typesInfo
            );
            assert.equal(manager, await allowTokens.owner());
            assert.equal(anotherOwner, await allowTokens.primary());
            assert.equal(smallConfirmations, await allowTokens.smallAmountConfirmations());
            assert.equal(mediumConfirmations, await allowTokens.mediumAmountConfirmations());
            assert.equal(largeConfirmations, await allowTokens.largeAmountConfirmations());
            const confirmations = await allowTokens.getConfirmations();
            assert.equal(smallConfirmations, confirmations.smallAmount.toString());
            assert.equal(mediumConfirmations, confirmations.mediumAmount.toString());
            assert.equal(largeConfirmations, confirmations.largeAmount.toString());
            const typeDescriptionLength = await allowTokens.getTypeDescriptionsLength();
            assert.equal(typesInfo.length.toString(), typeDescriptionLength.toString());
            const typeDescriptions = await allowTokens.getTypeDescriptions();
            assert.equal(typeDescriptions.length, typesInfo.length);
            for(let i = 0; i < typeDescriptions.length; i++) {
                assert.equal(typeDescriptions[i], typesInfo[i].description);
            }
            const typesLimits = await allowTokens.getTypesLimits();
            assert.equal(typesLimits.length, typesInfo.length);
            for(let i = 0; i < typesLimits.length; i++) {
                let limits = await allowTokens.typeLimits(i.toString());
                assert.equal(typesLimits[i].min, limits.min.toString());
                assert.equal(typesLimits[i].max, limits.max.toString());
                assert.equal(typesLimits[i].mediumAmount, limits.mediumAmount.toString());
                assert.equal(typesLimits[i].largeAmount, limits.largeAmount.toString());
            }
        });
    });

    describe('After AllowTokens initialization', () => {
        beforeEach(async function () {
                this.token = await MainToken.new("MAIN", "MAIN", 18, 10000, { from: tokenDeployer });
                this.allowTokens = await AllowTokens.new();
                await this.allowTokens.methods['initialize(address,address,uint256,uint256,uint256,(string,(uint256,uint256,uint256,uint256,uint256))[])'](
                    manager,
                    tokenDeployer,
                    '10',
                    '20',
                    '30',
                    []
                );
                this.typeId = 0;
            });

        describe('Tokens whitelist', async function () {
            it('should have correct version', async function () {
                let version = await this.allowTokens.version();
                assert.equal(version, 'v2');
            });

            it('fails isTokenAllowed if null address provided', async function() {
                await utils.expectThrow(this.allowTokens.isTokenAllowed(utils.NULL_ADDRESS));
            })


            it('add token type', async function() {
                assert.equal('0', (await this.allowTokens.getTypeDescriptionsLength()).toString());
                await this.allowTokens.addTokenType('RIF', { max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3') }, { from: manager });
                assert.equal('1', (await this.allowTokens.getTypeDescriptionsLength()).toString());
                assert.equal('RIF', (await this.allowTokens.typeDescriptions('0')));
            });

            it('fail if add token type is empty', async function() {
                assert.equal('0', (await this.allowTokens.getTypeDescriptionsLength()).toString());
                utils.expectThrow(this.allowTokens.addTokenType('', { max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3') }, { from: manager }));
                assert.equal('0', (await this.allowTokens.getTypeDescriptionsLength()).toString());
            });

            it('fail if over 250 token type', async function() {
                for(var i = 0; i < 250; i++) {
                    await this.allowTokens.addTokenType('RIF', { max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3') }, { from: manager });
                }
                assert.equal('250', (await this.allowTokens.getTypeDescriptionsLength()).toString());
                utils.expectThrow(this.allowTokens.addTokenType('250TH', { max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3') }, { from: manager }));
            });

            it('validates whitelisted token', async function() {
                await this.allowTokens.addTokenType('RIF', { max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3') }, { from: manager });
                let typeId = 0;
                //Use owner to set the token
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, typeId, { from: manager });
                let isAllowed = await this.allowTokens.isTokenAllowed(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(isAllowed, true);
                let otherToken = await MainToken.new("OTHER", "OTHER", 18, 10000, { from: tokenDeployer });
                //use primary to set token
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, otherToken.address, typeId, { from: tokenDeployer });
                isAllowed = await this.allowTokens.isTokenAllowed(chains.HARDHAT_TEST_NET_CHAIN_ID, otherToken.address);
                assert.equal(isAllowed, true);
            });

            it('should add multiple tokens', async function() {
                await this.allowTokens.addTokenType('RIF', { max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3') }, { from: manager });
                let typeId = 0;
                let otherToken = await MainToken.new("OTHER", "OTHER", 18, 10000, { from: tokenDeployer });
                await this.allowTokens.setMultipleTokens(chains.HARDHAT_TEST_NET_CHAIN_ID,
                [
                    { token:this.token.address, typeId: typeId },
                    { token: otherToken.address, typeId: typeId }
                ], { from: manager });
                let isAllowed = await this.allowTokens.isTokenAllowed(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(isAllowed, true);
                isAllowed = await this.allowTokens.isTokenAllowed(chains.HARDHAT_TEST_NET_CHAIN_ID, otherToken.address);
                assert.equal(isAllowed, true);
            });

            it('fail if setToken caller is not the owner', async function() {
                const previousIsTokenAllowed = await this.allowTokens.isTokenAllowed(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                await this.allowTokens.addTokenType('RIF', { max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3') }, { from: manager });
                let typeId = 0;
                await utils.expectThrow(this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, typeId, { from: anotherOwner }));

                const isTokenAllowed = await this.allowTokens.isTokenAllowed(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(isTokenAllowed, previousIsTokenAllowed);
            });

            it('fail if setToken address is empty', async function() {
                await this.allowTokens.addTokenType('RIF', { max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3') }, { from: manager });
                let typeId = 0;
                await utils.expectThrow(this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, utils.NULL_ADDRESS, typeId, { from: manager }));
            });

            it('fail if setToken typeid does not exist', async function() {
                await this.allowTokens.addTokenType('RIF', { max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3') }, { from: manager });
                let typeId = '2';
                await utils.expectThrow(this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, typeId, { from: manager }));
            });

            it('setToken type even if address was already added', async function() {
                let result = await this.allowTokens.getInfoAndLimits(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(result.info.typeId.toString(), '0');
                assert.equal(result.info.allowed, false);

                await this.allowTokens.addTokenType('RIF', { max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3') }, { from: manager });
                let typeId = 0;
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, typeId, { from: manager });
                result = await this.allowTokens.getInfoAndLimits(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(result.info.typeId.toString(), typeId.toString());
                assert.equal(result.info.allowed, true);

                await this.allowTokens.addTokenType('DOC', { max:toWei('20000'), min:toWei('2'), daily:toWei('200000'), mediumAmount:toWei('3'), largeAmount:toWei('10')}, { from: manager });
                typeId = 1;
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, typeId, { from: manager });
                result = await this.allowTokens.getInfoAndLimits(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(result.info.typeId.toString(), typeId.toString());
                assert.equal(result.info.allowed, true);
            });

            it('removes allowed token', async function() {
                await this.allowTokens.addTokenType('RIF', { max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3') }, { from: manager });
                let typeId = 0;
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, typeId, { from: manager });
                let isAllowed = await this.allowTokens.isTokenAllowed(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(isAllowed, true);

                await this.allowTokens.removeAllowedToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, { from: manager });
                isAllowed = await this.allowTokens.isTokenAllowed(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(isAllowed, false);
            });

            it('fail if removeAllowedToken caller is not the owner', async function() {
                await this.allowTokens.addTokenType('RIF', { max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3') }, { from: manager });
                let typeId = 0;
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, typeId, { from: manager });
                const previousIsTokenAllowed = await this.allowTokens.isTokenAllowed(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                await utils.expectThrow(this.allowTokens.removeAllowedToken(this.token.address, { from: tokenDeployer }));

                const isTokenAllowed = await this.allowTokens.isTokenAllowed(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(isTokenAllowed, previousIsTokenAllowed);
            });

            it('fail if removeAllowedToken address is not in the whitelist', async function() {
                await utils.expectThrow(this.allowTokens.removeAllowedToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, { from: manager }));
            });


        });

        describe('Limits of tokens allowed', async function() {
            beforeEach(async function () {
                await this.allowTokens.addTokenType('RIF', { max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3') }, { from: manager });
            });

            it('should set initial values', async function() {
                let limits = await this.allowTokens.typeLimits(this.typeId);
                assert.equal(limits.max.toString(), web3.utils.toWei('10000'));
                assert.equal(limits.min.toString(), web3.utils.toWei('1'));
                assert.equal(limits.daily.toString(), web3.utils.toWei('100000'));
            });

            it ('sets new limits for tokens', async function() {
                const newMaxTokens = web3.utils.toWei('50000');
                const newMinTokens = web3.utils.toWei('10');
                const newDailyLimit = web3.utils.toWei('50000');

                await this.allowTokens.setTypeLimits(this.typeId, {max: newMaxTokens, min:newMinTokens, daily:newDailyLimit, mediumAmount:toWei('100'), largeAmount:toWei('1000')}, { from: manager });
                let limits = await this.allowTokens.typeLimits(this.typeId);

                assert.equal(limits.max.toString(), newMaxTokens.toString());
                assert.equal(limits.min.toString(), newMinTokens.toString());
                assert.equal(limits.daily.toString(), newDailyLimit.toString());
            });

            it('fail if not the owner', async function() {
                const newMaxTokens = web3.utils.toWei('50000');
                const newMinTokens = web3.utils.toWei('10');
                const newDailyLimit = web3.utils.toWei('50000');

                let previousLimits = await this.allowTokens.typeLimits(this.typeId);
                await utils.expectThrow(this.allowTokens.setTypeLimits(this.typeId, {max: newMaxTokens, min:newMinTokens, daily:newDailyLimit, mediumAmount:toWei('100'), largeAmount:toWei('1000')}, { from: tokenDeployer }));

                let limits = await this.allowTokens.typeLimits(this.typeId);
                assert.equal(limits.max.toString(), previousLimits.max.toString());
                assert.equal(limits.min.toString(), previousLimits.min.toString());
                assert.equal(limits.daily.toString(), previousLimits.daily.toString());
            });

            it('fail if max is smaller than min', async function() {
                const newMaxTokens = web3.utils.toWei('9');
                const newMinTokens = web3.utils.toWei('10');
                const newDailyLimit = web3.utils.toWei('50000');
                const mediumAmount = web3.utils.toWei('11');
                const largeAmount = web3.utils.toWei('12');
                await utils.expectThrow(this.allowTokens.setTypeLimits(this.typeId, {max: newMaxTokens, min:newMinTokens, daily:newDailyLimit, mediumAmount:mediumAmount, largeAmount:largeAmount}, { from: manager }));
            });

            it('fail daily limit smaller than max', async function() {
                const newMaxTokens = web3.utils.toWei('100');
                const newMinTokens = web3.utils.toWei('10');
                const newDailyLimit = web3.utils.toWei('99');
                const mediumAmount = web3.utils.toWei('11');
                const largeAmount = web3.utils.toWei('12');
                await utils.expectThrow(this.allowTokens.setTypeLimits(this.typeId, {max: newMaxTokens, min:newMinTokens, daily:newDailyLimit, mediumAmount:mediumAmount, largeAmount:largeAmount}, { from: manager }));
            });

            it('fail if typeId bigger than max', async function() {
                const typeId = Number(await this.allowTokens.getTypeDescriptionsLength())+1;
                const newMaxTokens = web3.utils.toWei('50');
                const newMinTokens = web3.utils.toWei('10');
                const newDailyLimit = web3.utils.toWei('300');
                const mediumAmount = web3.utils.toWei('11');
                const largeAmount = web3.utils.toWei('12');
                await utils.expectThrow(this.allowTokens.setTypeLimits(typeId.toString(), {max: newMaxTokens, min:newMinTokens, daily:newDailyLimit, mediumAmount:mediumAmount, largeAmount:largeAmount}, { from: manager }));
            });

            it('fail medium amount smaller than min limit', async function() {
                const newMaxTokens = web3.utils.toWei('100');
                const newMinTokens = web3.utils.toWei('10');
                const newDailyLimit = web3.utils.toWei('1000');
                const mediumAmount = web3.utils.toWei('10');
                const largeAmount = web3.utils.toWei('12');
                await utils.expectThrow(this.allowTokens.setTypeLimits(this.typeId, {max: newMaxTokens, min:newMinTokens, daily:newDailyLimit, mediumAmount:mediumAmount, largeAmount:largeAmount}, { from: manager }));
            });

            it('fail large amount smaller than medium amount', async function() {
                const newMaxTokens = web3.utils.toWei('100');
                const newMinTokens = web3.utils.toWei('10');
                const newDailyLimit = web3.utils.toWei('1000');
                const mediumAmount = web3.utils.toWei('11');
                const largeAmount = web3.utils.toWei('11');
                await utils.expectThrow(this.allowTokens.setTypeLimits(this.typeId, {max: newMaxTokens, min:newMinTokens, daily:newDailyLimit, mediumAmount:mediumAmount, largeAmount:largeAmount}, { from: manager }));
            });

            it('calcMaxWithdraw', async function() {
                const newMaxTokens = web3.utils.toWei('10000');
                const newMinTokens = web3.utils.toWei('1');
                const newDailyLimit = web3.utils.toWei('12000');
                const mediumAmount = web3.utils.toWei('2');
                const largeAmount = web3.utils.toWei('3');

                await this.allowTokens.setTypeLimits(this.typeId, {max: newMaxTokens, min:newMinTokens, daily:newDailyLimit, mediumAmount:mediumAmount, largeAmount:largeAmount}, { from: manager });
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, this.typeId, { from: manager });

                let maxWithdraw = await this.allowTokens.calcMaxWithdraw(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(maxWithdraw, newMaxTokens);

                await this.allowTokens.updateTokenTransfer(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, newMaxTokens);
                maxWithdraw = await this.allowTokens.calcMaxWithdraw(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                let expected = web3.utils.toWei('2000');
                assert.equal(maxWithdraw.toString(), expected);

                await this.allowTokens.updateTokenTransfer(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, expected);
                maxWithdraw = await this.allowTokens.calcMaxWithdraw(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(maxWithdraw.toString(), '0');
            });
        });


        describe('updateTokenTransfer', async function() {

            it('should check max value', async function() {
                let maxLimit = toWei('10000');
                await this.allowTokens.addTokenType('RIF', { max:maxLimit, min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3')}, { from: manager });
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, this.typeId, { from: manager });

                await this.allowTokens.updateTokenTransfer(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, maxLimit);

                await utils.expectThrow(this.allowTokens.updateTokenTransfer(this.token.address, new BN(maxLimit).add(new BN('1'))));
            });

            it('should check min value', async function() {
                let minLimit = toWei('1');
                await this.allowTokens.addTokenType('RIF', {max:toWei('10000'), min:minLimit, daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3')}, { from: manager });
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, this.typeId, { from: manager });

                await this.allowTokens.updateTokenTransfer(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, minLimit);

                await utils.expectThrow(this.allowTokens.updateTokenTransfer(this.token.address, new BN(minLimit).sub(new BN('1'))));
            });

            it('should check daily limit', async function() {
                let minLimit = toWei('1');
                let dailyLimit = toWei('1');
                await this.allowTokens.addTokenType('RIF', { max:toWei('1'), min:minLimit, daily:dailyLimit, mediumAmount:toWei('2'), largeAmount:toWei('3')}, { from: manager });
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, this.typeId, { from: manager });

                await this.allowTokens.updateTokenTransfer(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, minLimit);

                await utils.expectThrow(this.allowTokens.updateTokenTransfer(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, minLimit, dailyLimit));
            });

            it('should allow side and whitelisted tokens', async function() {
                let maxLimit = toWei('10000');
                await this.allowTokens.addTokenType('RIF', {max:maxLimit, min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3')}, { from: manager });
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, this.typeId, { from: manager });

                await this.allowTokens.updateTokenTransfer(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, maxLimit);
            });

            it('should check allowed token if not side or allowed token', async function() {
                let maxTokensAllowed = toWei('10000');
                //Token not allowed
                await utils.expectThrow(this.allowTokens.updateTokenTransfer(this.token.address, maxTokensAllowed));

                await this.allowTokens.addTokenType('RIF', {max:maxTokensAllowed, min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3')}, { from: manager });
                await this.allowTokens.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, this.typeId, { from: manager });

                await this.allowTokens.updateTokenTransfer(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, maxTokensAllowed);
            });

        });

        describe('Set Confirmations', async function() {

            it('should set confirmations', async function() {
                let newSmallAmountConfirmations = '15';
                let newMediumAmountConfirmations = '23';
                let newLargeAmountConfirmations = '150';
                await this.allowTokens.setConfirmations(newSmallAmountConfirmations, newMediumAmountConfirmations, newLargeAmountConfirmations, { from: manager });
                assert.equal(newSmallAmountConfirmations, (await this.allowTokens.smallAmountConfirmations()).toString());
                assert.equal(newMediumAmountConfirmations, (await this.allowTokens.mediumAmountConfirmations()).toString());
                assert.equal(newLargeAmountConfirmations, (await this.allowTokens.largeAmountConfirmations()).toString());

                newSmallAmountConfirmations = '0';
                newMediumAmountConfirmations = '0';
                newLargeAmountConfirmations = '0';
                await this.allowTokens.setConfirmations(newSmallAmountConfirmations, newMediumAmountConfirmations, newLargeAmountConfirmations, { from: manager });
                assert.equal(newSmallAmountConfirmations, (await this.allowTokens.smallAmountConfirmations()).toString());
                assert.equal(newMediumAmountConfirmations, (await this.allowTokens.mediumAmountConfirmations()).toString());
                assert.equal(newLargeAmountConfirmations, (await this.allowTokens.largeAmountConfirmations()).toString());

                newSmallAmountConfirmations = '10';
                newMediumAmountConfirmations = '10';
                newLargeAmountConfirmations = '100';
                await this.allowTokens.setConfirmations(newSmallAmountConfirmations, newMediumAmountConfirmations, newLargeAmountConfirmations, { from: manager });
                assert.equal(newSmallAmountConfirmations, (await this.allowTokens.smallAmountConfirmations()).toString());
                assert.equal(newMediumAmountConfirmations, (await this.allowTokens.mediumAmountConfirmations()).toString());
                assert.equal(newLargeAmountConfirmations, (await this.allowTokens.largeAmountConfirmations()).toString());

                newSmallAmountConfirmations = '10';
                newMediumAmountConfirmations = '100';
                newLargeAmountConfirmations = '100';
                await this.allowTokens.setConfirmations(newSmallAmountConfirmations, newMediumAmountConfirmations, newLargeAmountConfirmations, { from: manager });
                assert.equal(newSmallAmountConfirmations, (await this.allowTokens.smallAmountConfirmations()).toString());
                assert.equal(newMediumAmountConfirmations, (await this.allowTokens.mediumAmountConfirmations()).toString());
                assert.equal(newLargeAmountConfirmations, (await this.allowTokens.largeAmountConfirmations()).toString());

                newSmallAmountConfirmations = '100';
                newMediumAmountConfirmations = '100';
                newLargeAmountConfirmations = '1000';
                await this.allowTokens.setConfirmations(newSmallAmountConfirmations, newMediumAmountConfirmations, newLargeAmountConfirmations, { from: manager });
                assert.equal(newSmallAmountConfirmations, (await this.allowTokens.smallAmountConfirmations()).toString());
                assert.equal(newMediumAmountConfirmations, (await this.allowTokens.mediumAmountConfirmations()).toString());
                assert.equal(newLargeAmountConfirmations, (await this.allowTokens.largeAmountConfirmations()).toString());
            });

            it('should fail to set small amount confirmations bigger than medium', async function() {
                const newSmallAmountConfirmations = '30';
                const newMediumAmountConfirmations = '10';
                const newLargeAmountConfirmations = '50';
                await utils.expectThrow(this.allowTokens.setConfirmations(newSmallAmountConfirmations, newMediumAmountConfirmations, newLargeAmountConfirmations, { from: manager }));
            });

            it('should fail to set medium amount confirmations bigger than large', async function() {
                const newSmallAmountConfirmations = '30';
                const newMediumAmountConfirmations = '50';
                const newLargeAmountConfirmations = '40';
                await utils.expectThrow(this.allowTokens.setConfirmations(newSmallAmountConfirmations, newMediumAmountConfirmations, newLargeAmountConfirmations, { from: manager }));
            });

        });

        describe('Ownable methods', async function() {

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

        describe('Secondary methods', async function() {

            it('Should not allowed when not called by primary', async function() {
                let maxTokensAllowed = toWei('10000');
                await utils.expectThrow(this.allowTokens.updateTokenTransfer(this.token.address, maxTokensAllowed, {from: anotherAccount}));
            });

            it('Should not transfer primary when not called by the owner', async function() {
                let owner = await this.allowTokens.primary();
                await utils.expectThrow(this.allowTokens.transferPrimary(anotherOwner, {from: anotherAccount}));
                let ownerAfter = await this.allowTokens.primary();

                assert.equal(owner, ownerAfter);
            });

            it('Should transfer primary', async function() {
                await this.allowTokens.transferPrimary(anotherOwner);
                let primary = await this.allowTokens.primary();
                assert.equal(primary, anotherOwner);
                let owner = await this.allowTokens.owner();
                assert.notEqual(owner, primary);
            });
        })

        describe('Calls from MultiSig', async function() {
            const multiSigOnwerA = accounts[2];
            const multiSigOnwerB = accounts[3];

            beforeEach(async function () {
                this.multiSig = await MultiSigWallet.new([multiSigOnwerA, multiSigOnwerB], 2);
                this.allowTokens = await AllowTokens.new();
                await this.allowTokens.methods['initialize(address,address,uint256,uint256,uint256,(string,(uint256,uint256,uint256,uint256,uint256))[])'](
                    this.multiSig.address,
                    tokenDeployer,
                    '0',
                    '0' ,
                    '0',
                    []
                );
                let data = this.allowTokens.contract.methods.addTokenType('RIF', {max:toWei('10000'), min:toWei('1'), daily:toWei('100000'), mediumAmount:toWei('2'), largeAmount:toWei('3')}).encodeABI();
                await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
                this.txIndex = 0
                await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });
            });

            it('should fail to add a new allowed token due to missing signatures', async function() {
                let data = this.allowTokens.contract.methods.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, this.typeId).encodeABI();
                await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
                this.txIndex++;
                let tx = await this.multiSig.transactions(this.txIndex);
                assert.equal(tx.executed, false);

                let isAllowed = await this.allowTokens.isTokenAllowed(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(isAllowed, false);
            });

            it('should add a new allowed token', async function() {
                let data = this.allowTokens.contract.methods.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, this.typeId).encodeABI();

                await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
                this.txIndex++;
                await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

                let isAllowed = await this.allowTokens.isTokenAllowed(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(isAllowed, true);
            });

            it('should fail to remove an allowed token due to missing signatures', async function() {
                let data = this.allowTokens.contract.methods.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, this.typeId).encodeABI();
                await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
                this.txIndex++;
                await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });
                let tx = await this.multiSig.transactions(this.txIndex);
                assert.equal(tx.executed, true);

                data = this.allowTokens.contract.methods.removeAllowedToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address).encodeABI();
                await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
                this.txIndex++;
                tx = await this.multiSig.transactions(this.txIndex);
                assert.equal(tx.executed, false);

                isAllowed = await this.allowTokens.isTokenAllowed(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(isAllowed, true);
            });

            it('should remove an allowed token', async function() {
                let data = this.allowTokens.contract.methods.setToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address, this.typeId).encodeABI();
                await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
                this.txIndex++;
                await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

                data = this.allowTokens.contract.methods.removeAllowedToken(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address).encodeABI();
                await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
                this.txIndex++;
                await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

                let tx = await this.multiSig.transactions(this.txIndex);
                assert.equal(tx.executed, true);

                isAllowed = await this.allowTokens.isTokenAllowed(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(isAllowed, false);
            });

            it('should fail to set max tokens due to missing signatures', async function() {
                let result = await this.allowTokens.getInfoAndLimits(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                let limit = result.limit;
                let maxTokens = limit.max.toString();
                let newMax = web3.utils.toWei('1000');

                let data = this.allowTokens.contract.methods.setTypeLimits(result.info.typeId.toString(), {max:newMax, min:limit.min.toString(), daily:limit.daily.toString(), mediumAmount:toWei('2'), largeAmount:toWei('3')}).encodeABI();
                await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
                this.txIndex++;

                let tx = await this.multiSig.transactions(this.txIndex);
                assert.equal(tx.executed, false);

                result = await this.allowTokens.getInfoAndLimits(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                let maxTokensAfter = result.limit.max;
                assert.equal(maxTokensAfter.toString(), maxTokens);
            });

            it('should set max tokens', async function() {
                let newMax = web3.utils.toWei('1000');
                let result = await this.allowTokens.getInfoAndLimits(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                let limit = result.limit;
                let data = this.allowTokens.contract.methods.setTypeLimits(result.info.typeId.toString(), {max:newMax, min:limit.min.toString(), daily:limit.daily.toString(), mediumAmount:toWei('2'), largeAmount:toWei('3')}).encodeABI();
                await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
                this.txIndex++;
                await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

                let tx = await this.multiSig.transactions(this.txIndex);
                assert.equal(tx.executed, true);

                result = await this.allowTokens.getInfoAndLimits(chains.HARDHAT_TEST_NET_CHAIN_ID, this.token.address);
                assert.equal(result.limit.max.toString(), newMax);
            });

            it('should set min tokens', async function() {
                let limit = await this.allowTokens.typeLimits(this.typeId);
                let newMin = web3.utils.toWei('10');
                let data = this.allowTokens.contract.methods.setTypeLimits(this.typeId, {max:limit.max.toString(), min:newMin.toString(), daily:limit.daily.toString(), mediumAmount:toWei('100'), largeAmount:toWei('1000')}).encodeABI();
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
                let data = this.allowTokens.contract.methods.setTypeLimits(this.typeId, {max:limit.max.toString(), min:limit.min.toString(), daily:newDailyLimit, mediumAmount:toWei('2'), largeAmount:toWei('3')}).encodeABI();
                await this.multiSig.submitTransaction(this.allowTokens.address, 0, data, { from: multiSigOnwerA });
                this.txIndex++;
                await this.multiSig.confirmTransaction(this.txIndex, { from: multiSigOnwerB });

                let tx = await this.multiSig.transactions(this.txIndex);
                assert.equal(tx.executed, true);

                limit = await this.allowTokens.typeLimits(this.typeId);
                assert.equal(limit.daily.toString(), newDailyLimit);
            });
        });
    });
});
