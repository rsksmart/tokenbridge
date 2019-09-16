pragma solidity >=0.4.21 <0.6.0;

import "./RskPowLibrary.sol";

contract RskPowHelper {
    function isValid(uint256 difficulty, bytes memory bitcoinMergedMiningHeader) public pure returns (bool) {
        return RskPowLibrary.isValid(difficulty, bitcoinMergedMiningHeader);
    }
    
    function getBitcoinBlockHash(bytes memory bitcoinMergedMiningHeader) public pure returns (bytes32 blockHash) {
        return RskPowLibrary.getBitcoinBlockHash(bitcoinMergedMiningHeader);
    }
    
    function difficultyToTarget(uint256 difficulty) public pure returns (bytes32 target) {
        return RskPowLibrary.difficultyToTarget(difficulty);
    }
}

