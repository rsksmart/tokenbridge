# Components

The Token Bridge works between RSK and Ethereum using a set of Federators to exchange transactions between the networks. The original ERC20 Token Contract is deployed on the Mainchain (or the source network) and it does not require any modifications (it might pre-exists to the deployment of the RSK Token Bridge).

Two additional contracts are deployed on each side:
* The Bridge Contract: Acts as a Token Custodian of the Tokens on the Mainchain, creates the Cross Tokens Event. It receives Tokens from the Mainchain and holds them until the MultiSig contract instructs it to release them.
* The MultiSig Wallet Contract: Primarly used by the Sidechain but necessary on both sides to allow two way transfers. The signers should be associated to the federators. Once necessary votes are obtained, Bridge Contract is invoked to release the funds on Sidechain.

Finally, a set of off-chain scripts known as the Federator listens for transfer events emitted by the Bridge. This set of scripts can be seen as a group of Oracles and its main purpose is to inform the events between both chains by voting against the MultiSig contract.

Note: To make it work both ways you'll need all contracts deployed in both networks.