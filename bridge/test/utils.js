const gasLimit = 6800000;

// from https://ethereum.stackexchange.com/questions/11444/web3-js-with-promisified-api
const promisify = (inner) =>
  new Promise((resolve, reject) =>
    inner((err, res) => {
      if (err) { reject(err) }

      resolve(res);
    })
);

async function expectThrow (promise) {
  try {
    await promise;
  } catch (error) {
      return;
  }
  
  assert.fail('Expected throw not received');
}


function checkGas(gas) {
    process.stdout.write(`\x1b[36m[Gas:${gas}]\x1b[0m`);
    assert(gas < gasLimit, "Gas used bigger than the maximum in mainnet");
}

function checkRcpt(tx) {
    assert.equal(Number(tx.receipt.status), 1, "Should be a succesful Tx");
    checkGas(tx.receipt.gasUsed);
  }

const asyncMine = async () => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: "2.0",
            method: "evm_mine",
            id: new Date().getTime()
            }, (error, result) => {
                if (error) {
                    return reject(error);
                }
                return resolve(result);
            });
    });
};

let evm_mine = async (iterations) => {
    for(var i = 0; i < iterations; i++ ) {
        await asyncMine();
    };
};

function calculatePrefixesSuffixes(nodes) {
    const prefixes = [];
    const suffixes = [];
    const ns = [];
    
    for (let k = 0, l = nodes.length; k < l; k++) {
        if (k + 1 < l && nodes[k+1].indexOf(nodes[k]) >= 0)
            continue;
        
        ns.push(nodes[k]);
    }
    
    let hash = web3.utils.sha3(Buffer.from(ns[0], 'hex'));
    
    if (hash.substring(0, 2).toLowerCase() === '0x')
        hash = hash.substring(2);
    
    prefixes.push('0x');
    suffixes.push('0x');
    
    for (let k = 1, l = ns.length; k < l; k++) {
        const p = ns[k].indexOf(hash);
        
        prefixes.push('0x' + ns[k].substring(0, p));
        suffixes.push('0x' + ns[k].substring(p + hash.length));
        
        hash = web3.utils.sha3(Buffer.from(ns[k], 'hex'));
        
        if (hash.substring(0, 2).toLowerCase() === '0x')
            hash = hash.substring(2);
    }
    
    return { prefixes: prefixes, suffixes: suffixes };
}

module.exports = {
    checkGas: checkGas,
    checkRcpt: checkRcpt,
    evm_mine: evm_mine,
    promisify: promisify,
    expectThrow: expectThrow,
    calculatePrefixesSuffixes: calculatePrefixesSuffixes
};

