pragma solidity ^0.5.0;

// Import base Initializable contract
import "./zeppelin/upgradable/Initializable.sol";
// Import interface and library from OpenZeppelin contracts
import "./zeppelin/upgradable/utils/ReentrancyGuard.sol";
import "./zeppelin/upgradable/lifecycle/UpgradablePausable.sol";
import "./zeppelin/upgradable/ownership/UpgradableOwnable.sol";

import "./zeppelin/introspection/IERC1820Registry.sol";
import "./zeppelin/token/ERC20/IERC20.sol";
import "./zeppelin/token/ERC20/SafeERC20.sol";
import "./zeppelin/utils/Address.sol";
import "./zeppelin/math/SafeMath.sol";

import "./IBridge_v1.sol";
import "./SideToken_v1.sol";
import "./SideTokenFactory_v1.sol";
import "./AllowTokens.sol";

contract Bridge_v1 is Initializable, IBridge_v1, IERC777Recipient, UpgradablePausable, UpgradableOwnable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
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

    function initialize(address _manager, address _federation, address _allowTokens, address _sideTokenFactory, string memory _symbolPrefix)
    public initializer {
        require(bytes(_symbolPrefix).length > 0, "Bridge: Empty symbol prefix");
        require(_allowTokens != NULL_ADDRESS, "Bridge: AllowTokens address is empty");
        require(_manager != NULL_ADDRESS, "Bridge: Manager address is empty");
        require(_federation != NULL_ADDRESS, "Bridge: Federation address is empty");
        UpgradableOwnable.initialize(_manager);
        UpgradablePausable.initialize(_manager);
        symbolPrefix = _symbolPrefix;
        allowTokens = AllowTokens(_allowTokens);
        sideTokenFactory = SideTokenFactory_v1(_sideTokenFactory);
        _changeFederation(_federation);
        //keccak256("ERC777TokensRecipient")
        erc1820.setInterfaceImplementer(address(this), 0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b, address(this));
    }

    function version() external pure returns (string memory) {
        return "v1";
    }

    modifier onlyFederation() {
        require(msg.sender == federation, "Bridge: Caller not the Federation");
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
        require(decimals <= 18, "Bridge: Decimals not between 0 and 18");
        require(granularity > 0 && granularity <= MAX_GRANULARITY, "Bridge: Granularity not between 0 and 10^18");

        _processTransaction(blockHash, transactionHash, receiver, amount, logIndex);

        if (knownTokens[tokenAddress]) {
            _acceptCrossBackToToken(receiver, tokenAddress, decimals, granularity, amount);
        } else {
            _acceptCrossToSideToken(receiver, tokenAddress, decimals, granularity, amount, symbol);
        }
        return true;
    }

    function _acceptCrossToSideToken(address receiver, address tokenAddress, uint8 decimals, uint256 granularity, uint256 amount,
    string memory symbol) private {
        uint256 formattedAmount;
        uint256 calculatedGranularity;
        if(decimals == 18) {
            //tokenAddress is a ERC20 with 18 decimals should have 1 granularity
            //tokenAddress is a ERC777 token we give the same granularity
            calculatedGranularity = granularity;
            formattedAmount = amount;
        } else {
            //tokenAddress is a ERC20 with other than 18 decimals
            calculatedGranularity = decimalsToGranularity(decimals);
            formattedAmount = amount.mul(calculatedGranularity);
        }
        uint8 calculatedDecimals = 18;

        SideToken_v1 sideToken = mappedTokens[tokenAddress];
        if (address(sideToken) == NULL_ADDRESS) {
            sideToken = _createSideToken(tokenAddress, symbol, calculatedGranularity);
        } else {
            require(calculatedGranularity == sideToken.granularity(), "Bridge: Granularity differ from side token");
        }
        sideToken.mint(receiver, formattedAmount, "", "");
        // solium-disable-next-line max-len
        emit AcceptedCrossTransfer(tokenAddress, receiver, amount, decimals, granularity, formattedAmount, calculatedDecimals, calculatedGranularity);
    }

    function _acceptCrossBackToToken(address receiver, address tokenAddress, uint8 decimals, uint256 granularity, uint256 amount) private {
        require(decimals == 18, "Bridge: Invalid decimals cross back");
        require(granularity > 0 && granularity <= MAX_GRANULARITY, "Bridge: Invalid granularity crossing back");
        uint8 tokenDecimals = getDecimals(tokenAddress);
        //As side tokens are ERC777 we need to convert granularity to decimals
        uint8 calculatedDecimals = granularityToDecimals(granularity);
        require(tokenDecimals == calculatedDecimals, "Bridge: Decimals differ from original");
        uint256 formattedAmount = amount.div(granularity);
        IERC20(tokenAddress).safeTransfer(receiver, formattedAmount);
        // solium-disable-next-line max-len
        emit AcceptedCrossTransfer(tokenAddress, receiver, amount, decimals, granularity, formattedAmount, calculatedDecimals, 1);
    }

    function decimalsToGranularity(uint8 decimals) public pure returns (uint256) {
        return uint256(10)**(18-decimals);
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
        address sender = _msgSender();
        require(!sender.isContract(), "Bridge: Sender can't be a contract");
        sendIncentiveToEventsCrossers(msg.value);
        //Transfer the tokens on IERC20, they should be already Approved for the bridge Address to use them
        IERC20(tokenToUse).safeTransferFrom(_msgSender(), address(this), amount);
        crossTokens(tokenToUse, _msgSender(), amount, "");
        return true;
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
        require(to == address(this), "Bridge: Not destination address");
        require(crossingPayment == 0, "Bridge: Needs payment");
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
        require(payment >= crossingPayment, "Bridge: Insufficient crossingPayment");
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

        string memory symbol = getSymbol(tokenToUse);
        uint8 decimals = getDecimals(tokenToUse);
        uint256 granularity = getGranularity(tokenToUse);

        emit Cross(tokenToUse, from, amount, symbol, userData, decimals, granularity);
    }

    function getSymbol(address tokenToUse) private view returns (string memory) {
        //support 32 bytes or string symbol
        (bool success, bytes memory data) = tokenToUse.staticcall(abi.encodeWithSignature("symbol()"));
        require(success, "Bridge: Token hasn't symbol()");
        require(data.length != 0, "Bridge: Token empty symbol");
        if (data.length == 32) {
            return bytes32ToString(abi.decode(data, (bytes32)));
        }
        return abi.decode(data, (string));
    }

    function getDecimals(address tokenToUse) private view returns (uint8 decimals) {
        //support decimals as uint256 or uint8
        (bool success, bytes memory data) = tokenToUse.staticcall(abi.encodeWithSignature("decimals()"));
        require(success, "Bridge: No decimals");
        require(data.length == 1 || data.length == 32, "Bridge: Decimals not uint8 or uint256");
        if (data.length == 1) {
            decimals = abi.decode(data, (uint8));
        } else if (data.length == 32) {
            decimals = uint8(abi.decode(data, (uint256)));
        }
        require(decimals <= 18, "Bridge: Decimals not between 0 and 18");
        return decimals;
    }

    function getGranularity(address tokenToUse) private view returns (uint256 granularity) {
        //support granularity if ERC777
        (bool success, bytes memory data) = tokenToUse.staticcall(abi.encodeWithSignature("granularity()"));
        granularity = 1;
        if(success) {
            granularity = abi.decode(data, (uint256));
            require(granularity > 0 && granularity <= MAX_GRANULARITY, "Bridge: Invalid granularity");
        }
        return granularity;
    }

    /* bytes32 (fixed-size array) to string (dynamically-sized array) */
    function bytes32ToString(bytes32 _bytes32) public pure returns (string memory) {
        uint8 i = 0;
        while(i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }


    function _createSideToken(address token, string memory symbol, uint256 granularity) private returns (SideToken_v1){
        string memory newSymbol = string(abi.encodePacked(symbolPrefix, symbol));
        address sideTokenAddress = sideTokenFactory.createSideToken(newSymbol, newSymbol, granularity);
        SideToken_v1 sideToken = SideToken_v1(sideTokenAddress);
        mappedTokens[token] = sideToken;
        originalTokens[sideTokenAddress] = token;
        emit NewSideToken(sideTokenAddress, token, newSymbol, granularity);
        return sideToken;
    }

    function verifyWithAllowTokens(address tokenToUse, uint256 amount, bool isASideToken) private  {
        // solium-disable-next-line security/no-block-members
        if (now > lastDay + 24 hours) {
            // solium-disable-next-line security/no-block-members
            lastDay = now;
            spentToday = 0;
        }
        // solium-disable-next-line max-len
        require(allowTokens.isValidTokenTransfer(tokenToUse, amount, spentToday, isASideToken), "Bridge: Bigger than limits");
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
        require(!processed[compiledId], "Bridge: Already processed");
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

