import { Signer } from "ethers";
import { Strategy } from "./Strategy.interface";
import { UnsignedTransaction, Transaction } from "ethers";
import { Deferrable } from "ethers/lib/utils";
import { TransactionRequest } from "@ethersproject/abstract-provider";

export type OneByOneStrategyParams = {
  signer: Signer;
};

export class OneByOneStrategy implements Strategy {
  params: OneByOneStrategyParams;

  constructor(signer_: Signer) {
    this.params = { signer: signer_ };
  }

  async strategyFunction(
    txsToExecute: UnsignedTransaction[],
    params: OneByOneStrategyParams = this.params
  ): Promise<any> {
    const signer = params.signer;
    let responses: Transaction[] = [];
    while (txsToExecute.length > 0) {
      const response: Transaction = await signer.sendTransaction(
        txsToExecute.shift() as Deferrable<TransactionRequest>
      );
      responses.push(response);
    }
    return responses;
  }
}
