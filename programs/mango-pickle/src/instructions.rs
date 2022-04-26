use crate::*;

const PICKLE_GROUP_KEY : &[u8] = b"pickle_group";
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

    pub system_program : Program<'info, System>,
}