// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Flipper is Ownable {
  bool[] public states = [false, false, false];

  function flip(uint256 position) public onlyOwner {
    states[position] = !states[position];
  }

  function state(uint256 position) public view returns (bool) {
    return states[position];
  }
}
