pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

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
    mapping (bytes32 => bool) public claimed; // transactionId => true
    IAllowTokens public allowTokens;
    ISideTokenFactory public sideTokenFactory;
    //Bridge_v1 variables
    bool public isUpgrading;
    uint256 constant public feePercentageDivider = 10000; // Porcentage with up to 2 decimals
    //Bridge_v3 variables
    bytes32 constant private _erc777Interface = keccak256("ERC777Token");
    IWrapped public wrappedCurrency;
    mapping (bytes32 => CrossedTransactions) public crossedTransactions; // txHash => TransactionStatus

    event AllowTokensChanged(address _newAllowTokens);
    event FederationChanged(address _newFederation);
    event SideTokenFactoryChanged(address _newSideTokenFactory);
    event Upgrading(bool _isUpgrading);
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
        require(_msgSender() == address(wrappedCurrency), "Bridge: not wrappedCurrency");
    }

    function version() external pure returns (string memory) {
        return "v3";
    }

    modifier whenNotUpgrading() {
        require(!isUpgrading, "Bridge: Upgrading");
        _;
    }

    function acceptTransfer(
        TransactionInfo calldata transactionInfo
    ) external whenNotPaused nonReentrant {
        require(_msgSender() == federation, "Bridge: Sender not Federation");
        require(transactionInfo.originalTokenAddress != NULL_ADDRESS, "Bridge: Token is null");
        require(transactionInfo.receiver != NULL_ADDRESS, "Bridge: Receiver is null");
        require(transactionInfo.amount > 0, "Bridge: Amount 0");
        require(bytes(transactionInfo.symbol).length > 0, "Bridge: Empty symbol");
        require(transactionInfo.blockHash != NULL_HASH, "Bridge: BlockHash is null");
        require(transactionInfo.transactionHash != NULL_HASH, "Bridge: Transaction is null");
        require(transactionInfo.decimals <= 18, "Bridge: Decimals bigger 18");
        require(Utils.granularityToDecimals(transactionInfo.granularity) <= 18, "Bridge: invalid granularity");

        CrossedTransactions memory crossedTx = crossedTransactions[transactionInfo.transactionHash];
        require(crossedTx.transactionId == bytes32(0), "Bridge: Already processed");

        crossedTx.transactionId = getTransactionId(
            transactionInfo.blockHash,
            transactionInfo.transactionHash,
            transactionInfo.receiver,
            transactionInfo.amount,
            transactionInfo.logIndex
        );
        crossedTx.transactionInfo = transactionInfo;

        crossedTransactions[transactionInfo.transactionHash] = crossedTx;
        emit AcceptedCrossTransfer(
            transactionInfo.originalTokenAddress,
            transactionInfo.sender,
            transactionInfo.receiver,
            transactionInfo.amount,
            transactionInfo.decimals,
            transactionInfo.transactionHash,
            crossedTx.transactionId
        );
    }


    function claim(bytes32 transactionHash, bool preferWrapped) public {
        CrossedTransactions memory crossedTx = crossedTransactions[transactionHash];
        require(!claimed[crossedTx.transactionId], "Bridge: Already claimed");
        claimed[crossedTx.transactionId] = true;
        if (knownTokens[crossedTx.transactionInfo.originalTokenAddress]) {
            _claimCrossBackToToken(preferWrapped, crossedTx);
        } else {
            _claimCrossToSideToken(crossedTx);
        }
    }

    function _claimCrossToSideToken(
        CrossedTransactions memory crossedTx
    ) private {
        (uint256 calculatedGranularity, uint256 formattedAmount) = Utils.calculateGranularityAndAmount(
            crossedTx.transactionInfo.decimals,
            crossedTx.transactionInfo.granularity,
            crossedTx.transactionInfo.amount
        );
        ISideToken sideToken = mappedTokens[crossedTx.transactionInfo.originalTokenAddress];
        if (address(sideToken) == NULL_ADDRESS) {
            // Create side token
            string memory newSymbol = string(abi.encodePacked(symbolPrefix, crossedTx.transactionInfo.symbol));
            sideToken = ISideToken(sideTokenFactory.createSideToken(newSymbol, newSymbol, calculatedGranularity));
            mappedTokens[crossedTx.transactionInfo.originalTokenAddress] = sideToken;
            originalTokens[address(sideToken)] = crossedTx.transactionInfo.originalTokenAddress;
            allowTokens.setToken(address(sideToken), crossedTx.transactionInfo.typeId);
            emit NewSideToken(address(sideToken), crossedTx.transactionInfo.originalTokenAddress, newSymbol, calculatedGranularity);
        } else {
            require(calculatedGranularity == sideToken.granularity(), "Bridge: Granularity differ");
        }
        sideToken.mint(crossedTx.transactionInfo.receiver, formattedAmount, "", "");

        emit Claim(
            crossedTx.transactionInfo.transactionHash,
            address(sideToken),
            crossedTx.transactionInfo.receiver,
            formattedAmount,
            18,
            crossedTx.transactionId
        );
    }

    function _claimCrossBackToToken(
        bool preferWrapped,
        CrossedTransactions memory crossedTx
    ) private {
        require(crossedTx.transactionInfo.decimals == 18, "Bridge: Invalid decimals");
        //As side tokens are ERC777 we need to convert granularity to decimals
        (uint8 calculatedDecimals, uint256 formattedAmount) = Utils.calculateDecimalsAndAmount(
            crossedTx.transactionInfo.originalTokenAddress,
            crossedTx.transactionInfo.granularity,
            crossedTx.transactionInfo.amount
        );
        if(address(wrappedCurrency) == crossedTx.transactionInfo.originalTokenAddress && preferWrapped) {
            wrappedCurrency.withdraw(formattedAmount);
            crossedTx.transactionInfo.receiver.transfer(formattedAmount);
        } else {
            IERC20(crossedTx.transactionInfo.originalTokenAddress).safeTransfer(crossedTx.transactionInfo.receiver, formattedAmount);
        }
        emit Claim(
            crossedTx.transactionInfo.transactionHash,
            crossedTx.transactionInfo.originalTokenAddress,
            crossedTx.transactionInfo.receiver,
            formattedAmount,
            calculatedDecimals,
            crossedTx.transactionId
        );
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
        require(userData.length != 0 || !from.isContract(), "Bridge: Specify receiver address in data");
        address receiver = userData.length == 0 ? from : Utils.bytesToAddress(userData);
        crossTokens(tokenToUse, from, receiver, amount, userData);
    }

    function crossTokens(address tokenToUse, address from, address to, uint256 amount, bytes memory userData)
    private whenNotUpgrading whenNotPaused nonReentrant {
        knownTokens[tokenToUse] = true;
        uint256 fee = amount.mul(feePercentage).div(feePercentageDivider);
        uint256 amountMinusFees = amount.sub(fee);
        (uint8 decimals, uint256 granularity, string memory symbol) = Utils.getTokenInfo(tokenToUse);
        uint formattedAmount = amount;
        if(decimals != 18) {
            formattedAmount = amount.mul(uint256(10)**(18-decimals));
        }
        // We consider the amount before fees converted to 18 decimals to check the limits
        // updateTokenTransfer revert if token not allowed
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
