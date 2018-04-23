var unit = 2
var boxes = []
var map = new L.Map('map', { center: [0, 0], zoom: 1 });
window.geoJSON = L.geoJSON(boxes, {
    style: function (feature) {
        switch (feature.properties.free) {
            case 1: return { color: "#aaaaaa", weight: 1, fill: true, fillOpacity: 1, fillColor: "#ffffff" };
            case 0: return { color: "#aaaaaa", weight: 1, fill: true, fillOpacity: 1, fillColor: "#333333" };
        }
    }
})
window.geoJSON.addTo(map);

function buildPoint(x, y, free) {
    var tl = [x * unit, y * unit]
    var tr = [x * unit + unit, y * unit]
    var br = [x * unit + unit, y * unit - unit]
    var bl = [x * unit, y * unit - unit]

    console.log(tl, tr, br, bl);

    return {
        "type": "Feature",
        "properties": { "free": free },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[tl, tr, br, bl, tl]]
        }
    }
}

var ws = new WebSocket("ws://localhost:3010", "echo-protocol");
ws.onopen = function(event) {
    ws.send(JSON.stringify({
        type: "get_map",
        data: undefined
    }))
}

ws.onmessage = function(msg) {
    var message = JSON.parse(msg.data)

    if (message.data != undefined){
      console.log("Points are available.");
      switch (message.type) {
          case "get_map": on_get_map(message.data); break;
          case "get_point": on_get_point(message.data); break;
          default: console.log(message)
      }
    }

    else{
      console.log("Waiting for points...");
    }
}

ws.onerror = function(err){
  console.error(err);
}

function on_get_map(points) {
    points.forEach(function(point) {
        window.geoJSON.addData(buildPoint(point[0], point[1], point[2]))
    })
}

function on_get_point(point) {
    geoJSON.addData(buildPoint(point[0], point[1], point[2]))
}
