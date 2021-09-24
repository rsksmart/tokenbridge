// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../zeppelin/math/SafeMath.sol";
import "../zeppelin/introspection/IERC1820Registry.sol";
import "../zeppelin/token/ERC777/IERC777.sol";

library UtilsV1 {
    using SafeMath for uint256;

    IERC1820Registry constant private ERC_1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
    // keccak256("ERC777Token")
    bytes32 constant private TOKENS_ERC777_HASH = 0xac7fbab5f54a3ca8194167523c6753bfeb96a445279294b6125b68cce2177054;

    function getTokenInfo(address tokenToUse) external view returns (uint8 decimals, uint256 granularity, string memory symbol) {
        decimals = getDecimals(tokenToUse);
        granularity = getGranularity(tokenToUse);
        symbol = getSymbol(tokenToUse);
    }

    function getSymbol(address tokenToUse) public view returns (string memory symbol) {
        //support 32 bytes or string symbol
        (bool success, bytes memory data) = tokenToUse.staticcall(abi.encodeWithSignature("symbol()"));
        require(success, "Utils: Token hasn't symbol()");
        if (data.length == 32) {
            symbol = bytes32ToString(abi.decode(data, (bytes32)));
        } else {
            symbol = abi.decode(data, (string));
        }
        require(bytes(symbol).length > 0, "Utils: Token empty symbol");
        return symbol;
    }

    function getDecimals(address tokenToUse) public view returns (uint8) {
        //support decimals as uint256 or uint8
        (bool success, bytes memory data) = tokenToUse.staticcall(abi.encodeWithSignature("decimals()"));
        require(success, "Utils: No decimals");
        require(data.length == 32, "Utils: Decimals not uint<M>");
        // uint<M>: enc(X) is the big-endian encoding of X,
        //padded on the higher-order (left) side with zero-bytes such that the length is 32 bytes.
        uint256 decimalsDecoded = abi.decode(data, (uint256));
        require(decimalsDecoded <= 18, "Utils: Decimals not in 0 to 18");
        return uint8(decimalsDecoded);
    }

    function getGranularity(address tokenToUse) public view returns (uint256 granularity) {
        granularity = 1;
        //support granularity if ERC777
        address implementer = ERC_1820.getInterfaceImplementer(tokenToUse, TOKENS_ERC777_HASH);
        if (implementer != address(0)) {
            granularity = IERC777(implementer).granularity();
            //Verify granularity is power of 10 to keep it compatible with ERC20 decimals
            granularityToDecimals(granularity);
        }
        return granularity;
    }

    /* bytes32 (fixed-size array) to string (dynamically-sized array) */
    function bytes32ToString(bytes32 _bytes32) internal pure returns (string memory) {
        uint8 i = 0;
        while(i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }

    function decimalsToGranularity(uint8 decimals) public pure returns (uint256) {
        require(decimals <= 18, "Utils: Decimals not in 0 to 18");
        return uint256(10)**(18-decimals);
    }

    function granularityToDecimals(uint256 granularity) public pure returns (uint8) {
        if(granularity == 1) return 18;
        if(granularity == 10) return 17;
        if(granularity == 100) return 16;
        if(granularity == 1000) return 15;
        if(granularity == 10000) return 14;
        if(granularity == 100000) return 13;
        if(granularity == 1000000) return 12;
        if(granularity == 10000000) return 11;
        if(granularity == 100000000) return 10;
        if(granularity == 1000000000) return 9;
        if(granularity == 10000000000) return 8;
        if(granularity == 100000000000) return 7;
        if(granularity == 1000000000000) return 6;
        if(granularity == 10000000000000) return 5;
        if(granularity == 100000000000000) return 4;
        if(granularity == 1000000000000000) return 3;
        if(granularity == 10000000000000000) return 2;
        if(granularity == 100000000000000000) return 1;
        if(granularity == 1000000000000000000) return 0;
        require(false, "Utils: invalid granularity");
        return 0;
    }

    function calculateGranularityAndAmount(uint8 decimals, uint256 granularity, uint256 amount) external pure
        returns(uint256 calculatedGranularity, uint256 formattedAmount) {

        if(decimals == 18) {
            //tokenAddress is a ERC20 with 18 decimals should have 1 granularity
            //tokenAddress is a ERC777 token we give the same granularity
            calculatedGranularity = granularity;
            formattedAmount = amount;
        } else {
            //tokenAddress is a ERC20 with other than 18 decimals
            calculatedGranularity = decimalsToGranularity(decimals);
            formattedAmount = amount.mul(calculatedGranularity);
        }
    }

    function calculateDecimalsAndAmount(address tokenAddress, uint256 granularity, uint256 amount)
        external view returns (uint8 calculatedDecimals, uint256 formattedAmount) {
        uint8 tokenDecimals = getDecimals(tokenAddress);
        //As side tokens are ERC777 we need to convert granularity to decimals
        calculatedDecimals = granularityToDecimals(granularity);
        require(tokenDecimals == calculatedDecimals, "Utils: Token decimals differ from decimals - granularity");
        formattedAmount = amount.div(granularity);
    }

}
