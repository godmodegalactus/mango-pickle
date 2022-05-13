use crate::*;

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
#[repr(u8)]
pub enum DataType {
    PickleGroup = 0,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Copy)]
#[repr(C)]
/// Stores meta information about the `Account` on chain
pub struct MetaData {
    pub data_type: u8,
    pub version: u8,
    pub is_initialized: bool,
    pub extra_info: [u8; 5],
}

impl MetaData {
    pub fn new(data_type: DataType, version: u8, is_initialized: bool) -> Self {
        Self { data_type: data_type as u8, version, is_initialized, extra_info: [0; 5] }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Copy)]
#[repr(C)]
pub struct TokenInfo {
    pub mint: Pubkey,
    pub root_bank: Pubkey,
    pub decimals: u8,
    //pub padding: [u8; 7],
}

// This is group for MangoPickle
#[account(zero_copy)]
pub struct PickleGroup {

    pub meta_data: MetaData,
    // program id for mango
    pub mango_program_id : Pubkey,
    // Associated for mango
    pub mango_group : Pubkey,
    //mango group admin
    pub admin_ai : Pubkey,
    // liquidation in percentage with 6 digits of decimals
    pub liquidation_deposit : u32,
    // mango pool token infos
    pub tokens: [TokenInfo; 16],
    // token count
    pub token_count_of_mango : u8,
    // token pools to store liquidation tokens
    pub token_pools: [Pubkey; 16],
    padding : [u8; 256],
}


#[account(zero_copy)]
pub struct PickleUser {
    pub meta_data: MetaData,
    // Pickle group
    pub pickle_group_pk: Pubkey,
    // owner
    pub owner_pk: Pubkey,
    // associated mango account
    pub mango_account_pk: Pubkey,
    
    pub tokens_locked_for_liquidation: [u64; 16],

    pub solana_locked_for_liquidation: u64,
} 