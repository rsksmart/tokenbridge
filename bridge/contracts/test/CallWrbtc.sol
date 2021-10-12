// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

import "../interface/IWrapped.sol";

contract CallWrbtc {

	IWrapped public wrbtc;

	constructor(address _wrbtcAddr) {
		setWrbtc(_wrbtcAddr);
	}

	receive() external payable {
		// The fallback function is needed to use WRBTC
		require(msg.sender == address(wrbtc), "wrong WRBTC addr");
	}

	function setWrbtc(address _wrbtcAddr) public {
		wrbtc = IWrapped(_wrbtcAddr);
	}

	function deposit() public payable {
		wrbtc.deposit{ value: msg.value }();
	}

	function withdraw(uint256 wad) public {
		wrbtc.withdraw(wad);
		address payable senderPayable = payable(msg.sender);
		(bool success, ) = senderPayable.call{value: wad, gas:23000}("");
		require(success, "CallWrbtc: transfer fail");
	}

}