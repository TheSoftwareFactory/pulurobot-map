/*##################################################
# Class declaration for a Map. Allows to retrieve db
# data and add a point into the db. Also have basic
# constructor and getters.
#
# point : Array of point info, e.g: [[x,y], status]
# map_name : Name wanted for the actual Map object
##################################################*/
const Promise = require('bluebird');
const Sqlite = require('sqlite-pool');
const db = new Sqlite('../artifacts/maps.db', {Promise});

class RobotMap{

  constructor(robot_map_name, points){
    this.robot_map_name = robot_map_name;
		this.points = points;
  }

  getRobotMapName(){
    return this.robot_map_name;
  }

	getPoints(){
    return this.points;
  }

  setPoint(x, y, free){
    this.points.push([x, y, free]);

    let sql = 'INSERT INTO '+this.robot_map_name+' (x, y, status) VALUES ('+x+', '+y+', '+free+')';
    db.run(sql, function(err){
      if (err){
        return console.error(err.message);
      }
      else{
        console.log(x+', '+y+', '+', '+free+' added successfully.');
      }
    });
  }

	setPoints(list_of_points){
		for (var i = 0; i < list_of_points; i++){
			setPoint(list_of_points[i][0],list_of_points[i][1],list_of_points[i][2]);
		}
	}

  getFromDB(map_name){
    return Promise.all([
      db.all('SELECT x, y, status FROM '+map_name)
    ]).then(
      (map)=>{
        if(map===undefined){
          return console.error('Error : result is undefined.');
        }
        else{
          for (var i = 0; i<map[0].length; i++){
            let x = map[0][i].x;
            let y = map[0][i].y;
            let free = map[0][i].status;
            this.points.push([x,y, free]);
          }
        }
      }
    ).catch(function(error){
			console.error(error);
		})
  }

}

module.exports = RobotMap;
