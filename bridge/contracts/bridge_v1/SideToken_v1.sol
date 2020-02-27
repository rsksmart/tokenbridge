pragma solidity ^0.5.0;

import "../zeppelin/token/ERC777/ERC777.sol";
import "../zeppelin/upgradable/Initializable.sol";
import "./IERC677Receiver.sol";

contract SideToken_v1 is ERC777, Initializable {
    using Address for address;
    using SafeMath for uint256;

    address public _minter;
    uint256 private _granularity;

    function initialize (string memory tokenName, string memory tokenSymbol, address minterAddr, uint256 granularity)
    public initializer {
        require(minterAddr != address(0), "SideToken: Minter address is null");
        require(granularity >= 1, "SideToken: Granularity must be equal or bigger than 1");
        _minter = minterAddr;
        init(tokenName, tokenSymbol, new address[](0));
        _granularity = granularity;
    }

    modifier onlyMinter() {
        require(_msgSender() == _minter, "SideToken: Caller is not the minter");
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

    /* -- Helper Functions -- */
    //
    /// @notice Internal function that ensures `amount` is multiple of the granularity
    /// @param amount The quantity that want's to be checked
    function requireMultiple(uint256 amount) internal view {
        require(amount.div(_granularity).mul(_granularity) == amount, "SideToken: Amount is not a multiple of Granularity");
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