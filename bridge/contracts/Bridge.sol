pragma solidity >=0.4.21 <0.6.0;

import "./zeppelin/token/ERC20/ERC20Detailed.sol";
import "./zeppelin/token/ERC20/SafeERC20.sol";
import "./zeppelin/lifecycle/Pausable.sol";
import "./zeppelin/ownership/Ownable.sol";
import "./zeppelin/math/SafeMath.sol";
import "./ERC677TransferReceiver.sol";
import "./IBridge.sol";
import "./SideToken.sol";

contract Bridge is IBridge, ERC677TransferReceiver, Pausable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20Detailed;

    address public manager;
    uint8 public symbolPrefix;
    uint public crossingPayment;

    mapping (address => SideToken) public mappedTokens;
    mapping (address => address) public originalTokens;
    mapping (address => bool) public knownTokens;
    mapping (address => address) public mappedAddresses;
    mapping(bytes32 => bool) processed;
    address[] public allowedTokens;
    bool public validateAllowedTokens = false;

    event Cross(address indexed _tokenAddress, address indexed _to, uint256 _amount, string _symbol);
    event NewSideToken(address indexed _newSideTokenAddress, address indexed _originalTokenAddress, string _symbol);
    event AcceptedCrossTransfer(address indexed _tokenAddress, address indexed _to, uint256 _amount);
    event CrossingPaymentChanged(uint256 _amount);
    event ManagmentTransferred(address indexed _previousManager, address indexed _newManager);
    event AllowedTokenAdded(address indexed _tokenAddress);
    event AllowedTokenRemoved(address indexed _tokenAddress);
    event AllowedTokenValidation(bool _enabled);

    modifier onlyManager() {
        require(msg.sender == manager, "Sender is not the manager");
        _;
    }

    modifier onlyAllowedTokens(address token) {
        require(isTokenAllowed(token), "Token is not allowed for transfer");
        _;
    }

    modifier tokenExists(address token) {
        require(allowedTokenExist(token), "Token already exist");
        _;
    }

    modifier tokenDoesNotExist(address token) {
        require(!allowedTokenExist(token), "Token does not exist");
        _;
    }

    modifier notNull(address _address) {
        require(_address != address(0), "Address cannot be empty");
        _;
    }

    constructor(address _manager, uint8 _symbolPrefix) public {
        require(_manager != address(0), "Empty manager");
        require(_symbolPrefix != 0, "Empty symbol prefix");
        manager = _manager;
        symbolPrefix = _symbolPrefix;
    }

    function receiveTokens(ERC20Detailed tokenToUse, uint256 amount) public payable whenNotPaused returns (bool) {
        validateToken(tokenToUse);
        require(msg.value >= crossingPayment, "Insufficient coins sent for crossingPayment");
        if (isSideToken(address(tokenToUse))) {
            SideToken(address(tokenToUse)).burn(amount);
            emit Cross(originalTokens[address(tokenToUse)], getMappedAddress(msg.sender), amount, tokenToUse.symbol());
        }
        else {
            knownTokens[address(tokenToUse)] = true;
            emit Cross(address(tokenToUse), getMappedAddress(msg.sender), amount, tokenToUse.symbol());
        }
        tokenToUse.safeTransferFrom(msg.sender, address(this), amount);
        address payable receiver = address(uint160(manager));
        receiver.transfer(msg.value);
        return true;
    }

    function acceptTransfer(
        address tokenAddress,
        address receiver,
        uint256 amount,
        string memory symbol,
        bytes32 blockHash,
        bytes32 transactionHash,
        uint32 logIndex
    )
        public onlyManager whenNotPaused onlyAllowedTokens(tokenAddress) returns(bool) {
        require(!transactionWasProcessed(blockHash, transactionHash, receiver, amount, logIndex), "Transaction already processed");

        processToken(tokenAddress, symbol);
        processTransaction(blockHash, transactionHash, receiver, amount, logIndex);

        address to = getMappedAddress(receiver);
        if (isMappedToken(tokenAddress)) {
            SideToken sideToken = mappedTokens[tokenAddress];
            require(sideToken.mint(to, amount), "Error minting on side token");
        }
        else {
            ERC20Detailed token = ERC20Detailed(tokenAddress);
            token.safeTransfer(to, amount);
        }
        emit AcceptedCrossTransfer(tokenAddress, to, amount);
        return true;
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
            address sideTokenAddress = address(sideToken);
            originalTokens[sideTokenAddress] = token;
            emit NewSideToken(sideTokenAddress, token, newSymbol);
        }
    }

    function setCrossingPayment(uint amount) public onlyManager whenNotPaused {
        crossingPayment = amount;
        emit CrossingPaymentChanged(crossingPayment);
    }

    function changeManager(address newmanager) public onlyManager whenNotPaused {
        require(newmanager != address(0), "New manager address is empty");
        address oldmanager = manager;
        manager = newmanager;
        emit ManagmentTransferred(newmanager, oldmanager);
    }

    function tokenFallback(address from, uint256 amount, bytes memory) public whenNotPaused returns (bool) {
        //TODO add validations and manage callback from contracts correctly
        //TODO If its a mirror contract created by us we should brun the tokens and sent then back. If not we shoulld add it to the pending trasnfer
        address originalTokenAddress = originalTokens[msg.sender];
        require(originalTokenAddress != address(0), "Sender is not one of the crossed token contracts");
        SideToken sideToken = SideToken(msg.sender);
        sideToken.burn(amount);
        emit Cross(originalTokenAddress, getMappedAddress(from), amount, ERC20Detailed(originalTokenAddress).symbol());
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

    function isSideToken(address token) private view returns (bool) {
        return originalTokens[token] != address(0);
    }

    function isMappedToken(address token) private view returns (bool) {
        return address(mappedTokens[token]) != address(0);
    }

    function getTransactionCompiledId(
        bytes32 _blockHash,
        bytes32 _transactionHash,
        address _receiver,
        uint256 _amount,
        uint32 _logIndex
    )
        private pure returns(bytes32)
    {
        return keccak256(abi.encodePacked(_blockHash, _transactionHash, _receiver, _amount, _logIndex));
    }

    function transactionWasProcessed(
        bytes32 _blockHash,
        bytes32 _transactionHash,
        address _receiver,
        uint256 _amount,
        uint32 _logIndex
    )
        public view returns(bool)
    {
        bytes32 compiledId = getTransactionCompiledId(_blockHash, _transactionHash, _receiver, _amount, _logIndex);

        return processed[compiledId];
    }

    function processTransaction(
        bytes32 _blockHash,
        bytes32 _transactionHash,
        address _receiver,
        uint256 _amount,
        uint32 _logIndex
    )
        private whenNotPaused
    {
        bytes32 compiledId = getTransactionCompiledId(_blockHash, _transactionHash, _receiver, _amount, _logIndex);

        processed[compiledId] = true;
    }

    function allowedTokenExist(address token) private view returns (bool) {
        if (token == address(0))
            return false;

        for (uint i; i < allowedTokens.length; i++) {
            if (allowedTokens[i] == token)
            return true;
        }
        return false;
    }

    function isTokenAllowed(address token) public view returns (bool) {
        if (validateAllowedTokens) {
            return allowedTokenExist(token);
        }
        return true;
    }

    function addAllowedToken(address token) public onlyManager notNull(token) tokenDoesNotExist(token) {
        allowedTokens.push(token);
        emit AllowedTokenAdded(token);
    }

    function removeAllowedToken(address token) public onlyManager tokenExists(token) {
        for (uint i = 0; i < allowedTokens.length - 1; i++)
            if (allowedTokens[i] == token) {
                allowedTokens[i] = allowedTokens[allowedTokens.length - 1];
                break;
            }
        allowedTokens.length -= 1;

        emit AllowedTokenRemoved(token);
    }

    function enableAllowedTokensValidation() public onlyManager {
        validateAllowedTokens = true;
        emit AllowedTokenValidation(validateAllowedTokens);
    }

    function disableAllowedTokensValidation() public onlyManager {
        validateAllowedTokens = false;
        emit AllowedTokenValidation(validateAllowedTokens);
    }
}

