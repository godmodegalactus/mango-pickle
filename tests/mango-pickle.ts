import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { MangoPickle } from "../target/types/mango_pickle";
import { TestUtils } from "./utils/test_utils";
import { SerumUtils } from "./utils/serum"
import { MangoContext, MangoUtils } from "./utils/mango_utils"
import { PythUtils } from "./utils/pyth";
import * as mlog from "mocha-logger"

describe("mango-pickle", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MangoPickle as Program<MangoPickle>;
  const connection = provider.connection;

  const owner = anchor.web3.Keypair.generate();

  const test_utils = new TestUtils(connection, owner);
  const serumUtils = new SerumUtils(test_utils);
  const pythUtils = new PythUtils(connection, owner)
  const mangoUtils = new MangoUtils(connection, owner, serumUtils, pythUtils);
  let mangoContext : MangoContext = null;
  it("Initialize Mango and add two users", async () => {
    const sig = await connection.requestAirdrop(
        owner.publicKey,
        anchor.web3.LAMPORTS_PER_SOL * 100,
    );
    await connection.confirmTransaction(sig);

    mangoContext = await mangoUtils.createMangoContext();
    mlog.log("Mango context created");
    await mangoUtils.addUser(mangoContext);
    await mangoUtils.addUser(mangoContext);
  });
});
