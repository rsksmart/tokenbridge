
# Real example

## RSK Testnet Explorer and stats
[https://stats.testnet.rsk.co/](https://stats.testnet.rsk.co/)
[https://explorer.testnet.rsk.co/](https://explorer.testnet.rsk.co/)
[https://faucet.rifos.org](https://faucet.rifos.org)

## Rinkeby (Ethereum testnet) Explorer and stats
[https://www.rinkeby.io/#stats](https://www.rinkeby.io/#stats)
[https://rinkeby.etherscan.io/](https://rinkeby.etherscan.io/)

## List of Abis
[abis](../submitter/abis)

## List of Addresses
### On RSk
    - "mmr": [0x979c7a7f35151ce34849517a3cde6e525ae90bb5](https://explorer.testnet.rsk.co/address/0x979c7a7f35151ce34849517a3cde6e525ae90bb5),
    - "bridge": [0x026ac1760cFeC00576DCe9a388aC8fbF4fc62F1B](https://explorer.testnet.rsk.co/address/0x026ac1760cfec00576dce9a388ac8fbf4fc62f1b),
    - "rif": [0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE](https://explorer.testnet.rsk.co/address/0x19f64674d8a5b4e652319f5e239efd3bc969a1fe)
### On Rinkeby
    - "mmrProver": "0x6c09BfC38fAF273AD8061D8F7CC64aB5A72838E1",
    - "bridge": "0x2CF9AE9947538119aFd0A246D3ac87dCC8112E05",
    - "blockRecorder": "0x144518a82B2CdB010Ef97b282000cFe1906719d3",
    - "receiptProver": "0x30797cFD6644291D7bC5456Ace8480275505fCea",
    - "eventsProcessor": "0x5A323A9c4C0Fd6a521426dd0EbCeD8318a9835eb"
    - "Crossed tRIF": "0x3Eb9440125E2260A1C6b3Af798Fb9a53aa2FB19B"

## On RSK
Approve on tRIF contract (0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE) the Bridge (0x026ac1760cFeC00576DCe9a388aC8fbF4fc62F1B)
https://explorer.testnet.rsk.co/tx/0x433e85d6330504ad13e01c4a83c90de68e429f8283a0c172d0293166b7b1eedf

RSK Bridge (0x026ac1760cFeC00576DCe9a388aC8fbF4fc62F1B) call receiveTokens with tRIF contract (0x19F64674D8A5B4E652319F5e239eFd3bc969A1fE) and amout as argument
https://explorer.testnet.rsk.co/tx/0x666b67346be3b03d91f46a2a114d388960276efddc466333b1988ceeceafe850

Emit Cross Event
https://explorer.testnet.rsk.co/tx/0x9ff323449fe264d07f887bbdf512caf603ef7362ed8a428157e362f96ce3fad8?__ctab=Logs

MMR calculate
https://explorer.testnet.rsk.co/tx/0x48a48c37fe16536dd3a392c51c11c7c1ee0155f4af556aaa0eaf365c1a138274


##On Rinkeby (Ethereum testnet)

Record Block
https://rinkeby.etherscan.io/tx/0xfa64bd4df975f3c63a3aceb20e2d5d182969dc4e9c9034332d63fed0f9b7140f

Init Proof
https://rinkeby.etherscan.io/tx/0x2fdf85230d1a47ff77575c8a8a9b3d88af9a8e24c1ae64032d2b7404be85ae12

MMRProver Contract call getBlocksToProve [ 
  '259356',
  '259551',
  '259746',
  '259941',
  '260136',
  '260331',
  '260526',
  '260721',
  '260916',
  '261111',
  '261306',
  '261501',
  '261566' ]

MMRProver Contract processBlockProof
https://rinkeby.etherscan.io/tx/0x003e2d9513f2f46a1b7a90a4b3610a2d2ad6ba0f186bbbd06e4129855e06071d
https://rinkeby.etherscan.io/tx/0x5ece4fbfad40c69f5e11ee7d6f4f58f9645699af58a6de124ced5bbf2c623121
https://rinkeby.etherscan.io/tx/0x206ce9cd7d925e983ceacb053264496ed697d8bd88dd8159d51e6bf4c7e904f7
https://rinkeby.etherscan.io/tx/0x91b47c12ca0b865e69a1b23588af80dc5b75263bcc272c1947f8cceeb7d9f798
https://rinkeby.etherscan.io/tx/0x1e734f5ca6dd3b1c388f376ed65db98331849430b201c725348578eba3825b69
https://rinkeby.etherscan.io/tx/0xe0b8fd06429f1bdf0ac5e453ffbca2fb81a0d92cec7f6e8fc17a58a243ae4391
https://rinkeby.etherscan.io/tx/0x5ad03d84b94f540f020ed70a5ea3ff9947ac5fc18e6115ae229d2c2bd001f9d8
https://rinkeby.etherscan.io/tx/0xd7830ac73e3f0434cd5fde7bada853d19ced3585fb577fcb786b925dc7b5d022
https://rinkeby.etherscan.io/tx/0x12d7670539a3bd449ea191712cbc01c6a8a002cee75f9be3604f855f413372f7
https://rinkeby.etherscan.io/tx/0xc06b89a7e43a7f64a2cd4153dc06cec6bf9cd71725a120dd4185813f419c9dde
https://rinkeby.etherscan.io/tx/0x22fc0407dc7f4c60b4405941927fbfc46e626841aa8f18b18cc6e218cc96a603
https://rinkeby.etherscan.io/tx/0xe8876ed9e80e449e2864f387006eecb557ef113fcdd1029a81138ea8ccd485ba
https://rinkeby.etherscan.io/tx/0xe2c4b097bdc1096ffc0982cd37ca591fe9f2f73151a958f2cead2515f0068fca

Process Transaction Receipt 
https://rinkeby.etherscan.io/tx/0x248f58cb2769160b435ef0e092127e605c3cad04e46a5c7b996210f3835fbbd4

