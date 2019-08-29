pragma solidity >=0.4.21 <0.6.0;

 /*
 * Contract interface for receivers of tokens that
 * comply with ERC-677.
 * See https://github.com/ethereum/EIPs/issues/677 for details.
 */
contract ERC677TransferReceiver {
    function tokenFallback(address from, uint256 amount, bytes memory data) public returns (bool);
}