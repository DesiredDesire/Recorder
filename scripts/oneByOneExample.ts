import { Signer } from "ethers";
import { Recorder } from "./Recorder.class";
import { WETH9 } from "../typechain";
import {
  OneByOneStrategy,
  OneByOneStrategyParams,
} from "./strategies/OneByOneStrategy.class";
import { RecordableContract } from "./RecordableContract.class";

const hre = require("hardhat");
async function main() {
  // to initialize  Recorder:
  // 1. initialize strategy
  // 1.1 speify strategy-speific params
  const signer: Signer = (await hre.ethers.getSigners())[0];
  const params: OneByOneStrategyParams = { signer: signer };
  // 1.2 initialize strategy by passing params
  const oneByOneStrategy = new OneByOneStrategy(params);
  // 2. initialize Recorder
  const recorderOBO: Recorder = new Recorder(oneByOneStrategy);

  // to initialize RecordableContract
  // 1. have a initialized Recorder
  // 2. initialize Contract
  const WETH9Factory = await hre.ethers.getContractFactory("WETH9");
  const WETH9: WETH9 = await WETH9Factory.attach(
    "0xc778417e063141139fce010982780140aa0cd5ab"
  );
  // 3. initialize RecordableContract
  const WETH9recordable = new RecordableContract<WETH9>(WETH9, recorderOBO);

  //USAGE
  // record transaction
  await WETH9recordable.record.deposit();
  await WETH9recordable.record.approve(
    "0x4E9B1c9e75D059cF56e4E670aC20f3d67b4824E2",
    "1000"
  );
  // you can print recorded transactions
  recorderOBO.print();
  // execute recorder transaction with specified strategy
  await console.log(await recorderOBO.execute());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
