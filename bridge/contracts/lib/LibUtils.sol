// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
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

    function toAddress(bytes memory _bytes, uint256 _start) internal pure returns (address) {
        require(_bytes.length >= _start + 20, "LibUtils: toAddress_outOfBounds");
        address tempAddress;

        assembly {
            tempAddress := div(mload(add(add(_bytes, 0x20), _start)), 0x1000000000000000000000000)
        }

        return tempAddress;
    }

    function toUint128(bytes memory _bytes, uint256 _start) internal pure returns (uint128) {
        require(_bytes.length >= _start + 16, "LibUtils: toUint128_outOfBounds");
        uint128 tempUint;

        assembly {
            tempUint := mload(add(add(_bytes, 0x10), _start))
        }

        return tempUint;
    }

    function toUint256(bytes memory _bytes, uint256 _start) internal pure returns (uint256) {
		require(_bytes.length >= _start + 32, "LibUtils: toUint256_outOfBounds");
		uint256 tempUint;

        // solium-disable-next-line security/no-inline-assembly
		assembly {
			tempUint := mload(add(add(_bytes, 0x20), _start))
		}

		return tempUint;
	}
}
