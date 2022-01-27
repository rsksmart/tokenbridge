import Tx from 'ethereumjs-tx';
import * as ethUtils from 'ethereumjs-util';
import * as utils from '../lib/utils';
import * as fs from 'fs';
import axios from 'axios';

import { CustomError } from './CustomError';
const ESTIMATED_GAS = 250000;

import * as chains from './chainId';
export class TransactionSender {
  client: any;
  logger: any;
  chainId: any;
  manuallyCheck: any;
  etherscanApiKey: any;
  debuggingMode: any;

  constructor(client, logger, config) {
    this.client = client;
    this.logger = logger;
    this.chainId = null;
    this.manuallyCheck = `${config.storagePath || __dirname}/manuallyCheck.txt`;
    this.etherscanApiKey = config.etherscanApiKey;
    this.debuggingMode = false;
  }

  async getNonce(address) {
    return this.client.eth.getTransactionCount(address, 'pending');
  }

  numberToHexString(number) {
    if (!number) {
      return '0x0';
    }
    return `0x${Math.ceil(parseInt(number)).toString(16)}`;
  }

  async getGasPrice() {
    if (await this.isRsk()) {
      return this.getRskGasPrice();
    }
    return this.getEthGasPrice();
  }

  async getGasLimit(rawTx) {
    const estimatedGas = await this.client.eth.estimateGas({
      gasPrice: rawTx.gasPrice,
      value: rawTx.value,
      to: rawTx.to,
      data: rawTx.data,
      from: rawTx.from,
    });
    // Gas estimation does not work correctly on RSK and after the London harfork, neither is working on Ethereum
    // example https://etherscan.io/tx/0xd30d6cf428606e2ef3667427b9b6baecb2f4c9cbb44a0c82c735a238ec8f72fb
    // To fix it, we decided to use a hardcoded gas estimation
    return +estimatedGas < ESTIMATED_GAS ? ESTIMATED_GAS : +estimatedGas;
  }

  async getEthGasPrice() {
    const chainId = await this.getChainId();
    const gasPrice = parseInt(await this.client.eth.getGasPrice());
    const useGasPrice = gasPrice <= 1 ? 1 : Math.round(gasPrice * 1.5);
    if (chainId === 1) {
      const data = {
        module: 'gastracker',
        action: 'gasoracle',
      };
      const response = await this.useEtherscanApi(data);
      const gasOraclePrice = response.result;
      const proposeGasPrice = parseInt(this.client.utils.toWei(gasOraclePrice.ProposeGasPrice, 'gwei'));
      const fastGasPrice = parseInt(this.client.utils.toWei(gasOraclePrice.FastGasPrice, 'gwei'));
      // Add a 1.3% margin to avoid gas spikes as even fast gas price is not enough
      const fastGasPricePlus = Math.ceil(fastGasPrice * 1.013);
      if (fastGasPrice >= gasPrice && useGasPrice >= fastGasPrice) {
        // If fastGasPrice is cheaper than gasPrice x1.5 use fastGasPrice
        // we check that fastGasPrice is bigger than gasPrice to avoid posible attacks and API errors
        this.logger.trace('gasPrice', gasPrice, 'useGasPrice', useGasPrice);
        this.logger.trace('gasOraclePrice', gasOraclePrice);
        this.logger.trace('useGasPrice >= fastGasPrice, we will use', fastGasPricePlus);
        return fastGasPricePlus;
      }
      if (useGasPrice <= 25000000000) {
        // Currently when we restart an ethereum node the eth_getPrice is given values that are lower than the network
        // Usually around 9 GWei or 15 GWei that's why we set the limit in 25 GWei
        // When this happens we will use the gas price provided by etherscan
        this.logger.trace('gasPrice', gasPrice, 'useGasPrice', useGasPrice);
        this.logger.trace('gasOraclePrice', gasOraclePrice);
        this.logger.trace('useGasPrice <= 25000000000, we will use', fastGasPricePlus);
        return fastGasPricePlus;
      }
      if (proposeGasPrice >= gasPrice && proposeGasPrice >= useGasPrice && proposeGasPrice < useGasPrice * 5) {
        // if useGasPrice is lower than proposeGasPrice the transaction will probably get stucked
        // we add a control in case proposeGasPrice is way high
        // Try to use fastGasPrice if the value is too high, use proposeGasPrice and add 2 Gwei to help avoid gas spikes
        const recommendedGas = fastGasPrice < useGasPrice * 5 ? fastGasPricePlus : proposeGasPrice + 5000000000;
        this.logger.trace('gasPrice', gasPrice, 'useGasPrice', useGasPrice);
        this.logger.trace('gasOraclePrice', gasOraclePrice);
        this.logger.trace('proposeGasPrice >= useGasPrice, we will use', recommendedGas);
        return recommendedGas;
      }
    }
    return useGasPrice;
  }

  async getRskGasPrice() {
    const block = await this.client.eth.getBlock('latest');
    const gasPrice = parseInt(block.minimumGasPrice);
    return gasPrice <= 1 ? 1 : Math.round(gasPrice * 1.03);
  }

  async getChainId() {
    if (this.chainId === undefined) {
      this.chainId = parseInt(await this.client.eth.net.getId());
    }
    return this.chainId;
  }

  async isRsk() {
    const chainId = await this.getChainId();
    return chainId === chains.RSK_TEST_NET_CHAIN_ID || chainId === chains.RSK_MAIN_NET_CHAIN_ID;
  }

  async createRawTransaction(from, to, data, value) {
    const nonce = await this.getNonce(from);
    const chainId = await this.getChainId();
    const gasPrice = await this.getGasPrice();
    const rawTx: any = {
      chainId: chainId,
      gasPrice: this.numberToHexString(gasPrice),
      value: this.numberToHexString(value),
      to: to,
      data: data,
      from: from,
      nonce: this.numberToHexString(nonce),
      r: 0,
      s: 0,
    };

    if (await this.isRsk()) {
      delete rawTx.chainId;
      delete rawTx.r;
      delete rawTx.s;
    }
    rawTx.gas = this.numberToHexString(await this.getGasLimit(rawTx));

    if (this.debuggingMode) {
      rawTx.gas = this.numberToHexString(100);
      this.logger.warn(`debugging mode enabled, forced rawTx.gas ${rawTx.gas}`);
    }
    this.logger.trace('createRawTransaction RawTx', rawTx);
    return rawTx;
  }

  signRawTransaction(rawTx, privateKey) {
    const tx = new Tx(rawTx);
    tx.sign(utils.hexStringToBuffer(privateKey));
    return tx;
  }

  async getAddress(privateKey) {
    if (privateKey && privateKey.length) {
      return utils.privateToAddress(privateKey);
    }
    //If no private key provided we use personal (personal is only for testing)
    const accounts = await this.client.eth.getAccounts();
    return accounts[0];
  }

  async useEtherscanApi(data) {
    const chainId = await this.getChainId();
    if (chainId !== 1 && chainId !== 42) {
      throw new Error(`ChainId:${chainId} can't use Etherescan API`);
    }

    const url = chainId === 1 ? 'https://api.etherscan.io/api' : 'https://api-kovan.etherscan.io/api';

    const params = new URLSearchParams();
    params.append('apikey', this.etherscanApiKey);
    for (const property in data) {
      params.append(property, data[property]);
    }

    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };
    const response = await axios.post(url, params, config);

    if (response.data.status === 0) {
      throw new Error(
        `Etherscan API:${url} data:${JSON.stringify(data)} message:${response.data.message} result:${
          response.data.result
        }`,
      );
    }
    return response.data;
  }

  async sendTransaction(to, data, value, privateKey, throwOnError = false) {
    const chainId = await this.getChainId();
    let txHash;
    let receipt;
    let rawTx;
    try {
      const from = await this.getAddress(privateKey);
      rawTx = await this.createRawTransaction(from, to, data, value);
      if (privateKey && privateKey.length) {
        const signedTx = this.signRawTransaction(rawTx, privateKey);
        const serializedTx = ethUtils.bufferToHex(signedTx.serialize());
        receipt = await this.client.eth.sendSignedTransaction(serializedTx).once('transactionHash', async (hash) => {
          txHash = hash;
          if (chainId === 1) {
            // send a POST request to Etherscan, we broadcast the same transaction as GETH is not working correclty
            // see  https://github.com/ethereum/go-ethereum/issues/22308
            const dataProxy = {
              module: 'proxy',
              action: 'eth_sendRawTransaction',
              hex: serializedTx,
            };
            await this.useEtherscanApi(dataProxy);
          }
        });
      } else {
        //If no private key provided we use personal (personal is only for testing)
        delete rawTx.r;
        delete rawTx.s;
        delete rawTx.v;
        receipt = await this.client.eth.sendTransaction(rawTx).once('transactionHash', (hash) => (txHash = hash));
      }

      if (receipt.status) {
        this.logger.info(`Transaction Successful txHash:${receipt.transactionHash} blockNumber:${receipt.blockNumber}`);
      } else {
        this.logger.error('Transaction Receipt Status Failed', receipt);
        this.logger.error('RawTx that failed Status', rawTx);
      }

      return receipt;
    } catch (err) {
      this.logger.error('Error in sendTransaction', err, `transactionHash:${txHash} to:${to} data:${data}`);
      if (throwOnError) {
        throw new CustomError('Error in sendTransaction', err);
      }

      if (err.message.indexOf('it might still be mined') > 0) {
        this.logger
          .warn(`Transaction was not mined within 750 seconds, please make sure your transaction was properly sent. Be aware that
                it might still be mined. transactionHash:${txHash}`);
        fs.appendFileSync(this.manuallyCheck, `transactionHash:${txHash} to:${to} data:${data}\n`);
      } else {
        this.logger.error('Transaction Hash Failed', txHash, err);
        this.logger.error('RawTx that failed Catch', rawTx);
      }
      return { transactionHash: txHash, status: false, error: err };
    }
  }
}

export default TransactionSender;
