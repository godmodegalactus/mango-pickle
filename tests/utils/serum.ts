import { Market, DexInstructions, OpenOrders } from "@project-serum/serum";
import {
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    TransactionInstruction,
} from "@solana/web3.js";
import { BN } from "@project-serum/anchor";
import * as splToken from "@solana/spl-token";
import { TestUtils, toPublicKeys } from "./test_utils";
import mlog from "mocha-logger";

export const DEX_ID = new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");

export class SerumUtils {
    private utils: TestUtils;
    private authority: Keypair;

    constructor(utils: TestUtils,
        authority: Keypair) {
        this.utils = utils;
        this.authority = authority;
    }

    private async createAccountIx(
        account: PublicKey,
        space: number,
        programId: PublicKey
    ): Promise<TransactionInstruction> {
        return SystemProgram.createAccount({
            newAccountPubkey: account,
            fromPubkey: this.utils.payer().publicKey,
            lamports: await this.utils
                .connection()
                .getMinimumBalanceForRentExemption(space),
            space,
            programId,
        });
    }

    /**
     * Create a new Serum market
     */
    public async createMarket(info: CreateMarketInfo): Promise<Market> {
        const owner = this.utils.payer();
        const market = await this.utils.createAccount( owner, DEX_ID, Market.getLayout(DEX_ID).span,);
        const requestQueue = await this.utils.createAccount( owner, DEX_ID, 5132);
        const eventQueue = await this.utils.createAccount( owner, DEX_ID, 262156);
        const bids = await this.utils.createAccount( owner, DEX_ID, 65548);
        const asks = await this.utils.createAccount( owner, DEX_ID, 65548);
        const quoteDustThreshold = new BN(100);

        const [vaultOwner, vaultOwnerBump] = await this.findVaultOwner(
            market.publicKey
        );

        const [baseVault, quoteVault] = await Promise.all([
            this.utils.createTokenAccount(
                info.baseToken,
                this.authority,
                vaultOwner
            ),
            this.utils.createTokenAccount(
                info.quoteToken,
                this.authority,
                vaultOwner
                ),
            ]);
        
            
        const initMarketTx = this.utils.transaction().add(
            DexInstructions.initializeMarket(
                toPublicKeys({
                    market,
                    requestQueue,
                    eventQueue,
                    bids,
                    asks,
                    baseVault,
                    quoteVault,
                    baseMint: info.baseToken,
                    quoteMint: info.quoteToken,
                    baseLotSize: new BN(info.baseLotSize),
                    quoteLotSize: new BN(info.quoteLotSize),
                    feeRateBps: info.feeRateBps,
                    vaultSignerNonce: vaultOwnerBump,
                    quoteDustThreshold,
                    programId: DEX_ID,
                })
            )
        );

        await this.utils.sendAndConfirmTransaction(initMarketTx, []);

        let mkt = await Market.load(
            this.utils.connection(),
            market.publicKey,
            { commitment: "recent" },
            DEX_ID
        );
        return mkt;
    }

    public async createMarketMaker(
        lamports: number,
        tokens: [PublicKey, BN][]
    ): Promise<MarketMaker> {
        const account = await this.utils.createWallet(lamports);
        const tokenAccounts = {};
        const transactions = [];
        for (const [token, amount] of tokens) {
            const publicKey = await this.utils.createTokenAccount(
                token,
                this.authority,
                account.publicKey,
            );
            splToken.mintTo( this.utils.connection(), this.authority, token, publicKey, this.authority, amount.toNumber())
            tokenAccounts[token.toBase58()] = publicKey;
        }

        return new MarketMaker(this.utils, account, tokenAccounts);
    }

    public async createAndMakeMarket(baseToken: PublicKey, quoteToken: PublicKey, marketPrice: number, exp : number): Promise<Market> {
        const market = await this.createMarket({
            baseToken,
            quoteToken,
            baseLotSize: 1000,
            quoteLotSize: 100,
            feeRateBps: 0,
        });
        let nb = Math.floor(40000/marketPrice);
        {
            
            const marketMaker = await this.createMarketMaker(
                1 * LAMPORTS_PER_SOL,
                [
                    [baseToken, new anchor.BN(nb * 10)],
                    [quoteToken,  new anchor.BN(nb * 10)],
                ]
            );
            const bids = MarketMaker.makeOrders([[marketPrice * 0.995, nb]]);
            const asks = MarketMaker.makeOrders([[marketPrice * 1.005, nb]]);

            await marketMaker.placeOrders(market, bids, asks);
        }
        return market;
    }

    public async findVaultOwner(market: PublicKey): Promise<[PublicKey, BN]> {
        const bump = new BN(0);
    
        while (bump.toNumber() < 255) {
            try {
                const vaultOwner = await PublicKey.createProgramAddress(
                    [market.toBuffer(), bump.toArrayLike(Buffer, "le", 8)],
                    DEX_ID
                );
    
                return [vaultOwner, bump];
            } catch (_e) {
                bump.iaddn(1);
            }
        }
    
        throw new Error("no seed found for vault owner");
    }
    
}

export interface CreateMarketInfo {
    baseToken: PublicKey;
    quoteToken: PublicKey;
    baseLotSize: number;
    quoteLotSize: number;
    feeRateBps: number;
}

export interface Order {
    price: number;
    size: number;
}

export class MarketMaker {
    public account: Keypair;
    public tokenAccounts: { [mint: string]: PublicKey };

    private utils: TestUtils;

    constructor(
        utils: TestUtils,
        account: Keypair,
        tokenAccounts: { [mint: string]: PublicKey }
    ) {
        this.utils = utils;
        this.account = account;
        this.tokenAccounts = tokenAccounts;
    }

    static makeOrders(orders: [number, number][]): Order[] {
        return orders.map(([price, size]) => ({ price, size }));
    }

    async placeOrders(market: Market, bids: Order[], asks: Order[]) {
        await this.utils.connection().confirmTransaction(
            await this.utils.connection().requestAirdrop(this.account.publicKey, 20 * LAMPORTS_PER_SOL),
            "confirmed"
          );

        const baseTokenAccount =
            this.tokenAccounts[market.baseMintAddress.toBase58()];

        const quoteTokenAccount =
            this.tokenAccounts[market.quoteMintAddress.toBase58()];

        const askOrderTxs = [];
        const bidOrderTxs = [];

        const placeOrderDefaultParams = {
            owner: this.account.publicKey,
            clientId: undefined,
            openOrdersAddressKey: undefined,
            openOrdersAccount: undefined,
            feeDiscountPubkey: null,
        };
        for (const entry of asks) {
            const { transaction, signers } =
                await market.makePlaceOrderTransaction(
                    this.utils.connection(),
                    {
                        payer: baseTokenAccount,
                        side: "sell",
                        price: entry.price,
                        size: entry.size,
                        orderType: "limit",
                        selfTradeBehavior: "decrementTake",
                        ...placeOrderDefaultParams,
                    }
                );

            askOrderTxs.push([transaction, [this.account, ...signers]]);
        }

        for (const entry of bids) {
            const { transaction, signers } =
                await market.makePlaceOrderTransaction(
                    this.utils.connection(),
                    {
                        payer: quoteTokenAccount,
                        side: "buy",
                        price: entry.price,
                        size: entry.size,
                        orderType: "limit",
                        selfTradeBehavior: "decrementTake",
                        ...placeOrderDefaultParams,
                    }
                );

            bidOrderTxs.push([transaction, [this.account, ...signers]]);
        }

        await this.utils.sendAndConfirmTransactionSet(
            ...askOrderTxs,
            ...bidOrderTxs
        );
    }
}