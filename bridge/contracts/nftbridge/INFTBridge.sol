// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

interface INFTBridge {

  struct NFTClaimData {
    address payable to;
    address from;
    uint256 tokenId;
    address tokenAddress;
    bytes32 blockHash;
    bytes32 transactionHash;
    uint32 logIndex;
    uint256 originChainId;
  }

	struct OriginalNft {
		address nftAddress;
		uint256 originChainId;
	}

  function version() external pure returns (string memory);

  function getFixedFee() external view returns (uint256);

  function receiveTokensTo(
    address tokenAddress,
    address to,
    uint256 tokenId,
    uint256 destinationChainId
  ) external payable;

  /**
    * Accepts the transaction from the other chain that was voted and sent by the Federation contract
    */
  function acceptTransfer(
    address _originalTokenAddress,
    address payable _from,
    address payable _to,
    uint256 _tokenId,
    bytes32 _blockHash,
    bytes32 _transactionHash,
    uint32 _logIndex,
    uint256 _originChainId,
		uint256	_destinationChainId
  ) external;

  /**
    * Claims the crossed transaction using the hash, this sends the token to the address specified in the claim data
    */
  function claim(NFTClaimData calldata _claimData) external;

  function claimFallback(NFTClaimData calldata _claimData) external;

  function getTransactionDataHash(
    address _to,
    address _from,
    uint256 _tokenId,
    address _tokenAddress,
    bytes32 _blockHash,
    bytes32 _transactionHash,
    uint32 _logIndex,
    uint256 _originChainId,
		uint256	_destinationChainId
  ) external returns (bytes32);

  event Cross(
    address indexed _originalTokenAddress,
    address indexed _from,
    address indexed _to,
    address _tokenCreator,
    bytes _userData,
    uint256 _totalSupply,
    uint256 _tokenId,
    string _tokenURI,
    uint256 _originChainId,
		uint256 _destinationChainId
  );
  event NewSideNFTToken(
    address indexed _newSideNFTTokenAddress,
    address indexed _originalTokenAddress,
    string _newSymbol,
    uint256 originChainId
  );
  event AcceptedNFTCrossTransfer(
    bytes32 indexed _transactionHash,
    address indexed _originalTokenAddress,
    address indexed _to,
    address _from,
    uint256 _tokenId,
    bytes32 _blockHash,
    uint256 _logIndex,
    uint256 _originChainId,
		uint256	_destinationChainId
  );
  event FixedFeeNFTChanged(uint256 _amount);
  event ClaimedNFTToken(
    bytes32 indexed _transactionHash,
    address indexed _originalTokenAddress,
    address indexed _to,
    address _sender,
    uint256 _tokenId,
    bytes32 _blockHash,
    uint256 _logIndex,
    address _receiver,
    uint256 _originChainId,
		uint256	_destinationChainId
  );
}
