pragma solidity 0.5.0;

library ProofLibrary {
    function calculateRoot(bytes memory content, bytes[] memory prefixes, bytes[] memory sufixes) pure internal returns (bytes32) {
        uint nlevels = prefixes.length;
        bytes32 hash = keccak256(abi.encodePacked(prefixes[0], content, sufixes[0]));
        
        for (uint k = 1; k < nlevels; k++)                
            hash = keccak256(abi.encodePacked(prefixes[k], hash, sufixes[k]));
            
        return hash;
    }
}
