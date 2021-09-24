// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

import "../zeppelin/token/ERC777/ERC777.sol";
import "../interface/IERC677Receiver.sol";
import "../interface/ISideToken.sol";
import "../lib/LibEIP712.sol";

contract SideToken is ISideToken, ERC777 {
    using Address for address;
    using SafeMath for uint256;

    address public minter;
    uint256 private _granularity;

    // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-2612.md
    bytes32 public domainSeparator;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint) public nonces;

    // ERC677 Transfer Event
    event Transfer(address,address,uint256,bytes);

    constructor(string memory _tokenName, string memory _tokenSymbol, address _minterAddr, uint256 _newGranularity)
    ERC777(_tokenName, _tokenSymbol, new address[](0)) {
        require(_minterAddr != address(0), "SideToken: Empty Minter");
        require(_newGranularity >= 1, "SideToken: Granularity < 1");
        minter = _minterAddr;
        _granularity = _newGranularity;

        uint chainId;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            chainId := chainid()
        }
        domainSeparator = LibEIP712.hashEIP712Domain(
            name(),
            "1",
            chainId,
            address(this)
        );
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
    external onlyMinter override
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
        address from = _msgSender();

        _send(from, from, recipient, amount, data, "", false);
        emit Transfer(from, recipient, amount, data);
        IERC677Receiver(recipient).onTokenTransfer(from, amount, data);
        return true;
    }

    function granularity() public view override returns (uint256) {
        return _granularity;
    }

    // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-2612.md
    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external {
        require(deadline >= block.timestamp, "SideToken: EXPIRED"); // solhint-disable-line not-rely-on-time
        bytes32 digest = LibEIP712.hashEIP712Message(
            domainSeparator,
            keccak256(
                abi.encode(
                    PERMIT_TYPEHASH,
                    owner,
                    spender,
                    value,
                    nonces[owner]++,
                    deadline
                )
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress != address(0) && recoveredAddress == owner, "SideToken: INVALID_SIGNATURE");
        _approve(owner, spender, value);
    }

}