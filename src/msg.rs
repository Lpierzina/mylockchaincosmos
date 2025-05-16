use cosmwasm_std::Binary;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use cosmwasm_schema::QueryResponses;



// Empty instantiation message
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {}

// Executable functions that can change blockchain state
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum ExecuteMsg {
    Register { document_hash: Binary }, // input: bytes32-style hash
}

// Read-only queries
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema, QueryResponses)]
pub enum QueryMsg {
    #[returns(IsRegisteredResponse)] // ✅ fix this line
    IsRegistered { document_hash: Binary },

    #[returns(DetailsResponse)]
    GetDetails { document_hash: Binary },
}


// Output format for GetDetails query
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct DetailsResponse {
    pub registrant: String,
    pub timestamp: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct IsRegisteredResponse {
    pub is_registered: bool,
}

