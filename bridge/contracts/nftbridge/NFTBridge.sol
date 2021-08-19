// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma abicoder v2;

// Import base Initializable contract
import "../zeppelin/upgradable/Initializable.sol";
// Import interface and library from OpenZeppelin contracts
import "../zeppelin/upgradable/utils/ReentrancyGuard.sol";
import "../zeppelin/upgradable/lifecycle/UpgradablePausable.sol";
import "../zeppelin/upgradable/ownership/UpgradableOwnable.sol";

import "../zeppelin/introspection/IERC1820Registry.sol";
import "../zeppelin/token/ERC20/IERC20.sol";
import "../zeppelin/token/ERC20/SafeERC20.sol";
import "../zeppelin/token/ERC721/IERC721.sol";
import "../zeppelin/token/ERC721/IERC721Metadata.sol";
import "../zeppelin/token/ERC721/IERC721Enumerable.sol";
import "../zeppelin/token/ERC721/IERC721Receiver.sol";
import "../zeppelin/utils/Address.sol";
import "../zeppelin/math/SafeMath.sol";

import "../lib/LibEIP712.sol";
import "../lib/LibUtils.sol";

import "./INFTBridge.sol";
import "./ISideNFTToken.sol";
import "./ISideNFTTokenFactory.sol";
import "../interface/IAllowTokens.sol";
import "../interface/IWrapped.sol";

// solhint-disable-next-line max-states-count
contract NFTBridge is
  Initializable,
  INFTBridge,
  UpgradablePausable,
  UpgradableOwnable,
  ReentrancyGuard,
  IERC721Receiver {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;
  using Address for address;

  address internal constant NULL_ADDRESS = address(0);
  bytes32 internal constant NULL_HASH = bytes32(0);
  IERC1820Registry internal constant ERC1820 =
      IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

  address payable internal federation;
  uint256 internal fixedFee;
  string public symbolPrefix;
  uint256 internal _deprecatedLastDay;
  uint256 internal _deprecatedSpentToday;

  mapping(address => address) public sideTokenAddressByOriginalTokenAddress;
  mapping(address => address) public originalTokenAddressBySideTokenAddress;
  mapping(address => bool) public knownTokens; // OriginalToken => true
  mapping(bytes32 => bool) public claimed; // transactionDataHash => true // previously named processed
  IAllowTokens public allowTokens;
  ISideNFTTokenFactory public sideTokenFactory;
  //Bridge_v1 variables
  bool public isUpgrading;
  //Bridge_v3 variables
  bytes32 internal constant ERC_777_INTERFACE = keccak256("ERC777Token");
  IWrapped public wrappedCurrency;
  mapping(bytes32 => bytes32) public transactionDataHashes; // transactionHash => transactionDataHash
  mapping(bytes32 => address) public originalTokenAddresses; // transactionHash => originalTokenAddress
  mapping(bytes32 => address) public senderAddresses; // transactionHash => senderAddress

  bytes32 public domainSeparator;
  // keccak256("Claim(address to,uint256 amount,bytes32 transactionHash,address relayer,uint256 fee,uint256 nonce,uint256 deadline)");
  bytes32 public constant CLAIM_TYPEHASH =
      0xf18ceda3f6355f78c234feba066041a50f6557bfb600201e2a71a89e2dd80433;
  mapping(address => uint256) public nonces;

  event AllowTokensChanged(address _newAllowTokens);
  event FederationChanged(address _newFederation);
  event SideTokenFactoryChanged(address _newSideNFTTokenFactory);
  event Upgrading(bool _isUpgrading);
  event WrappedCurrencyChanged(address _wrappedCurrency);

  function initialize(
    address _manager,
    address payable _federation,
    address _allowTokens,
    address _sideTokenFactory,
    string memory _symbolPrefix
  ) public initializer {
    UpgradableOwnable.initialize(_manager);
    UpgradablePausable.__Pausable_init(_manager);
    symbolPrefix = _symbolPrefix;
    allowTokens = IAllowTokens(_allowTokens);
    sideTokenFactory = ISideNFTTokenFactory(_sideTokenFactory);
    federation = _federation;
    //keccak256("ERC777TokensRecipient")
    ERC1820.setInterfaceImplementer(
      address(this),
      0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b,
      address(this)
    );
    initDomainSeparator();
  }

  receive() external payable {
    // The fallback function is needed to use WRBTC
    require(
      _msgSender() == address(wrappedCurrency),
      "Bridge: not wrappedCurrency"
    );
  }

  function version() external pure override returns (string memory) {
    return "v1";
  }

  function initDomainSeparator() public {
    uint256 chainId;
    // solium-disable-next-line security/no-inline-assembly
    assembly {
      chainId := chainid()
    }
    domainSeparator = LibEIP712.hashEIP712Domain(
      "RSK Token Bridge",
      "1",
      chainId,
      address(this)
    );
  }

  modifier whenNotUpgrading() {
    require(!isUpgrading, "Bridge: Upgrading");
    _;
  }

  function acceptTransfer(
    address _originalTokenAddress,
    address payable _from,
    address payable _to,
    uint256 _tokenId,
    bytes32 _blockHash,
    bytes32 _transactionHash,
    uint32 _logIndex
  ) external override whenNotPaused nonReentrant {
    require(_msgSender() == federation, "BridgeNFT: Not Federation");
    require(
      knownTokens[_originalTokenAddress] ||
          sideTokenAddressByOriginalTokenAddress[_originalTokenAddress] != NULL_ADDRESS,
      "BridgeNFT: Unknown token"
    );
    require(_to != NULL_ADDRESS, "BridgeNFT: Null To");
    require(_from != NULL_ADDRESS, "BridgeNFT: Null From");
    require(_blockHash != NULL_HASH, "BridgeNFT: Null BlockHash");
    require(_transactionHash != NULL_HASH, "BridgeNFT: Null TxHash");
    require(
      transactionDataHashes[_transactionHash] == bytes32(0),
      "BridgeNFT: Already accepted"
    );

    bytes32 _transactionDataHash = getTransactionDataHash(
      _to,
      _tokenId,
      _blockHash,
      _transactionHash,
      _logIndex
    );
    // Do not remove, claimed will also have transactions previously processed using older bridge versions
    require(!claimed[_transactionDataHash], "Bridge: Already claimed");

    transactionDataHashes[_transactionHash] = _transactionDataHash;
    originalTokenAddresses[_transactionHash] = _originalTokenAddress;
    senderAddresses[_transactionHash] = _from;

    emit AcceptedNFTCrossTransfer(
      _transactionHash,
      _originalTokenAddress,
      _to,
      _from,
      _tokenId,
      _blockHash,
      _logIndex
    );
  }

  function createSideNFTToken(
    address _originalTokenAddress,
    string calldata _originalTokenSymbol,
    string calldata _originalTokenName,
    string calldata _baseURI,
    string calldata _contractURI
  ) external onlyOwner {
    require(_originalTokenAddress != NULL_ADDRESS, "Bridge: Null original token address");
    address sideTokenAddress = sideTokenAddressByOriginalTokenAddress[_originalTokenAddress];
    require(sideTokenAddress == NULL_ADDRESS, "Bridge: Side token already exists");
    string memory sideTokenSymbol = string(abi.encodePacked(symbolPrefix, _originalTokenSymbol));

    // Create side token
    sideTokenAddress = sideTokenFactory.createSideNFTToken(_originalTokenName, sideTokenSymbol, _baseURI, _contractURI);

    sideTokenAddressByOriginalTokenAddress[_originalTokenAddress] = sideTokenAddress;
    originalTokenAddressBySideTokenAddress[sideTokenAddress] = _originalTokenAddress;
    emit NewSideNFTToken(sideTokenAddress, _originalTokenAddress, sideTokenSymbol);
  }

  function claim(ClaimData calldata _claimData) external override returns (uint256 receivedAmount) {
    receivedAmount = _claim(
      _claimData,
      _claimData.to,
      payable(address(0)),
      0
    );
    return receivedAmount;
  }

  function claimFallback(ClaimData calldata _claimData) external override returns (uint256 receivedAmount) {
    require(
      _msgSender() == senderAddresses[_claimData.transactionHash],
      "Bridge: invalid sender"
    );
    receivedAmount = _claim(
      _claimData,
      _msgSender(),
      payable(address(0)),
      0
    );
    return receivedAmount;
  }

  function getDigest(
    ClaimData memory _claimData,
    address payable _relayer,
    uint256 _fee,
    uint256 _deadline
  ) internal returns (bytes32) {
    return LibEIP712.hashEIP712Message(
      domainSeparator,
      keccak256(
        abi.encode(
          CLAIM_TYPEHASH,
          _claimData.to,
          _claimData.amount,
          _claimData.transactionHash,
          _relayer,
          _fee,
          nonces[_claimData.to]++,
          _deadline
        )
      )
    );
  }

  // Inspired by https://github.com/dapphub/ds-dach/blob/master/src/dach.sol
  function claimGasless(
    ClaimData calldata _claimData,
    address payable _relayer,
    uint256 _fee,
    uint256 _deadline,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external override returns (uint256 receivedAmount) {
    // solhint-disable-next-line not-rely-on-time
    require(_deadline >= block.timestamp, "Bridge: EXPIRED");

    bytes32 digest = getDigest(_claimData, _relayer, _fee, _deadline);
    address recoveredAddress = ecrecover(digest, _v, _r, _s);
    require(
      _claimData.to != address(0) && recoveredAddress == _claimData.to,
      "Bridge: INVALID_SIGNATURE"
    );

    receivedAmount = _claim(_claimData, _claimData.to, _relayer, _fee);
    return receivedAmount;
  }

  function _claim(
    ClaimData calldata _claimData,
    address payable _reciever,
    address payable _relayer,
    uint256 _fee
  ) internal returns (uint256 receivedAmount) {
    address originalTokenAddress = originalTokenAddresses[
      _claimData.transactionHash
    ];
    require(originalTokenAddress != NULL_ADDRESS, "Bridge: Tx not crossed");

    bytes32 transactionDataHash = getTransactionDataHash(
      _claimData.to,
      _claimData.amount,
      _claimData.blockHash,
      _claimData.transactionHash,
      _claimData.logIndex
    );
    require(
      transactionDataHashes[_claimData.transactionHash] == transactionDataHash,
      "Bridge: Wrong txDataHash"
    );
    require(!claimed[transactionDataHash], "Bridge: Already claimed");

    claimed[transactionDataHash] = true;
    if (knownTokens[originalTokenAddress]) {
      receivedAmount = _claimCrossBackToToken(
        originalTokenAddress,
        _reciever,
        _claimData.amount,
        _relayer,
        _fee
      );
    } else {
      receivedAmount = _claimCrossToSideToken(
        originalTokenAddress,
        _reciever,
        _claimData.amount,
        _relayer,
        _fee
      );
    }
    emit Claimed(
      _claimData.transactionHash,
      originalTokenAddress,
      _claimData.to,
      senderAddresses[_claimData.transactionHash],
      _claimData.amount,
      _claimData.blockHash,
      _claimData.logIndex,
      _reciever,
      _relayer,
      _fee
    );
    return receivedAmount;
  }


  function _claimCrossToSideToken(
    address _originalTokenAddress,
    address payable _receiver,
    uint256 _amount,
    address payable _relayer,
    uint256 _fee
  ) internal returns (uint256 receivedAmount) { // solhint-disable-line no-empty-blocks
    // claim logic here
      // address sideToken = mappedTokens[_originalTokenAddress];
      // uint256 granularity = IERC777(sideToken).granularity();
      // uint256 formattedAmount = _amount.mul(granularity);
      // require(_fee <= formattedAmount, "Bridge: fee too high");
      // receivedAmount = formattedAmount - _fee;
      // ISideToken(sideToken).mint(_receiver, receivedAmount, "", "");
      // if(_fee > 0) {
      //     ISideToken(sideToken).mint(_relayer, _fee, "", "relayer fee");
      // }
      // return receivedAmount;
  }

  function _claimCrossBackToToken(
    address _originalTokenAddress,
    address payable _receiver,
    uint256 _amount,
    address payable _relayer,
    uint256 _fee
  ) internal returns (uint256 receivedAmount) {
    uint256 decimals = LibUtils.getDecimals(_originalTokenAddress);
    //As side tokens are ERC777 they will always have 18 decimals
    uint256 formattedAmount = _amount.div(uint256(10)**(18 - decimals));
    require(_fee <= formattedAmount, "Bridge: fee too high");
    receivedAmount = formattedAmount - _fee;
    if (address(wrappedCurrency) == _originalTokenAddress) {
      wrappedCurrency.withdraw(formattedAmount);
      _receiver.transfer(receivedAmount);
      if (_fee > 0) {
        _relayer.transfer(_fee);
      }
    } else {
      IERC20(_originalTokenAddress).safeTransfer(
        _receiver,
        receivedAmount
      );
      if (_fee > 0) {
        IERC20(_originalTokenAddress).safeTransfer(_relayer, _fee);
      }
    }
    return receivedAmount;
  }

  function getTokenCreator(address tokenAddress, uint256 tokenId) public view returns (address) {
    (bool success, bytes memory data) = tokenAddress.staticcall(abi.encodeWithSignature("creator()"));
    if (success) {
      return abi.decode(data, (address));
    }

    return IERC721(tokenAddress).ownerOf(tokenId);
  }

  /**
    * ERC-20 tokens approve and transferFrom pattern
    * See https://eips.ethereum.org/EIPS/eip-20#transferfrom
    */
  function receiveTokensTo(
    address tokenAddress,
    address to,
    uint256 tokenId
  ) public payable override {
    address tokenCreator = getTokenCreator(tokenAddress, tokenId);

    address payable sender = _msgSender();
    // Transfer the tokens on IERC20, they should be already Approved for the bridge Address to use them
    IERC721(tokenAddress).safeTransferFrom(sender, address(this), tokenId);

    crossTokens(tokenAddress, to, tokenCreator, "", tokenId);

    if (fixedFee > 0) {
      require(msg.value >= fixedFee, "NFTBridge: value is smaller than fixed fee");

      // Send the payment to the MultiSig of the Federation
      federation.transfer(fixedFee);
      if (msg.value > fixedFee) { // refund of unused value
        sender.transfer(msg.value - fixedFee);
      }
    }
  }

  function crossTokens(
    address tokenAddress,
    address to,
    address tokenCreator,
    bytes memory userData,
    uint256 tokenId
  ) internal whenNotUpgrading whenNotPaused nonReentrant {
    knownTokens[tokenAddress] = true;

    IERC721Enumerable enumerable = IERC721Enumerable(tokenAddress);
    IERC721Metadata metadataIERC = IERC721Metadata(tokenAddress);
    string memory tokenURI = metadataIERC.tokenURI(tokenId);

    emit Cross(
      tokenAddress,
      _msgSender(),
      to,
      tokenCreator,
      userData,
      enumerable.totalSupply(),
      tokenId,
      tokenURI
    );
  }

  function getTransactionDataHash(
    address _to,
    uint256 _tokenId,
    bytes32 _blockHash,
    bytes32 _transactionHash,
    uint32 _logIndex
  ) public pure override returns (bytes32) {
    return keccak256(
      abi.encodePacked(
        _blockHash,
        _transactionHash,
        _to,
        _tokenId,
        _logIndex
      )
    );
  }

  function setFixedFee(uint256 amount) external onlyOwner {
    fixedFee = amount;
    emit FixedFeeNFTChanged(fixedFee);
  }

  function getFixedFee() external view override returns (uint256) {
    return fixedFee;
  }

  function changeFederation(address payable newFederation) external onlyOwner {
    require(newFederation != NULL_ADDRESS, "Bridge: Federation is empty");
    federation = newFederation;
    emit FederationChanged(federation);
  }

  function changeAllowTokens(address newAllowTokens) external onlyOwner {
    require(newAllowTokens != NULL_ADDRESS, "Bridge: AllowTokens is empty");
    allowTokens = IAllowTokens(newAllowTokens);
    emit AllowTokensChanged(newAllowTokens);
  }

  function getFederation() external view returns (address) {
    return federation;
  }

  function changeSideTokenFactory(address newSideNFTTokenFactory) external onlyOwner {
    require(
      newSideNFTTokenFactory != NULL_ADDRESS,
      "Bridge: empty SideTokenFactory"
    );
    sideTokenFactory = ISideNFTTokenFactory(newSideNFTTokenFactory);
    emit SideTokenFactoryChanged(newSideNFTTokenFactory);
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

  function hasCrossed(bytes32 transactionHash) public view returns (bool) {
    return transactionDataHashes[transactionHash] != bytes32(0);
  }

  function hasBeenClaimed(bytes32 transactionHash) public view returns (bool) {
    return claimed[transactionDataHashes[transactionHash]];
  }

  /**
    * Always returns `IERC721Receiver.onERC721Received.selector`.
    */
  function onERC721Received(
    address,
    address,
    uint256,
    bytes memory
  ) public virtual override returns (bytes4) {
    return this.onERC721Received.selector;
  }

}
