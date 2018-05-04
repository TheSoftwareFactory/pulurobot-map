const Sqlite = require('sqlite-pool');
const Promise = require('bluebird');
const port = process.env.port || 3000;
const db = new Sqlite('../artifacts/maps.db', {Promise});

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var http = require('http');
var WebSocketServer = require('websocket').server;
var WebSocket = require('ws')

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var loginRouter = require('./routes/login');

var server = require('./bin/www');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//Set the different routes of the app
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/login', loginRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

/*##################################################
# Class declaration for a Map. Allows to retrieve db
# data and add a point into the db. Also have basic
# constructor and getters.
#
# point : Array of point info, e.g: [[x,y], status]
# map_name : Name wanted for the actual Map object
##################################################*/

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
    )
  }

}

/*##################################################
#	Class declaration for a list of Map objects. Allows
#	to store different maps in order to manage different
#	environments for the robot.
#
##################################################*/

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


/*##################################################
# Implementation of the Websocket (server part).
# Creation of the server and listening port, and
# taking in consideration "on request",
# "on message" and "on close" actions.
##################################################*/

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' (ws-server) Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

var wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

function originIsAllowed(origin) {

  return true;
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + '(ws-server) Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + '(ws-server) Connection accepted.');

    connection.on('message', function(message) {

      function sendMap(map) {
          if (connection.connected) {

            let res = map.getPoints();

            let json = {
							name: map.getRobotMapName(),
              type: "get_map",
              data: res
            }

            connection.send(JSON.stringify(json));
          }
      }

      function setPoint(map, name, val){
        for (var i = 0; i < val.length; i++ ){
          let x = val[i][0];
          let y = val[i][1];
          let free = val[i][2];

          map.setPoint(name.toString(), x, y, free);
          sendMap();
        }
      }

      function unknownCommand(){
        let json = {
          type: "unknown",
          data: "undefined"
        }

        connection.send(JSON.stringify(json));
      }

      if (message.type === 'utf8') {

        console.log('(ws-server) Received Message: ' + message.utf8Data);
        connection.sendUTF(message.utf8Data);

        let json = message.utf8Data;
        let data = JSON.parse(json);
				let name = data.name;
        let type = data.type;
        let val = data.data;

				if (name == 'request_robot_history'){
					let id = data.id;
					var request = require('request'),
    			uri = "http://192.168.43.97:3000/api/v1/station/robot/location/history?robot_id="+id,
    			auth = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.bt-HcLOMzZjeS_Zw6jc0lDH5SdaK0ZgZYIKXk5ont6w"

					request(
						{
							uri : uri,
							headers : {
								"Authorization" : auth
							}
						},
						function (error, response, body) {
							var map_from_robot = mapFromRobotLocations(body);
						}
					);
					testMaplist.setMap(map_from_robot);
					sendMap(map_from_robot);
				}

				if (testMaplist.getMaplistNames().includes(name) == false){
					var map = new RobotMap(name,[]);
					var promise1 = Promise.resolve(map.getFromDB(name));
					testMaplist.setMap(map);
				}
				else{
					var map = testMaplist.getMapFromName(name);
				}

        if (type == 'get_map') {
					if(promise1!=undefined){
						promise1.then(function(value){
							sendMap(map);
						});
					}
					else{
						sendMap(map);
					}
        }

        else if (type == 'set_point') {
          setPoint(val);
        }

        else {
          unknownCommand();
        }
      }

      else if (message.type === 'binary') {
        console.log('(ws-server) Received Binary Message of ' + message.binaryData.length + ' bytes');
        connection.sendBytes(message.binaryData);
      }
      else{
        console.log("(ws-server) Message is neither utf8 or binary.");
      }
    });

    connection.on('close', function(reasonCode, description) {
      console.log((new Date()) + '(ws-server) Peer ' + connection.remoteAddress + ' disconnected.');
    });
});

//Retrieve the history of a robot's points from the server
function mapFromRobotLocations(data){
	let list_of_points = [];
	for(var i = 0; i<data.length; i++){
		let x = data[i].x;
		let y = data[i].y;
		list_of_points.push([x,y, 1]);
	}
	return new RobotMap("map_from_robot", list_of_points);
}


/*####################################
Test zone
####################################*/

server.listen(3010, function() {
    console.log((new Date()) + ' (ws-server) Server is listening on port 3010');
});

var testMaplist = new Maplist("testMaplist", []);


module.exports = app;
