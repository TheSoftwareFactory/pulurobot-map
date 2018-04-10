use std::collections::HashMap;
use super::db;

pub struct Map {
    points: HashMap<(i64, i64), bool>,
}

impl Map {
    pub fn new() -> Self {
        Map { points: HashMap::new() }
    }

    pub fn from_db(map_name: &str) -> Self {
        let conn = db::get_connection();
        let query = format!("SELECT x, y, status FROM {}", map_name);
        let mut stmt = conn.prepare(&query).unwrap();
        let point_iter = stmt.query_map(&[], |row| {
            let x: i64 = row.get(0);
            let y: i64 = row.get(1);
            let status: i32 = row.get(2);
            ((x, y), status)
        }).unwrap();

        let mut map = Map::new();
        for point in point_iter {
            if let Ok(((x, y), status)) = point {
                map.set(x, y, status == 0);
            }
        }
        map
    }

    pub fn points(&self) -> &HashMap<(i64, i64), bool> {
        &self.points
    }

    pub fn get(&self, x: i64, y: i64) -> bool {
        *self.points.get(&(x, y)).unwrap_or(&false)
    }

    pub fn set(&mut self, x: i64, y: i64, free: bool) {
        self.points.insert((x, y), free);
    }
}