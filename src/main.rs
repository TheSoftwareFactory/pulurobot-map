extern crate ws;
extern crate pulurobot_map;

use pulurobot_map::websocket::WebSocket;
use pulurobot_map::map::Map;

fn main() {
    println!("Starting listening on 127.0.0.1:3010");
    ws::listen("127.0.0.1:3010", |out| {
        WebSocket::new(out, Map::from_db("map_v1"))
    }).unwrap();
}
