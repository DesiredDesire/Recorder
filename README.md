# Recorder
RecordableContract.class extends ethers.Contract and allows for easy transaction data recording on Recorded.class.

After recording some transactions on Recorder.class one can execute all of them using definded during Recorder.class construction Strategy.interface by calling method execute.

For now the implemented strategies are:

  oneByOneStrategy.class - sends all transaction on Blockchain using ethers.Signer
  
  gnosisMultisendStrategy.class - batches all transactions and sends them to specified gnosisSafe
  
Check oneByOneExample.ts and gnosisMultisendExample.ts to see how it is done.
