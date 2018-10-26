pragma solidity ^0.4.24;

contract Transferable {
    function acceptTransfer(address account, uint256 value) public returns(bool);
}
