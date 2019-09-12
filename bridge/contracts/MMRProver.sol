pragma solidity >=0.4.21 <0.6.0;
pragma experimental ABIEncoderV2;

import "./ProofLibrary.sol";

contract MMRProver {
    constructor() public {
    }
    
    function mmrIsValid(bytes32 finalmmr, bytes memory initial, bytes[] memory prefixes, bytes[] memory suffixes) public view returns (bool) {
        bytes32 root = ProofLibrary.calculateRoot(initial, prefixes, suffixes);
        
        return root == finalmmr;
    }
}

