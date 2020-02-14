pragma solidity ^0.5.0;

import "../zeppelin/token/ERC777/ERC777.sol";
import "./IERC677Receiver.sol";

contract SideToken_v1 is ERC777 {
    using Address for address;

    address public minter;

    constructor(string memory _tokenName, string memory _tokenSymbol, address _minterAddr)
    ERC777(_tokenName, _tokenSymbol, new address[](0)) public {
        require(_minterAddr != address(0), "SideToken: Minter address is null");
        minter = _minterAddr;
    }

    modifier onlyMinter() {
        require(_msgSender() == minter, "SideToken: Caller is not the minter");
        _;
    }

    function mint(
        address account,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    )

    external onlyMinter
    {
        _mint(_msgSender(), account, amount, userData, operatorData);
    }

    /**
    * @dev ERC677 transfer token with additional data if the recipient is a contact.
    * @param recipient The address to transfer to.
    * @param amount The amount to be transferred.
    * @param data The extra data to be passed to the receiving contract.
    */
    function transferAndCall(address recipient, uint amount, bytes calldata data)
        external returns (bool success)
    {
        require(recipient != address(0), "SideToken: transfer to the zero address");
        address from = _msgSender();

        _callTokensToSend(from, from, recipient, amount, "", "");

        _move(from, from, recipient, amount, data, "");

        if(!_callTokensReceived(from, from, recipient, amount, data, "", false)) {
            if (recipient.isContract()) {
                IERC677Receiver receiver = IERC677Receiver(recipient);
                receiver.onTokenTransfer(from, amount, data);
            }
        }

        return true;
    }

}