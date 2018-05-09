// Declaration of the environment constants
const Promise = require('bluebird');
const port = process.env.port || 3000;

// Declaration of the environment variables
var RobotMap = require('./models/robotmap');
var Maplist = require('./models/maplist');
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var http = require('http');
var WebSocketServer = require('websocket').server;

// Variables of the router
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

		// Actions when receiving message
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

			// Verification of the message type
      if (message.type === 'utf8') {

        console.log('(ws-server) Received Message: ' + message.utf8Data);
        connection.sendUTF(message.utf8Data);

				// Creation of variable to analyze the message
        let json = message.utf8Data;
        let data = JSON.parse(json);
				let name = data.name;
        let type = data.type;
        let val = data.data;

				// Case where the client request the robot's history itself
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
							},
							timeout : 1000
						},
						function (error, response, body) {
							var map_from_robot = mapFromRobotLocations(body);
							if(map_from_robot == false){
								let json = {
				          data : "noserver"
				        }

				        connection.send(JSON.stringify(json));
							}
							else{
								testMaplist.setMap(map_from_robot);
								sendMap(map_from_robot);
							}
						}
					);
				}

				// Case where a map is requested from the database
				else{
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
      }

			// Verification of the message type
      else if (message.type === 'binary') {
        console.log('(ws-server) Received Binary Message of ' + message.binaryData.length + ' bytes');
        connection.sendBytes(message.binaryData);
      }

			// Verification of the message type
      else{
        console.log("(ws-server) Message is neither utf8 or binary.");
      }
    });

    connection.on('close', function(reasonCode, description) {
      console.log((new Date()) + '(ws-server) Peer ' + connection.remoteAddress + ' disconnected.');
    });
});

// Retrieve the history of a robot's points from the server
function mapFromRobotLocations(data){
	let list_of_points = [];
	if (data != undefined){
		let json_data = JSON.parse(data);

		for(var i = 0; i<json_data.length; i++){
			let x = json_data[i].x;
			let y = json_data[i].y;
			list_of_points.push([x,y, 1]);
		}
		return new RobotMap("map_from_robot", list_of_points);
	}
	else{
		return false;
	}
}


/*####################################
Run/Test zone
####################################*/

server.listen(3010, function() {
    console.log((new Date()) + ' (ws-server) Server is listening on port 3010');
});

var testMaplist = new Maplist("testMaplist", []);


module.exports = app;
