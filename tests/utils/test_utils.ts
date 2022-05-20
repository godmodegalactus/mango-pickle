import { Wallet, BN } from "@project-serum/anchor";
import {
    NATIVE_MINT,
    createAccount,
    createMint,
    TOKEN_PROGRAM_ID,
    AccountLayout as TokenAccountLayout,
} from "@solana/spl-token";
import {
    Account,
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Signer,
    SystemProgram,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";
import { PythUtils } from "./pyth";
import mlog from "mocha-logger";

export class TestUtils {
    public static readonly pythProgramId = PythUtils.programId;

    public pyth: PythUtils;

    private conn: Connection;
    private authority: Keypair;

    private recentBlockhash: string;

    constructor(conn: Connection, authority: Keypair) {
        this.conn = conn;
        this.authority = authority;
        this.pyth = new PythUtils(conn, authority);
    }

    async createAccount( owner : Keypair, pid : PublicKey, space: number): Promise<Keypair> {
        const newAccount = new Keypair();
        const createTx = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: owner.publicKey,
                newAccountPubkey: newAccount.publicKey,
                programId: pid,
                lamports: await this.conn.getMinimumBalanceForRentExemption(
                    space
                ),
                space,
            })
        );

        await sendAndConfirmTransaction(this.conn, createTx, [
            owner,
            newAccount,
        ]);
        return newAccount;
    }

    async updateBlockhash() {
        this.recentBlockhash = (await this.conn.getRecentBlockhash()).blockhash;
    }

    payer(): Keypair {
        return this.authority;
    }

    connection(): Connection {
        return this.conn;
    }

    transaction(): Transaction {
        return new Transaction({
            feePayer: this.authority.publicKey,
            recentBlockhash: this.recentBlockhash,
        });
    }

    
    async createTokenAccount(mint: PublicKey, payer: Keypair, owner: PublicKey) : Promise<PublicKey> {
        return createAccount(this.conn,
            payer,
            mint,
            owner,
            Keypair.generate())
    }

    async createToken(
        decimals: number,
        authority: PublicKey = this.authority.publicKey
    ): Promise<PublicKey> {
        const token = await createMint(
            this.conn,
            this.authority,
            authority,
            authority,
            decimals,
            anchor.web3.TOKEN_PROGRAM_ID
        );

        return token;
    }


    async createWallet(lamports: number): Promise<Keypair> {
        const wallet = Keypair.generate();
        const fundTx = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: this.authority.publicKey,
                toPubkey: wallet.publicKey,
                lamports,
            })
        );

        await this.sendAndConfirmTransaction(fundTx, [this.authority]);
        return wallet;
    }

    async findProgramAddress(
        programId: PublicKey,
        seeds: (HasPublicKey | ToBytes | Uint8Array | string)[]
    ): Promise<[PublicKey, number]> {
        const seed_bytes = seeds.map((s) => {
            if (typeof s == "string") {
                return Buffer.from(s);
            } else if ("publicKey" in s) {
                return s.publicKey.toBytes();
            } else if ("toBytes" in s) {
                return s.toBytes();
            } else {
                return s;
            }
        });
        return await PublicKey.findProgramAddress(seed_bytes, programId);
    }

    async sendAndConfirmTransaction(
        transaction: Transaction,
        signers: Signer[]
    ): Promise<string> {
        return await sendAndConfirmTransaction(
            this.conn,
            transaction,
            signers.concat(this.authority)
        );
    }

    async  sendAndConfirmTransactionSet(
        ...transactions: [Transaction, Signer[]][]
    ): Promise<string[]> {
        const signatures = await Promise.all(
            transactions.map(([t, s]) =>
                this.conn.sendTransaction(t, s)
            )
        );
        const result = await Promise.all(
            signatures.map((s) => this.conn.confirmTransaction(s))
        );

        const failedTx = result.filter((r) => r.value.err != null);

        if (failedTx.length > 0) {
            throw new Error(`Transactions failed: ${failedTx}`);
        }

        return signatures;
    }
}

export function toBN(obj: any): any {
    if (typeof obj == "number") {
        return new BN(obj);
    } else if (typeof obj == "object") {
        const bnObj = {};

        for (const field in obj) {
            bnObj[field] = toBN(obj[field]);
        }

        return bnObj;
    }

    return obj;
}

export function toPublicKeys(
    obj: Record<string, string | PublicKey | HasPublicKey | any>
): any {
    const newObj = {};

    for (const key in obj) {
        const value = obj[key];

        if (typeof value == "string") {
            newObj[key] = new PublicKey(value);
        } else if (typeof value == "object" && "publicKey" in value) {
            newObj[key] = value.publicKey;
        } else {
            newObj[key] = value;
        }
    }

    return newObj;
}

export function toBase58(
    obj: Record<string, string | PublicKey | HasPublicKey>
): any {
    const newObj = {};

    for (const key in obj) {
        const value = obj[key];

        if (value == undefined) {
            continue;
        } else if (typeof value == "string") {
            newObj[key] = value;
        } else if ("publicKey" in value) {
            newObj[key] = value.publicKey.toBase58();
        } else if ("toBase58" in value && typeof value.toBase58 == "function") {
            newObj[key] = value.toBase58();
        } else {
            newObj[key] = value;
        }
    }

    return newObj;
}

interface ToBytes {
    toBytes(): Uint8Array;
}

interface HasPublicKey {
    publicKey: PublicKey;
}


export function getAmountDifference(beforeAmount: number, afterAmount: number): number {
    return afterAmount - beforeAmount;
}