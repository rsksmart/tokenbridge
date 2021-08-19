// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma abicoder v2;

interface INFTBridge {
  struct NFTClaimData {
    address payable to;
    uint256 tokenId;
    bytes32 blockHash;
    bytes32 transactionHash;
    uint32 logIndex;
  }

  function version() external pure returns (string memory);

  function getFixedFee() external view returns (uint256);

  function receiveTokensTo(
    address tokenAddress,
    address to,
    uint256 tokenId
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
    uint32 _logIndex
  ) external;

  /**
    * Claims the crossed transaction using the hash, this sends the token to the address specified in the claim data
    */
  function claim(NFTClaimData calldata _claimData) external;

  function claimFallback(NFTClaimData calldata _claimData) external;

  function getTransactionDataHash(
    address _to,
    uint256 _amount,
    bytes32 _blockHash,
    bytes32 _transactionHash,
    uint32 _logIndex
  ) external returns (bytes32);

  // uint256 _amount is the totalSupply of an NFT token like 20 collectibles in the [The Drops](https://opensea.io/collection/the-drops-v2)
  event Cross(
    address indexed _tokenAddress,
    address indexed _from,
    address indexed _to,
    address _tokenCreator,
    bytes _userData,
    uint256 _amount,
    uint256 _tokenId,
    string _tokenURI
  );
  event NewSideNFTToken(
    address indexed _newSideNFTTokenAddress,
    address indexed _originalTokenAddress,
    string _newSymbol
  );
  event AcceptedNFTCrossTransfer(
    bytes32 indexed _transactionHash,
    address indexed _originalTokenAddress,
    address indexed _to,
    address _from,
    uint256 _tokenId,
    bytes32 _blockHash,
    uint256 _logIndex
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
    address _receiver
  );
}
