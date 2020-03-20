pragma solidity ^0.5.0;

import "./zeppelin/math/SafeMath.sol";

library Utils {
    using SafeMath for uint256;

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

    function getDecimals(address tokenToUse) public view returns (uint8 decimals) {
        //support decimals as uint256 or uint8
        (bool success, bytes memory data) = tokenToUse.staticcall(abi.encodeWithSignature("decimals()"));
        require(success, "Utils: No decimals");
        require(data.length == 1 || data.length == 32, "Utils: Decimals not uint8 or uint256");
        if (data.length == 1) {
            decimals = abi.decode(data, (uint8));
        } else if (data.length == 32) {
            decimals = uint8(abi.decode(data, (uint256)));
        }
        require(decimals <= 18, "Utils: Decimals not in 0 to 18");
        return decimals;
    }

    function getGranularity(address tokenToUse) public view returns (uint256 granularity) {
        //support granularity if ERC777
        (bool success, bytes memory data) = tokenToUse.staticcall(abi.encodeWithSignature("granularity()"));
        granularity = 1;
        if(success) {
            granularity = abi.decode(data, (uint256));
            require(granularity >= 1 && granularity <= 1000000000000000000, "Utils: Invalid granularity");
        }
        if(granularity > 1) {
            require(granularity.div(10).mul(10) == granularity, "Utils: Granularity not mul 10");
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
    }

    function calculateGranularityAndAmount(uint8 decimals, uint256 granularity, uint256 amount) public pure
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

}
