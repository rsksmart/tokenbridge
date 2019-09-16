pragma solidity >=0.4.21 <0.6.0;

import "./zeppelin/math/SafeMath.sol";

library RskPowLibrary {
    using SafeMath for uint256;

    function getBitcoinBlockHash(bytes memory bitcoinMergedMiningHeader) internal pure returns (bytes32 blockHash) {
        bytes memory reversedHash = abi.encodePacked(sha256(abi.encodePacked(sha256(bitcoinMergedMiningHeader))));
        blockHash = toBytes32(reverse(reversedHash,0,32), 0);
        return blockHash;
    }

    function difficultyToTarget(uint256 _difficulty) internal pure returns (bytes32 target) {
        uint256 max = ~uint256(0);
        uint256 difficulty = _difficulty;
        if(difficulty < 3) {
            // minDifficulty is 3 because target needs to be of length 256
            // and not have 1 in the position 255 (count start from 0)
            difficulty = 3;
        }
        target = bytes32(max.div(difficulty));
        return target;
    }

    function isValid(uint256 difficulty, bytes memory bitcoinMergedMiningHeader) internal pure returns (bool) {
        require(bitcoinMergedMiningHeader.length == 80, "BitcoinMergedMiningHeader must be 80 bytes");
        bytes32 blockHash = getBitcoinBlockHash(bitcoinMergedMiningHeader);
        bytes32 target = difficultyToTarget(difficulty);
        return blockHash < target;
    }

    function reverse(bytes memory _bytes, uint _start, uint _length) internal  pure returns (bytes memory) {
        require(_bytes.length >= (_start + _length), "Reverse start plus length larger than bytes size");

        bytes memory tempBytes = new bytes(_length);
        for(uint i = 0; i < _length; i++) {
            tempBytes[_length - 1 - i] = _bytes[_start + i];
        }
        return tempBytes;
    }

    function toBytes32(bytes memory _bytes, uint _start) internal  pure returns (bytes32) {
        require(_bytes.length >= (_start + 32), "toBytes32 bytes length must be at least 32");
        bytes32 tempBytes32;

        assembly {
            tempBytes32 := mload(add(add(_bytes, 0x20), _start))
        }

        return tempBytes32;
    }

}
