pragma solidity ^0.5.0;

// Import base Initializable contract
import "./zeppelin/upgradable/Initializable.sol";
// Import interface and library from OpenZeppelin contracts
import "./zeppelin/upgradable/utils/ReentrancyGuard.sol";
import "./zeppelin/upgradable/lifecycle/UpgradablePausable.sol";
import "./zeppelin/upgradable/ownership/UpgradableOwnable.sol";

import "./zeppelin/introspection/IERC1820Registry.sol";
import "./zeppelin/token/ERC777/IERC777Recipient.sol";
import "./zeppelin/token/ERC20/IERC20.sol";
import "./zeppelin/token/ERC20/SafeERC20.sol";
import "./zeppelin/utils/Address.sol";
import "./zeppelin/math/SafeMath.sol";

import "./IBridge.sol";
import "./ISideToken.sol";
import "./ISideTokenFactory.sol";
import "./IAllowTokens.sol";
import "./Utils.sol";
import "./IWrapped.sol";

contract Bridge is Initializable, IBridge, IERC777Recipient, UpgradablePausable, UpgradableOwnable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Address for address;

    address constant private NULL_ADDRESS = address(0);
    bytes32 constant private NULL_HASH = bytes32(0);
    IERC1820Registry constant private erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    address private federation;
    uint256 private feePercentage;
    string public symbolPrefix;
    uint256 private _depprecatedLastDay;
    uint256 private _deprecatedSpentToday;

    mapping (address => ISideToken) public mappedTokens; // OirignalToken => SideToken
    mapping (address => address) public originalTokens; // SideToken => OriginalToken
    mapping (address => bool) public knownTokens; // OriginalToken => true
    mapping(bytes32 => bool) public processed; // ProcessedHash => true
    IAllowTokens public allowTokens;
    ISideTokenFactory public sideTokenFactory;
    //Bridge_v1 variables
    bool public isUpgrading;
    uint256 constant public feePercentageDivider = 10000; // Porcentage with up to 2 decimals
    //Bridge_v3 variables
    bytes32 constant private _erc777Interface = keccak256("ERC777Token");
    IWrapped public wrappedCurrency;

    event AllowTokensChanged(address _newAllowTokens);
    event FederationChanged(address _newFederation);
    event SideTokenFactoryChanged(address _newSideTokenFactory);
    event Upgrading(bool isUpgrading);
    event WrappedCurrencyChanged(address _wrappedCurrency);

    function initialize(
        address _manager,
        address _federation,
        address _allowTokens,
        address _sideTokenFactory,
        string memory _symbolPrefix
    ) public initializer {
        UpgradableOwnable.initialize(_manager);
        UpgradablePausable.initialize(_manager);
        symbolPrefix = _symbolPrefix;
        allowTokens = IAllowTokens(_allowTokens);
        sideTokenFactory = ISideTokenFactory(_sideTokenFactory);
        federation = _federation;
        //keccak256("ERC777TokensRecipient")
        erc1820.setInterfaceImplementer(address(this), 0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b, address(this));
    }

    function () external payable {
        // The fallback function is needed to use WRBTC
        require(_msgSender() == address(wrappedCurrency), "Bridge: sender not wrappedCurrency");
    }

    function version() external pure returns (string memory) {
        return "v3";
    }

    modifier whenNotUpgrading() {
        require(!isUpgrading, "Bridge: Upgrading");
        _;
    }

    function markAsProcessed(bytes32 blockHash, bytes32 transactionHash, address payable receiver, uint256 amount, uint32 logIndex) private {
        bytes32 compiledId = getTransactionId(blockHash, transactionHash, receiver, amount, logIndex);
        require(!processed[compiledId], "Bridge: Already processed");
        processed[compiledId] = true;
    }

    function acceptTransfer(
        address tokenAddress,
        address sender,
        address payable receiver,
        uint256 amount,
        string calldata symbol,
        bytes32 blockHash,
        bytes32 transactionHash,
        uint32 logIndex,
        uint8 decimals,
        uint256 granularity,
        uint256 typeId
    ) external whenNotPaused nonReentrant {
        require(_msgSender() == federation, "Bridge: Sender not Federation");
        require(tokenAddress != NULL_ADDRESS, "Bridge: Token is null");
        require(receiver != NULL_ADDRESS, "Bridge: Receiver is null");
        require(amount > 0, "Bridge: Amount 0");
        require(bytes(symbol).length > 0, "Bridge: Empty symbol");
        require(blockHash != NULL_HASH, "Bridge: BlockHash is null");
        require(transactionHash != NULL_HASH, "Bridge: Transaction is null");
        require(decimals <= 18, "Bridge: Decimals bigger 18");
        require(Utils.granularityToDecimals(granularity) <= 18, "Bridge: invalid granularity");

        markAsProcessed(blockHash, transactionHash, receiver, amount, logIndex);

        if (knownTokens[tokenAddress]) {
            _acceptCrossBackToToken(sender, receiver, tokenAddress, decimals, granularity, amount, typeId);
        } else {
            _acceptCrossToSideToken(sender, receiver, tokenAddress, decimals, granularity, amount, symbol, typeId);
        }
    }

    function _acceptCrossToSideToken(
        address sender,
        address payable receiver,
        address tokenAddress,
        uint8 decimals,
        uint256 granularity,
        uint256 amount,
        string memory symbol,
        uint256 typeId
    ) private {
        (uint256 calculatedGranularity, uint256 formattedAmount) = Utils.calculateGranularityAndAmount(decimals, granularity, amount);
        ISideToken sideToken = mappedTokens[tokenAddress];
        if (address(sideToken) == NULL_ADDRESS) {
            // Create side token
            string memory newSymbol = string(abi.encodePacked(symbolPrefix, symbol));
            sideToken = ISideToken(sideTokenFactory.createSideToken(newSymbol, newSymbol, calculatedGranularity));
            mappedTokens[tokenAddress] = sideToken;
            originalTokens[address(sideToken)] = tokenAddress;
            allowTokens.setToken(address(sideToken), typeId);
            emit NewSideToken(address(sideToken), tokenAddress, newSymbol, calculatedGranularity);
        } else {
            require(calculatedGranularity == sideToken.granularity(), "Bridge: Granularity differ");
        }
        sideToken.mint(receiver, formattedAmount, "", "");
        emit AcceptedCrossTransfer(
            tokenAddress,
            sender,
            receiver,
            amount,
            decimals,
            granularity,
            formattedAmount,
            18,
            calculatedGranularity,
            typeId);
    }

    function _acceptCrossBackToToken(
        address sender,
        address payable receiver,
        address tokenAddress,
        uint8 decimals,
        uint256 granularity,
        uint256 amount,
        uint256 typeId)
    private {
        require(decimals == 18, "Bridge: Invalid decimals");
        //As side tokens are ERC777 we need to convert granularity to decimals
        (uint8 calculatedDecimals, uint256 formattedAmount) = Utils.calculateDecimalsAndAmount(tokenAddress, granularity, amount);
        if(address(wrappedCurrency) == tokenAddress) {
            wrappedCurrency.withdraw(formattedAmount);
            receiver.transfer(formattedAmount);
        } else {
            IERC20(tokenAddress).safeTransfer(receiver, formattedAmount);
        }
        emit AcceptedCrossTransfer(
            tokenAddress,
            sender,
            receiver,
            amount,
            decimals,
            granularity,
            formattedAmount,
            calculatedDecimals,
            1,
            typeId);
    }

    /**
     * ERC-20 tokens approve and transferFrom pattern
     * See https://eips.ethereum.org/EIPS/eip-20#transferfrom
     */
    function receiveTokensTo(address tokenToUse, address to, uint256 amount) public {
        address sender = _msgSender();
        //Transfer the tokens on IERC20, they should be already Approved for the bridge Address to use them
        IERC20(tokenToUse).safeTransferFrom(sender, address(this), amount);
        crossTokens(tokenToUse, sender, to, amount, "");
    }

    /**
     * Use network currency and cross it.
     */
    function depositTo(address to) external payable {
        address sender = _msgSender();
        require(address(wrappedCurrency) != NULL_ADDRESS, "Bridge: wrappedCurrency empty");
        wrappedCurrency.deposit.value(msg.value)();
        crossTokens(address(wrappedCurrency), sender, to, msg.value, "");
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
    ) external {
        //Hook from ERC777address
        if(operator == address(this)) return; // Avoid loop from bridge calling to ERC77transferFrom
        require(to == address(this), "Bridge: Not to this address");
        address tokenToUse = _msgSender();
        require(erc1820.getInterfaceImplementer(tokenToUse, _erc777Interface) != NULL_ADDRESS, "Bridge: Not ERC777 token");
        require(allowTokens.isTokenAllowed(tokenToUse), "Bridge: token not allowed");
        require(userData.length != 0 || !from.isContract(), "Bridge: Specify receiver address in data");
        address receiver = userData.length == 0 ? from : Utils.bytesToAddress(userData);
        crossTokens(tokenToUse, from, receiver, amount, userData);
    }

    function crossTokens(address tokenToUse, address from, address to, uint256 amount, bytes memory userData)
    private whenNotUpgrading whenNotPaused nonReentrant {
        uint256 fee = amount.mul(feePercentage).div(feePercentageDivider);
        uint256 amountMinusFees = amount.sub(fee);
        (uint8 decimals, uint256 granularity, string memory symbol) = Utils.getTokenInfo(tokenToUse);
        knownTokens[tokenToUse] = true;
        uint formattedAmount = amount;
        if(decimals != 18) {
            formattedAmount = amount.mul(uint256(10)**(18-decimals));
        }
        //We consider the amount before fees converted to 18 decimals to check the limits
        uint256 typeId = allowTokens.updateTokenTransfer(tokenToUse, formattedAmount);
        if (originalTokens[tokenToUse] != NULL_ADDRESS) {
            //Side Token Crossing
            uint256 modulo = amountMinusFees.mod(granularity);
            fee = fee.add(modulo);
            amountMinusFees = amountMinusFees.sub(modulo);
            ISideToken(tokenToUse).burn(amountMinusFees, userData);
        }

        emit Cross(
            tokenToUse,
            from,
            to,
            amountMinusFees,
            symbol,
            userData,
            decimals,
            granularity,
            typeId
        );

        if (fee > 0) {
            //Send the payment to the MultiSig of the Federation
            IERC20(tokenToUse).safeTransfer(owner(), fee);
        }
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

    function setFeePercentage(uint amount) external onlyOwner {
        require(amount < (feePercentageDivider/10), "Bridge: bigger than 10%");
        feePercentage = amount;
        emit FeePercentageChanged(feePercentage);
    }

    function getFeePercentage() external view returns(uint) {
        return feePercentage;
    }

    function changeFederation(address newFederation) external onlyOwner {
        require(newFederation != NULL_ADDRESS, "Bridge: Federation is empty");
        federation = newFederation;
        emit FederationChanged(federation);
    }


    function changeAllowTokens(address newAllowTokens) external onlyOwner {
        require(newAllowTokens != NULL_ADDRESS, "Bridge: AllowTokens is empty");
        allowTokens = IAllowTokens(newAllowTokens);
        emit AllowTokensChanged(newAllowTokens);
    }

    function getFederation() external view returns(address) {
        return federation;
    }

    function changeSideTokenFactory(address newSideTokenFactory) external onlyOwner {
        require(newSideTokenFactory != NULL_ADDRESS, "Bridge: SideTokenFactory is empty");
        sideTokenFactory = ISideTokenFactory(newSideTokenFactory);
        emit SideTokenFactoryChanged(newSideTokenFactory);
    }

    function setUpgrading(bool _isUpgrading) external onlyOwner {
        isUpgrading = _isUpgrading;
        emit Upgrading(isUpgrading);
    }

    function setWrappedCurrency(address _wrappedCurrency) external onlyOwner {
        require(_wrappedCurrency != NULL_ADDRESS, "Bridge: wrapp is empty");
        wrappedCurrency = IWrapped(_wrappedCurrency);
        emit WrappedCurrencyChanged(_wrappedCurrency);
    }

}
