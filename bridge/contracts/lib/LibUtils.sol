// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma abicoder v2;

library LibUtils {

    function decimalsToGranularity(uint8 decimals) internal pure returns (uint256) {
        require(decimals <= 18, "LibUtils: Decimals not <= 18");
        return uint256(10)**(18-decimals);
    }

    function getDecimals(address tokenToUse) internal view returns (uint8) {
        //support decimals as uint256 or uint8
        (bool success, bytes memory data) = tokenToUse.staticcall(abi.encodeWithSignature("decimals()"));
        require(success, "LibUtils: No decimals");
        // uint<M>: enc(X) is the big-endian encoding of X,
        //padded on the higher-order (left) side with zero-bytes such that the length is 32 bytes.
        return uint8(abi.decode(data, (uint256)));
    }

    function getGranularity(address tokenToUse) internal view returns (uint256) {
        //support granularity if ERC777
        (bool success, bytes memory data) = tokenToUse.staticcall(abi.encodeWithSignature("granularity()"));
        require(success, "LibUtils: No granularity");

        return abi.decode(data, (uint256));
    }

    function bytesToAddress(bytes memory bys) internal pure returns (address addr) {
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            addr := mload(add(bys,20))
        }
    }

}
