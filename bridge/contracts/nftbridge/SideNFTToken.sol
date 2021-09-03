// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../zeppelin/token/ERC721/ERC721.sol";
import "../interface/IERC1271.sol";
import "./ISideNFTToken.sol";
import "../lib/LibEIP712.sol";
import "../zeppelin/token/ERC721/ERC721Burnable.sol";

contract SideNFTToken is ISideNFTToken, ERC721, ERC721Burnable {
    using Address for address;
    using SafeMath for uint256;

    mapping(uint256 => uint256) public _nonces;

    address public minter;

    // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-2612.md
    bytes32 public domainSeparator;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint) public nonces;

    string private _contractURI;

    // ERC677 Transfer Event
    event Transfer(address,address,uint256,bytes);

    constructor(string memory _name, string memory _symbol, address _minter, string memory _baseURI,
        string memory contractURI_) ERC721(_name, _symbol) {
        require(_minter != address(0), "SideToken: Empty Minter");
        minter = _minter;
        _setBaseURI(_baseURI);
        _setContractURI(contractURI_);
        _setDomainSeparator();
    }

    function _setDomainSeparator() internal {
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

    function _setContractURI(string memory contractURI_) internal {
        _contractURI = contractURI_;
    }

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    modifier onlyMinter() {
        require(_msgSender() == minter, "SideToken: Caller is not the minter");
        _;
    }

    function mint(
        address account,
        uint256 tokenId
    )
    external onlyMinter override
    {
        _mint(account, tokenId);
    }

    function _getAndIncrementNonce(uint256 tokenId) internal returns (uint256) {
        return uint256(_nonces[tokenId]++);
    }

    function permit(
        address spender,
        uint256 tokenId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable {
        require(block.timestamp <= deadline, "Permit expired"); // solhint-disable-line not-rely-on-time

        bytes32 digest =
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    domainSeparator,
                    keccak256(abi.encode(PERMIT_TYPEHASH, spender, tokenId, _getAndIncrementNonce(tokenId), deadline))
                )
            );
        address owner = ownerOf(tokenId);
        require(spender != owner, "ERC721Permit: approval to current owner");

        if (Address.isContract(owner)) {
            require(IERC1271(owner).isValidSignature(digest, abi.encodePacked(r, s, v)) == 0x1626ba7e, "Unauthorized");
        } else {
            address recoveredAddress = ecrecover(digest, v, r, s);
            require(recoveredAddress != address(0), "Invalid signature");
            require(recoveredAddress == owner, "Unauthorized");
            // Approval(recoveredAddress, owner, tokenId);
        }

        approve(spender, tokenId);
    }

}