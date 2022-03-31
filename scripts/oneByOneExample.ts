import { Signer } from "ethers";
import { Recorder } from "./Recorder";
import { WETH9 } from "../typechain";
import { OneByOneStrategy } from "./strategies/OneByOneStrategy.class";
import { RecordableContract } from "./RecordableContract";

const hre = require("hardhat");
async function main() {
  const WETH9Factory = await hre.ethers.getContractFactory("WETH9");
  const WETH9: WETH9 = await WETH9Factory.attach(
    "0xc778417e063141139fce010982780140aa0cd5ab"
  );
  const signer: Signer = (await hre.ethers.getSigners())[0];
  const oneByOneStrategy = new OneByOneStrategy(signer);

  const recorder: Recorder = new Recorder(oneByOneStrategy);

  const WETH9recorder = new RecordableContract<WETH9>(WETH9, recorder);

  await WETH9recorder.record.deposit();
  await WETH9recorder.record.approve(
    "0x4E9B1c9e75D059cF56e4E670aC20f3d67b4824E2",
    "1000"
  );

  recorder.print();
  await console.log(await recorder.execute());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
