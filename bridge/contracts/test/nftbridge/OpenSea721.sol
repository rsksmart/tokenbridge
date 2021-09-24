// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
// created using https://github.com/ProjectOpenSea/opensea-creatures/blob/master/contracts/ERC721Tradable.sol
// and https://github.com/ProjectOpenSea/opensea-creatures/blob/master/contracts/Creature.sol
import "../../zeppelin/token/ERC721/ERC721.sol";
import "../../zeppelin/ownership/Ownable.sol";
import "../../zeppelin/math/SafeMath.sol";
import "../../zeppelin/utils/Strings.sol";
import "./OpenSeaEIP712Base.sol";


/**
 * @title OpenSea721
 * OpenSea721 - ERC721 contract that whitelists a trading address, and has minting functionality.
 */
contract OpenSea721 is ERC721, OpenSeaEIP712Base, Ownable {
    using SafeMath for uint256;

    uint256 private _currentTokenId = 0;

    constructor(
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {
        _initializeEIP712(_name);
    }

    function baseTokenURI() public pure returns (string memory) {
        return "https://creatures-api.opensea.io/api/creature/";
    }

    function contractURI() public pure returns (string memory) {
        return "https://creatures-api.opensea.io/contract/opensea-creatures";
    }

    /**
     * @dev Mints a token to an address with a tokenURI.
     * @param _to address of the future owner of the token
     */
    function mintTo(address _to) public onlyOwner {
        uint256 newTokenId = _getNextTokenId();
        _mint(_to, newTokenId);
        _incrementTokenId();
    }

    /**
     * @dev calculates the next token ID based on value of _currentTokenId
     * @return uint256 for the next token ID
     */
    function _getNextTokenId() private view returns (uint256) {
        return _currentTokenId.add(1);
    }

    /**
     * @dev increments the value of _currentTokenId
     */
    function _incrementTokenId() private {
        _currentTokenId++;
    }

    function tokenURI(uint256 _tokenId) override public pure returns (string memory) {
        return string(abi.encodePacked(baseTokenURI(), Strings.toString(_tokenId)));
    }

}