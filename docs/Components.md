
# Components

The Token Bridge works between RSK and Ethereum. The original ERC20 Token Contract is deployed on the Mainchain and it does not require any modifications (it might pre-exists to the deployment of the RSK Token Bridge).

Two additional contracts are deployed on the Mainchain:
* The MMR Contract: Keeps track of the MMR root and emits an event with it.
* The Bridge Contract: Acts as a Token Custodian of the Tokens on the Mainchain, creates the Cross Tokens Event. It receives Tokens from the Mainchain and holds them until the EventsProcessor instructs it to release them.

On the Sidechain seven contracts are deployed:
* The EventsProcessor Contract: Verifies the information from Mainchain and controls the release of Mirror Tokens from the Sidechain to the Mainchain.
* The BlockRecorder Contract: Verifies the Block and store its hash and the asociated Tx Receipt Root.
* The MMRProver Contract: Verifies the MMR root and MMR Proof are valid.
* The ReceiptProver Contract: Verifies the Tx Receipt given and Merkle Proof hash up to the Tx Receipt root of a block.
* The RskPow/EthPow Contract: Verifies the block Proof of Work.
* The Bridge Contract: Verifies the Cross tokens event and releases the transfered tokens from the Mainchain, also acts as a Token Custodian of the Mirror Tokens on the Sidechain.

Finally, a set of off-chain scripts known as the Submitter listens for transfer events emitted by the Bridge. This set of scripts can be seen as a group of Oracles and its main purpose is to inform the events between both chains.

Note: To make it work both ways you'll need all of the contracts deployed in both networks.

![Components Diagram](./images/components_diagram.jpg?raw=true "Components Diagram")

See the ["token bridge flow"](./Flow.md) for a better understanding on how it's used