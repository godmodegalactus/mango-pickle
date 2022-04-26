use anchor_lang::prelude::*;
use std::{mem::size_of};
use anchor_lang::solana_program::program_pack::Pack;

mod instructions;
use instructions::*;

mod state;
use state::*;

mod errors;
use errors::*;

use mango::state::{MangoGroup};
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod mango_pickle {
    use super::*;

    pub fn init_pickle_group(ctx: Context<InitPickleGroup>, liquidation_deposit: u32) -> Result<()> {
        
        let accounts = ctx.accounts;
        let mut pickle_group = accounts.pickle_group_ai.load_init()?;
        pickle_group.meta_data = MetaData::new(DataType::PickleGroup, 0, true);
        pickle_group.admin_ai = accounts.admin.key();
        pickle_group.mango_group = *accounts.mango_group.key;
        pickle_group.mango_program_id = *accounts.mango_program_id.key;
        pickle_group.liquidation_deposit = liquidation_deposit;

        let mango_group_res = MangoGroup::load_checked( &accounts.mango_group, &accounts.mango_program_id.key());

        let mango_group = match mango_group_res {
            Ok(mango_group) => {
                Ok(mango_group)
            },
            Err(_) =>  Err(error!(PickleError::MangoError))
        }?;
        let mut token_counts : usize = 0;
        for i in 0..mango_group.tokens.len() {
            let token = mango_group.tokens[i];
            pickle_group.tokens[i].mint = token.mint;
            pickle_group.tokens[i].root_bank = token.root_bank;
            pickle_group.tokens[i].decimals = token.decimals;

            if token.mint != Pubkey::default() {
                token_counts += 1;
            }
        }

        if ctx.remaining_accounts.len() != token_counts * 2 {
            return Err(error!(PickleError::TokenPoolsMissing));
        }

        for i in (0..ctx.remaining_accounts.len()).step_by(2) {
            let mint_ai = &ctx.remaining_accounts[i];
            if pickle_group.tokens[i/2].mint != mint_ai.key() {
                return Err(error!(PickleError::InvalidMint))
            }
            let mint = spl_token::state::Mint::unpack_from_slice(&mint_ai.try_borrow_data()?)?;
            pickle_group.token_pools[i] = ctx.remaining_accounts[i + 1].key();
        }
        Ok(())
    }
}
