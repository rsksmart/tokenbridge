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
    uint256 public lastCrossEventBlock;
    uint256 public blocksBetweenCrossEvents;
    uint256 public minimumPedingTransfersCount;

    mapping (address => SideToken) public mappedTokens;
    mapping (address => address) public originalTokens;
    mapping (address => bool) public knownTokens;
    
    mapping (address => address) public mappedAddresses;

    struct TransferStruct {
        address token;
        address receiver;
        uint256 amount;
        string symbol;
    }
    
    uint256 public pendingTransfersCount;
    TransferStruct[] public pendingTransferStruct;
    
    event Token(address indexed token, string symbol);
    event Cross(address indexed _tokenAddress, address indexed _to, uint256 _amount);

    modifier onlyManager() {
        require(msg.sender == manager, "Sender is not the manager");
        _;
    }

    constructor(address _manager, uint8 _symbolPrefix, uint256 _blocksBetweenCrossEvents, uint256 _minimumPedingTransfersCount) public {
        require(_manager != address(0), "Empty manager");
        require(_symbolPrefix != 0, "Empty symbol prefix");
        manager = _manager;
        symbolPrefix = _symbolPrefix;
        pendingTransfersCount = 0;
        blocksBetweenCrossEvents = _blocksBetweenCrossEvents;
        minimumPedingTransfersCount = _minimumPedingTransfersCount;
    }

    function onTokenTransfer(address to, uint256 amount, bytes memory data) public whenNotPaused returns (bool success) {
        return tokenFallback(to, amount, data);
    }

    function addPendingTransfer(ERC20Detailed fromToken, address to, uint256 amount) private whenNotPaused {
        validateToken(fromToken);
        //TODO should group by address and sender
        pendingTransferStruct.push(TransferStruct(address(fromToken), to, amount, fromToken.symbol()));
        pendingTransfersCount++;
    }

    function emitEvent() public whenNotPaused returns (bool success) {
        //TODO add validations
        if(block.number > lastCrossEventBlock + blocksBetweenCrossEvents || pendingTransfersCount > minimumPedingTransfersCount ) {
            for(uint256 i = 0; i < pendingTransfersCount; i++) {
                TransferStruct memory transfer = pendingTransferStruct[i];
                address token = transfer.token;
                
                if (originalTokens[token] != address(0))
                    token = originalTokens[token];
                else if (!knownTokens[token]) {
                    emit Token(token, ERC20Detailed(token).symbol());
                    knownTokens[token] = true;
                }
                    
                emit Cross(token, getMappedAddress(transfer.receiver), transfer.amount);
                
                delete pendingTransferStruct[i];
            }
            
            pendingTransfersCount = 0;
            lastCrossEventBlock = block.number;
            
            return true;
        }
        
        return false;
    }
    
    function processToken(address token, string memory symbol) public onlyManager whenNotPaused returns (bool) {
        SideToken sideToken = mappedTokens[token];
        
        if (address(sideToken) == address(0)) {
            string memory newSymbol = string(abi.encodePacked(symbolPrefix, symbol));
            sideToken = new SideToken(newSymbol, newSymbol);
            mappedTokens[token] = sideToken;
            originalTokens[address(sideToken)] = token;
        }
        
        return true;
    }

    function acceptTransfer(address tokenAddress, address receiver, uint256 amount)
        public onlyManager whenNotPaused returns(bool) {
        address to = getMappedAddress(receiver);

        if (isMappedToken(tokenAddress)) {
            SideToken sideToken = mappedTokens[tokenAddress];
            require(sideToken.mint(to, amount));
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
        addPendingTransfer(ERC20Detailed(originalTokenAddress), from, amount);
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
        addPendingTransfer(tokenToUse, msg.sender, amount);
        
        if (isSideToken(address(tokenToUse)))
            SideToken(address(tokenToUse)).burn(amount);
            
        return true;
    }
    
    function isSideToken(address token) private returns (bool) {
        return originalTokens[token] != address(0);
    }
    
    function isMappedToken(address token) private returns (bool) {
        return address(mappedTokens[token]) != address(0);
    }
}

