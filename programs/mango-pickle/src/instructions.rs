use anchor_spl::token::{TokenAccount, Token, Mint};
use spl_token::native_mint;

use crate::*;

const PICKLE_GROUP_KEY : &[u8] = b"pickle_group";
const PICKLE_NATIVE_VAULT : &[u8] = b"PICKLE_SOL_VAULT";
pub const PICKLE_AUTHORITY: &[u8] = b"PICKLE_AUTHORITY";
//const PICKLE_SIGNER_KEY : &[u8] = b"pickle_signer";

#[derive(Accounts)]
pub struct InitPickleGroup<'info> {
    #[account(mut)]
    pub admin : Signer<'info>,
    /// CHECK: mango program id, no need to check
    pub mango_program_id : AccountInfo<'info>,
    /// CHECK: mango group will be checked by us, but the underlying data is handled by mango
    pub mango_group : AccountInfo<'info>,
    
    #[account( init,
        seeds = [ 
                    PICKLE_GROUP_KEY, 
                    &mango_group.key.to_bytes(),
                    &mango_program_id.key.to_bytes(),
                ],
        bump,
        payer = admin,
        space = 8 + size_of::<PickleGroup>(),)]
    pub pickle_group_ai : AccountLoader<'info, PickleGroup>,
    
    /// CHECK: PDA of mango authority will be checked before intializing, should be generated using seeds [PICKLE_AUTHORITY, pickle_group_pk]
    pub pickle_authority : AccountInfo<'info>,

    #[account(mut, 
        constraint = solana_mint.key() == native_mint::id())]
    pub solana_mint:  Box<Account<'info, Mint>>,

    // vault where all the solana to incentivise the keepers is kept
    #[account( init,
        seeds = [
            PICKLE_NATIVE_VAULT,
            &mango_group.key.to_bytes(),
            &mango_program_id.key.to_bytes(),
        ],
        bump,
        payer = admin,
        token::mint = solana_mint,
        token::authority = pickle_authority,
    )]
    pub solana_vault: Box<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct RegisterNewUser<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_pickle_account: AccountLoader<'info, PickleUser>,
}