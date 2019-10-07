# Flow

## Mainchain to Sidechain

To transfer Tokens from the Mainchain to the Sidechain first an account must approve the transfers of tokens to the Bridge, and then call `receiveTokens` on the Bridge, to send the Tokens. The Bridge acts only as a Token Custodian, it holds the received tokens and emits a Cross token event that batches the tokens transfers. The Submitter (a group of off-chain scripts) listens for the events emitted by the Bridge and gives the information to the EventProcessor in the other network.

The Sidechain EventProcessor verifies the block POW, tx Receipt, Merkle proof for the tx Receipt, MMR root for the block, and Merkle Proof for the MMR root. If everything is ok it calls the Bridge to release the Sidechain Tokens.

The Sidechain Bridge dinamically allocates (create / mint / burn) Mirror Tokens to release the transferred amount of Mirror Tokens to the specified source account. The source account from the Mainchain could be the same as the destination account on the Sidechain or it can be mapped in the Mainchain Bridge to a different account.

To avoid undesirable side-effects due to a Blockchain reorganization the EventsProcessor only process transfer events that have enough confirmations (K confirmation blocks).

![Mainchain to Sidechain transfer flow](./images/mainchain_to_sidechain_high_level.jpg?raw=true "Mainchain to Sidechain transfer")




## Simplified sequence diagram
![Simplified sequence diagram](./images/simplified_decentralized_bridge_sequence.jpg?raw=true "Simplified sequence diagram")

See a ["real example"](./RealExample.md) for a testnet example of the steps described above

## Sidechain to Mainchain

When an account from the Sidechain wants to transfer Mirror Tokens back to the Mainchain, it transfers them to the Sidechain Bridge. Similar to the Mainchain to Sidechain transfer, the Bridge emits events that are listened by the Submitter (it might be the same group as the ones in the Mainchain, but this is not mandatory).

The Mainchain EventsProcessor veryfies everything is ok and instructs the Mainchain Bridge to release the transferred amount of Tokens to the specified Mainchain account. As in the previous case, the source account from the Sidechain could be the same as the destination account of the Mainchain or it can be mapped in the Sidechain Bridge to a different account.

![Sidechain to Mainchain transfer flow](./images/sidechain_to_mainchain_high_level.jpg?raw=true "Sidechain to Mainchain transfer")