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

import "./IBridge_v1.sol";
import "./ISideToken.sol";
import "./ISideTokenFactory.sol";
import "./AllowTokens.sol";
import "./Utils.sol";

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

    mapping (address => ISideToken) public mappedTokens; // OirignalToken => SideToken
    mapping (address => address) public originalTokens; // SideToken => OriginalToken
    mapping (address => bool) public knownTokens; // OriginalToken => true
    mapping(bytes32 => bool) processed; // ProcessedHash => true
    AllowTokens public allowTokens;
    ISideTokenFactory public sideTokenFactory;
    //Bridge_v1 variables
    //bool public isUpgrading;


    event FederationChanged(address _newFederation);
    event SideTokenFactoryChanged(address _newSideTokenFactory);

    function initialize(address _manager, address _federation, address _allowTokens, address _sideTokenFactory, string memory _symbolPrefix)
    public initializer {
        UpgradableOwnable.initialize(_manager);
        UpgradablePausable.initialize(_manager);
        symbolPrefix = _symbolPrefix;
        allowTokens = AllowTokens(_allowTokens);
        _changeSideTokenFactory(_sideTokenFactory);
        _changeFederation(_federation);
        //keccak256("ERC777TokensRecipient")
        erc1820.setInterfaceImplementer(address(this), 0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b, address(this));
    }

    function version() external pure returns (string memory) {
        return "v1";
    }

    modifier onlyFederation() {
        require(msg.sender == federation, "Bridge: Sender not Federation");
        _;
    }

    // modifier whenNotUpgrading() {
    //     require(isUpgrading == false, "Bridge: Upgrading");
    //     _;
    // }

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
        require(tokenAddress != NULL_ADDRESS, "Bridge: Token cant be null");
        require(receiver != NULL_ADDRESS, "Bridge: Receiver cant be null");
        require(amount > 0, "Bridge: Amount cant be 0");
        require(bytes(symbol).length > 0, "Bridge: Symbol cant be empty");
        require(blockHash != NULL_HASH, "Bridge: BlockHash cant be null");
        require(transactionHash != NULL_HASH, "Bridge: Transaction cant be null");
        require(decimals <= 18, "Bridge: Decimals bigger 18");
        require(granularity >= 1 && granularity <= 1000000000000000000, "Bridge: Granularity not between 1 and 10^18");
        if(granularity > 1) {
            require(granularity.div(10).mul(10) == granularity, "Bridge: Granularity not mul 10");
        }

        _processTransaction(blockHash, transactionHash, receiver, amount, logIndex);

        if (knownTokens[tokenAddress]) {
            _acceptCrossBackToToken(receiver, tokenAddress, decimals, granularity, amount);
        } else {
            _acceptCrossToSideToken(receiver, tokenAddress, decimals, granularity, amount, symbol);
        }
        return true;
    }

    function _acceptCrossToSideToken(
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
            require(calculatedGranularity == sideToken.granularity(), "Bridge: Granularity differ from side token");
        }
        sideToken.mint(receiver, formattedAmount, "", "");
        emit AcceptedCrossTransfer(tokenAddress, receiver, amount, decimals, granularity, formattedAmount, 18, calculatedGranularity);
    }

    function _acceptCrossBackToToken(address receiver, address tokenAddress, uint8 decimals, uint256 granularity, uint256 amount) private {
        require(decimals == 18, "Bridge: Invalid decimals cross back");
        uint8 tokenDecimals = Utils.getDecimals(tokenAddress);
        //As side tokens are ERC777 we need to convert granularity to decimals
        uint8 calculatedDecimals = Utils.granularityToDecimals(granularity);
        require(tokenDecimals == calculatedDecimals, "Bridge: Decimals differ from original");
        uint256 formattedAmount = amount.div(granularity);
        IERC20(tokenAddress).safeTransfer(receiver, formattedAmount);
        emit AcceptedCrossTransfer(tokenAddress, receiver, amount, decimals, granularity, formattedAmount, calculatedDecimals, 1);
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
        require(to == address(this), "Bridge: No to address");
        require(crossingPayment == 0, "Bridge: Needs payment");
        //This can only be used with trusted contracts
        crossTokens(_msgSender(), from, amount, userData);
    }

    function crossTokens(address tokenToUse, address from, uint256 amount, bytes memory userData) private {
        bool _isSideToken = isSideToken(tokenToUse);
        verifyWithAllowTokens(tokenToUse, amount, _isSideToken);
        if (_isSideToken) {
            sideTokenCrossingBack(from, ISideToken(tokenToUse), amount, userData);
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

    function sideTokenCrossingBack(address from, ISideToken tokenToUse, uint256 amount, bytes memory userData) private {
        tokenToUse.burn(amount, userData);
        // solium-disable-next-line max-len
        emit Cross(originalTokens[address(tokenToUse)], from, amount, tokenToUse.symbol(), userData, tokenToUse.decimals(), tokenToUse.granularity());
    }

    function mainTokenCrossing(address from, address tokenToUse, uint256 amount, bytes memory userData) private {
        knownTokens[address(tokenToUse)] = true;
        uint8 decimals = Utils.getDecimals(tokenToUse);
        string memory symbol = Utils.getSymbol(tokenToUse);
        uint256 granularity = Utils.getGranularity(tokenToUse);

        emit Cross(tokenToUse, from, amount, symbol, userData, decimals, granularity);
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

    function verifyWithAllowTokens(address tokenToUse, uint256 amount, bool isASideToken) private  {
        // solium-disable-next-line security/no-block-members
        if (now > lastDay + 24 hours) {
            // solium-disable-next-line security/no-block-members
            lastDay = now;
            spentToday = 0;
        }
        require(allowTokens.isValidTokenTransfer(tokenToUse, amount, spentToday, isASideToken), "Bridge: Bigger than limit");
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
        require(!processed[compiledId], "Bridge:Already processed");
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

    function changeFederation(address newFederation) external onlyOwner returns(bool) {
        _changeFederation(newFederation);
        return true;
    }

    function _changeFederation(address newFederation) internal {
        require(newFederation != NULL_ADDRESS, "Bridge: Federation is empty");
        federation = newFederation;
        emit FederationChanged(federation);
    }

    function getFederation() external view returns(address) {
        return federation;
    }

    function changeSideTokenFactory(address newSideTokenFactory) external onlyOwner returns(bool) {
        _changeSideTokenFactory(newSideTokenFactory);
        return true;
    }

    function _changeSideTokenFactory(address newSideTokenFactory) internal {
        require(newSideTokenFactory != NULL_ADDRESS, "Bridge: SideTokenFactory is empty");
        sideTokenFactory = ISideTokenFactory(newSideTokenFactory);
        emit SideTokenFactoryChanged(newSideTokenFactory);
    }

    //This method is only for testnet to erase the Chain Link toke and recreate it with the new version that is ERC677 compatible.
    //It wont be in the mainnet release
    function clearSideToken(address originalToken) external onlyOwner returns(bool){
        address sideToken = address(mappedTokens[originalToken]);
        originalTokens[sideToken] = NULL_ADDRESS;
        mappedTokens[originalToken] = ISideToken(NULL_ADDRESS);
        return true;
    }

    // function startUpgrade() external onlyOwner {
    //     isUpgrading = true;
    // }

    // function endUpgrade() external onlyOwner {
    //     isUpgrading = false;
    // }

}

