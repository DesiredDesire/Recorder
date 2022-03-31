import Safe from "@gnosis.pm/safe-core-sdk";
import { UnsignedTransaction } from "ethers";
import { Strategy } from "./Strategy.interface";
import SafeServiceClient from "@gnosis.pm/safe-service-client";
import { MetaTransactionData } from "@gnosis.pm/safe-core-sdk-types";

export type GnosisMultisendStrategyParams = {
  safeSdk: Safe;
  safeServiceClient: SafeServiceClient;
  safeAddress: string;
  senderAddress: string;
};

export class GnosisMultisendStrategy implements Strategy {
  params: GnosisMultisendStrategyParams;

  constructor(
    safeSdk: Safe,
    safeServiceClient: SafeServiceClient,
    safeAddress: string,
    senderAddress: string
  ) {
    this.params = {
      safeSdk: safeSdk,
      safeServiceClient: safeServiceClient,
      safeAddress: safeAddress,
      senderAddress: senderAddress,
    };
  }

  async strategyFunction(
    txsToExecute: UnsignedTransaction[],
    params: GnosisMultisendStrategyParams = this.params
  ): Promise<any[]> {
    let transactions: MetaTransactionData[] = [];

    for (let i = 0; i < txsToExecute.length; i++) {
      if (typeof txsToExecute[i].to !== "string")
        throw "transaction to is not defined";
      transactions.push({
        to: (txsToExecute[i].to as unknown) as string,
        value: "0",
        data: txsToExecute[i].data as string,
      });
    }

    const safeTransaction = await params.safeSdk.createTransaction(
      transactions,
      {}
    );
    await params.safeSdk.signTransaction(safeTransaction);
    const safeTxHash = await params.safeSdk.getTransactionHash(safeTransaction);
    const result = await params.safeServiceClient.proposeTransaction({
      safeAddress: params.safeAddress,
      safeTransaction: safeTransaction,
      safeTxHash: safeTxHash,
      senderAddress: params.senderAddress,
    });
    return [safeTransaction];
  }
}
