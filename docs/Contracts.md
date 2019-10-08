# Main Contracts

These contracts are deployed on both chains (the `BlockRecorder` current implementation
only process RSK block headers; the process of Ethereum block headers is not implemented
yet).

## Bridge

It receives and locks tokens, using its method `receiveTokens`. This method
get the tokens from the token contract using `safeTransferFrom` so the user should
have approved the transfer before invoking the `Bridge` method.

The other responsability of this contract is to release tokens, under the
control of the `EventsProcessor` contract. This contract, described below,
only apply the events emitted by the other blockchain that were validated.

The `Cross` event describes the original transfer. The `Token` event has
the information of a token that should be created because it is the first
time that is used in the chain as a mirror of the original token in the other chain.

## BlockRecorder

It keeps the block data (number, difficulty, transaction receipts root, Merkle Mountain Range (MMR) validation)
by block hash. This info is obtained in two ways:

- The hash, number, difficult and receipts root are extracted from a block header
that is sent to the `recordBlock` method. The header is parsed in its RLP components. Its
Proof of Work (PoW) is validated, using the RSK algorithm based on Bitcoin merge
mining.

- The Merkle Mountain Range (MMR) validation is informed by a helper contract `MMRProver`, specialized
in validating the information provided, described below. Currently, only the validation
is asserted, based on the presence of the block in many MMR subtrees on a blockchain. The
block MMR is not supplied.

To do: Implement the same functionality for Ethereum block headers, validating
their Proof of Work (PoW) using ETHash.

## MMRProver

Its responsability is to validate the presence of a block in a blockchain. To do
the validation, a proof of existence of the supplied block in a blockchain is provided,
based on the partial proof of its inclusion in the tree of MMRs of an advanced
block. Not only this proof is provided, but also many other proofs to validate
that previous blocks also are included in the blockchain that ends in the advanced block.

Given a block hash and number, and the MMR of an advanced block, the contract calculates
the block numbers to be proved as included in the blockchain.

When all the block proofs are provided and validated, the initial block is considered
included in the blockchain. The result is sent to `BlockRecorder` contract. Only the
blocks that pass this validation will be considered to process transfer events included
in them.

To do: better calculation of blocks to be provided, considering their
relative weight into the proof.

## EventsProcessor

It is in charge of validate transfer and token events, contained in a transaction
receipt and executed in a block, and apply them to the `Bridge` contract.

It receives a transaction receipt and its partial proof of its inclusion in a block
transaction receipt trie. The proof is validated, using the known transaction receipt
root contained in the block. This hash root is extracted from the `BlockRecorder`.

The informed block should also be marked as included in a blockchain. The `BlockRecorder` instance
has such information, based on the process conducted by the `MMRProver` contract, described
above.

Once the block and transaction receipt were checked, the logs are extracted
from the receipt, and the `Token` and `Cross` events emitted by the `Bridge` contract
in the other chain are retrieved. Their information is applied to this chain `Bridge` instance,
creating new mirror tokens if needed, and executing the mirror transfer.


See the ["token bridge components"](./Components.md) for a better understanding of the pieces involced


