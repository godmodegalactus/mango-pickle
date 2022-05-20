import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { MangoPickle } from "../target/types/mango_pickle";
import { TestUtils } from "./utils/test_utils";
import { SerumUtils } from "./utils/serum"
import { MangoContext, MangoUtils } from "./utils/mango_utils"
import { PythUtils } from "./utils/pyth";
import * as mlog from "mocha-logger"
import * as mango_client from '@blockworks-foundation/mango-client';

describe("mango-pickle", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MangoPickle as Program<MangoPickle>;
  const connection = provider.connection;

  const owner = anchor.web3.Keypair.generate();

  
  const test_utils = new TestUtils(connection, owner);
  const serumUtils = new SerumUtils(test_utils, owner);
  const pythUtils = new PythUtils(connection, owner);
  const testUtils = new TestUtils(connection, owner);
  const mangoUtils = new MangoUtils(connection, owner, serumUtils, pythUtils, testUtils);
  let mangoContext : MangoContext = null;

  // solana logger
  // let logsCallback = (logs: anchor.web3.Logs, context: anchor.web3.Context) => {
  //   mlog.log( logs.logs.join("\n") )
  // };
  // const listner = connection.onLogs(MangoUtils.mango_programid, logsCallback)

  it("Initialize Mango and add two users", async () => {
    const sig = await connection.requestAirdrop(
        owner.publicKey,
        anchor.web3.LAMPORTS_PER_SOL * 100,
    );
    await connection.confirmTransaction(sig);

    mangoContext = await mangoUtils.createMangoContext();
    await mangoUtils.addNewToken(mangoContext)
    await mangoUtils.addNewToken(mangoContext)
    await mangoUtils.addNewToken(mangoContext)
    await mangoUtils.addNewToken(mangoContext)
    await mangoUtils.addNewToken(mangoContext)
    await mangoUtils.addUser(mangoContext);
    await mangoUtils.addUser(mangoContext);
  });

  it("Initialize Pickle account", async() => {
    let mangoClient = new mango_client.MangoClient(connection, new anchor.web3.PublicKey(MangoUtils.mango_programid));

    const [pickleGroup, bump] = await anchor.web3.PublicKey.findProgramAddress([Buffer.from("pickle_group"), mangoContext.mangoGroup.toBuffer(), MangoUtils.mango_programid.toBuffer()], program.programId)
    const token_pools = 
      (
        await Promise.all( mangoContext.tokens.map(x => testUtils.createTokenAccount(x.mint, owner, owner.publicKey)) )  
      ).map(x => ({ isSigner: false, isWritable: false, pubkey: x }));

    await program.methods.initPickleGroup(
      1000,
      ).accounts({
        admin: owner.publicKey,
        mangoProgramId: MangoUtils.mango_programid,
        mangoGroup: mangoContext.mangoGroup,
        pickleGroupAi: pickleGroup,
        systemProgram: anchor.web3.SystemProgram.programId
      }).signers(
        [owner]
      ).remainingAccounts(
        token_pools
      ).rpc();

    //connection.removeOnLogsListener(listner);
  })

});
