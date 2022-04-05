import { Signer } from "ethers";
import { Strategy } from "./Strategy.interface";
import { UnsignedTransaction, Transaction } from "ethers";
import { Deferrable } from "ethers/lib/utils";
import { TransactionRequest } from "@ethersproject/abstract-provider";

//Strategy specific params
export type OneByOneStrategyParams = {
  signer: Signer;
};

// Implementation of Strategy.interface
// Send transactions ony by one to the blockchain
// need to specify during construction:
// Signer - ethers.Signer connected to network
export class OneByOneStrategy implements Strategy {
  params: OneByOneStrategyParams;

  constructor(params_: OneByOneStrategyParams) {
    this.params = { signer: params_.signer };
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
