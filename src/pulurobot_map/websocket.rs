use ws::{CloseCode, Error, Handler, Handshake, Message, Result, Sender};
use serde_json::{self, Value};

use map::Map;

pub struct WebSocket {
    out: Sender,
    map: Map,
}

impl WebSocket {
    pub fn new(out: Sender, map: Map) -> Self {
        WebSocket { out, map }
    }
}

impl Handler for WebSocket {
    fn on_open(&mut self, _: Handshake) -> Result<()> {
        self.out.send("Connected successfull")
    }

    fn on_message(&mut self, msg: Message) -> Result<()> {
        let json = match msg {
            Message::Text(data) => data,
            Message::Binary(_) => String::new(),
        };

        let data: Value = serde_json::from_str(&json).unwrap();
        let kind = &data["type"];
        let val = &data["data"];

        match *kind {
            Value::String(ref t) if t == "get_map" => self.send_map(),
            Value::String(ref t) if t == "set_point" => self.set_point(val),
            _ => Ok(()),
        }
    }

    fn on_error(&mut self, err: Error) {
        println!("The server encountered an error: {:?}", err);
    }

    fn on_close(&mut self, code: CloseCode, reason: &str) {
        match code {
            CloseCode::Normal => println!("The client is done with the connection."),
            CloseCode::Away => println!("The client is leaving the connection."),
            _ => println!("The client encountered an error: {}", reason),
        }
    }
}

impl WebSocket {
    fn send_map(&self) -> Result<()> {
        let res = self.map
            .points()
            .iter()
            .map(|(&(x, y), free)| (x, y, free))
            .collect::<Vec<(i64, i64, &bool)>>();
        json!(res);

        self.out.send(
            json!({
                "type": "get_map",
                "data": res
            }).to_string(),
        )
    }

    fn set_point(&mut self, value: &Value) -> Result<()> {
        let point: &Vec<Value> = value.as_array().unwrap();
        let x: i64 = point[0].as_i64().unwrap();
        let y: i64 = point[1].as_i64().unwrap();
        let free: bool = point[2].as_i64().unwrap() == 0;

        self.map.set(x, y, free);
        self.send_map()
    }
}
