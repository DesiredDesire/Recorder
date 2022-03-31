import { Contract } from "ethers";
import { Recorder } from "./Recorder";

export class RecordableContract<T extends Contract> extends Contract {
  record = ({
    self: this,
  } as unknown) as T;
  private recorder: Recorder;

  constructor(contract: T, recorder_: Recorder) {
    super(
      contract.address,
      contract.interface,
      contract.provider !== undefined ? contract.provider : contract.signer
    );

    if (contract.address === undefined) {
      throw "contract.address undefined";
    }
    this.recorder = recorder_;

    const fnKeys: string[] = Object.keys(this.functions);
    for (let i = 0; i < fnKeys.length; i++) {
      if (fnKeys[i] === "self") {
        throw "contract has a function with name that is protected";
      }
      (this.record as any)[fnKeys[i]] = async function (...args: any[]) {
        console.log(`recording with args ${args}`);
        const toRecord = await this.self.populateTransaction[fnKeys[i]](
          ...args
        );
        this.self.recorder.record(toRecord);
      };
    }
  }
}
