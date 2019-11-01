const MultiSigWallet = artifacts.require('./MultiSigWallet');

const expectThrow = require('./utils').expectThrow;

contract('MultiSigWallet', async (accounts) => {
    const multiSigOwner = accounts[0];
    const additionalOwner = accounts[1];
    const anotherAccount = accounts[2];
    const sampleTx = {
        destination: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        value: 0,
        data: '0x29ee8e450000000000000000000000007ba156fe5471185cb3eec2de9c058412c452bb4c000000000000000000000000cd2a3d9f938e13cd947ec05abc7fe734df8dd8260000000000000000000000000000000000000000000000000000002e90edd00000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000005654d41494e000000000000000000000000000000000000000000000000000000'
    };

    beforeEach(async () => {
        this.multiSig = await MultiSigWallet.new([multiSigOwner], 1);
        assert.ok(this.multiSig);
    });

    describe('initial state', async () => {
        it('set the correct values', async () => {
            const owners = await this.multiSig.getOwners();
            assert.equal(owners.length, 1);
            assert.equal(owners[0], multiSigOwner);

            const required = await this.multiSig.required();
            assert.equal(required, 1);
        });

        it('throws error with invalid parameters', async () => {
            expectThrow(MultiSigWallet.new([], 1));
            expectThrow(MultiSigWallet.new([additionalOwner], 0));
        });
    })

    describe('add owner', async () => {
        it('adds a new owner successfully', async () => {
            let txData = this.multiSig.contract.methods.addOwner(additionalOwner).encodeABI();
            await this.multiSig.submitTransaction(this.multiSig.address, 0, txData);

            let isOwner = await this.multiSig.isOwner(additionalOwner)
            assert.equal(isOwner, true);

            const owners = await this.multiSig.getOwners();
            assert.equal(owners.length, 2);
        });

        it('throws error with invalid parameters', async () => {
            expectThrow(this.multiSig.addOwner());
            expectThrow(this.multiSig.addOwner(multiSigOwner));
        });
    })

    describe('remove owner', async () => {
        it('removes an owner successfully', async () => {
            let txData = this.multiSig.contract.methods.addOwner(additionalOwner).encodeABI();
            await this.multiSig.submitTransaction(this.multiSig.address, 0, txData);

            let isOwner = await this.multiSig.isOwner(additionalOwner)
            assert.equal(isOwner, true);

            txData = this.multiSig.contract.methods.removeOwner(additionalOwner).encodeABI();
            await this.multiSig.submitTransaction(this.multiSig.address, 0, txData);

            isOwner = await this.multiSig.isOwner(additionalOwner)
            assert.equal(isOwner, false);

            const owners = await this.multiSig.getOwners();
            assert.equal(owners.length, 1);
        });

        it('throws error with invalid parameters', async () => {
            expectThrow(this.multiSig.removeOwner());
            expectThrow(this.multiSig.removeOwner(anotherAccount));
        });
    })

    describe('replace owner', async () => {
        it('replaces an owner successfully', async () => {
            let txData = this.multiSig.contract.methods.addOwner(additionalOwner).encodeABI();
            await this.multiSig.submitTransaction(this.multiSig.address, 0, txData);

            txData = this.multiSig.contract.methods.replaceOwner(additionalOwner, anotherAccount).encodeABI();
            await this.multiSig.submitTransaction(this.multiSig.address, 0, txData);

            let isOwner = await this.multiSig.isOwner(additionalOwner)
            assert.equal(isOwner, false);

            isOwner = await this.multiSig.isOwner(anotherAccount)
            assert.equal(isOwner, true);

            const owners = await this.multiSig.getOwners();
            assert.equal(owners.length, 2);
        });

        it('throws error with invalid parameters', async () => {
            expectThrow(this.multiSig.replaceOwner());
            expectThrow(this.multiSig.replaceOwner(additionalOwner, additionalOwner));
        });
    })

    describe('change requirement', async () => {
        it('changes the required signers successfully', async () => {
            let txData = this.multiSig.contract.methods.addOwner(additionalOwner).encodeABI();
            await this.multiSig.submitTransaction(this.multiSig.address, 0, txData);

            txData = this.multiSig.contract.methods.changeRequirement(2).encodeABI();
            await this.multiSig.submitTransaction(this.multiSig.address, 0, txData);

            const required = await this.multiSig.required();
            assert.equal(required, 2);
        });

        it('throws error with invalid parameters', async () => {
            expectThrow(this.multiSig.changeRequirement());
            expectThrow(this.multiSig.changeRequirement(3));
        });
    })

    describe('submit transaction', async () => {
        it('submits a new transaction successfully', async () => {
            await this.multiSig.submitTransaction(sampleTx.destination, sampleTx.value, sampleTx.data);

            const transactionCount = await this.multiSig.transactionCount.call();
            assert.equal(transactionCount, BigInt(1));

            const tx = await this.multiSig.transactions(0);
            assert.equal(tx.destination, sampleTx.destination);
            assert.equal(tx.value, sampleTx.value);
            assert.equal(tx.data, sampleTx.data);
            assert.equal(tx.executed, true);
        });

        it('throws error with invalid parameters', async () => {
            expectThrow(this.multiSig.submitTransaction());
            expectThrow(this.multiSig.submitTransaction(sampleTx.destination, sampleTx.value));
        });
    })

    describe('confirm transaction', async () => {
        it('confirms a transaction successfully', async () => {
            let txData = this.multiSig.contract.methods.addOwner(additionalOwner).encodeABI();
            await this.multiSig.submitTransaction(this.multiSig.address, 0, txData);

            txData = this.multiSig.contract.methods.changeRequirement(2).encodeABI();
            await this.multiSig.submitTransaction(this.multiSig.address, 0, txData);

            await this.multiSig.submitTransaction(sampleTx.destination, sampleTx.value, sampleTx.data);
            let isConfirmed = await this.multiSig.confirmations(0, additionalOwner);
            assert.equal(isConfirmed, false);

            await this.multiSig.confirmTransaction(2, { from: additionalOwner });

            isConfirmed = await this.multiSig.confirmations(2, additionalOwner);
            assert.equal(isConfirmed, true);
        });

        it('throws error with invalid parameters', async () => {
            expectThrow(this.multiSig.confirmTransaction());
            expectThrow(this.multiSig.confirmTransaction(1));
        });
    })

    describe('revoke confirmation', async () => {
        it('revokes a confirmation successfully', async () => {
            let txData = this.multiSig.contract.methods.addOwner(additionalOwner).encodeABI();
            await this.multiSig.submitTransaction(this.multiSig.address, 0, txData);

            txData = this.multiSig.contract.methods.addOwner(anotherAccount).encodeABI();
            await this.multiSig.submitTransaction(this.multiSig.address, 0, txData);

            txData = this.multiSig.contract.methods.changeRequirement(3).encodeABI();
            await this.multiSig.submitTransaction(this.multiSig.address, 0, txData);

            await this.multiSig.submitTransaction(sampleTx.destination, sampleTx.value, sampleTx.data);
            await this.multiSig.confirmTransaction(3, { from: additionalOwner });

            let isConfirmed = await this.multiSig.confirmations(3, additionalOwner);
            assert.equal(isConfirmed, true);

            await this.multiSig.revokeConfirmation(3, { from: additionalOwner });
            isConfirmed = await this.multiSig.confirmations(3, additionalOwner);
            assert.equal(isConfirmed, false);
        });

        it('throws error with invalid parameters', async () => {
            expectThrow(this.multiSig.revokeConfirmation());
            expectThrow(this.multiSig.revokeConfirmation(1));
        });
    })

    describe('is confirmed', async () => {
        it('checks if transaction is confirmed successfully', async () => {
            let txData = this.multiSig.contract.methods.addOwner(additionalOwner).encodeABI();
            await this.multiSig.submitTransaction(this.multiSig.address, 0, txData);

            txData = this.multiSig.contract.methods.changeRequirement(2).encodeABI();
            await this.multiSig.submitTransaction(this.multiSig.address, 0, txData);

            await this.multiSig.submitTransaction(sampleTx.destination, sampleTx.value, sampleTx.data);
            let isConfirmed = await this.multiSig.isConfirmed(2);
            assert.equal(isConfirmed, false);

            await this.multiSig.confirmTransaction(2, { from: additionalOwner });

            isConfirmed = await this.multiSig.isConfirmed(2);
            assert.equal(isConfirmed, true);
        });
    })

    describe('get confirmation count', async () => {
        it('checks confirmation count successfully', async () => {
            await this.multiSig.submitTransaction(sampleTx.destination, sampleTx.value, sampleTx.data);
            let count = await this.multiSig.getConfirmationCount(0);
            assert.equal(count, 1);
        });
    })

    describe('get transaction count', async () => {
        it('checks transaction count successfully', async () => {
            await this.multiSig.submitTransaction(sampleTx.destination, sampleTx.value, sampleTx.data);
            let count = await this.multiSig.getTransactionCount(false, true);
            assert.equal(count, 1);

            count = await this.multiSig.getTransactionCount(true, false);
            assert.equal(count, 0);
        });
    })

    describe('get confirmations', async () => {
        it('get transaction confirmations successfully', async () => {
            await this.multiSig.submitTransaction(sampleTx.destination, sampleTx.value, sampleTx.data);
            let confirmations = await this.multiSig.getConfirmations(0);
            assert.equal(confirmations.length, 1);
            assert.equal(confirmations[0], multiSigOwner);
        });
    })

    describe('get transaction ids', async () => {
        it('get transaction ids successfully', async () => {
            await this.multiSig.submitTransaction(sampleTx.destination, sampleTx.value, sampleTx.data);
            let ids = await this.multiSig.getTransactionIds(0, 1, false, true);
            assert.equal(ids.length, 1);
        });
    })

});

