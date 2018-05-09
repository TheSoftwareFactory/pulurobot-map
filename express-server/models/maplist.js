/*##################################################
#	Class declaration for a list of Map objects. Allows
#	to store different maps in order to manage different
#	environments for the robot.
#
##################################################*/
var RobotMap = require('./robotmap');

class Maplist{

	constructor (maplist_name, list_of_maps){
		this.maplist_name = maplist_name;
		this.list_of_maps = list_of_maps;
	}

	getMaplistName(){
		return this.maplist_name;
	}

	getMaplist(){
		return this.list_of_maps;
	}

	getMaplistNames(){
		let list_of_names = [];
		for (var i = 0; i < this.list_of_maps.length; i++){
			list_of_names.push(this.list_of_maps[i].getRobotMapName());
		}

		return list_of_names;
	}

	getMaplistPoints(){
		let list_of_points = [];
		for (var i = 0; i < this.list_of_maps.length; i++){
			list_of_points.push(this.list_of_maps[i].getPoints());
		}

		return list_of_points;
	}

	getMapFromName(name){
		var map_from_name = this.list_of_maps.find(function(elt){
			return elt.getRobotMapName() == name;
		});

		return map_from_name;
	}

	setMap(new_map){
		if(new_map instanceof RobotMap == false){
			return console.error("Added object must be of instance 'RobotMap'.");
		}
		else{
			this.list_of_maps.push(new_map);
		}
	}
}

module.exports = Maplist;
