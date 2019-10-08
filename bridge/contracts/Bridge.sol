pragma solidity >=0.4.21 <0.6.0;

import "./zeppelin/token/ERC20/ERC20Detailed.sol";
import "./zeppelin/token/ERC20/SafeERC20.sol";
import "./zeppelin/lifecycle/Pausable.sol";
import "./zeppelin/math/SafeMath.sol";
import "./ERC677TransferReceiver.sol";
import "./Transferable.sol";
import "./SideToken.sol";

contract Bridge is Transferable, ERC677TransferReceiver, Pausable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20Detailed;

    address public manager;
    uint8 symbolPrefix;

    mapping (address => SideToken) public mappedTokens;
    mapping (address => address) public originalTokens;
    mapping (address => bool) public knownTokens;
    
    mapping (address => address) public mappedAddresses;

    event Cross(address indexed _tokenAddress, address indexed _to, uint256 _amount, string _symbol);
    
    modifier onlyManager() {
        require(msg.sender == manager, "Sender is not the manager");
        _;
    }

    constructor(address _manager, uint8 _symbolPrefix) public {
        require(_manager != address(0), "Empty manager");
        require(_symbolPrefix != 0, "Empty symbol prefix");
        manager = _manager;
        symbolPrefix = _symbolPrefix;
    }

    function onTokenTransfer(address to, uint256 amount, bytes memory data) public whenNotPaused returns (bool success) {
        return tokenFallback(to, amount, data);
    }

    function processToken(address token, string memory symbol) private onlyManager whenNotPaused {
        if (knownTokens[token])
            return;
    
        SideToken sideToken = mappedTokens[token];
        
        if (address(sideToken) == address(0)) {
            string memory newSymbol = string(abi.encodePacked(symbolPrefix, symbol));
            sideToken = new SideToken(newSymbol, newSymbol);
            mappedTokens[token] = sideToken;
            originalTokens[address(sideToken)] = token;
        }
    }

    function acceptTransfer(address tokenAddress, address receiver, uint256 amount, string memory symbol)
        public onlyManager whenNotPaused returns(bool) {
        processToken(tokenAddress, symbol);
        
        address to = getMappedAddress(receiver);

        if (isMappedToken(tokenAddress)) {
            SideToken sideToken = mappedTokens[tokenAddress];
            require(sideToken.mint(to, amount), "Error minting on side token");
        }
        else {
            ERC20Detailed token = ERC20Detailed(tokenAddress);
            token.safeTransfer(to, amount);
        }
        
        return true;
    }

    function changeManager(address newmanager) public onlyManager whenNotPaused {
        require(newmanager != address(0), "New manager address is empty");
        
        manager = newmanager;
    }

    function tokenFallback(address from, uint256 amount, bytes memory) public whenNotPaused returns (bool) {
        //TODO add validations and manage callback from contracts correctly
        //TODO If its a mirror contract created by us we should brun the tokens and sent then back. If not we shoulld add it to the pending trasnfer
        address originalTokenAddress = originalTokens[msg.sender];
        require(originalTokenAddress != address(0), "Sender is not one of the crossed token contracts");
        SideToken sideToken = SideToken(msg.sender);
        emit Cross(originalTokenAddress, getMappedAddress(from), amount, ERC20Detailed(originalTokenAddress).symbol());
        sideToken.burn(amount);
        return true;
    }

    function mapAddress(address to) public whenNotPaused {
        mappedAddresses[msg.sender] = to;
    }

    function getMappedAddress(address account) public view returns (address) {
        address mapped = mappedAddresses[account];

        if (mapped == address(0))
            return account;

        return mapped;
    }

    function validateToken(ERC20Detailed tokenToUse) private view {
        require(tokenToUse.decimals() == 18, "Token has decimals other than 18");
        require(bytes(tokenToUse.symbol()).length != 0, "Token doesn't have symbol");
    }

    function receiveTokens(ERC20Detailed tokenToUse, uint256 amount) public whenNotPaused returns (bool) {
        //TODO should we accept  that people call receiveTokens with the SideToken???
        validateToken(tokenToUse);
        tokenToUse.safeTransferFrom(msg.sender, address(this), amount);
        
        if (isSideToken(address(tokenToUse))) {
            SideToken(address(tokenToUse)).burn(amount);
            emit Cross(originalTokens[address(tokenToUse)], getMappedAddress(msg.sender), amount, tokenToUse.symbol());
        }
        else {
            knownTokens[address(tokenToUse)] = true;            
            emit Cross(address(tokenToUse), getMappedAddress(msg.sender), amount, tokenToUse.symbol());
        }

        return true;
    }
    
    function isSideToken(address token) private view returns (bool) {
        return originalTokens[token] != address(0);
    }
    
    function isMappedToken(address token) private view returns (bool) {
        return address(mappedTokens[token]) != address(0);
    }
}

