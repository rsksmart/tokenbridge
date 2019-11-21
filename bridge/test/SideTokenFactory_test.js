const SideTokenFactory = artifacts.require('./SideTokenFactory');
const utils = require('./utils');

const expectThrow = require('./utils').expectThrow;

contract('SideTokenFactory', async function (accounts) {
    const anAccount = accounts[1];

    beforeEach(async function () {
        this.sideTokenFactory = await SideTokenFactory.new();
    });

    it('creates a new side token with correct parameters', async function () {
        let receipt = await this.sideTokenFactory.createSideToken("SIDE", "SIDE");
        utils.checkRcpt(receipt);

        receipt = await this.sideTokenFactory.createSideToken("OTHERSYMBOL", "OTHERSYMBOL");
        utils.checkRcpt(receipt);
    });

    it('fails to create a new side token due to wrong parameters', async function() {
        await expectThrow(this.sideTokenFactory.createSideToken());
        await expectThrow(this.sideTokenFactory.createSideToken("SIDE", 1));
    });

    it('fails to create a new side token due to wrong owner', async function() {
        await expectThrow(this.sideTokenFactory.createSideToken("SIDE", "SIDE", { from: anAccount }));
    });

});

