pragma solidity >=0.4.21 <0.6.0;

contract Transferable {
    function acceptTransfer(address token, address receiver, uint256 amount) public returns(bool);
}
