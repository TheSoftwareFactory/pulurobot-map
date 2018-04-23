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
    this.points.push([x, y, free]);

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
            this.points.push([x,y, free]);
          }
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

      function sendMap() {
          if (connection.connected) {

            let res = testMap.getPoints();

            let json = {
              type: "get_map",
              data: res
            }

            connection.send(JSON.stringify(json));
          }
      }

      function setPoint(val){
        for (var i = 0; i < val.length; i++ ){
          let x = val[i][0];
          let y = val[i][1];
          let free = val[i][2];
          testMap.setPoint("map_v1", x, y, free);
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
        let type = data.type;
        let val = data.data;

        if (type == 'get_map') {
          sendMap();
        }

        else if (kind == 'set_point') {
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


/*####################################
Test zone
####################################*/

var testMap = new Map([], "testMap");
testMap.getFromDB("map_v1");

server.listen(3010, function() {
    console.log((new Date()) + ' (ws-server) Server is listening on port 3010');
});


module.exports = app;
