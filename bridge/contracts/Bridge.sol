pragma solidity ^0.4.24;

import "./zeppelin/token/ERC20/DetailedERC20.sol";
import "./Transferable.sol";
import "./SideToken.sol";

contract Bridge is Transferable {
    address public manager;
    uint8 symbolPrefix;

    mapping (address => SideToken) public mappedTokens;
    mapping (address => address) public mirrorTokens;
    mapping (address => address) public mappedAddresses;

    struct TransferStruct {
        DetailedERC20 from;
        address to;
        uint256 amount;
        string symbol;
    }
    uint256 public pendingTransfersCount;
    TransferStruct[] public pendingTransferStruct;
    event Cross(address indexed _tokenAddress, address indexed _to, uint256 _amount, string _symbol);

    modifier onlyManager() {
        require(msg.sender == manager, "Sender is not the manager");
        _;
    }

    constructor(address _manager, uint8 _symbolPrefix) public {
        require(_manager != address(0), "Empty manager");
        require(_symbolPrefix != 0, "Empty symbol prefix");
        manager = _manager;
        symbolPrefix = _symbolPrefix;
        pendingTransfersCount = 0;
    }

    function onTokenTransfer(address from, uint256 amount, bytes) public returns (bool success) {
        //TODO add validations and manage callback from contracts correctly
        //TODO If its a mirror contract created by us we should brun the tokens and sent then back. If not we shoulld add it to the pending trasnfer
        return addPendingTransfer(DetailedERC20(msg.sender), from, amount);
    }

    function addPendingTransfer(DetailedERC20 fromToken, address to, uint256 amount) private returns (bool success) {
        validateToken(fromToken);
        pendingTransferStruct.push(TransferStruct(fromToken, to, amount, fromToken.symbol()));
        pendingTransfersCount++;
        return true;
    }

    function emmitEvent() public {
        for(uint i = 0; i <= pendingTransfersCount; i++) {
            TransferStruct memory transfer = pendingTransferStruct[pendingTransfersCount];
            emit Cross(transfer.from, transfer.to, transfer.amount, transfer.symbol);
            delete pendingTransferStruct[pendingTransfersCount];
        }
        pendingTransfersCount = 0;
    }

    function acceptTransfer(address originalTokenAddress, address receiver, uint256 amount, string memory symbol)
    public onlyManager returns(bool) {
        SideToken tokenContract;
        if(address(mappedTokens[originalTokenAddress]) == address(0)) {
            string memory newSymbol = string(abi.encodePacked("r", symbol));
            tokenContract = new SideToken(newSymbol,newSymbol, 18, 0);
            mappedTokens[originalTokenAddress] = tokenContract;
            mirrorTokens[address(tokenContract)] = originalTokenAddress;
        }
        return tokenContract.mint(receiver, amount);
    }

    function changeManager(address newmanager) public onlyManager {
        require(newmanager != address(0), "New manager address is empty");
        manager = newmanager;
    }

    function tokenFallback(address, uint256, bytes) public view returns (bool) {
        require(mirrorTokens[msg.sender] != address(0), "Sender is not one of the crossed token contracts");
        //TODO add validations and manage callback from contracts correctly
        //TODO If its a mirror contract created by us we should brun the tokens and sent then back. If not we shoulld add it to the pending trasnfer
        return true;
    }

    function mapAddress(address to) public {
        mappedAddresses[msg.sender] = to;
    }

    function getMappedAddress(address account) public view returns (address) {
        address mapped = mappedAddresses[account];

        if (mapped == address(0))
            return account;

        return mapped;
    }

    function validateToken(DetailedERC20 tokenToUse) private view {
        require(tokenToUse.decimals() == 18, "Token has decimals other than 18");
    }

    function receiveTokens(DetailedERC20 tokenToUse, uint256 amount) public returns (bool) {
        validateToken(tokenToUse);
        if (!tokenToUse.transferFrom(msg.sender, address(this), amount))
            return false;

        return addPendingTransfer(tokenToUse, msg.sender, amount);
    }

}

