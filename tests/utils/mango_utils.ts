import * as anchor from '@project-serum/anchor';
import { Market, OpenOrders } from "@project-serum/serum";
import * as mango_client from '@blockworks-foundation/mango-client';
import * as web3 from '@solana/web3.js'
import * as splToken from '@solana/spl-token';
import {
  NATIVE_MINT,
  Mint,
  TOKEN_PROGRAM_ID,
  MintLayout,
} from "@solana/spl-token";

import {
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {SerumUtils, DEX_ID,} from "./serum";
import {PythUtils} from "./pyth";
import { TestUtils } from './test_utils';
import * as mlog from "mocha-logger"
import { BN } from 'bn.js';

const bs58 = require("bs58");
const dex_program = DEX_ID;

export interface TokenData {
    mint : PublicKey,
    rootBank : PublicKey,
    nodeBank : PublicKey,
    market : Market,
    marketIndex : number,
    starting_price : number,
}

export interface User {
    user: Keypair,
    mangoAccountPk : PublicKey,
    spotOrders : PublicKey[];
}

export interface MangoContext {
    mangoGroup : PublicKey;
    signerKey: PublicKey;
    mangoCache : PublicKey;
    usdcRootBank: PublicKey;
    usdcNodeBank: PublicKey;
    tokens : Array<TokenData>;
    quoteToken :TokenData;
    MSRM : PublicKey;
    users : Array<User>
}

export class MangoUtils {
    connection : web3.Connection;
    authority : web3.Keypair;

    public static mango_programid = new web3.PublicKey("5vQp48Wx55Ft1PUAx8qWbsioNaLeXWVkyCq2XpQSv34M");

    serumUtils : SerumUtils;
    pythUtils : PythUtils;
    testUtils : TestUtils;
    mangoClient : mango_client.MangoClient;

    constructor (connection : web3.Connection, 
        authority : web3.Keypair,
        serumUtils : SerumUtils,
        pythUtils : PythUtils,
        testUtils : TestUtils) {
        this.connection = connection;
        this.authority = authority;
        this.serumUtils = serumUtils;
        this.pythUtils = pythUtils;
        this.testUtils = testUtils;
        this.mangoClient = new mango_client.MangoClient(this.connection, MangoUtils.mango_programid);
    }

    async createTokenAccount(token: TokenData, payer: Keypair, owner: PublicKey) : Promise<PublicKey> {
        return this.testUtils.createTokenAccount(token.mint, payer, owner);
    }

    async initializeTokens(context: MangoContext) {
        context.tokens = new Array<TokenData>()
        context.quoteToken = { 
            mint: await splToken.createMint(
                    this.connection,
                    this.authority,
                    this.authority.publicKey,
                    this.authority.publicKey,
                    6,),
            rootBank : null,
            nodeBank : null,
            market : null,
            marketIndex : 0,
            starting_price : 1,
        }

        context.MSRM = await splToken.createMint(
            this.connection,
            this.authority,
            this.authority.publicKey,
            this.authority.publicKey,
            6,);
    }

    public async addNewToken(context: MangoContext) {
        let tokenData : TokenData = { 
            mint: await splToken.createMint(
                    this.connection,
                    this.authority,
                    this.authority.publicKey,
                    this.authority.publicKey,
                    6,),
            rootBank : null,
            nodeBank : null,
            market : null,
            marketIndex : 0,
            starting_price : 1,
        };
        await this.initSpotMarket(context, tokenData);
        context.tokens.push(tokenData)

    }

    async createAccountForMango(size : number) : Promise<web3.PublicKey> {
        const lamports = await this.connection.getMinimumBalanceForRentExemption(size);
        let address = web3.Keypair.generate();

        const transaction = new web3.Transaction().add(
            web3.SystemProgram.createAccount({
                fromPubkey: this.authority.publicKey,
                newAccountPubkey: address.publicKey,
                lamports,
                space: size,
                programId: MangoUtils.mango_programid,
            }))

        transaction.feePayer = this.authority.publicKey;
        let hash = await this.connection.getRecentBlockhash();
        transaction.recentBlockhash = hash.blockhash;
        // Sign transaction, broadcast, and confirm
        await web3.sendAndConfirmTransaction(
            this.connection,
            transaction,
            [this.authority, address],
            { commitment: 'confirmed' },
        );
        return address.publicKey;
    }

    public async createMangoContext() : Promise<MangoContext> {

        const size = mango_client.MangoGroupLayout.span;
        let group_address = await this.createAccountForMango( size);
        let root_bank_address = await this.createAccountForMango(mango_client.RootBankLayout.span);
        let node_bank_address = await this.createAccountForMango(mango_client.NodeBankLayout.span);
        let mango_cache = await this.createAccountForMango(mango_client.MangoCacheLayout.span);

        const { signerKey, signerNonce } = await mango_client.createSignerKeyAndNonce(
            MangoUtils.mango_programid,
            group_address,
          );
        
        let mangoContext: MangoContext = {
            mangoGroup:null,
            signerKey,
            mangoCache:null,
            usdcRootBank:null,
            usdcNodeBank:null,
            tokens:null,
            quoteToken:null,
            MSRM:null,
            users: new Array<User>(),
        };

        await this.initializeTokens(mangoContext);

        //const [signer, nonce] = await web3.PublicKey.findProgramAddress([group_address.toBuffer()], MangoUtils.mango_programid);
        let usdc_vault = await this.createTokenAccount(mangoContext.quoteToken, this.authority, signerKey);
        splToken.mintTo(this.connection, this.authority, mangoContext.quoteToken.mint, usdc_vault, this.authority, 1000000 * 1000000);

        let insurance_vault = await this.createTokenAccount(mangoContext.quoteToken, this.authority, signerKey);
        splToken.mintTo(this.connection, this.authority, mangoContext.quoteToken.mint, insurance_vault, this.authority, 1000000 * 1000000);

        let fee_vault = await this.createTokenAccount(mangoContext.quoteToken, this.authority, TOKEN_PROGRAM_ID);
        splToken.mintTo(this.connection, this.authority, mangoContext.quoteToken.mint, fee_vault, this.authority, 1000000 * 1000000);

        let msrm_vault = await this.testUtils.createTokenAccount(mangoContext.MSRM, this.authority, signerKey);
        mangoContext.quoteToken.rootBank = root_bank_address;
        mangoContext.quoteToken.nodeBank = node_bank_address;
        
        let ix = mango_client.makeInitMangoGroupInstruction(
            MangoUtils.mango_programid,
            group_address,
            signerKey,
            this.authority.publicKey,
            mangoContext.quoteToken.mint,
            usdc_vault,
            node_bank_address,
            root_bank_address,
            insurance_vault,
            PublicKey.default,
            fee_vault,
            mango_cache,
            dex_program,
            new anchor.BN(signerNonce),
            new anchor.BN(10),
            mango_client.I80F48.fromNumber(0.7),
            mango_client.I80F48.fromNumber(0.06),
            mango_client.I80F48.fromNumber(1.5),
          );

        let ixCacheRootBank = mango_client.makeCacheRootBankInstruction(MangoUtils.mango_programid,
            group_address,
            mango_cache,
            [root_bank_address]);

        let ixupdateRootBank = mango_client.makeUpdateRootBankInstruction(MangoUtils.mango_programid,
                group_address,
                mango_cache,
                root_bank_address,
                [node_bank_address]);
        
        await this.processInstruction(ix, [this.authority]);
        await this.processInstruction(ixCacheRootBank, [this.authority]);
        await this.processInstruction(ixupdateRootBank, [this.authority]);

        mangoContext.mangoGroup = group_address;
        mangoContext.mangoCache = mango_cache;
        return mangoContext;
    }

    async initSpotMarket(mangoContext: MangoContext, tokendata : TokenData) : Promise<PublicKey> {
        const mint = tokendata.mint;

        let oracle = await this.pythUtils.createPriceAccount();
        // temp update oracle price to initate pyth oracle
        await this.pythUtils.updatePriceAccount(oracle, {
            exponent: 6,
            aggregatePriceInfo: {
            price: 1000000n,
            conf: 1000n,
            },
        });

        let market = await this.serumUtils.createMarket({
            baseToken : mint,
            quoteToken: mangoContext.quoteToken.mint,
            baseLotSize : 1000,
            quoteLotSize : 1000,
            feeRateBps : 0,
        });

        let root_bank_address = await this.createAccountForMango(mango_client.RootBankLayout.span);
        let node_bank_address = await this.createAccountForMango(mango_client.NodeBankLayout.span);

        let vault = await this.testUtils.createTokenAccount( mint, this.authority, mangoContext.signerKey);

        tokendata.nodeBank = node_bank_address;
        tokendata.rootBank = root_bank_address;
        tokendata.market = market;

        // add spot market to mango
        {
            let add_oracle_ix = mango_client.makeAddOracleInstruction(
                MangoUtils.mango_programid,
                mangoContext.mangoGroup,
                oracle.publicKey,
                this.authority.publicKey,
            );
            const transaction = new web3.Transaction();
            transaction.add(add_oracle_ix);;
            transaction.feePayer = this.authority.publicKey;
            let hash = await this.connection.getRecentBlockhash();
            transaction.recentBlockhash = hash.blockhash;
            // Sign transaction, broadcast, and confirm
            await web3.sendAndConfirmTransaction(
                this.connection,
                transaction,
                [this.authority],
                { commitment: 'confirmed' },
            );
        }

        let add_spot_ix = mango_client.makeAddSpotMarketInstruction(
            MangoUtils.mango_programid,
            mangoContext.mangoGroup,
            oracle.publicKey,
            market.address,
            DEX_ID,
            mint,
            node_bank_address,
            vault,
            root_bank_address,
            this.authority.publicKey,
            mango_client.I80F48.fromNumber(10),
            mango_client.I80F48.fromNumber(5),
            mango_client.I80F48.fromNumber(0.05),
            mango_client.I80F48.fromNumber(0.7),
            mango_client.I80F48.fromNumber(0.06),
            mango_client.I80F48.fromNumber(1.5),
        );

        let ixCacheRootBank = mango_client.makeCacheRootBankInstruction(MangoUtils.mango_programid,
            mangoContext.mangoGroup,
            mangoContext.mangoCache,
            [root_bank_address]);

        let ixupdateRootBank = mango_client.makeUpdateRootBankInstruction(MangoUtils.mango_programid,
            mangoContext.mangoGroup,
            mangoContext.mangoCache,
            root_bank_address,
            [node_bank_address]);

        const transaction = new web3.Transaction();
        transaction.add(add_spot_ix);
        transaction.add(ixCacheRootBank);
        transaction.add(ixupdateRootBank);
        transaction.feePayer = this.authority.publicKey;
        let hash = await this.connection.getRecentBlockhash();
        transaction.recentBlockhash = hash.blockhash;
        // Sign transaction, broadcast, and confirm
        await web3.sendAndConfirmTransaction(
            this.connection,
            transaction,
            [this.authority],
            { commitment: 'confirmed' },
        );
        return mint;
    }

    async refreshTokenCache(mangoContext: MangoContext, tokenData : TokenData) {
        
        let ixupdateRootBank = mango_client.makeUpdateRootBankInstruction(MangoUtils.mango_programid,
            mangoContext.mangoGroup,
            mangoContext.mangoCache,
            tokenData.rootBank,
            [tokenData.nodeBank]);
        
        const transaction = new web3.Transaction();
        transaction.add(ixupdateRootBank);
        transaction.feePayer = this.authority.publicKey;
        let hash = await this.connection.getRecentBlockhash();
        transaction.recentBlockhash = hash.blockhash;
        // Sign transaction, broadcast, and confirm
        await web3.sendAndConfirmTransaction(
            this.connection,
            transaction,
            [this.authority],
            { commitment: 'confirmed' },
        );
    }

    async refreshRootBankCache(mangoContext: MangoContext) {
        let ixCacheRootBank = mango_client.makeCacheRootBankInstruction(MangoUtils.mango_programid,
            mangoContext.mangoGroup,
            mangoContext.mangoCache,
            mangoContext.tokens.map(x=>x.mint));

        const transaction = new web3.Transaction();
        transaction.add(ixCacheRootBank);
        transaction.feePayer = this.authority.publicKey;
        let hash = await this.connection.getRecentBlockhash();
        transaction.recentBlockhash = hash.blockhash;
        // Sign transaction, broadcast, and confirm
        await web3.sendAndConfirmTransaction(
            this.connection,
            transaction,
            [this.authority],
            { commitment: 'confirmed' },
        );
    }

    async refreshAllTokenCache(mangoContext: MangoContext) {
        await this.refreshRootBankCache(mangoContext);
        await Promise.all(
            mangoContext.tokens.map(x=> this.refreshTokenCache(mangoContext, x))
        );
    }

    async createAccount( address: PublicKey, owner: Keypair, programId: PublicKey, size : number) {
        const lamports = await this.connection.getMinimumBalanceForRentExemption(size);

        const transaction = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: owner.publicKey,
                newAccountPubkey: address,
                lamports,
                space: size,
                programId,
            }))

        transaction.feePayer = owner.publicKey;
        let hash = await this.connection.getRecentBlockhash();
        transaction.recentBlockhash = hash.blockhash;
        // Sign transaction, broadcast, and confirm
        await sendAndConfirmTransaction(
            this.connection,
            transaction,
            [owner],
            { commitment: 'confirmed' },
        );
    }

    async processInstruction(ix: anchor.web3.TransactionInstruction, signers:Array<web3.Signer>)
    {
        const transaction = new web3.Transaction();
        transaction.add(ix);
        transaction.feePayer = this.authority.publicKey;
        signers.push(this.authority);
        let hash = await this.connection.getRecentBlockhash();
        transaction.recentBlockhash = hash.blockhash;
        // Sign transaction, broadcast, and confirm
        try{
        await web3.sendAndConfirmTransaction(
            this.connection,
            transaction,
            signers,
            { commitment: 'confirmed' },
        );
        }
        catch(ex)
        { 
            const ext = ex as anchor.web3.SendTransactionError;
            if (ext != null) {
                mlog.log("---------------error----------------------------------")
                mlog.log(ext.message)
                if (ext.logs != null)
                {
                    mlog.log(ext.logs.join(", "));
                }
            }
            throw ex;
        }
    }

    async createSpotAccount(mangoContext: MangoContext, mangoAccount : PublicKey, owner : Keypair, tokenData: TokenData) : Promise<PublicKey> {

        let mangoGroup = await this.mangoClient.getMangoGroup(mangoContext.mangoGroup);
        const marketIndex = new BN( mangoGroup.tokens.findIndex(x=> x.mint.equals(tokenData.mint)) );

        const [spotOpenOrdersAccount, _bump] = await PublicKey.findProgramAddress(
                [
                    mangoAccount.toBuffer(), 
                    marketIndex.toBuffer("le", 8), 
                    Buffer.from("OpenOrders"),
                ], MangoUtils.mango_programid);
        
        const space = OpenOrders.getLayout(DEX_ID).span;
        //await this.createAccount( spotOpenOrdersAccount, owner, DEX_ID, space);
        const lamports = await this.connection.getMinimumBalanceForRentExemption(space);

        let ix2 = mango_client.makeCreateSpotOpenOrdersInstruction(
            MangoUtils.mango_programid,
            mangoContext.mangoGroup,
            mangoAccount,
            owner.publicKey,
            DEX_ID,
            spotOpenOrdersAccount,
            tokenData.market.address,
            mangoContext.signerKey,
        )
        await this.processInstruction(ix2, [owner]);

        return spotOpenOrdersAccount;
    }
    async startLogging() {
        let logsCallback = (logs: anchor.web3.Logs, context: anchor.web3.Context) => {
            mlog.log( logs.logs.join("\n") )
            mlog.log( "error " + logs.err.toString() )
        };
        this.connection.onLogs("all", logsCallback)
    }

    async createSpotAccounts(mangoContext: MangoContext, mangoAccount : PublicKey, owner : Keypair,) : Promise<PublicKey[]> {
        return await Promise.all(
            mangoContext.tokens.map(x=> this.createSpotAccount(mangoContext, mangoAccount, owner, x))
        );
    }

    public async addUser(mangoContext: MangoContext) {
        const user = web3.Keypair.generate();
        await this.connection.confirmTransaction( await this.connection.requestAirdrop(
            user.publicKey,
            web3.LAMPORTS_PER_SOL * 100));

        const space = mango_client.MangoAccountLayout.span;
        const lamports = await this.connection.getMinimumBalanceForRentExemption(space);

        const account_num = new anchor.BN(0)
        const [mangoAccount, _bump] = await PublicKey.findProgramAddress([mangoContext.mangoGroup.toBuffer(), user.publicKey.toBuffer(), account_num.toBuffer("le", 8)], MangoUtils.mango_programid);
        const ixc = mango_client.makeCreateMangoAccountInstruction(
            MangoUtils.mango_programid,
            mangoContext.mangoGroup,
            mangoAccount,
            user.publicKey,
            account_num,
            user.publicKey,
        )
        await this.processInstruction(ixc, [user]);
        
        mangoContext.users.push( {
            user,
            mangoAccountPk : mangoAccount,
            spotOrders : await this.createSpotAccounts(mangoContext, mangoAccount, user),
        } );
    }
}