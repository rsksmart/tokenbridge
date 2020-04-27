# Token Bridge FAQ

## What is the Token Bridge?

The Token Bridge is an interoperability protocol which allows users to move their own RSK or Ethereum ERC20 Tokens between networks in a quick and cost-efficient manner.
The UI is available at:

- Mainnet: [tokenbridge.rsk.co](https://tokenbridge.rsk.co/)
- Testnet: [testnet.tokenbridge.rsk.co](https://testnet.tokenbridge.rsk.co/)

<p align="center">
  <img src="./docs/images/token-bridge-diagram.png"/>
</p>

## What is a Side Token (mirror ERC20)?

Side Token is an ERC777 representation of a ERC20 compatible tokens which is on the other network(could be  on Ethereum or RSK network). The Side Token displays the exact same properties as the standard ERC20 token and allows it to be used in all the same places as ERC20.

## What is the purpose of having a Side Token?

Side Tokens are minted to prove cross chain bridges can work in a safe and secure manner with 2 standalone blockchains. We believe this kind of interoperability technology offers a lot of possibilities for smart contract owners, as they may prefer to do certain operations in one chain, and others in another one. By connecting blockchains with these bridges you allow for a variety of new use cases that never existed before.

## Will the supply of the original token will increase as a result of Side Tokens?

No! It’s important to note that there will be no increase in the original tokens. The existing amount of circulating original tokens will stay the same and simply be distributed across 2 networks (RSK Network & Ethereum network) instead of 1.

## What is the difference between original tokens and Side Tokens?

The original token lives on the network that it was deployed for example Ethereum, while the Side Token is a representation of the original token on the other network, for example RSK.

## What is the Side Token Contract Address, Symbol, and # of Decimal Places in order to add it as a Custom Coin on MyEtherWallet?

The symbol of the Side Token is the original token symbol with an `r` prefix if it is created in RSK or an `e` prefix if it is created in Ethereum. For example, if we cross the `RIF` token from RSK to Ethereum, the Side Token symbol would be `eRIF`.
The number of Decimal places will be 18. This are the ['addresses'](./docs/ContractAdddresses.md) of the deployed contrats in the different networks.
## How do I transform my original tokens to Side Tokens?

The Token Bridge will be a public DApp where users will be able to access by using Nifty Wallet or Metamask. You will be able to send your original tokens and receive an equivalent amount of Side Tokens on the other network. By toggling the network on Nifty or Metamask, you’re also able to transfer the other way around, by sending Side Tokens and receive original tokens.

## If I sell my Side Tokens, what happens to my original tokens?

Upon receiving your Side Tokens, you no longer own your original tokens. The moment you use the bridge to send them to the other network (RSK or Ethereum), they are locked up and stored in the contract address. Thus you effectively have no original tokens on the original network and now have Side Tokens on the other network.

## Is there a limit on how many tokens can be bridged over?

There is no limit on the total. Hypothetically, the entire circulating supply can be bridged, though this is unlikely happen as there will be strong use cases to use the tokens on either network.

However, there are daily quotas:

- Daily limit: 100,000 tokens
- Maximum per tx: 10,000 tokens
- Minimum per tx: 1 token

## Can any token be bridged over?

During the trial period, only whitelisted tokens can cross the bridge. The federation is responsible for adding and removing tokens from the whitelist.  When the trial period is over, and we move to a fully decentralized bridge, the whitelist will be removed.

## What are the fees for converting original tokens to Side Tokens and vice-versa? Who will be paying these fees?

The federation is paying and sponsoring the fees for the multiple transactions during the trial period. This will change after the trial period is complete, and the token bridge changes from a federated schema to a fully decentralized one. Users will need to pay a small amount of gas fee when using Metamask for to submit their transactions.

## How many confirmations are required to convert the original tokens to Side tokens and vice-versa?

- 120 confirmations are necessary on the RSK Mainnet, and 120 confirmations on the Ethereum Mainnet.
- 10 confirmations are necessary on the RSK Testnet, and 10 confirmations on the Ethereum Kovan Testnet.

## How does the Token Bridge work?

The Token Bridge functionality is quite unique, yet simple to understand. The ratio of tokens during network transfer always remains 1:1 and behaves in the following manner:

When original tokens are moved to the other network
- Original tokens are locked in the Token Bridge smart contract
- Side Tokens are minted to the same address that originally called the bridge

When Side Tokens are moved back from the other network
- Side Tokens are burned
- Original tokens are unlocked in the Token Bridge smart contract and transfer to the same address that originally called the bridge
