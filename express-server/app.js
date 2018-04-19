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
class Map{

  constructor(points, map_name){
    this.points = points;
    this.map_name = map_name;
  }

  getPoints(){
    return this.points;
  }

  getMapName(){
    return this.map_name;
  }

  setPoint(table_name, x, y, free){
    this.points.push([[x, y], free]);

    let sql = 'INSERT INTO '+table_name+' (x, y, status) VALUES ('+x+', '+y+', '+free+')';
    db.run(sql, function(err){
      if (err){
        return console.error(err.message);
      }
      else{
        console.log('Row added successfully.')
      }
    });
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
            this.points.push([[x,y], free]);
          }
          console.log(this.points);
        }
      }
    )
  }

}

/*##################################################
# Implementation of the Websocket (server part).
# Creation of the server and listening port, and
# taking in consideration "on request",
# "on message" and "on close" actions.
##################################################*/

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(3010, function() {
    console.log((new Date()) + ' Server is listening on port 3010');
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
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');

    function sendMap() {
        if (connection.connected) {

          let res = testMap.getPoints();

          let json = {
            kind: "get_map",
            data: res
          }

            connection.sendUTF(JSON.stringify(json));
            setTimeout(sendMap, 1000);
        }
    }

    connection.on('message', function(message) {
      console.log("Actual message here ?");
        if (message.type === 'utf8') {

          console.log("Here is the actual message : "+message);
          let json = message.utf8Data;
          let data = JSON.parse(json);

          if (data.kind == 'get_map') {
            sendMap();
          }
          else if (data.kind == 'set_point') {
            setPoint(val);
          }

          console.log('Received Message: ' + message.utf8Data);
          connection.sendUTF(message.utf8Data);
        }
        else if (message.type === 'binary') {
          console.log("BINARY...");
          console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
          connection.sendBytes(message.binaryData);
        }
        else{
          console.log("What happens then ?");
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});


/*##################################################
# Implementation of the Websocket (client part).
# Creation of the client, and taking in consideration
# "on connect", "on connect failed", "on error",
# "on message", and "on close" actions.
##################################################*/

var WebSocketClient = require('websocket').client;

var client = new WebSocketClient();

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
        }
    });

    function sendMap() {
        if (connection.connected) {

          let res = testMap.getPoints();

          let json = {
            kind: "get_map",
            data: res
          }

            connection.sendUTF(JSON.stringify(json));
            setTimeout(sendMap, 1000);
        }
    }

    sendMap(connection);

});

var testMap = new Map([], "testMap");
testMap.getFromDB("map_v1");

client.connect('ws://localhost:3010', 'echo-protocol');




/*

//Example of database's interaction with sqlite3 module

db.serialize(function () {
  db.run('CREATE TABLE lorem (info TEXT)')
  var stmt = db.prepare('INSERT INTO lorem VALUES (?)')

  for (var i = 0; i < 10; i++) {
    stmt.run('Ipsum ' + i)
  }

  stmt.finalize()

  db.each('SELECT rowid AS id, info FROM lorem', function (err, row) {
    console.log(row.id + ': ' + row.info)
  })
})

db.close()

*/

module.exports = app;
