pragma solidity >=0.4.21 <0.6.0;

contract MMR {
    uint constant NHASHES = 64;

    uint public nblock;
    bytes32 public nhash;

    uint public nhashes;
    bytes32[NHASHES] public hashes;

    constructor() public {
        nblock = block.number;
    }

    function calculate() public {
        bytes32 hash = blockhash(nblock);
        uint k;
        for (k = 0; k < NHASHES; k++) {
            if (hashes[k] == 0x0) {
                hashes[k] = hash;
                if (k + 1 > nhashes)
                    nhashes = k + 1;
                break;
            }
            hash = keccak256(abi.encodePacked(hashes[k], hash));
            hashes[k] = 0x0;
        }
        nblock++;

        bytes32 newhash;
        for (k = 0; k < nhashes; k++) {
            if (hashes[k] == 0x0)
                continue;
            newhash = keccak256(abi.encodePacked(hashes[k], newhash));
        }
        nhash = newhash;
    }
}