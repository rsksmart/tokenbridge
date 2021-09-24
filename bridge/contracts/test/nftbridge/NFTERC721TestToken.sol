// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../zeppelin/token/ERC721/ERC721.sol";

contract NFTERC721TestToken is ERC721 {

  string private _contractURI;

  constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

  function safeMint(address to, uint256 tokenId) public {
    _safeMint(to, tokenId);
  }

  function setBaseURI(string memory baseURI) public {
    _setBaseURI(baseURI);
  }

  function setContractURI(string memory contractURI_) public {
    _contractURI = contractURI_;
  }

  function contractURI() public view returns (string memory) {
    return _contractURI;
  }

  function setTokenURI(uint256 tokenId, string memory _tokenURI) public {
    _setTokenURI(tokenId, _tokenURI);
  }

}
