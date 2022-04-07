// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Timelock.sol";

import "hardhat/console.sol";

contract MultiTimelock is Timelock {
  constructor(address admin_, uint256 delay_) public Timelock(admin_, delay_) {}

  event CancelTransactions(
    bytes32 indexed txHash,
    uint256 numberOfTransactions,
    uint256 eta
  );
  event ExecuteTransactions(
    bytes32 indexed txHash,
    uint256 numberOfTransactions,
    uint256 eta
  );
  event QueueTransactions(
    bytes32 indexed txHash,
    uint256 numberOfTransactions,
    uint256 eta
  );

  struct transaction {
    address target;
    uint256 value;
    string signature;
    bytes data;
  }

  function queueTransactions(transaction[] memory transactionList, uint256 eta)
    external
    returns (bytes32)
  {
    require(
      msg.sender == admin, // mozna usunac
      "Timelock::queueTransaction: Call must come from admin."
    );
    require(
      eta >= getBlockTimestamp().add(delay),
      "Timelock::queueTransaction: Estimated execution block must satisfy delay."
    );

    bytes32 txHash = keccak256(abi.encode(transactionList, eta));
    queuedTransactions[txHash] = true;

    emit QueueTransactions(txHash, transactionList.length, eta);
    return txHash;
  }

  function cancelTransactions(transaction[] memory transactionList, uint256 eta)
    external
  {
    require(
      msg.sender == admin, // tylko multisig
      "Timelock::cancelTransaction: Call must come from admin."
    );

    bytes32 txHash = keccak256(abi.encode(transactionList, eta));
    queuedTransactions[txHash] = false;

    emit CancelTransactions(txHash, transactionList.length, eta);
  }

  function executeTransactions(
    transaction[] memory transactionList,
    uint256 eta
  ) external payable returns (bool) {
    require(
      msg.sender == admin,
      "Timelock::executeTransaction: Call must come from admin."
    );

    bytes32 txHash = keccak256(abi.encode(transactionList, eta));
    require(
      queuedTransactions[txHash],
      "Timelock::executeTransaction: Transaction hasn't been queued."
    );
    require(
      getBlockTimestamp() >= eta,
      "Timelock::executeTransaction: Transaction hasn't surpassed time lock."
    );
    require(
      getBlockTimestamp() <= eta.add(GRACE_PERIOD),
      "Timelock::executeTransaction: Transaction is stale."
    );

    queuedTransactions[txHash] = false;

    uint256 lenght = transactionList.length;
    bytes memory callData;

    for (uint256 i = 0; i < transactionList.length; i++) {
      if (bytes(transactionList[i].signature).length == 0) {
        callData = transactionList[i].data;
      } else {
        callData = abi.encodePacked(
          bytes4(keccak256(bytes(transactionList[i].signature))),
          transactionList[i].data
        );
      }

      // Execute the call
      (
        bool success, /* bytes memory returnData */

      ) = transactionList[i].target.call{value: transactionList[i].value}(
          callData
        );
      require(
        success,
        "Timelock::executeTransaction: Transaction execution reverted."
      );

      emit ExecuteTransaction(
        txHash,
        transactionList[i].target,
        transactionList[i].value,
        transactionList[i].signature,
        transactionList[i].data,
        eta
      );
    }
    return true;
  }
}
