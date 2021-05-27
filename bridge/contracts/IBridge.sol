pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

interface IBridge {

    struct CrossedTransactions {
        bytes32 transactionId;
        TransactionInfo transactionInfo;
    }

    struct TransactionInfo {
        address originalTokenAddress;
        address sender;
        address payable receiver;
        uint256 amount;
        bytes32 blockHash;
        bytes32 transactionHash;
        uint32 logIndex;
        uint8 decimals;
        uint256 granularity;
        uint256 typeId;
        string symbol;
    }

    function version() external pure returns (string memory);

    function getFeePercentage() external view returns(uint);

    /**
     * ERC-20 tokens approve and transferFrom pattern
     * See https://eips.ethereum.org/EIPS/eip-20#transferfrom
     */
    function receiveTokensTo(address tokenToUse, address to, uint256 amount) external;

    /**
     * Use network currency and cross it.
     */
    function depositTo(address to) external payable;

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
        bytes calldata operatorData
    ) external;

    /**
     * Accepts the transaction from the other chain that was voted and sent by the Federation contract
     */
    function acceptTransfer(
        address originalTokenAddress,
        TransactionInfo calldata transactionInfo
    ) external;

    /**
     * Claims the crossed transaction using the hash, this sends the funds to the address indicated in
     */
    function claim(
        bytes32 transactionHash,
        bool preferWrapped
    ) external;

    event Cross(
        address indexed _tokenAddress,
        address indexed _from,
        address indexed _to,
        uint256 _amount,
        string _symbol,
        bytes _userData,
        uint8 _decimals,
        uint256 _granularity,
        uint256 _typeId
    );
    event NewSideToken(
        address indexed _newSideTokenAddress,
        address indexed _originalTokenAddress,
        string _newSymbol,
        uint256 _granularity
    );
    event AcceptedCrossTransfer(
        address indexed _originalTokenAddress,
        address indexed _from,
        address indexed _to,
        uint256 _amount,
        uint8 _decimals,
        bytes32 _transactionHash,
        bytes32 _transactionId
    );
    event Claim(
        bytes32 indexed _transactionHash,
        address indexed _tokenAddress,
        address indexed receiver,
        uint256 _amount,
        uint8 _decimals,
        bytes32 _transactionId
    );
    event FeePercentageChanged(uint256 _amount);
}