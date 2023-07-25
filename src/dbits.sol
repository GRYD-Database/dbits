// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Dbits is ERC20, ERC20Burnable, AccessControl {
    address owner;

    bool locked = false;

    event swapped(address _by, uint256 amount);

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    modifier onlyOwner() {
        require(owner == _msgSender(), "Not authorized");
        _;
    }

    modifier onlyMinter()
    {
        require(isMinter(msg.sender), "Restricted to users.");
        _;
    }

    function isMinter(address account)
    public virtual view returns (bool)
    {
        return hasRole(MINTER_ROLE, account);
    }

    constructor() ERC20("Dbits", "DBITS") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        owner = msg.sender;
    }

    function mintToken(address to, uint256 _value) public onlyMinter {
        require(!locked, "Reentrant call detected!");

        locked = true;
        _mint(to, (_value * 10 ** 18));
        locked = false;
    }

    function burnToken(address from, uint256 _value) public virtual {
        require(!locked, "Reentrant call detected!");

        locked = true;
        _burn(from, (_value * 10 ** 18));
        emit swapped(from, (_value * 10 ** 18));
        locked = false;
    }

    function assignMinterRole(address to) public onlyOwner {
        _setupRole(MINTER_ROLE, to);
    }

    function getTotalCirculatingSupply() public view returns (uint256) {
        return totalSupply();
    }
}
