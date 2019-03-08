<<<<<<< HEAD
# Token Bridge

Ethereum/RSK Token Bridge

=======
# RSK Token Bridge
Ethereum/RSK Token Bridge

## Components

The Token Bridge works between two Ethereum compatible Blockchain networks (from now on Mainchain and Sidechain). The original ERC20 Token Contract is deployed on the Mainchain and it does not require any modifications (it might pre-exists to the deployment of the RSK Token Bridge).

Two additional contracts are deployed on the Mainchain:
* The Bridge Contract: acts as a Token Custodian of the Tokens on the Mainchain. It receives Tokens from the Mainchain and holds them until the Manager instructs it to release them.
* The Manager Contract: controls the release of Tokens from the Mainchain to the Sidechain.

On the Sidechain three contracts are deployed:
* The Manager Contract: controls the release of Mirror Tokens from the Sidechain to the Mainchain.
* The Bridge Contract: acts as a Token Custodian of the Mirror Tokens on the Sidechain. It receives Mirror Tokens from the Sidechan and holds them until the Manager instructs it to release them.
* The Mirror Token Contract: a representation of the Mainchain token on the Sidecain. This Token is also an ERC20 Token, so it can be managed and used by the Token ecosystem as any other ERC20 Token.

## Transfer flows

### Mainchain to Sidechain

To transfer Tokens from the Mainchain to the Sidechain an account transfers Tokens to the Bridge. Since ERC20 Tokens emit transfer events there is no need for the Bridge to also emit such events. The Federation (a group of Oracles implemented as off-chain scripts) listens for the events emitted by the Tokens when the Bridge receives the transfer. 

For each transfer event that each Mainchain Federator listens it casts a vote to the Sidechain Manager to release the same amount of Mirror Tokens on the Sidechain. In this way the Bridge acts only as a Token Custodian, it holds the received tokens. The release of the Tokens is controlled by the Manager.

The Sidechain Bridge has a preallocated amount of Mirror Tokens (similar to how the RSK Bridge works). Eventually we will include the required logic to dinamically allocate (mint / burn) Mirror Tokens.

When the Sidechain Manager has enough votes (N-out-of-M) for the Mainchain transfer it instructs the Sidechain Bridge to release the transferred amount of Mirror Tokens to the specified source account. The source account from the Mainchain could be the same as the destination account on the Sidechain or it can be mapped in the Mainchain Bridge to a different account.

To avoid undeserible side-effects due to a Blockchain reorganization the Federators only process transfer events that have enough confirmations (K confirmation blocks).

### Sidechain to Mainchain

When an account from the Sidechain wants to transfer Mirror Tokens back to the Mainchain, it transfers them to the Sidechain Bridge. Similar to the Mainchain to Sidechain transfer, the Mirror Tokens emit events that are listened by the Federation (it might be the same group of Oracles as the ones in the Mainchain, but this is not mandatory). 

The Federation casts votes to the Mainchain Manager and when the Mainchain Manager has enough votes (N-out-of-M) it instructs the Mainchain Bridge to release the transferred amount of Tokens to the specified Mainchain account. As in the previous case, the source account from the Sidechain could be the same as the destination account of the Mainchain or it can be mapped in the Sidechain Bridge to a different account.

At the moment, the RSK Token Bridge is implemented as a Symmetric Bridge. Alternatives to this implementation are being evaluated.

>>>>>>> 5f07362cc40f426e8ddfebd9938e2cb52c6d499b
## References

- [Retrofitting a two-way peg between blockchains](https://people.cs.uchicago.edu/~teutsch/papers/dogethereum.pdf)
- [Sentinel Bridge RSK](https://github.com/InfoCorp-Technologies/sentinel-bridge-rsk)
- [Parity Bridge](https://github.com/paritytech/parity-bridge)
- [Blockchain Interoperability — The Aion Transwarp Conduit (TWC)](https://blog.aion.network/blockchain-interoperability-the-aion-transwarp-conduit-twc-4f6ac2e79cec)
- [Transwarp-Conduit: Interoperable Blockchain Application Framework](https://aion.network/media/TWC_Paper_Final.pdf)
