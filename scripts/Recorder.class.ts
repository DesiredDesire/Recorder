import { UnsignedTransaction, Transaction } from "ethers";
import { Strategy } from "./strategies/Strategy.interface";

// class responsible for recoding and executing transactions
// construction:
//  strategy - that will be used to execute transactions
export class Recorder {
  recordedTransactions: UnsignedTransaction[] = [];
  executedTransactions: Transaction[] = [];
  strategy: Strategy;

  constructor(strategy_: Strategy) {
    this.strategy = strategy_;
  }

  // pushes an unsigned transaction (the paprameter) to the recordedTransaction List
  record(transaction: UnsignedTransaction) {
    this.recordedTransactions.push(transaction);
  }

  // execute all recorderTransaction in order using strategy and clears recordedTransaction
  async execute(): Promise<any[]> {
    const response = await this.strategy.strategyFunction(
      this.recordedTransactions
    );
    this.recordedTransactions = [];
    this.executedTransactions.concat(response);
    return response;
  }

  print() {
    console.log(this.recordedTransactions);
  }
}
