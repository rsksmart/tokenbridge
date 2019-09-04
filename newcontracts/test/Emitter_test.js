
const Emitter = artifacts.require('./Emitter.sol');

contract('Emitter', function (accounts) {
    beforeEach(async function () {
        this.emitter = await Emitter.new();
    });
    
    it('Emit cross events', async function () {
        await this.emitter.emitCrossEvents(
            [ accounts[0], accounts[1], accounts[2] ],
            [ accounts[3], accounts[4], accounts[5] ],
            [ 1000, 2000, 3000 ]
        );
    });
    
    it('Emit token events', async function () {
        await this.emitter.emitTokenEvents(
            [ accounts[0], accounts[1], accounts[2] ],
            [ "TOK1", "TOK2", "TOK3" ]
        );
    });
});

