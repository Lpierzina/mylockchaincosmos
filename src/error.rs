use cosmwasm_std::StdError;
use thiserror::Error;

// Custom contract errors returned by execute()
#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError), // Wraps standard errors

    #[error("Document already registered")]
    AlreadyRegistered {}, // Thrown if a hash is double-registered
}
