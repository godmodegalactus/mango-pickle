use crate::*;

#[error_code]
pub enum PickleError {
    #[msg("Error while calling mango functions")]
    MangoError,
    #[msg("Please provide 16 remaining accounts corresponding to token pools")]
    TokenPoolsMissing,
    #[msg("Invalid mint (must currespond to mango token mint)")]
    InvalidMint,
}

// From<mango::error::MangoError> for PickleError {
//     fn from(_error : mango::error::MangoError) -> Self {
//         return PickleError::MangoError;
//     }
// }