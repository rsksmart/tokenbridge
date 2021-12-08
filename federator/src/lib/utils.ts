import * as ethUtils from 'ethereumjs-util';
import Web3 from 'web3';
import { Config } from './config';

/**
 * Retry system with async / await
 *
 * @param {Function} fn : export function to execute
 * @param {Array} args : arguments of fn function
 * @param {Object} config : arguments of fn function
 * @property {Number} config.retriesMax : number of retries, by default 3
 * @property {Number} config.interval : interval (in ms) between retry, by default 0
 * @property {Boolean} config.exponential : use exponential retry interval, by default true
 * @property {Number} config.factor: interval incrementation factor
 * @property {Number} config.isCb: is fn a callback style export function ?
 */
export async function retry(fn, args = [], config: any = {}) {
  const retriesMax = config.retriesMax || 3;
  let interval = config.interval || 0;
  const exponential = config.exponential || true;
  const factor = config.factor || 2;

  for (let i = 0; i < retriesMax; i++) {
    try {
      if (!config.isCb) {
        return await fn(...args);
      }
    } catch (error) {
      if (retriesMax === i + 1 || (Object.prototype.hasOwnProperty.call(error, 'retryable') && !error.retryable)) {
        throw error;
      }

      interval = exponential ? interval * factor : interval;
      // if interval is set to zero, do not use setTimeout, gain 1 event loop tick
      if (interval) {
        await new Promise((r) => setTimeout(r, interval));
      }
    }
  }
}

export async function retry3Times(func, params = null) {
  return retry(func, params, { retriesMax: 3, interval: 1_000, exponential: false });
}

export async function waitBlocks(client, numberOfBlocks) {
  const startBlock = await client.eth.getBlockNumber();
  let currentBlock = startBlock;
  while (numberOfBlocks > currentBlock - startBlock) {
    const newBlock = await client.eth.getBlockNumber();
    if (newBlock !== currentBlock) {
      currentBlock = newBlock;
    } else {
      await sleep(20000);
    }
  }
}

export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForReceipt(txHash) {
  let timeElapsed = 0;
  const interval = 10000;
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(async () => {
      timeElapsed += interval;
      const web3 = new Web3();
      const receipt = await web3.eth.getTransactionReceipt(txHash);
      if (receipt != null) {
        clearInterval(checkInterval);
        resolve(receipt);
      }
      if (timeElapsed > 120_000) {
        reject(
          `Operation took too long <a target="_blank" href="${
            Config.getInstance().explorer
          }/tx/${txHash}">check Tx on the explorer</a>`,
        );
      }
    }, interval);
  });
}

export function hexStringToBuffer(hexString) {
  return ethUtils.toBuffer(ethUtils.addHexPrefix(hexString));
}

export function stripHexPrefix(str) {
  return str.indexOf('0x') == 0 ? str.slice(2) : str;
}

export function privateToAddress(privateKey) {
  return ethUtils.bufferToHex(ethUtils.privateToAddress(this.hexStringToBuffer(privateKey)));
}

// Returns current memory allocated in MB
export function memoryUsage() {
  const { heapUsed } = process.memoryUsage();
  return Math.round(heapUsed / (1024 * 1024));
}

export function calculatePrefixesSuffixes(nodes) {
  const prefixes = [];
  const suffixes = [];
  const ns = [];

  for (let i = 0; i < nodes.length; i++) {
    nodes[i] = stripHexPrefix(nodes[i]);
  }

  for (let k = 0, l = nodes.length; k < l; k++) {
    if (k + 1 < l && nodes[k + 1].indexOf(nodes[k]) >= 0) continue;

    ns.push(nodes[k]);
  }

  let hash = Web3.utils.sha3(Buffer.from(ns[0], 'hex').toString());
  hash = stripHexPrefix(hash);

  prefixes.push('0x');
  suffixes.push('0x');

  for (let k = 1, l = ns.length; k < l; k++) {
    const p = ns[k].indexOf(hash);

    prefixes.push(ethUtils.addHexPrefix(ns[k].substring(0, p)));
    suffixes.push(ethUtils.addHexPrefix(ns[k].substring(p + hash.length)));

    hash = Web3.utils.sha3(Buffer.from(ns[k], 'hex').toString());
    hash = stripHexPrefix(hash);
  }
  return { prefixes: prefixes, suffixes: suffixes };
}

export function checkHttpsOrLocalhost(url = '') {
  if (process.env.BRIDGE_SKIP_HTTPS === 'true') {
    return true;
  }
  const isHttps = url.startsWith('https://');
  const isLocalhost =
    url.startsWith('http://127.0.0.1') ||
    url.startsWith('http://172.17.0.1') ||
    url.startsWith('http://localhost') ||
    url.startsWith('http://0.0.0.0');

  return isHttps || isLocalhost;
}

export function checkIfItsInRSK(chainId = -1) {
  return chainId === 0 || chainId === 5777 || chainId === 30 || chainId === 31 || chainId === 33;
}

export async function getHeartbeatPollingInterval({ host, runHeartbeatEvery = 1 }) {
  const web3 = new Web3(host);
  const chainId = await web3.eth.net.getId();
  const pollingInterval = [30, 31].includes(chainId) ? 1000 * 60 * 60 : runHeartbeatEvery * 1000 * 60;
  return pollingInterval;
}

export async function asyncMine(anotherWeb3Instance = null) {
  let web3Instance = anotherWeb3Instance;
  if (!web3Instance) {
    web3Instance = new Web3();
  }
  return new Promise((resolve, reject) => {
    web3Instance.currentProvider.send(
      {
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: new Date().getTime(),
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      },
    );
  });
}

export async function evm_mine(iterations, web3Instance = null) {
  for (let i = 0; i < iterations; i++) {
    await asyncMine(web3Instance);
  }
}

export function increaseTimestamp(web3, increase) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        method: 'evm_increaseTime',
        params: [increase],
        jsonrpc: '2.0',
        id: new Date().getTime(),
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        return asyncMine(web3).then(() => resolve(result));
      },
    );
  });
}
export const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const tokenType = {
  COIN: 0,
  NFT: 1,
};
