window.onload = function(){
	var unit = 2
	var boxes = [];
	var map = new L.Map('map', { center: [0, 0], zoom: 2 });


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

	    return {
	        "type": "Feature",
	        "properties": { "free": free },
	        "geometry": {
	            "type": "Polygon",
	            "coordinates": [[tl, tr, br, bl, tl]]
	        }
	    }
	}


	var names = [];

	function on_get_map(name, points) {
	    points.forEach(function(point) {
	        geoJSON.addData(buildPoint(point[0], point[1], point[2]))
	    });

			let list = document.getElementById('map_from_list');
			if(list.selectedOptions[0].text=="No pre-loaded map available."){
				list.options.length = 0;
			}

			if(!names.includes(name)){
				list.options[list.options.length] = new Option(name, '0', false, false);
				names.push(name);
			}
	}

	function on_get_point(point) {
	    geoJSON.addData(buildPoint(point[0], point[1], point[2]));
	}

	var ws = new WebSocket("ws://localhost:3010", "echo-protocol");
	ws.onopen = function(event) {

	}

	ws.onmessage = function(msg) {
	    var message = JSON.parse(msg.data);
			console.log(message);

			if (message.data == undefined){
				console.log("Waiting for points...");
			}

	    else {
				if(message.data == "undefined" || message.data =="nomap" || message.data.length == 0){
					console.log("No points available.");
					var info = document.getElementById("information");
					var text = document.createTextNode("No points/maps available. Add points, try another name, or check your Wi-Fi connection.");
					var child = info.firstChild;
					if (child != null){
						info.removeChild(child);
						info.appendChild(text);
					}
					else{
						info.appendChild(text);
					}
				}

				else if(message.data == "noserver"){
					console.log("No response from server.");
					var info = document.getElementById("information");
					var text = document.createTextNode("Server could not be reached for location's history.");
					var child = info.firstChild;
					if (child != null){
						info.removeChild(child);
						info.appendChild(text);
					}
					else{
						info.appendChild(text);
					}
				}

				else{
					console.log("Points are available.");
					var info = document.getElementById("information");
					var child = info.firstChild;
					if (child != null){
						info.removeChild(child);
					}

		      switch (message.type) {
		          case "get_map": on_get_map(message.name,message.data); break;
		          case "get_point": on_get_point(message.data); break;
		          default: console.log(message);
		      }
				}
	    }
	}

	ws.onerror = function(err){
	  console.error(err);
	}

	function retrieveMap(name_of_map){
		if (name_of_map === ""){
			console.error("Map name is undefined. Input a valid name.");
			var info = document.getElementById("information");
			var text = document.createTextNode("Map name is undefined. Input at least one character.");
			var child = info.firstChild;
			if (child != null){
				info.removeChild(child);
				info.appendChild(text);
			}
			else{
				info.appendChild(text);
			}
		}
		else{
			ws.send(JSON.stringify({
					name: name_of_map,
	        type: "get_map",
	        data: undefined
	    }));
		}
	}

	function requestRobotHistory(robot_id){
		ws.send(JSON.stringify({
				name: 'request_robot_history',
				id: robot_id
		}));
	}

	var button_retrieve_map = document.getElementById("submit_map_name");
	var button_retrieve_robot = document.getElementById("submit_robot_id");
	var select = document.getElementById("map_from_list");

	button_retrieve_map.addEventListener('click', function(){
		geoJSON.clearLayers();
		let map_name = document.getElementById("map_name").value;
		retrieveMap(map_name);
	});

	button_retrieve_robot.addEventListener('click', function(){
		geoJSON.clearLayers();
		let robot_id = document.getElementById('robot_id').value;
		requestRobotHistory(robot_id);
	})

	select.addEventListener("change", function() {
		geoJSON.clearLayers();
		let map_name = select.options[select.selectedIndex].text;
		retrieveMap(map_name);
});

}
