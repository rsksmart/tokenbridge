
async function expectThrow (promise) {
  try {
    await promise;
  } catch (error) {
      return;
  }
  
  assert.fail('Expected throw not received');
}

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
    expectThrow: expectThrow,
    calculatePrefixesSuffixes: calculatePrefixesSuffixes
}


