pragma solidity ^0.4.24;

contract Transferable {
    function acceptTransfer(address originalTokenAddress, address receiver, uint256 amount, string memory symbol) public returns(bool);
    function changeManager(address newmanager) public;
}
