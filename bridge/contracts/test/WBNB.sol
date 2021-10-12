// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../interface/IWrapped.sol";

contract WBNB is IWrapped {
	string public name     = "Wrapped BNB";
	string public symbol   = "WBNB";
	uint8  public decimals = 18;

	event  Approval(address indexed src, address indexed guy, uint wad);
	event  Transfer(address indexed src, address indexed dst, uint wad);
	event  Deposit(address indexed dst, uint wad);
	event  Withdrawal(address indexed src, uint wad);

	mapping (address => uint) override public balanceOf;
	mapping (address => mapping (address => uint)) public allowance;

	receive () external payable {
		deposit();
	}

	function deposit() override public payable {
		balanceOf[msg.sender] += msg.value;
		emit Deposit(msg.sender, msg.value);
	}

	function withdraw(uint wad) override public {
		require(balanceOf[msg.sender] >= wad, "WBNB: Balance less than wad");
		balanceOf[msg.sender] -= wad;
		(bool success, ) = msg.sender.call{value:wad, gas:23000}("");
		require(success, "WBNB: transfer fail");
		emit Withdrawal(msg.sender, wad);
	}

	function totalSupply() override public view returns (uint) {
		return address(this).balance;
	}

	function approve(address guy, uint wad) override public returns (bool) {
		allowance[msg.sender][guy] = wad;
		emit Approval(msg.sender, guy, wad);
		return true;
	}

	function transfer(address dst, uint wad) override public returns (bool) {
		return transferFrom(msg.sender, dst, wad);
	}

	function transferFrom(
		address src,
		address dst,
		uint wad
	) override public returns (bool) {
		require(balanceOf[src] >= wad, "WBNB: Balance less than wad");

		if (src != msg.sender && allowance[src][msg.sender] != type(uint).max) {
			require(allowance[src][msg.sender] >= wad, "WBNB: Allowance less than wad");
			allowance[src][msg.sender] -= wad;
		}

		balanceOf[src] -= wad;
		balanceOf[dst] += wad;

		emit Transfer(src, dst, wad);

		return true;
	}
}