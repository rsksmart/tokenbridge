// How to run the script: npx hardhat run ./hardhat/script/createRifToken.js --network bsctestnet
const hre = require("hardhat");

const erc20 = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_from",
                "type": "address"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "name": "",
                "type": "uint8"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "balance",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            },
            {
                "name": "_spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    }
];

async function main() {
    const {deployments} = hre;
    const tokens = {
        network: [{
            name: 'rsktestnet',
            safeAddress: '0x51591ec8f296ef3e4deebe32c392c706aef42133',
            tokens: [
                {
                    name: "USDT",
                    address: "0x31974a4970BADA0ca9BcDe2E2eE6fC15922c5334"
                },
                {
                    name: "LINK",
                    address: "0x2d850c8E369F26bc02fF4c9fFbaE2d50107395CB"
                },
                {
                    name: "DAI",
                    address: "0xdF63373ddb5B37F44d848532BBcA14DBf4e8aa53"
                },
                {
                    name: "DOC",
                    address: "0xAC3896da7940c8e4Fe9E7F8cd4475Cd2534F37d7"
                },
                {
                    name: "USDC",
                    address: "0xbB739A6e04d07b08E38B66ba137d0c9Cd270c750"
                }
            ]
        },
        {
            name: 'sepolia',
            safeAddress: '0x51591ec8f296ef3e4deebe32c392c706aef42133',
            tokens: [
                {
                    name: "USDT",
                    address: "0xc70960c12c215c782d7061f2aFa6098a8CD5153B"
                },
                {
                    name: "LINK",
                    address: "0x779877A7B0D9E8603169DdbD7836e478b4624789"
                },
                {
                    name: "DAI",
                    address: "0xeD9b63833f58f012e1560A506F99C5Cf8f455d36"
                },
                {
                    name: "eDOC",
                    address: "0x1b95D8b1b0f5e3D5A0B5B360263f18010C4978C9"
                },
                {
                    name: "USDC",
                    address: "0x657FeD810c8D4BF92e67c09e41Be36791051f83B"
                }
            ]
        }]
    };

    const network = hre.network.name;
    const net = tokens.network.find(x => x.name === network);

    const Bridge = await deployments.get('BridgeV3');
    const BridgeProxy = await deployments.get('BridgeProxy');

    const bridge = new web3.eth.Contract(Bridge.abi, BridgeProxy.address);
    let bridgeFeePercentage = await bridge.methods.getFeePercentage().call();

    console.log(`Current fee percentage in bridge is: ${bridgeFeePercentage}`);

    console.log(`Getting balance for tokens of network ${net.name}`);

    bridgeFeePercentage = await bridge.methods.getFeePercentage().call();

    console.log(`Current bridge address ${BridgeProxy.address}`);
    console.log(`Current fee percentage in bridge is: ${bridgeFeePercentage}`);

    for await (const token of  net.tokens) {
        console.log(`Getting balance of token ${token.name}`);
        const tokenContract = new web3.eth.Contract(erc20, token.address);
        const tokenBalance = await tokenContract.methods.balanceOf(net.safeAddress).call();
        console.log(`The balance is: ${tokenBalance}`);
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
