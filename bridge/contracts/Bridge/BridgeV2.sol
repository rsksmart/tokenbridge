// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// Import base Initializable contract
import "../zeppelin/upgradable/Initializable.sol";
// Import interface and library from OpenZeppelin contracts
import "../zeppelin/upgradable/utils/ReentrancyGuard.sol";
import "../zeppelin/upgradable/lifecycle/UpgradablePausable.sol";
import "../zeppelin/upgradable/ownership/UpgradableOwnable.sol";

import "../zeppelin/introspection/IERC1820Registry.sol";
import "../zeppelin/token/ERC777/IERC777Recipient.sol";
import "../zeppelin/token/ERC20/IERC20.sol";
import "../zeppelin/token/ERC20/SafeERC20.sol";
import "../zeppelin/token/ERC777/IERC777.sol";
import "../zeppelin/utils/Address.sol";
import "../zeppelin/math/SafeMath.sol";

import "./IBridgeV2.sol";
import "../interface/ISideToken.sol";
import "../interface/ISideTokenFactory.sol";
import "../AllowTokens/AllowTokensV0.sol";
import "../Utils/UtilsV1.sol";

contract BridgeV2 is Initializable, IBridgeV2, IERC777Recipient, UpgradablePausable, UpgradableOwnable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Address for address;

    address constant private NULL_ADDRESS = address(0);
    bytes32 constant private NULL_HASH = bytes32(0);
    IERC1820Registry constant private ERC_1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    address private federation;
    uint256 private feePercentage;
    string public symbolPrefix;
    uint256 public lastDay;
    uint256 public spentToday;

    mapping (address => address) public mappedTokens; // OirignalToken => SideToken
    mapping (address => address) public originalTokens; // SideToken => OriginalToken
    mapping (address => bool) public knownTokens; // OriginalToken => true
    mapping(bytes32 => bool) public processed; // ProcessedHash => true
    AllowTokensV0 public allowTokens;
    ISideTokenFactory public sideTokenFactory;
    //Bridge_v1 variables
    bool public isUpgrading;
    uint256 constant public FEE_PERCENTAGE_DIVIDER = 10000; // Percentage with up to 2 decimals
    bool private alreadyRun;

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
        UpgradablePausable.__Pausable_init(_manager);
        symbolPrefix = _symbolPrefix;
        allowTokens = AllowTokensV0(_allowTokens);
        _changeSideTokenFactory(_sideTokenFactory);
        _changeFederation(_federation);
        //keccak256("ERC777TokensRecipient")
        ERC_1820.setInterfaceImplementer(address(this), 0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b, address(this));
    }

    function version() external pure override returns (string memory) {
        return "v2";
    }

    modifier onlyFederation() {
        require(msg.sender == federation, "Bridge: Sender not Federation");
        _;
    }

    modifier whenNotUpgrading() {
        require(!isUpgrading, "Bridge: Upgrading");
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
    ) external onlyFederation whenNotPaused nonReentrant override returns(bool) {
        require(tokenAddress != NULL_ADDRESS, "Bridge: Token is null");
        require(receiver != NULL_ADDRESS, "Bridge: Receiver is null");
        require(amount > 0, "Bridge: Amount 0");
        require(bytes(symbol).length > 0, "Bridge: Empty symbol");
        require(blockHash != NULL_HASH, "Bridge: BlockHash is null");
        require(transactionHash != NULL_HASH, "Bridge: Transaction is null");
        require(decimals <= 18, "Bridge: Decimals bigger 18");
        require(UtilsV1.granularityToDecimals(granularity) <= 18, "Bridge: invalid granularity");

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

        (uint256 calculatedGranularity,uint256 formattedAmount) = UtilsV1.calculateGranularityAndAmount(decimals, granularity, amount);
        address sideToken = mappedTokens[tokenAddress];
        if (sideToken == NULL_ADDRESS) {
            sideToken = _createSideToken(tokenAddress, symbol, calculatedGranularity);
        } else {
            require(calculatedGranularity == IERC777(sideToken).granularity(), "Bridge: Granularity differ from side token");
        }
        ISideToken(sideToken).mint(receiver, formattedAmount, "", "");
        emit AcceptedCrossTransfer(tokenAddress, receiver, amount, decimals, granularity, formattedAmount, 18, calculatedGranularity);
    }

    function _acceptCrossBackToToken(address receiver, address tokenAddress, uint8 decimals, uint256 granularity, uint256 amount) private {
        require(decimals == 18, "Bridge: Invalid decimals cross back");
        //As side tokens are ERC777 we need to convert granularity to decimals
        (uint8 calculatedDecimals, uint256 formattedAmount) = UtilsV1.calculateDecimalsAndAmount(tokenAddress, granularity, amount);
        IERC20(tokenAddress).safeTransfer(receiver, formattedAmount);
        emit AcceptedCrossTransfer(tokenAddress, receiver, amount, decimals, granularity, formattedAmount, calculatedDecimals, 1);
    }

    /**
     * ERC-20 tokens approve and transferFrom pattern
     * See https://eips.ethereum.org/EIPS/eip-20#transferfrom
     */
    function receiveTokens(address tokenToUse, uint256 amount) override external whenNotUpgrading whenNotPaused nonReentrant returns(bool) {
        address sender = _msgSender();
        require(!sender.isContract(), "Bridge: Sender can't be a contract");
        //Transfer the tokens on IERC20, they should be already Approved for the bridge Address to use them
        IERC20(tokenToUse).safeTransferFrom(sender, address(this), amount);
        crossTokens(tokenToUse, sender, amount, "");
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
    ) external whenNotPaused whenNotUpgrading override(IBridgeV2, IERC777Recipient) {
        //Hook from ERC777address
        if(operator == address(this)) return; // Avoid loop from bridge calling to ERC77transferFrom
        require(to == address(this), "Bridge: Not to address");
        address tokenToUse = _msgSender();
        //This can only be used with trusted contracts
        crossTokens(tokenToUse, from, amount, userData);
    }

    function crossTokens(address tokenToUse, address from, uint256 amount, bytes memory userData) private {
        bool isASideToken = originalTokens[tokenToUse] != NULL_ADDRESS;
        //Send the payment to the MultiSig of the Federation
        uint256 fee = amount.mul(feePercentage).div(FEE_PERCENTAGE_DIVIDER);
        uint256 amountMinusFees = amount.sub(fee);
        if (isASideToken) {
            uint256 modulo = amountMinusFees.mod(IERC777(tokenToUse).granularity());
            fee = fee.add(modulo);
            amountMinusFees = amountMinusFees.sub(modulo);
        }
        if(fee > 0) {
            IERC20(tokenToUse).safeTransfer(owner(), fee);
        }
        if (isASideToken) {
            verifyWithAllowTokens(tokenToUse, amount, isASideToken);
            //Side Token Crossing
            IERC777(tokenToUse).burn(amountMinusFees, userData);
            // solium-disable-next-line max-len
            emit Cross(originalTokens[tokenToUse], from, amountMinusFees, IERC777(tokenToUse).symbol(), userData, IERC777(tokenToUse).decimals(), IERC777(tokenToUse).granularity());
        } else {
            //Main Token Crossing
            knownTokens[tokenToUse] = true;
            (uint8 decimals, uint256 granularity, string memory symbol) = UtilsV1.getTokenInfo(tokenToUse);
            uint formattedAmount = amount;
            if(decimals != 18) {
                formattedAmount = amount.mul(uint256(10)**(18-decimals));
            }
            //We consider the amount before fees converted to 18 decimals to check the limits
            verifyWithAllowTokens(tokenToUse, formattedAmount, isASideToken);
            emit Cross(tokenToUse, from, amountMinusFees, symbol, userData, decimals, granularity);
        }
    }

    function _createSideToken(address token, string memory symbol, uint256 granularity) private returns (address sideToken){
        string memory newSymbol = string(abi.encodePacked(symbolPrefix, symbol));
        address sideTokenAddress = sideTokenFactory.createSideToken(newSymbol, newSymbol, granularity);
        sideToken = sideTokenAddress;
        mappedTokens[token] = sideToken;
        originalTokens[sideTokenAddress] = token;
        emit NewSideToken(sideTokenAddress, token, newSymbol, granularity);
        return sideToken;
    }

    function verifyWithAllowTokens(address tokenToUse, uint256 amount, bool isASideToken) private  {
        // solium-disable-next-line security/no-block-members
        if (block.timestamp > lastDay + 24 hours) { // solhint-disable-line not-rely-on-time
            // solium-disable-next-line security/no-block-members
            lastDay = block.timestamp; // solhint-disable-line not-rely-on-time
            spentToday = 0;
        }
        require(allowTokens.isValidTokenTransfer(tokenToUse, amount, spentToday, isASideToken), "Bridge: Bigger than limit");
        spentToday = spentToday.add(amount);
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
        require(amount < (FEE_PERCENTAGE_DIVIDER/10), "Bridge: bigger than 10%");
        feePercentage = amount;
        emit FeePercentageChanged(feePercentage);
    }

    function getFeePercentage() override external view returns(uint) {
        return feePercentage;
    }

    function calcMaxWithdraw() override external view returns (uint) {
        uint spent = spentToday;
        // solium-disable-next-line security/no-block-members
        if (block.timestamp > lastDay + 24 hours) // solhint-disable-line not-rely-on-time
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

    function startUpgrade() external onlyOwner {
        isUpgrading = true;
        emit Upgrading(isUpgrading);
    }

    function endUpgrade() external onlyOwner {
        isUpgrading = false;
        emit Upgrading(isUpgrading);
    }

    //This method is only to recreate the USDT and USDC tokens on rsk without granularity restrictions.
    function clearSideToken() external onlyOwner returns(bool) {
        require(!alreadyRun, "already done");
        alreadyRun = true;
        address payable[4] memory sideTokens = [
            payable(0xe506F698b31a66049BD4653ed934E7a07Cbc5549),
            payable(0x5a42221D7AaE8e185BC0054Bb036D9757eC18857),
            payable(0xcdc8ccBbFB6407c53118fE47259e8d00C81F42CD),
            payable(0x6117C9529F15c52e2d3188d5285C745B757b5825)
        ];
        for (uint i = 0; i < sideTokens.length; i++) {
            address originalToken = address(originalTokens[sideTokens[i]]);
            originalTokens[sideTokens[i]] = NULL_ADDRESS;
            mappedTokens[originalToken] = address(NULL_ADDRESS);
        }
        return true;
    }

}
