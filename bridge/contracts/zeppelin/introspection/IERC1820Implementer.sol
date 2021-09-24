// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

/**
 * @dev Interface for an ERC1820 implementer, as defined in the
 * https://eips.ethereum.org/EIPS/eip-1820#interface-implementation-erc1820implementerinterface[EIP].
 * Used by contracts that will be registered as implementers in the
 * {IERC1820Registry}.
 */
interface IERC1820Implementer {
    /**
     * @dev Returns a special value (`ERC1820_ACCEPT_MAGIC`) if this contract
     * implements `_interfaceHash` for `_account`.
     *
     * See {IERC1820Registry-setInterfaceImplementer}.
     */
    function canImplementInterfaceForAddress(bytes32 _interfaceHash, address _account) external view returns (bytes32);
}
