# RSK Trustless Decentralized Token Bridge POC

Proof of concept Ethereum/RSK Trustless Decentralized Token Bridge.

## Rationale
Cross chain events are very important in the future of crypto. Currently most of them have a federation or a group of people that is trusted to validate and cross this events. We propose a way of using smart contracts to verify events from the other chain, this way anyone can cross the events. As the motto goes verify, don't trust.

## Overview
We have a smart contract bridge on each network, the bridge on one chain will receive and lock the tokens, then it will emmit an event that can be served to the bridge on the other chain. This bridge will validate the tx receipt, the merkle proof that the tx receipt is inside the block, verify the block and its pow and finally using Fly Client it will verify that the block is part of the blockchain using the MMR root (Mountain Merkle Range root).

![Mainchain to Sidechain transfer flow](./images/mainchain_to_sidechain_high_level.jpg?raw=true "Mainchain to Sidechain transfer")

See the [documentation](./docs) for more information on how it works.

## Testnet Example
We used this POC on RSK testnet and Ethereum Rinkeby and transfered the RSK RIF token to Ethereum, in order to probe the trustless decentralized token bridge.
See the ['real example'](./docs/RealExample.md) for more information.

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

