// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

import "./ISideNFTToken.sol";
import "../zeppelin/token/ERC721/ERC721.sol";
import "../zeppelin/token/ERC721/ERC721Burnable.sol";

contract SideNFTToken is ISideNFTToken, ERC721, ERC721Burnable {
  address public minter;
  string private _contractURI;

  constructor(string memory _name, string memory _symbol, address _minter, string memory _baseURI, string memory contractURI_) ERC721(_name, _symbol) {
    require(_minter != address(0), "SideToken: Empty Minter");
    minter = _minter;
    _setBaseURI(_baseURI);
    _setContractURI(contractURI_);
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

  function mint(address account, uint256 tokenId) external onlyMinter override {
    _mint(account, tokenId);
  }
}