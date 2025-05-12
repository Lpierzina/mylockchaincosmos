use cosmwasm_std::{Addr, Timestamp};
use cw_storage_plus::Map;

// Use String keys for document hash (e.g. Keccak256 as hex string)
pub const REGISTRANT: Map<&str, Addr> = Map::new("registrant");
pub const TIMESTAMPS: Map<&str, Timestamp> = Map::new("timestamp");
