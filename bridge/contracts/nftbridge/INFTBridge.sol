// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma abicoder v2;
interface INFTBridge {

    struct ClaimData {
        address payable to;
        uint256 amount;
        bytes32 blockHash;
        bytes32 transactionHash;
        uint32 logIndex;
    }

    // struct NFTcrossAddresses {
    //   address tokenAddress;
    //   address to;
    // }

    function version() external pure returns (string memory);

    function getFeePercentage() external view returns(uint);

    /**
     * ERC-20 tokens approve and transferFrom pattern
     * See https://eips.ethereum.org/EIPS/eip-20#transferfrom
     */
    function receiveTokensTo(
      address tokenAddress,
      address to,
      uint256 tokenId) external;

    /**
     * Accepts the transaction from the other chain that was voted and sent by the Federation contract
     */
    function acceptTransfer(
        address _originalTokenAddress,
        address payable _from,
        address payable _to,
        uint256 _amount,
        bytes32 _blockHash,
        bytes32 _transactionHash,
        uint32 _logIndex
    ) external;

    /**
     * Claims the crossed transaction using the hash, this sends the funds to the address indicated in
     */
    function claim(ClaimData calldata _claimData) external returns (uint256 receivedAmount);

    function claimFallback(ClaimData calldata _claimData) external returns (uint256 receivedAmount);

    function claimGasless(
        ClaimData calldata _claimData,
        address payable _relayer,
        uint256 _fee,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external returns (uint256 receivedAmount);

    function getTransactionDataHash(
        address _to,
        uint256 _amount,
        bytes32 _blockHash,
        bytes32 _transactionHash,
        uint32 _logIndex
    ) external returns(bytes32);

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
    event NewSideToken(
        address indexed _newSideTokenAddress,
        address indexed _originalTokenAddress,
        string _newSymbol
    );
    event AcceptedCrossTransfer(
        bytes32 indexed _transactionHash,
        address indexed _originalTokenAddress,
        address indexed _to,
        address  _from,
        uint256 _amount,
        bytes32 _blockHash,
        uint256 _logIndex
    );
    event FeePercentageChanged(uint256 _amount);
    event Claimed(
        bytes32 indexed _transactionHash,
        address indexed _originalTokenAddress,
        address indexed _to,
        address _sender,
        uint256 _amount,
        bytes32 _blockHash,
        uint256 _logIndex,
        address _reciever,
        address _relayer,
        uint256 _fee
    );
}