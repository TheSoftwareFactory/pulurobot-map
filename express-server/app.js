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

  setPoints(table_name, x, y, free){
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

var server = http.createServer(app);

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
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            connection.sendUTF(message.utf8Data);
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});

var testMap = new Map([], "testMap");
testMap.getPoints();
testMap.getMapName();
testMap.getFromDB("map_v1");





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
