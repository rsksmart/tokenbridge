// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

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
import "./zeppelin/token/ERC777/IERC777.sol";

import "./IBridge.sol";
import "./ISideToken.sol";
import "./ISideTokenFactory.sol";
import "./IAllowTokens.sol";
import "./IWrapped.sol";

contract Bridge is Initializable, IBridge, IERC777Recipient, UpgradablePausable, UpgradableOwnable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Address for address;

    address constant internal NULL_ADDRESS = address(0);
    bytes32 constant internal NULL_HASH = bytes32(0);
    IERC1820Registry constant internal erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    address internal federation;
    uint256 internal feePercentage;
    string public symbolPrefix;
    uint256 internal _depprecatedLastDay;
    uint256 internal _deprecatedSpentToday;

    mapping (address => address) public mappedTokens; // OirignalToken => SideToken
    mapping (address => address) public originalTokens; // SideToken => OriginalToken
    mapping (address => bool) public knownTokens; // OriginalToken => true
    mapping (bytes32 => bool) public claimed; // transactionDataHash => true
    IAllowTokens public allowTokens;
    ISideTokenFactory public sideTokenFactory;
    //Bridge_v1 variables
    bool public isUpgrading;
    uint256 constant public feePercentageDivider = 10000; // Porcentage with up to 2 decimals
    //Bridge_v3 variables
    bytes32 constant internal _erc777Interface = keccak256("ERC777Token");
    IWrapped public wrappedCurrency;
    mapping (bytes32 => bytes32) public transactionsDataHashes; // transactionHash => transactionDataHash
    mapping (bytes32 => address) public originalTokenAddresses; // transactionDataHash => originalTokenAddress
    mapping (bytes32 => address) public senderAddresses; // transactionDataHash => senderAddress

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
        UpgradablePausable.__Pausable_init(_manager);
        symbolPrefix = _symbolPrefix;
        allowTokens = IAllowTokens(_allowTokens);
        sideTokenFactory = ISideTokenFactory(_sideTokenFactory);
        federation = _federation;
        //keccak256("ERC777TokensRecipient")
        erc1820.setInterfaceImplementer(address(this), 0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b, address(this));
    }

    receive () external payable {
        // The fallback function is needed to use WRBTC
        require(_msgSender() == address(wrappedCurrency), "Bridge: not wrappedCurrency");
    }

    function version() override external pure returns (string memory) {
        return "v3";
    }

    modifier whenNotUpgrading() {
        require(!isUpgrading, "Bridge: Upgrading");
        _;
    }

    function acceptTransfer(
        address _originalTokenAddress,
        address payable _from,
        // address payable _to,
        // uint256 _amount,
        // bytes32 _blockHash,
        bytes32 _transactionHash,
        // uint32 _logIndex
        bytes32 _transactionDataHash
    ) external whenNotPaused nonReentrant override {
        require(_msgSender() == federation, "Bridge: Sender not Federation");
        require(_originalTokenAddress != NULL_ADDRESS, "Bridge: TokenAddr is null");
        // require(_to != NULL_ADDRESS, "Bridge: To is null");
        // require(_amount > 0, "Bridge: Amount 0");
        // require(_blockHash != NULL_HASH, "Bridge: BlockHash is null");
        require(_transactionHash != NULL_HASH, "Bridge: TxHash is null");
        // require(crossedTransaction(_transactionHash), "Bridge: Already accepted");

        transactionsDataHashes[_transactionHash] = _transactionDataHash;
        originalTokenAddresses[_transactionDataHash] = _originalTokenAddress;
        senderAddresses[_transactionDataHash] = _from;

        emit AcceptedCrossTransfer(
            _originalTokenAddress,
            _from,
            // _to,
            // _amount,
            // _blockHash,
            _transactionHash,
            // _logIndex,
            _transactionDataHash
        );
    }


    function createSideToken(
        uint256 _typeId,
        address _originalTokenAddress,
        uint8 _originalTokenDecimals,
        string calldata _originalTokenSymbol,
        string calldata _originalTokenName
    ) external onlyOwner {
        address sideToken = mappedTokens[_originalTokenAddress];
        require(sideToken == NULL_ADDRESS, "Bridge: sideToken already exists");
        // Create side token
        string memory newSymbol = string(abi.encodePacked(symbolPrefix, _originalTokenSymbol));
        string memory newName = string(abi.encodePacked(" on RSK", _originalTokenName));
        uint256 granularity = decimalsToGranularity(_originalTokenDecimals);

        sideToken = sideTokenFactory.createSideToken(newName, newSymbol, granularity);

        mappedTokens[_originalTokenAddress] = sideToken;
        originalTokens[sideToken] = _originalTokenAddress;
        allowTokens.setToken(sideToken, _typeId);

        emit NewSideToken(sideToken, _originalTokenAddress, newSymbol, granularity);
    }

    function claim(
        address payable _to,
        uint256 _amount,
        bytes32 _blockHash,
        bytes32 _transactionHash,
        uint32 _logIndex,
        bool _preferWrapped
    ) external override {

        (address originalTokenAddress, bytes32 transactionDataHash) = _verifyClaim(
            _to,
            _amount,
            _blockHash,
            _transactionHash,
            _logIndex
        );

        _claim(
            originalTokenAddress,
            transactionDataHash,
            _to,
            _amount,
            _preferWrapped
        );

        emit Claimed(
            originalTokenAddress,
            senderAddresses[transactionDataHash],
            _to,
            _amount,
            _blockHash,
            _transactionHash,
            _logIndex,
            transactionDataHash
        );
    }

    function claimFallback(
        address payable _to,
        uint256 _amount,
        bytes32 _blockHash,
        bytes32 _transactionHash,
        uint32 _logIndex,
        bool _preferWrapped
    ) external override {
        (address originalTokenAddress, bytes32 transactionDataHash) = _verifyClaim(
            _to,
            _amount,
            _blockHash,
            _transactionHash,
            _logIndex
        );

        require(_msgSender() == senderAddresses[transactionDataHash],"Bridge: invalid sender");
        _claim(
            originalTokenAddress,
            transactionDataHash,
            _msgSender(),
            _amount,
            _preferWrapped
        );

        emit ClaimedWithFallback(
            originalTokenAddress,
            _msgSender(),
            _to,
            _amount,
            _blockHash,
            _transactionHash,
            _logIndex,
            transactionDataHash
        );
    }

    function _verifyClaim(
        address payable _to,
        uint256 _amount,
        bytes32 _blockHash,
        bytes32 _transactionHash,
        uint32 _logIndex
    ) internal view returns(address originalTokenAddress, bytes32 transactionDataHash) {
        transactionDataHash = getTransactionDataHash(
            _to,
            _amount,
            _blockHash,
            _transactionHash,
            _logIndex
        );
        originalTokenAddress = originalTokenAddresses[transactionDataHash];
        require(originalTokenAddress != NULL_ADDRESS, "Bridge: Tx has not crossed");
        require(!claimed[transactionDataHash], "Bridge: Already claimed");
    }

    function _claim(
        address originalTokenAddress,
        bytes32 _transactionDataHash,
        address payable _to,
        uint256 _amount,
        bool preferWrapped
    ) internal {
        claimed[_transactionDataHash] = true;
        if (knownTokens[originalTokenAddress]) {
            _claimCrossBackToToken(
                preferWrapped,
                originalTokenAddress,
                _to,
                _amount
            );
        } else {
            _claimCrossToSideToken(
                originalTokenAddress,
                _to,
                _amount
            );
        }
    }

    function _claimCrossToSideToken(
        address _originalTokenAddress,
        address payable _to,
        uint256 _amount
    ) internal {
        address sideToken = mappedTokens[_originalTokenAddress];
        require(sideToken != NULL_ADDRESS, "Bridge: sideToken does not exist");
        uint256 granularity = IERC777(sideToken).granularity();
        uint256 formattedAmount = _amount.mul(granularity);

        ISideToken(sideToken).mint(_to, formattedAmount, "", "");
    }

    function _claimCrossBackToToken(
        bool preferWrapped,
        address _originalTokenAddress,
        address payable _to,
        uint256 _amount
    ) internal {
        uint256 decimals = getDecimals(_originalTokenAddress);
        //As side tokens are ERC777 they will always have 18 decimals
        uint256 formattedAmount = _amount.div(uint256(10) ** (18 - decimals));

        if(address(wrappedCurrency) == _originalTokenAddress && !preferWrapped) {
            wrappedCurrency.withdraw(formattedAmount);
            _to.transfer(formattedAmount);
        } else {
            IERC20(_originalTokenAddress).safeTransfer(_to, formattedAmount);
        }
    }

    /**
     * ERC-20 tokens approve and transferFrom pattern
     * See https://eips.ethereum.org/EIPS/eip-20#transferfrom
     */
    function receiveTokensTo(address tokenToUse, address to, uint256 amount) override public {
        address sender = _msgSender();
        //Transfer the tokens on IERC20, they should be already Approved for the bridge Address to use them
        IERC20(tokenToUse).safeTransferFrom(sender, address(this), amount);
        crossTokens(tokenToUse, sender, to, amount, "");
    }

    /**
     * Use network currency and cross it.
     */
    function depositTo(address to) override external payable {
        address sender = _msgSender();
        require(address(wrappedCurrency) != NULL_ADDRESS, "Bridge: wrappedCurrency empty");
        wrappedCurrency.deposit{ value: msg.value }();
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
    ) external override(IBridge, IERC777Recipient){
        //Hook from ERC777address
        if(operator == address(this)) return; // Avoid loop from bridge calling to ERC77transferFrom
        require(to == address(this), "Bridge: Not to this address");
        address tokenToUse = _msgSender();
        require(erc1820.getInterfaceImplementer(tokenToUse, _erc777Interface) != NULL_ADDRESS, "Bridge: Not ERC777 token");
        require(userData.length != 0 || !from.isContract(), "Bridge: Specify receiver address in data");
        address receiver = userData.length == 0 ? from : bytesToAddress(userData);
        crossTokens(tokenToUse, from, receiver, amount, userData);
    }

    function crossTokens(address tokenToUse, address from, address to, uint256 amount, bytes memory userData)
    internal whenNotUpgrading whenNotPaused nonReentrant {
        knownTokens[tokenToUse] = true;
        uint256 fee = amount.mul(feePercentage).div(feePercentageDivider);
        uint256 amountMinusFees = amount.sub(fee);
        uint8 decimals = getDecimals(tokenToUse);
        uint formattedAmount = amount;
        if(decimals != 18) {
            formattedAmount = amount.mul(uint256(10)**(18-decimals));
        }
        // We consider the amount before fees converted to 18 decimals to check the limits
        // updateTokenTransfer revert if token not allowed
        allowTokens.updateTokenTransfer(tokenToUse, formattedAmount);
        address originalTokenAddress = tokenToUse;
        if (originalTokens[tokenToUse] != NULL_ADDRESS) {
            //Side Token Crossing
            originalTokenAddress = originalTokens[tokenToUse];
            uint256 granularity = getGranularity(tokenToUse);
            uint256 modulo = amountMinusFees.mod(granularity);
            fee = fee.add(modulo);
            amountMinusFees = amountMinusFees.sub(modulo);
            IERC777(tokenToUse).burn(amountMinusFees, userData);
        }

        emit Cross(
            originalTokenAddress,
            from,
            to,
            amountMinusFees,
            userData
        );

        if (fee > 0) {
            //Send the payment to the MultiSig of the Federation
            IERC20(tokenToUse).safeTransfer(owner(), fee);
        }
    }

    function getTransactionDataHash(
        address _to,
        uint256 _amount,
        bytes32 _blockHash,
        bytes32 _transactionHash,
        uint32 _logIndex
    )
        public pure override returns(bytes32)
    {
        return keccak256(abi.encodePacked(_blockHash, _transactionHash, _to, _amount, _logIndex));
    }

    function setFeePercentage(uint amount) external onlyOwner {
        require(amount < (feePercentageDivider/10), "Bridge: bigger than 10%");
        feePercentage = amount;
        emit FeePercentageChanged(feePercentage);
    }

    function getFeePercentage() external view override returns(uint) {
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

    function decimalsToGranularity(uint8 decimals) public pure returns (uint256) {
        require(decimals <= 18, "Bridge: Decimals not in 0 to 18");
        return uint256(10)**(18-decimals);
    }

    function getDecimals(address tokenToUse) public view returns (uint8) {
        //support decimals as uint256 or uint8
        (bool success, bytes memory data) = tokenToUse.staticcall(abi.encodeWithSignature("decimals()"));
        require(success, "Bridge: No decimals");
        // uint<M>: enc(X) is the big-endian encoding of X,
        //padded on the higher-order (left) side with zero-bytes such that the length is 32 bytes.
        return uint8(abi.decode(data, (uint256)));
    }

    function bytesToAddress(bytes memory bys) public pure returns (address addr) {
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            addr := mload(add(bys,20))
        }
    }

    function getGranularity(address tokenToUse) public view returns (uint256) {
        //support granularity if ERC777
        (bool success, bytes memory data) = tokenToUse.staticcall(abi.encodeWithSignature("granularity()"));
        require(success, "Bridge: No granularity");

        return abi.decode(data, (uint256));
    }

    function crossedTransaction(bytes32 transactionHash) public view returns (bool) {
        return transactionsDataHashes[transactionHash] != bytes32(0);
    }

}
