use cosmwasm_std::{
    entry_point, Deps, DepsMut, Env, MessageInfo, Response, StdResult, Timestamp, Binary,
    to_json_binary,
};
use crate::error::ContractError;
use crate::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, DetailsResponse};
use crate::state::{REGISTRANT, TIMESTAMPS};
use hex; // <-- ensure you add this crate in Cargo.toml under [dependencies]

// ----------------------------
// Entry point for contract instantiation (no config needed)
// ----------------------------
#[entry_point]
pub fn instantiate(
    _deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    Ok(Response::default())
}

// ----------------------------
// Executes transactions like `register`
// ----------------------------
#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Register { document_hash } => {
            // Convert Binary (Vec<u8>) to hex string for key
            let hash_key = hex::encode(&document_hash);

            // Check if already registered
            if REGISTRANT.has(deps.storage, hash_key.as_str()) {
                return Err(ContractError::AlreadyRegistered {});
            }

            // Save registrant address
            REGISTRANT.save(deps.storage, hash_key.as_str(), &info.sender)?;

            // Save registration timestamp
            TIMESTAMPS.save(deps.storage, hash_key.as_str(), &env.block.time)?;

            // Return a Response with event attributes (logs)
            Ok(Response::new()
                .add_attribute("action", "register")
                .add_attribute("document_hash", hash_key)
                .add_attribute("registrant", info.sender.to_string())
                .add_attribute("timestamp", env.block.time.seconds().to_string()))
        }
    }
}

// ----------------------------
// Queries: is_registered / get_details
// ----------------------------
#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::IsRegistered { document_hash } => {
            let hash_key = hex::encode(&document_hash);
            let is_set = REGISTRANT.has(deps.storage, hash_key.as_str());
            Ok(Binary::from(vec![is_set as u8]))
        }
        QueryMsg::GetDetails { document_hash } => {
            let hash_key = hex::encode(&document_hash);
            let registrant = REGISTRANT.load(deps.storage, hash_key.as_str())?;
            let timestamp = TIMESTAMPS.load(deps.storage, hash_key.as_str())?;

            let resp = DetailsResponse {
                registrant: registrant.to_string(),
                timestamp: timestamp.seconds(),
            };

            to_json_binary(&resp) // use JSON-safe binary encoding
        }
    }
}
