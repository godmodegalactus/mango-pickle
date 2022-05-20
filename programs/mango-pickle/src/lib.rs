use anchor_lang::prelude::*;
use anchor_spl::*;
use std::mem::size_of;

mod instructions;
use instructions::*;

mod state;
use state::*;

mod errors;
use errors::*;

use mango::state::MangoGroup;
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod mango_pickle {
    use super::*;

    pub fn init_pickle_group(
        ctx: Context<InitPickleGroup>,
        liquidation_deposit: u32,
    ) -> Result<()> {
        let accounts = ctx.accounts;
        let mut pickle_group = accounts.pickle_group_ai.load_init()?;
        pickle_group.meta_data = MetaData::new(DataType::PickleGroup, 0, true);
        pickle_group.admin_ai = accounts.admin.key();
        pickle_group.mango_group = *accounts.mango_group.key;
        pickle_group.mango_program_id = *accounts.mango_program_id.key;
        pickle_group.liquidation_deposit = liquidation_deposit;

        let mango_group_res =
            MangoGroup::load_checked(&accounts.mango_group, &accounts.mango_program_id.key());

        let mango_group = match mango_group_res {
            Ok(mango_group) => Ok(mango_group),
            Err(_) => Err(error!(PickleError::MangoError)),
        }?;

        // to count and copy number of mango tokens
        let mut token_counts: usize = 0;
        for i in 0..mango_group.tokens.len() - 1 {
            // -1 as the last is USDC(quote token)
            let token = mango_group.tokens[i];
            if token.mint == Pubkey::default() {
                continue;
            }

            token_counts += 1;
            pickle_group.tokens[i].mint = token.mint;
            pickle_group.tokens[i].root_bank = token.root_bank;
            pickle_group.tokens[i].decimals = token.decimals;
        }
        solana_program::msg!("token count : {}", token_counts);

        require!(
            ctx.remaining_accounts.len() == token_counts,
            PickleError::TokenPoolsMissing
        );

        for i in 0..ctx.remaining_accounts.len() {
            let mint = token::accessor::mint(&ctx.remaining_accounts[i])?;
            if mint != pickle_group.tokens[i].mint {
                return Err(error!(PickleError::InvalidMint));
            }
            pickle_group.token_pools[i] = ctx.remaining_accounts[i].key();
        }
        Ok(())
    }
}
