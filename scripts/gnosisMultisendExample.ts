import { Signer, ethers } from "ethers";
import { Recorder } from "./Recorder";
import { WETH9 } from "../typechain";
import { RecordableContract } from "./RecordableContract";
import SafeServiceClient from "@gnosis.pm/safe-service-client";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { GnosisMultisendStrategy } from "./strategies/GnosisMultisendStrategy.class";
import { PRIVATE_KEY } from "../privatekey";

const senderAddress = "0x4E9B1c9e75D059cF56e4E670aC20f3d67b4824E2";
const safeAddress = "0x1723eCac74D89eDEc0FD45a14283c8BA3a6B61d4";
const transactionServiceUrl = {
  rinkeby: "https://safe-transaction.rinkeby.gnosis.io/",
  mainnet: "https://safe-transaction.gnosis.io",
};
const web3Provider =
  "https://rinkey.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161";

const hre = require("hardhat");
async function main() {
  const safeService = new SafeServiceClient(transactionServiceUrl.rinkeby);
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

  const WETH9Factory = await hre.ethers.getContractFactory("WETH9");
  const WETH9: WETH9 = await WETH9Factory.attach(
    "0xc778417e063141139fce010982780140aa0cd5ab"
  );
  const signer: Signer = (await hre.ethers.getSigners())[0];
  const gnosisMultisendStrategy = new GnosisMultisendStrategy(
    safeSdk,
    safeService,
    safeAddress,
    senderAddress
  );

  const recorder: Recorder = new Recorder(gnosisMultisendStrategy);

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
