pragma solidity ^0.5.0;

import "./zeppelin/token/ERC777/ERC777.sol";
import "./IERC677Receiver.sol";
import "./ISideToken.sol";

contract SideToken_v1 is ISideToken, ERC777 {
    using Address for address;
    using SafeMath for uint256;

    address public minter;
    uint256 private _granularity;

    constructor(string memory _tokenName, string memory _tokenSymbol, address _minterAddr, uint256 _newGranularity)
    ERC777(_tokenName, _tokenSymbol, new address[](0)) public {
        require(_minterAddr != address(0), "SideToken: Minter address is null");
        require(_newGranularity >= 1, "SideToken: Granularity must be equal or bigger than 1");
        if(_newGranularity > 1) {
            require(_newGranularity.mod(10) == 0, "SideToken: Granularity not 10^");
        }
        minter = _minterAddr;
        _granularity = _newGranularity;
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
                IERC677Receiver(recipient).onTokenTransfer(from, amount, data);
            }
        }

        return true;
    }

    /* -- Helper Functions -- */
    //
    /// @notice Internal function that ensures `amount` is multiple of the granularity
    /// @param amount The quantity that want's to be checked
    function requireMultiple(uint256 amount) internal view {
        require(amount.mod(_granularity) == 0, "SideToken: Amount is not a multiple of Granularity");
    }

    function _move(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    )
    internal
    {
        requireMultiple(amount);
        super._move(operator, from, to, amount, userData, operatorData);
    }

    function _burn(
        address operator,
        address from,
        uint256 amount,
        bytes memory data,
        bytes memory operatorData
    )
    internal
    {
        requireMultiple(amount);
        super._burn(operator, from, amount, data, operatorData);
    }

    function _mint(
        address operator,
        address account,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    )
    internal
    {
        requireMultiple(amount);
        super._mint(operator, account, amount, userData, operatorData);
    }

    function granularity() public view returns (uint256) {
        return _granularity;
    }

}