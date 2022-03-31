import { UnsignedTransaction } from "ethers";

export interface Strategy {
  strategyFunction(
    txsToExecute: UnsignedTransaction[],
    params?: object
  ): Promise<any[]>;
}
