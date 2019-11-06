pragma solidity >=0.4.21 <0.6.0;

import "./zeppelin/lifecycle/Pausable.sol";

contract Governance is Pausable {
    address public manager;
    uint public crossingPayment;

    event ManagementTransferred(address indexed _previousManager, address indexed _newManager);
    event CrossingPaymentChanged(uint256 _amount);

    constructor(address _manager) public {
        require(_manager != address(0), "Empty manager");
        manager = _manager;
    }

    modifier onlyManager() {
        require(msg.sender == manager, "Sender is not the manager");
        _;
    }

    function changeManager(address newmanager) public onlyManager whenNotPaused {
        require(newmanager != address(0), "New manager address is empty");
        address oldmanager = manager;
        manager = newmanager;
        emit ManagementTransferred(newmanager, oldmanager);
    }

    function setCrossingPayment(uint amount) public onlyManager whenNotPaused {
        crossingPayment = amount;
        emit CrossingPaymentChanged(crossingPayment);
    }
}
