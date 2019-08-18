pragma solidity ^0.4.24;

import "./zeppelin/token/ERC20/ERC20.sol";
import "./Transferable.sol";

contract Bridge is Transferable {
    address public manager;
    ERC20 public token;
    
    mapping (address => address) mappedAddresses;
    
    modifier onlyManager() {
        require(msg.sender == manager);
        _;
    }
    
    constructor(address _manager, ERC20 _token) public {
        manager = _manager;
        token = _token;
    }
    
    function acceptTransfer(address receiver, uint256 amount) public onlyManager returns(bool) {
        return token.transfer(receiver, amount);
    }
    
    function changeManager(address newmanager) public onlyManager {
        require(newmanager != address(0));
        
        manager = newmanager;
    }
    
    function tokenFallback(address from, uint256 amount, bytes data) public view returns (bool) {
        require(msg.sender == address(token));
        return true;
    }
    
    function mapAddress(address to) public {
        mappedAddresses[msg.sender] = to;
    }
    
    function getMappedAddress(address account) public view returns (address) {
        address mapped = mappedAddresses[account];
        
        if (mapped == address(0))
            return account;
            
        return mapped;
    }    

    function receiveTokens(ERC20 tokentouse, uint256 amount) public returns (bool) {
        require(address(token) == address(tokentouse));
        
        if (!token.transferFrom(msg.sender, address(this), amount))
            return false;
        
        return true;
    }
}

