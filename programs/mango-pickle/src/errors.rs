use crate::*;

#[error_code]
pub enum PickleError {
    #[msg("Error while calling mango functions")]
    MangoError,
    #[msg("Please provide remaining accounts corresponding to token pools equal to number of mints in mango")]
    TokenPoolsMissing,
    #[msg("Invalid mint (must currespond to mango token mint)")]
    InvalidMint,
}