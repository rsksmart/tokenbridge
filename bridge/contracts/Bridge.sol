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
import "./AllowTokens.sol";
import "./Utils.sol";

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
    AllowTokens public allowTokens;
    ISideTokenFactory public sideTokenFactory;
    //Bridge_v1 variables
    bool public isUpgrading;
    uint256 constant public feePercentageDivider = 10000; // Porcentage with up to 2 decimals
    bytes32 constant _erc777Interface = keccak256("ERC777Token");

    event AllowTokensChanged(address _newAllowTokens);
    event FederationChanged(address _newFederation);
    event SideTokenFactoryChanged(address _newSideTokenFactory);
    event Upgrading(bool isUpgrading);

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
        allowTokens = AllowTokens(_allowTokens);
        sideTokenFactory = ISideTokenFactory(_sideTokenFactory);
        federation = _federation;
        //keccak256("ERC777TokensRecipient")
        erc1820.setInterfaceImplementer(address(this), 0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b, address(this));
    }

    function version() external pure returns (string memory) {
        return "v3";
    }

    modifier whenNotUpgrading() {
        require(!isUpgrading, "Bridge: Upgrading");
        _;
    }

    function acceptTransfer(
        address tokenAddress,
        address sender,
        address receiver,
        uint256 amount,
        string calldata symbol,
        bytes32 blockHash,
        bytes32 transactionHash,
        uint32 logIndex,
        uint8 decimals,
        uint256 granularity
    ) external whenNotPaused nonReentrant {
        require(msg.sender == federation, "Bridge: Sender not Federation");
        require(tokenAddress != NULL_ADDRESS, "Bridge: Token is null");
        require(receiver != NULL_ADDRESS, "Bridge: Receiver is null");
        require(amount > 0, "Bridge: Amount 0");
        require(bytes(symbol).length > 0, "Bridge: Empty symbol");
        require(blockHash != NULL_HASH, "Bridge: BlockHash is null");
        require(transactionHash != NULL_HASH, "Bridge: Transaction is null");
        require(decimals <= 18, "Bridge: Decimals bigger 18");
        require(Utils.granularityToDecimals(granularity) <= 18, "Bridge: invalid granularity");

        _processTransaction(blockHash, transactionHash, receiver, amount, logIndex);

        if (knownTokens[tokenAddress]) {
            _acceptCrossBackToToken(sender, receiver, tokenAddress, decimals, granularity, amount);
        } else {
            _acceptCrossToSideToken(sender, receiver, tokenAddress, decimals, granularity, amount, symbol);
        }
    }

    function _acceptCrossToSideToken(
        address sender,
        address receiver,
        address tokenAddress,
        uint8 decimals,
        uint256 granularity,
        uint256 amount,
        string memory symbol
    ) private {

        (uint256 calculatedGranularity,uint256 formattedAmount) = Utils.calculateGranularityAndAmount(decimals, granularity, amount);
        ISideToken sideToken = mappedTokens[tokenAddress];
        if (address(sideToken) == NULL_ADDRESS) {
            sideToken = _createSideToken(tokenAddress, symbol, calculatedGranularity);
        } else {
            require(calculatedGranularity == sideToken.granularity(), "Bridge: Granularity differ");
        }
        sideToken.mint(receiver, formattedAmount, "", "");
        emit AcceptedCrossTransfer(tokenAddress, sender, receiver, amount, decimals, granularity, formattedAmount, 18, calculatedGranularity);
    }

    function _acceptCrossBackToToken(
        address sender,
        address receiver,
        address tokenAddress,
        uint8 decimals,
        uint256 granularity,
        uint256 amount)
    private {
        require(decimals == 18, "Bridge: Invalid decimals");
        //As side tokens are ERC777 we need to convert granularity to decimals
        (uint8 calculatedDecimals, uint256 formattedAmount) = Utils.calculateDecimalsAndAmount(tokenAddress, granularity, amount);
        IERC20(tokenAddress).safeTransfer(receiver, formattedAmount);
        emit AcceptedCrossTransfer(tokenAddress, sender, receiver, amount, decimals, granularity, formattedAmount, calculatedDecimals, 1);
    }

    /**
     * ERC-20 tokens approve and transferFrom pattern
     * See https://eips.ethereum.org/EIPS/eip-20#transferfrom
     */
    function receiveTokensTo(address tokenToUse, address to, uint256 amount) public whenNotUpgrading whenNotPaused nonReentrant {
        address sender = _msgSender();
        if(sender.isContract()) {
            require(allowTokens.allowedContracts(sender), "Bridge: from contract not whitelisted ");
        }
        //Transfer the tokens on IERC20, they should be already Approved for the bridge Address to use them
        IERC20(tokenToUse).safeTransferFrom(sender, address(this), amount);
        crossTokens(tokenToUse, sender, to, amount, "");
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
    ) external whenNotPaused whenNotUpgrading {
        //Hook from ERC777address
        if(operator == address(this)) return; // Avoid loop from bridge calling to ERC77transferFrom
        require(to == address(this), "Bridge: Not to this address");
        address tokenToUse = _msgSender();
        require(erc1820.getInterfaceImplementer(tokenToUse, _erc777Interface) != NULL_ADDRESS, "Bridge: Not ERC777 token");
        address receiver = userData.length == 0 ? from : bytesToAddress(userData);
        //This can only be used with trusted contracts
        require(allowTokens.isTokenAllowed(tokenToUse), "Bridge: token not allowed");
        crossTokens(tokenToUse, from, receiver, amount, userData);
    }

    function bytesToAddress(bytes memory bys) private pure returns (address addr) {
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            addr := mload(add(bys,20))
        }
    }

    function isSideToken(address tokenAddress) public view returns (bool) {
        return originalTokens[tokenAddress] != NULL_ADDRESS;
    }

    function crossTokens(address tokenToUse, address from, address to, uint256 amount, bytes memory userData) private {
        uint256 fee = amount.mul(feePercentage).div(feePercentageDivider);
        uint256 amountMinusFees = amount.sub(fee);
        (uint8 decimals, uint256 granularity, string memory symbol) = Utils.getTokenInfo(tokenToUse);
        knownTokens[tokenToUse] = true;
        uint formattedAmount = amount;
        if(decimals != 18) {
            formattedAmount = amount.mul(uint256(10)**(18-decimals));
        }
        //We consider the amount before fees converted to 18 decimals to check the limits
        allowTokens.updateTokenTransfer(tokenToUse, formattedAmount);
        if (isSideToken(tokenToUse)) {
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
            granularity
        );

        if (fee > 0) {
            //Send the payment to the MultiSig of the Federation
            IERC20(tokenToUse).safeTransfer(owner(), fee);
        }
    }

    function _createSideToken(address token, string memory symbol, uint256 granularity) private returns (ISideToken sideToken){
        string memory newSymbol = string(abi.encodePacked(symbolPrefix, symbol));
        address sideTokenAddress = sideTokenFactory.createSideToken(newSymbol, newSymbol, granularity);
        sideToken = ISideToken(sideTokenAddress);
        mappedTokens[token] = sideToken;
        originalTokens[sideTokenAddress] = token;
        emit NewSideToken(sideTokenAddress, token, newSymbol, granularity);
        return sideToken;
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

    function setFeePercentage(uint amount) external onlyOwner whenNotPaused {
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
        allowTokens = AllowTokens(newAllowTokens);
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

}
