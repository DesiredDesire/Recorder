import { UnsignedTransaction, Signer, Transaction } from "ethers";
import { Strategy } from "./strategies/Strategy.interface";

const hre = require("hardhat");

export interface StrategyFunction {
  (signer: Signer, txsToExecute: UnsignedTransaction[]): Promise<any[]>;
}

export class Recorder {
  recordedTransactions: UnsignedTransaction[] = [];
  executedTransactions: Transaction[] = [];
  strategy: Strategy;

  constructor(strategy_: Strategy) {
    this.strategy = strategy_;
  }

  record(transaction: UnsignedTransaction) {
    this.recordedTransactions.push(transaction);
  }

  async execute(): Promise<Transaction[]> {
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
