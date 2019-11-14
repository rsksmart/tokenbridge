pragma solidity ^0.5.0;

// Import base Initializable contract
import "@openzeppelin/upgrades/contracts/Initializable.sol";
// Import interface and library from OpenZeppelin contracts
import "./zeppelin/upgradable/lifecycle/UpgradablePausable.sol";
import "./zeppelin/upgradable/ownership/UpgradableOwnable.sol";

import "./zeppelin/token/ERC20/ERC20Detailed.sol";
import "./zeppelin/token/ERC20/SafeERC20.sol";
import "./zeppelin/math/SafeMath.sol";

import "./IBridge.sol";
import "./SideToken.sol";
import "./SideTokenFactory.sol";
import "./IAllowTokens.sol";

contract Bridge_v0 is Initializable, IBridge, UpgradablePausable, UpgradableOwnable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20Detailed;

    uint8 public symbolPrefix;
    uint256 public crossingPayment;

    mapping (address => SideToken) public mappedTokens;
    mapping (address => address) public originalTokens;
    mapping (address => bool) public knownTokens;
    mapping (address => address) public mappedAddresses;
    mapping(bytes32 => bool) processed;
    IAllowTokens allowTokens;
    SideTokenFactory sideTokenFactory;

    event Cross(address indexed _tokenAddress, address indexed _to, uint256 _amount, string _symbol);
    event NewSideToken(address indexed _newSideTokenAddress, address indexed _originalTokenAddress, string _symbol);
    event AcceptedCrossTransfer(address indexed _tokenAddress, address indexed _to, uint256 _amount);
    event CrossingPaymentChanged(uint256 _amount);

    function initialize(address _manager, address _allowTokens, address _sideTokenFactory, uint8 _symbolPrefix) public initializer {
        require(_symbolPrefix != 0, "Empty symbol prefix");
        require(_allowTokens != address(0), "Missing AllowTokens contract address");
        require(_manager != address(0), "Manager is empty");
        //UpgradableOwnable.initialize(_manager);
        //UpgradablePausable.initialize(_manager);
        symbolPrefix = _symbolPrefix;
        allowTokens = IAllowTokens(_allowTokens);
        sideTokenFactory = SideTokenFactory(_sideTokenFactory);
    }

    function version() public pure returns (string memory) {
        return "v0";
    }

    function receiveTokens(ERC20Detailed tokenToUse, uint256 amount) public payable whenNotPaused returns (bool) {
        validateAndCreateCrossEvent(address(tokenToUse), amount, msg.value);
        //Transfer the tokens on ERC20
        tokenToUse.safeTransferFrom(msg.sender, address(this), amount);
        sendIncentiveToEventsCrossers(msg.value);
        return true;
    }

    function sendIncentiveToEventsCrossers(uint256 payment) private {
        //Send the payment to the MultiSig of the Federation
        address payable receiver = address(uint160(owner()));
        receiver.transfer(payment);
    }

    function validateAndCreateCrossEvent(address tokenToUse, uint256 amount, uint256 payment) private {
        validateToken(tokenToUse, amount, payment);
        if (isSideToken(tokenToUse)) {
            (SideToken(tokenToUse)).operatorBurn(msg.sender, amount, '', '');
            emit Cross(originalTokens[tokenToUse], getMappedAddress(msg.sender), amount, (ERC20Detailed(tokenToUse)).symbol());
        }
        else {
            knownTokens[tokenToUse] = true;
            emit Cross(tokenToUse, getMappedAddress(msg.sender), amount, (ERC20Detailed(tokenToUse)).symbol());
        }
    }

    //TODO ERC777 does not sent currency here, we should change that
    //Also we should implement tokenSender to verify if the amount sent is correct
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint amount,
        bytes memory userData,
        bytes memory operatorData
    ) public payable whenNotPaused returns (bool) {
        //Hook from ERC777
        require(to == address(this), "This contract is not the address recieving the tokens");
        //TODO add Balance check
        validateAndCreateCrossEvent(msg.sender, amount, msg.value);
        sendIncentiveToEventsCrossers(msg.value);
    }

    function acceptTransfer(
        address tokenAddress,
        address receiver,
        uint256 amount,
        string memory symbol,
        bytes32 blockHash,
        bytes32 transactionHash,
        uint32 logIndex
    ) public onlyOwner whenNotPaused returns(bool) {
        require(allowTokens.isTokenAllowed(tokenAddress), "Token is not allowed for transfer");
        require(amount <= allowTokens.getMaxTokensAllowed(), "The amount of tokens to transfer is greater than allowed");
        require(!transactionWasProcessed(blockHash, transactionHash, receiver, amount, logIndex), "Transaction already processed");

        processToken(tokenAddress, symbol);
        processTransaction(blockHash, transactionHash, receiver, amount, logIndex);

        address to = getMappedAddress(receiver);
        if (isMappedToken(tokenAddress)) {
            SideToken sideToken = mappedTokens[tokenAddress];
            sideToken.operatorMint(to, amount, "", "");
        }
        else {
            require(knownTokens[tokenAddress], "Token address is not in knownTokens");
            ERC20Detailed token = ERC20Detailed(tokenAddress);
            token.safeTransfer(to, amount);
        }
        emit AcceptedCrossTransfer(tokenAddress, to, amount);
        return true;
    }

    function onTokenTransfer(address to, uint256 amount, bytes memory data) public returns (bool success) {
        return tokenFallback(to, amount, data);
    }

    function processToken(address token, string memory symbol) private onlyOwner whenNotPaused {
        if (knownTokens[token])
            return;

        SideToken sideToken = mappedTokens[token];

        if (address(sideToken) == address(0)) {
            string memory newSymbol = string(abi.encodePacked(symbolPrefix, symbol));
            // sideToken = new SideToken(newSymbol, newSymbol);
            sideToken = sideTokenFactory.createSideToken(newSymbol, newSymbol);
            mappedTokens[token] = sideToken;
            address sideTokenAddress = address(sideToken);
            originalTokens[sideTokenAddress] = token;
            emit NewSideToken(sideTokenAddress, token, newSymbol);
        }
    }

    function tokenFallback(address from, uint256 amount, bytes memory) public whenNotPaused returns (bool) {
        //TODO add validations and manage callback from contracts correctly
        //TODO If its a mirror contract created by us we should brun the tokens and sent then back. If not we shoulld add it to the pending trasnfer
        address originalTokenAddress = originalTokens[msg.sender];
        require(originalTokenAddress != address(0), "Sender is not one of the crossed token contracts");
        SideToken sideToken = SideToken(msg.sender);
        sideToken.operatorBurn(msg.sender, amount, '', '');
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

    function validateToken(address tokenToUse, uint256 amount, uint256 payment) private view {
        ERC20Detailed detailedTokenToUse = ERC20Detailed(tokenToUse);
        require(detailedTokenToUse.decimals() == 18, "Token has decimals other than 18");
        require(bytes(detailedTokenToUse.symbol()).length != 0, "Token doesn't have a symbol");
        require(amount <= allowTokens.getMaxTokensAllowed(), "The amount of tokens to transfer is greater than allowed");
        require(payment >= crossingPayment, "Insufficient coins sent for crossingPayment");
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
        private
    {
        bytes32 compiledId = getTransactionCompiledId(_blockHash, _transactionHash, _receiver, _amount, _logIndex);

        processed[compiledId] = true;
    }

    function setCrossingPayment(uint amount) public onlyOwner whenNotPaused {
        crossingPayment = amount;
        emit CrossingPaymentChanged(crossingPayment);
    }
}

