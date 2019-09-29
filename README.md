# RSK Decentralized Token Bridge POC

Proof of concept Ethereum/RSK Decentralized Token Bridge.


## Transfer flows

### Mainchain to Sidechain

To transfer Tokens from the Mainchain to the Sidechain first an account must approve the transfers of tokens to the Bridge, and then call receiveTokens on the Bridge, to send the Tokens. The Bridge acts only as a Token Custodian, it holds the received tokens and emits a Cross token event that batches the tokens transfers. The Submitter (a group of off-chain scripts) listens for the events emitted by the Bridge and gives the information to the EventProcessor in the other network. 

The side chain EventProcessor verifies the block POW, tx Receipt, Merkle proof for the tx Receipt, MMR root for the block, and Merkle Proof for the MMR root. If everything is ok it calls the Bridge to release the Sidechain Tokens.

The Sidechain Bridge dinamically allocates (create / mint / burn) Mirror Tokens to release the transferred amount of Mirror Tokens to the specified source account. The source account from the Mainchain could be the same as the destination account on the Sidechain or it can be mapped in the Mainchain Bridge to a different account.

To avoid undeserible side-effects due to a Blockchain reorganization the EventsProcessor only process transfer events that have enough confirmations (K confirmation blocks).

![Mainchain to Sidechain transfer flow](./docs/images/mainchain_to_sidechain_high_level.jpg?raw=true "Mainchain to Sidechain transfer")

### Sidechain to Mainchain

When an account from the Sidechain wants to transfer Mirror Tokens back to the Mainchain, it transfers them to the Sidechain Bridge. Similar to the Mainchain to Sidechain transfer, the Bridge emits events that are listened by the Submitter (it might be the same group as the ones in the Mainchain, but this is not mandatory). 

The Mainchain EventsProcessor veryfies everything is ok and it instructs the Mainchain Bridge to release the transferred amount of Tokens to the specified Mainchain account. As in the previous case, the source account from the Sidechain could be the same as the destination account of the Mainchain or it can be mapped in the Sidechain Bridge to a different account.

![Sidechain to Mainchain transfer flow](./docs/images/sidechain_to_mainchain_high_level.jpg?raw=true "Sidechain to Mainchain transfer")

### Simplified sequence diagram
![Simplified sequence diagram](./docs/images/simplified_decentralized_bridge_sequence.jpg?raw=true "Simplified sequence diagram")

## Components

The Token Bridge works between RSK and Ethereum. The original ERC20 Token Contract is deployed on the Mainchain and it does not require any modifications (it might pre-exists to the deployment of the RSK Token Bridge).

Two additional contracts are deployed on the Mainchain:
* The MMR Contract: Keeps track of the MMR root and emits an event with it.
* The Bridge Contract: Acts as a Token Custodian of the Tokens on the Mainchain, creates the Cross Tokens Event. It receives Tokens from the Mainchain and holds them until the EventsProcessor instructs it to release them.

On the Sidechain seven contracts are deployed:
* The EventsProcessor Contract: Verifies the information from Manchain and controls the release of Mirror Tokens from the Sidechain to the Mainchain.
* The BlockRecorder Contract: Verifies the Block and store its hash and the asociated Tx Receipt Root.
* The MMRProver Contract: Verifies the MMR root and MMR Proof are valid.
* The ReceiptProver Contract: Verifies the Tx Receipt given and Merkle Proof hash up to the Tx Receipt root of a block.
* The RskPow/EthPow Contract: Verifies the block Proof of Work.
* The Bridge Contract: Verifies the Cross tokens event and releases the transfered tokens from the mainchain, also acts as a Token Custodian of the Mirror Tokens on the Sidechain.

Finally, a set of off-chain scripts known as the Submitter listens for transfer events emitted by the Bridge. This set of scripts can be seen as a group of Oracles and its main purpose is to inform the events between both chains.

Note: To make it work both ways you'll need all of the contracts deployed in both networks.

![Components Diagram](./docs/images/components_diagram.jpg?raw=true "Components Diagram")

## References
- [FlyClient: Super-Light Clients for Cryptocurrencies](https://eprint.iacr.org/2019/226.pdf)
- [Mimblewimble Grin](https://github.com/mimblewimble/grin/blob/master/doc/mmr.md)
- [The Tari Project](https://docs.rs/merklemountainrange/0.0.1/src/merklemountainrange/lib.rs.html#23-183)
- [Retrofitting a two-way peg between blockchains](https://people.cs.uchicago.edu/~teutsch/papers/dogethereum.pdf)
- [Sentinel Bridge RSK](https://github.com/InfoCorp-Technologies/sentinel-bridge-rsk)
- [Parity Bridge](https://github.com/paritytech/parity-bridge)
- [Blockchain Interoperability — The Aion Transwarp Conduit (TWC)](https://blog.aion.network/blockchain-interoperability-the-aion-transwarp-conduit-twc-4f6ac2e79cec)
- [Transwarp-Conduit: Interoperable Blockchain Application Framework](https://aion.network/media/TWC_Paper_Final.pdf)
- [UI for TokenBridge, an interoperability solution between Ethereum networks for native and ERC tokens](https://github.com/poanetwork/bridge-ui)
- [DAI Bridge POA Network](https://dai-bridge.poa.network/)
- [POA Network partners with MakerDAO on xDai Chain, the first ever USD-Stable Blockchain](https://medium.com/poa-network/poa-network-partners-with-makerdao-on-xdai-chain-the-first-ever-usd-stable-blockchain-65a078c41e6a)
- [How BancorX Works: From Ethereum to EOS and Back Again](https://blog.bancor.network/how-bancorx-works-from-ethereum-to-eos-and-back-again-649336ea1c4)
- [How do Relay Tokens work?](https://support.bancor.network/hc/en-us/articles/360000471472-How-do-Relay-Tokens-work-)
- [XCLAIM: Trustless, Interoperable, Cryptocurrency-Backed Assets](https://eprint.iacr.org/2018/643.pdf)

