// We are actually gonna use the latest Bridge but truffle only knows the address of the proxy
const toWei = web3.utils.toWei;
const deployHelper = require('../deployed/deployHelper');
const chains = require('../hardhat/helper/chains');
const address = require('../hardhat/helper/address');

module.exports = async function(hre) { // HardhatRuntimeEnvironment
  const {getNamedAccounts, deployments} = hre;
  const {deployer, allowTokensProxy} = await getNamedAccounts();
  const {deploy, log} = deployments;

  if (allowTokensProxy) {
    return;
  }

  const AllowTokensV1 = await deployments.get('AllowTokensV1');
  const proxyAdminAddress = await address.getProxyAdminAddress(hre);
  const bridgeProxyAddress = await address.getBridgeProxyAddress(hre);

  const deployedJson = deployHelper.getDeployed(network.name);
  const typesInfo = chains.isMainnet(network) ? tokensTypesMainnet() : tokensTypesTestnet();

  const allowTokensLogicV1 = new web3.eth.Contract(AllowTokensV1.abi, AllowTokensV1.address);
  const methodCall = allowTokensLogicV1.methods.initialize(
    deployer,
    bridgeProxyAddress,
    deployedJson.smallAmountConfirmations ?? '0',
    deployedJson.mediumAmountConfirmations ?? '0',
    deployedJson.largeAmountConfirmations ?? '0',
    typesInfo
  );
  methodCall.call({from: deployer});

  const deployResultProxy = await deploy('AllowTokensProxy', {
    from: deployer,
    contract: 'TransparentUpgradeableProxy',
    args: [
      AllowTokensV1.address,
      proxyAdminAddress,
      methodCall.encodeABI()
    ],
    log: true
  });

  if (deployResultProxy.newlyDeployed) {
    log(`Contract AllowTokensProxy deployed at ${deployResultProxy.address} using ${deployResultProxy.receipt.gasUsed.toString()} gas`);
  }
};
module.exports.id = 'deploy_allow_tokens_proxy'; // id required to prevent reexecution
module.exports.tags = ['AllowTokensProxy', 'new'];
module.exports.dependencies = ['ProxyAdmin', 'BridgeProxy', 'AllowTokensV1'];

function tokensTypesMainnet() {
  return [
    {
      description: 'BTC', limits: {
        min: toWei('0.0001'),
        max: toWei('25'),
        daily: toWei('100'),
        mediumAmount: toWei('0.1'),
        largeAmount: toWei('1')
      }
    },
    {
      description: 'ETH', limits: {
        min: toWei('0.005'),
        max: toWei('750'),
        daily: toWei('3000'),
        mediumAmount: toWei('3'),
        largeAmount: toWei('30')
      }
    },
    {
      description: '<1000usd', limits: {
        min: toWei('0.01'),
        max: toWei('2500'),
        daily: toWei('5000'),
        mediumAmount: toWei('10'),
        largeAmount: toWei('100')
      }
    },
    {
      description: '<100usd', limits: {
        min: toWei('0.1'),
        max: toWei('25000'),
        daily: toWei('50000'),
        mediumAmount: toWei('100'),
        largeAmount: toWei('1000')
      }
    },
    {
      description: '=1usd', limits: {
        min: toWei('10'),
        max: toWei('2500000'),
        daily: toWei('5000000'),
        mediumAmount: toWei('10000'),
        largeAmount: toWei('100000')
      }
    },
    {
      description: '<1usd', limits: {
        min: toWei('1000'),
        max: toWei('250000000'),
        daily: toWei('500000000'),
        mediumAmount: toWei('1000000'),
        largeAmount: toWei('10000000')
      }
    },
    {
      description: '<1cent', limits: {
        min: toWei('100000'),
        max: toWei('25000000000'),
        daily: toWei('50000000000'),
        mediumAmount: toWei('100000000'),
        largeAmount: toWei('1000000000')
      }
    }
  ];
}

function tokensTypesTestnet() {
  return [
    {
      description: 'BTC', limits: {
        min: toWei('0.0001'),
        max: toWei('25'),
        daily: toWei('100'),
        mediumAmount: toWei('0.01'),
        largeAmount: toWei('0.1')
      }
    },
    {
      description: 'ETH', limits: {
        min: toWei('0.0005'),
        max: toWei('750'),
        daily: toWei('3000'),
        mediumAmount: toWei('0.03'),
        largeAmount: toWei('0.3')
      }
    },
    {
      description: '<1000usd', limits: {
        min: toWei('0.001'),
        max: toWei('2500'),
        daily: toWei('5000'),
        mediumAmount: toWei('0.01'),
        largeAmount: toWei('0.1')
      }
    },
    {
      description: '<100usd', limits: {
        min: toWei('0.1'),
        max: toWei('25000'),
        daily: toWei('50000'),
        mediumAmount: toWei('1'),
        largeAmount: toWei('10')
      }
    },
    {
      description: '=1usd', limits: {
        min: toWei('1'),
        max: toWei('2500000'),
        daily: toWei('5000000'),
        mediumAmount: toWei('10'),
        largeAmount: toWei('100')
      }
    },
    {
      description: '<1usd', limits: {
        min: toWei('10'),
        max: toWei('250000000'),
        daily: toWei('500000000'),
        mediumAmount: toWei('100'),
        largeAmount: toWei('1000')
      }
    },
    {
      description: '<1cent', limits: {
        min: toWei('10'),
        max: toWei('25000000000'),
        daily: toWei('50000000000'),
        mediumAmount: toWei('100'),
        largeAmount: toWei('1000')
      }
    }
  ];
}
