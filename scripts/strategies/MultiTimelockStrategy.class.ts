import { Signer } from "ethers";
import { BigNumber } from "ethers";
import { Strategy } from "./Strategy.interface";
import { UnsignedTransaction, Transaction } from "ethers";
import { MultiTimelock } from "../../typechain";

type QueuedTransaction = {
  target: string;
  value: number | string;
  signature: string;
  data: string;
};

//Strategy specific params
export type MultiTimelockParams = {
  signer: Signer;
  multiTimelock: MultiTimelock;
  eta: string;
};

// Implementation of Strategy.interface
// Send transactions ony by one to the blockchain
// need to specify during construction:
// Signer - ethers.Signer connected to network
export class MultiTimelockStrategy implements Strategy {
  params: MultiTimelockParams;

  constructor(params_: MultiTimelockParams) {
    this.params = params_;
  }

  async strategyFunction(
    txsToExecute: UnsignedTransaction[],
    params: MultiTimelockParams = this.params
  ): Promise<any> {
    const signer = params.signer;
    let responses: any[] = [];
    let toSend: QueuedTransaction[] = [];
    while (txsToExecute.length > 0) {
      let toAdd = txsToExecute.shift() as UnsignedTransaction;
      toSend.push({
        target: toAdd.to as string,
        value: 0,
        signature: "",
        data: toAdd.data as string,
      });
    }
    const tx = await this.params.multiTimelock.queueTransactions(
      toSend,
      this.params.eta
    );
    responses.push(await tx.wait());

    return responses;
  }
}
