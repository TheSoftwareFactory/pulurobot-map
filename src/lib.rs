#[macro_use]
extern crate lazy_static;
extern crate ws;

#[macro_use]
extern crate serde_json;

mod pulurobot_map;

pub use pulurobot_map::{websocket, map};