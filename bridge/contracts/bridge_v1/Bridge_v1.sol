pragma solidity ^0.5.0;

// Import base Initializable contract
import "../zeppelin/upgradable/Initializable.sol";
// Import interface and library from OpenZeppelin contracts
import "../zeppelin/upgradable/utils/ReentrancyGuard.sol";
import "../zeppelin/upgradable/lifecycle/UpgradablePausable.sol";
import "../zeppelin/upgradable/ownership/UpgradableOwnable.sol";

import "../zeppelin/introspection/IERC1820Registry.sol";
import "../zeppelin/token/ERC20/ERC20Detailed.sol";
import "../zeppelin/token/ERC20/SafeERC20.sol";
import "../zeppelin/utils/Address.sol";
import "../zeppelin/math/SafeMath.sol";

import "./IBridge_v1.sol";
import "./SideToken_v1.sol";
import "./SideTokenFactory_v1.sol";
import "../AllowTokens.sol";

contract Bridge_v1 is Initializable, IBridge_v1, IERC777Recipient, UpgradablePausable, UpgradableOwnable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20Detailed;
    using Address for address;

    address constant private NULL_ADDRESS = address(0);
    bytes32 constant private NULL_HASH = bytes32(0);
    IERC1820Registry constant private erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    address private federation;
    uint256 private crossingPayment;
    string public symbolPrefix;
    uint256 public lastDay;
    uint256 public spentToday;

    mapping (address => SideToken_v1) public mappedTokens; // OirignalToken => SideToken
    mapping (address => address) public originalTokens; // SideToken => OriginalToken
    mapping (address => bool) public knownTokens; // OriginalToken => true
    mapping(bytes32 => bool) processed; // ProcessedHash => true
    AllowTokens public allowTokens;
    SideTokenFactory_v1 public sideTokenFactory;
    //Bridge_v1 variables
    uint256 constant private MAX_GRANULARITY = 1000000000000000000;

    event FederationChanged(address _newFederation);

    function initialize(address _manager, address _federation, address _allowTokens, string memory _symbolPrefix)
    public initializer {
        require(bytes(_symbolPrefix).length > 0, "Bridge: Empty symbol prefix");
        require(_allowTokens != NULL_ADDRESS, "Bridge: Missing AllowTokens contract address");
        require(_manager != NULL_ADDRESS, "Bridge: Manager address is empty");
        require(_federation != NULL_ADDRESS, "Bridge: Federation address is empty");
        UpgradableOwnable.initialize(_manager);
        UpgradablePausable.initialize(_manager);
        symbolPrefix = _symbolPrefix;
        allowTokens = AllowTokens(_allowTokens);
        // solium-disable-next-line security/no-block-members
        lastDay = now;
        spentToday = 0;
        _changeFederation(_federation);
        //keccak256("ERC777TokensRecipient")
        erc1820.setInterfaceImplementer(address(this), 0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b, address(this));
    }

    function version() external pure returns (string memory) {
        return "v1";
    }

    modifier onlyFederation() {
        require(msg.sender == federation, "Bridge: Caller is not the Federation");
        _;
    }

    function acceptTransfer(
        address tokenAddress,
        address receiver,
        uint256 amount,
        string calldata symbol,
        bytes32 blockHash,
        bytes32 transactionHash,
        uint32 logIndex,
        uint8 decimals,
        uint256 granularity
    ) external onlyFederation whenNotPaused nonReentrant returns(bool) {
        require(tokenAddress != NULL_ADDRESS, "Bridge: Token Address cant be null");
        require(receiver != NULL_ADDRESS, "Bridge: Receiver Address cant be null");
        require(amount > 0, "Bridge: Amount cant be 0");
        require(bytes(symbol).length > 0, "Bridge: Symbol cant be empty");
        require(blockHash != NULL_HASH, "Bridge: Block Hash cant be null");
        require(transactionHash != NULL_HASH, "Bridge: Transaction Hash cant be null");
        require(decimals >= 0 && decimals <= 18, "Bridge: Decimals not between 0 and 18");
        require(granularity >= 0 && granularity <= MAX_GRANULARITY, "Bridge: Granularity not between 0 and 10^18");

        _processTransaction(blockHash, transactionHash, receiver, amount, logIndex);

        if (knownTokens[tokenAddress]) {
            _acceptCrossBackToToken(receiver, tokenAddress, decimals, granularity, amount);
        } else {
            createSideToken(tokenAddress, symbol, decimals);
            _acceptCrossToSideToken(receiver, tokenAddress, decimals, granularity, amount);
        }
        return true;
    }

    function _acceptCrossToSideToken(address receiver, address tokenAddress, uint8 decimals, uint256 granularity, uint256 amount)
    private returns (uint256 formattedAmount, uint8 calculatedDecimals, uint256 calculatedGranularity) {
        SideToken_v1 sideToken = mappedTokens[tokenAddress];
        uint256 tokenGranularity = sideToken.granularity();
        if(decimals == 18) {
            if(granularity == 0) {
                //tokenAddress is a ERC20 with 18 decimals
                calculatedGranularity = 1;
            } else {
                //tokenAddress is a ERC777 token
                calculatedGranularity = granularity;
            }
            formattedAmount = amount;
        } else {
            //tokenAddress is a ERC20 with other than 18 decimals
            calculatedGranularity = uint256(10)**(18-decimals);
            formattedAmount = amount.mul(granularity);
        }
        calculatedDecimals = 18;
        require(calculatedGranularity == tokenGranularity, "Bridge: granularity does not match the side token granularity");
        sideToken.mint(receiver, formattedAmount, "", "");
        // solium-disable-next-line max-len
        emit AcceptedCrossTransfer(tokenAddress, receiver, amount, decimals, granularity, formattedAmount, calculatedDecimals, calculatedGranularity);
    }

    function _acceptCrossBackToToken(address receiver, address tokenAddress, uint8 decimals, uint256 granularity, uint256 amount)
    private returns (uint256 formattedAmount, uint8 calculatedDecimals, uint256 calculatedGranularity) {
        require(decimals == 18, "Bridge: Crossing back token doesn't have 18 decimals");
        require(granularity > 0 && granularity <= MAX_GRANULARITY, "Bridge: Crossing back token doesn't have valid granularity");
        ERC20Detailed token = ERC20Detailed(tokenAddress);
        uint8 tokenDecimals = token.decimals();
        //As side tokens are ERC777 we need to convert granularity to decimals
        calculatedDecimals = granularityToDecimals(granularity);
        require(tokenDecimals == calculatedDecimals, "Bridge: decimals does not match the original token");
        calculatedGranularity = 1;
        formattedAmount = amount.div(granularity);
        token.safeTransfer(receiver, formattedAmount);
        // solium-disable-next-line max-len
        emit AcceptedCrossTransfer(tokenAddress, receiver, amount, decimals, granularity, formattedAmount, calculatedDecimals, calculatedGranularity);
    }

    function granularityToDecimals(uint256 granularity) public pure returns (uint8) {
        if(granularity == 1) return 18;
        if(granularity == 10) return 17;
        if(granularity == 100) return 16;
        if(granularity == 1000) return 15;
        if(granularity == 10000) return 14;
        if(granularity == 100000) return 13;
        if(granularity == 1000000) return 12;
        if(granularity == 10000000) return 11;
        if(granularity == 100000000) return 10;
        if(granularity == 1000000000) return 9;
        if(granularity == 10000000000) return 8;
        if(granularity == 100000000000) return 7;
        if(granularity == 1000000000000) return 6;
        if(granularity == 10000000000000) return 5;
        if(granularity == 100000000000000) return 4;
        if(granularity == 1000000000000000) return 3;
        if(granularity == 10000000000000000) return 2;
        if(granularity == 100000000000000000) return 1;
        if(granularity == 1000000000000000000) return 0;
    }

    /**
     * ERC-20 tokens approve and transferFrom pattern
     * See https://eips.ethereum.org/EIPS/eip-20#transferfrom
     */
    function receiveTokens(address tokenToUse, uint256 amount) external payable whenNotPaused nonReentrant returns(bool) {
        verifyIsERC20Detailed(tokenToUse);
        address sender = _msgSender();
        require(!sender.isContract(), "Bridge: Contracts can't cross tokens using their addresses as destination");
        sendIncentiveToEventsCrossers(msg.value);
        //Transfer the tokens on IERC20, they should be already Approved for the bridge Address to use them
        ERC20Detailed(tokenToUse).safeTransferFrom(_msgSender(), address(this), amount);
        crossTokens(tokenToUse, _msgSender(), amount, "");
        return true;
    }

    /**
     * ERC-677 implementation for Receiving Tokens Contracts
     * See https://github.com/ethereum/EIPs/issues/677 for details
     */
    function onTokenTransfer(address from, uint amount, bytes calldata userData) external whenNotPaused nonReentrant returns (bool) {
        return _tokenFallback(from, amount, userData);
    }

    function _tokenFallback(address from, uint amount, bytes memory userData) private returns (bool) {
        require(crossingPayment == 0, "Bridge: Needs payment, use receiveTokens instead");
        verifyIsERC20Detailed(_msgSender());
        //This can only be used with trusted contracts
        crossTokens(_msgSender(), from, amount, userData);
        return true;
    }

    /**
     * ERC-223 implementation for Receiving Tokens Contracts
     * See https://github.com/ethereum/EIPs/issues/223 for details
     */
    function tokenFallback(address from, uint amount, bytes calldata userData) external whenNotPaused nonReentrant returns (bool) {
        return _tokenFallback(from, amount, userData);
    }

    /**
     * ERC-777 tokensReceived hook allows to send tokens to a contract and notify it in a single transaction
     * See https://eips.ethereum.org/EIPS/eip-777#motivation for details
     */
    function tokensReceived (
        address operator,
        address from,
        address to,
        uint amount,
        bytes calldata userData,
        bytes calldata
    ) external whenNotPaused {
        //Hook from ERC777address
        if(operator == address(this)) return; // Avoid loop from bridge calling to ERC77transferFrom
        require(to == address(this), "Bridge: This contract is not the address receiving the tokens");
        require(crossingPayment == 0, "Bridge: Needs payment, use receiveTokens instead");
        verifyIsERC20Detailed(_msgSender());
        //This can only be used with trusted contracts
        crossTokens(_msgSender(), from, amount, userData);
    }

    function crossTokens(address tokenToUse, address from, uint256 amount, bytes memory userData) private {
        bool _isSideToken = isSideToken(tokenToUse);
        verifyWithAllowTokens(tokenToUse, amount, _isSideToken);
        if (_isSideToken) {
            sideTokenCrossingBack(from, SideToken_v1(tokenToUse), amount, userData);
        } else {
            mainTokenCrossing(from, tokenToUse, amount, userData);
        }
    }

    function sendIncentiveToEventsCrossers(uint256 payment) private {
        require(payment >= crossingPayment, "Bridge: Insufficient coins sent for crossingPayment");
        //Send the payment to the MultiSig of the Federation
        if(payment > 0) {
            address payable receiver = address(uint160(owner()));
            receiver.transfer(payment);
        }
    }

    function sideTokenCrossingBack(address from, SideToken_v1 tokenToUse, uint256 amount, bytes memory userData) private {
        tokenToUse.burn(amount, userData);
        // solium-disable-next-line max-len
        emit Cross(originalTokens[address(tokenToUse)], from, amount, tokenToUse.symbol(), userData, tokenToUse.decimals(), tokenToUse.granularity());
    }

    function mainTokenCrossing(address from, address tokenToUse, uint256 amount, bytes memory userData) private {
        knownTokens[tokenToUse] = true;
        ERC20Detailed token = ERC20Detailed(tokenToUse);
        //TODO support 32 bytes symbol
        //TODO support decimals as uint256
        //TODO support granularity if ERC777
        emit Cross(tokenToUse, from, amount, token.symbol(), userData, token.decimals(), 1);
    }

    function createSideToken(address token, string memory symbol, uint8 decimals) private {
        if (address(mappedTokens[token]) == NULL_ADDRESS) {
            string memory newSymbol = string(abi.encodePacked(symbolPrefix, symbol));
            uint256 granularity = uint256(10)**(decimals - 18);
            address sideTokenAddress = sideTokenFactory.createSideToken(newSymbol, newSymbol, granularity);
            mappedTokens[token] = SideToken_v1(sideTokenAddress);
            originalTokens[sideTokenAddress] = token;
            emit NewSideToken(sideTokenAddress, token, newSymbol, granularity);
        }
    }

    function verifyIsERC20Detailed(address tokenToUse) private view {
        ERC20Detailed detailedTokenToUse = ERC20Detailed(tokenToUse);
        uint8 decimals = detailedTokenToUse.decimals();
        require(decimals >= 0 && decimals <= 18, "Bridge: Token does not have decimals  between 0 and 18");
        require(bytes(detailedTokenToUse.symbol()).length != 0, "Bridge: Token doesn't have a symbol");
    }

    function verifyWithAllowTokens(address tokenToUse, uint256 amount, bool isASideToken) private  {
        // solium-disable-next-line security/no-block-members
        if (now > lastDay + 24 hours) {
            // solium-disable-next-line security/no-block-members
            lastDay = now;
            spentToday = 0;
        }
        // solium-disable-next-line max-len
        require(allowTokens.isValidTokenTransfer(tokenToUse, amount, spentToday, isASideToken), "Bridge: Transfer doesn't comply with AllowTokens limits");
        spentToday = spentToday.add(amount);
    }

    function isSideToken(address token) public view returns (bool) {
        return originalTokens[token] != NULL_ADDRESS;
    }

    function getTransactionId(
        bytes32 _blockHash,
        bytes32 _transactionHash,
        address _receiver,
        uint256 _amount,
        uint32 _logIndex
    )
        public pure returns(bytes32)
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
        bytes32 compiledId = getTransactionId(_blockHash, _transactionHash, _receiver, _amount, _logIndex);

        return processed[compiledId];
    }

    function _processTransaction(
        bytes32 _blockHash,
        bytes32 _transactionHash,
        address _receiver,
        uint256 _amount,
        uint32 _logIndex
    )
        private
    {
        bytes32 compiledId = getTransactionId(_blockHash, _transactionHash, _receiver, _amount, _logIndex);
        require(!processed[compiledId], "Bridge: Transaction was already processed");
        processed[compiledId] = true;
    }

    function setCrossingPayment(uint amount) external onlyOwner whenNotPaused {
        crossingPayment = amount;
        emit CrossingPaymentChanged(crossingPayment);
    }

    function getCrossingPayment() external view returns(uint) {
        return crossingPayment;
    }

    function calcMaxWithdraw() external view returns (uint) {
        uint spent = spentToday;
        // solium-disable-next-line security/no-block-members
        if (now > lastDay + 24 hours)
            spent = 0;
        return allowTokens.calcMaxWithdraw(spent);
    }

    function _changeFederation(address newFederation) private {
        federation = newFederation;
        emit FederationChanged(federation);
    }

    function changeFederation(address newFederation) external onlyOwner whenNotPaused {
        _changeFederation(newFederation);
    }

    function getFederation() external view returns(address) {
        return federation;
    }

}

