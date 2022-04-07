import { Recorder } from "../scripts/Recorder.class";
import {
  MultiTimelockStrategy,
  MultiTimelockParams,
} from "../scripts/strategies/MultiTimelockStrategy.class";
import { RecordableContract } from "../scripts/RecordableContract.class";
import { BigNumber, ContractReceipt, Signer } from "ethers";
import { Flipper, MultiTimelock } from "../typechain";

const { expect } = require("chai");
const { ethers } = require("hardhat");

const hre = require("hardhat");

const DAY = 86400;

type QueuedTransaction = {
  target: string;
  value: number | string;
  signature: string;
  data: string;
};

describe("MultiTimeLock Testing...", () => {
  let owner: any;
  let user: any;
  let flipper: Flipper;
  let multiTimelock: MultiTimelock;

  beforeEach("deploy contracts", async () => {
    [owner, user] = await ethers.getSigners();
    const Flipper = await ethers.getContractFactory("Flipper");
    flipper = await Flipper.deploy();
    await flipper.deployed();
    const MultiTimeLock = await ethers.getContractFactory("MultiTimelock");
    multiTimelock = await MultiTimeLock.deploy(owner.address, 2 * DAY);
    await multiTimelock.deployed();
    await flipper.transferOwnership(multiTimelock.address);
  });

  describe("Deployment", async () => {
    it("Deployed correctly", async function () {
      const state0 = await flipper.state(0);
      const state1 = await flipper.state(1);
      const state2 = await flipper.state(2);
      const flipperOwner = await flipper.owner();
      const admin = await multiTimelock.admin();
      const delay = await multiTimelock.delay();

      expect(state0).to.equal(false);
      expect(state1).to.equal(false);
      expect(state2).to.equal(false);
      expect(flipperOwner).to.equal(multiTimelock.address);
      expect(admin).to.equal(owner.address);
      expect(delay).to.equal(BigNumber.from(2 * DAY));
    });
    it("Flipping should fail when called not by admin", async () => {
      await expect(flipper.flip(0)).to.be.reverted;
    });
  });

  describe("MultiTimelock", async () => {
    it("Queueing should fail when called not by admin", async () => {
      const populated = await flipper.populateTransaction.flip(0);
      const queued: QueuedTransaction = {
        target: flipper.address,
        value: 0,
        signature: "",
        data: populated.data as string,
      };

      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const timestamp = blockBefore.timestamp;
      const eta = BigNumber.from(timestamp)
        .add(BigNumber.from(3 * DAY))
        .toString();

      await expect(multiTimelock.connect(user).queueTransactions([queued], eta))
        .to.be.reverted;
    });

    describe("sending more than one batched transaction", async () => {
      let txContractHash: any;
      let txHash: any;
      let queued: QueuedTransaction[] = [];
      let eta: any;
      beforeEach(" Qeueing", async () => {
        queued = [
          {
            target: flipper.address,
            value: 0,
            signature: "",
            data: (await flipper.populateTransaction.flip(0)).data as string,
          },
          {
            target: flipper.address,
            value: 0,
            signature: "",
            data: (await flipper.populateTransaction.flip(1)).data as string,
          },
        ];
        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        const timestamp = blockBefore.timestamp;
        eta = BigNumber.from(timestamp)
          .add(BigNumber.from(3 * DAY))
          .toString();

        const tx = await multiTimelock.queueTransactions(queued, eta);
        const receipt = await tx.wait();
        txContractHash = receipt.events?.filter((x) => {
          return x.event == "QueueTransactions";
        })[0].args?.txHash;
        txHash = tx.hash;
      });

      it("Queueing two transaction by admin should work", async () => {
        expect(
          await multiTimelock.queuedTransactions(txContractHash)
        ).to.be.equal(true);
      });

      it("Queueing and Executing two transaction by admin should work", async () => {
        await ethers.provider.send("evm_increaseTime", [3 * DAY + 100]);

        await multiTimelock.executeTransactions(queued, eta);

        expect(await flipper.state(0)).to.be.equal(true);
        expect(await flipper.state(1)).to.be.equal(true);
        expect(await flipper.state(2)).to.be.equal(false);

        expect(
          await multiTimelock.queuedTransactions(txContractHash)
        ).to.be.equal(false);
      });

      it("Executing before eta by admin should fail", async () => {
        await ethers.provider.send("evm_increaseTime", [1 * DAY + 100]);

        await expect(multiTimelock.executeTransactions(queued, eta)).to.be
          .reverted;

        expect(await flipper.state(0)).to.be.equal(false);
        expect(await flipper.state(1)).to.be.equal(false);
        expect(await flipper.state(2)).to.be.equal(false);

        expect(
          await multiTimelock.queuedTransactions(txContractHash)
        ).to.be.equal(true);
      });

      it("Executing using decoded data got from txHash", async () => {
        // getting txDAta from txHash
        const txData = (await ethers.provider.getTransaction(txHash)).data;
        const decodedTxData = await multiTimelock.interface.decodeFunctionData(
          "queueTransactions",
          txData
        );
        // TODO make function
        const decodedQueuedTransactions: QueuedTransaction[] = [
          {
            target: decodedTxData[0][0].target,
            value: decodedTxData[0][0].value,
            signature: decodedTxData[0][0].signature,
            data: decodedTxData[0][0].data,
          },
          {
            target: decodedTxData[0][1].target,
            value: decodedTxData[0][1].value,
            signature: decodedTxData[0][1].signature,
            data: decodedTxData[0][1].data,
          },
        ];
        const decodedEta = decodedTxData[1].toString();
        await ethers.provider.send("evm_increaseTime", [3 * DAY + 100]);
        await multiTimelock.executeTransactions(
          decodedQueuedTransactions,
          decodedEta
        );
        expect(await flipper.state(0)).to.be.equal(true);
        expect(await flipper.state(1)).to.be.equal(true);
        expect(
          await multiTimelock.queuedTransactions(txContractHash)
        ).to.be.equal(false);
      });
    });

    describe("Using Recorder to queue", async () => {
      let txContractHash: any;
      let txHash: any;
      beforeEach("Recording and executing recorder transactoin", async () => {
        // With use of Recorder.class and RecordableContract.class
        // we are going to record flipper transactions
        // and execute them with multiTimelockStrategy that will send them to timelock

        // to initialize  Recorder:
        // 1. initialize strategy
        // 1.1 speify strategy-speific params
        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        const timestamp = blockBefore.timestamp;
        const eta = (timestamp + 3 * DAY + 100).toString();

        const signer: Signer = (await hre.ethers.getSigners())[0];
        const params: MultiTimelockParams = {
          signer: signer,
          multiTimelock: multiTimelock,
          eta: eta,
        };
        // 1.2 initialize strategy by passing params
        const multiTimelockStrategy = new MultiTimelockStrategy(params);
        // 2. initialize Recorder
        const recorder: Recorder = new Recorder(multiTimelockStrategy);

        // to initialize RecordableContract
        // 1. have a initialized Recorder
        // 2. initialize Contract - already initialized
        // 3. initialize RecordableContract
        const flipperRecordable = new RecordableContract<Flipper>(
          flipper,
          recorder
        );
        //USAGE
        // record transaction
        await flipperRecordable.record.flip("0");
        await flipperRecordable.record.flip("1");
        console.log("dupa");

        const receipt = (await recorder.execute())[0] as ContractReceipt;
        txContractHash = receipt.events?.filter((x) => {
          return x.event == "QueueTransactions";
        })[0].args?.txHash;
        txHash = receipt.events?.filter((x) => {
          return x.event == "QueueTransactions";
        })[0].transactionHash;
      });

      it("Queueing two transaction by admin should work", async () => {
        expect(
          await multiTimelock.queuedTransactions(txContractHash)
        ).to.be.equal(true);
      });

      it("Executing using decoded data got from txHash", async () => {
        // getting txDAta from txHash
        const txData = (await ethers.provider.getTransaction(txHash)).data;
        const decodedTxData = await multiTimelock.interface.decodeFunctionData(
          "queueTransactions",
          txData
        );

        // TODO make function
        const decodedQueuedTransactions: QueuedTransaction[] = [
          {
            target: decodedTxData[0][0].target,
            value: decodedTxData[0][0].value,
            signature: decodedTxData[0][0].signature,
            data: decodedTxData[0][0].data,
          },
          {
            target: decodedTxData[0][1].target,
            value: decodedTxData[0][1].value,
            signature: decodedTxData[0][1].signature,
            data: decodedTxData[0][1].data,
          },
        ];
        const decodedEta = decodedTxData[1].toString();
        await ethers.provider.send("evm_increaseTime", [3 * DAY + 100]);
        await multiTimelock.executeTransactions(
          decodedQueuedTransactions,
          decodedEta
        );
        expect(await flipper.state(0)).to.be.equal(true);
        expect(await flipper.state(1)).to.be.equal(true);
        expect(
          await multiTimelock.queuedTransactions(txContractHash)
        ).to.be.equal(false);
      });
    });
  });
});
