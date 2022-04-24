import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { MangoPickle } from "../target/types/mango_pickle";

describe("mango-pickle", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.MangoPickle as Program<MangoPickle>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
