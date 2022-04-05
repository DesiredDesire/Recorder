import { Signer, ethers } from "ethers";
import { Recorder } from "./Recorder.class";
import { WETH9 } from "../typechain";
import { RecordableContract } from "./RecordableContract.class";
import SafeServiceClient from "@gnosis.pm/safe-service-client";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import {
  GnosisMultisendStrategy,
  GnosisMultisendStrategyParams,
} from "./strategies/GnosisMultisendStrategy.class";
import { PRIVATE_KEY } from "../privatekey";

const senderAddress = "0x3CEb3f792C5C3f3f74f61fE6E08a6005B5fBe4F3";
const safeAddress = "0xCe0c0D75a1841D34A8Df6f4961478115ae29E5fb";
const transactionServiceUrl = {
  rinkeby: "https://safe-transaction.rinkeby.gnosis.io/",
  mainnet: "https://safe-transaction.gnosis.io",
};

const hre = require("hardhat");

async function main() {
  // to initialize  Recorder:
  // 1. initialize strategy
  // 1.1 speify strategy-speific params
  const infuraProvider = new ethers.providers.InfuraProvider(
    "rinkeby",
    "9aa3d95b3bc440fa88ea12eaa4456161"
  );
  const safeOwner = new ethers.Wallet(PRIVATE_KEY, infuraProvider);
  const ethAdapter = new EthersAdapter({
    ethers,
    signer: safeOwner,
  });
  const safeSdk = await Safe.create({
    ethAdapter,
    safeAddress,
    isL1SafeMasterCopy: true,
  });
  const safeService = new SafeServiceClient(transactionServiceUrl.rinkeby);
  const params: GnosisMultisendStrategyParams = {
    safeSdk: safeSdk,
    safeServiceClient: safeService,
    safeAddress: safeAddress,
    senderAddress: senderAddress,
  };
  // 1.2 initialize strategy by passing params
  const gnosisMultisendStrategy = new GnosisMultisendStrategy(params);
  // 2. initialize Recorder
  const recorder: Recorder = new Recorder(gnosisMultisendStrategy);

  // to initialize RecordableContract
  // 1. have a initialized Recorder
  // 2. initialize Contract
  const WETH9Factory = await hre.ethers.getContractFactory("WETH9");
  const WETH9: WETH9 = await WETH9Factory.attach(
    "0xc778417e063141139fce010982780140aa0cd5ab"
  );
  // 3. initialize RecordableContract
  const WETH9recorder = new RecordableContract<WETH9>(WETH9, recorder);

  //USAGE
  // record transaction
  await WETH9recorder.record.deposit();
  await WETH9recorder.record.approve(
    "0x4E9B1c9e75D059cF56e4E670aC20f3d67b4824E2",
    "1000"
  );
  // you can print recorded transactions
  recorder.print();
  // execute recorder transaction with specified strategy
  await console.log(await recorder.execute());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
