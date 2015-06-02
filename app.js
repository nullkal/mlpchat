var express = require('express');

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var autoprefixer = require('express-autoprefixer');

app.use(autoprefixer({browsers: 'last 2 versions'}));
app.use(express.static(__dirname + '/public'));

io.on('connection', function(socket) {
  var screenName = null;

  socket.on('login', function(name, ack) {
    screenName = name;
    ack();
    io.emit('chat', 'OP', name + 'さんが入室しました。');
    console.log('LOGIN: ' + name);
  });

  socket.on('chat', function(msg){
    if (screenName) {
      io.emit('chat', screenName, msg);
    }
  });

  socket.on('disconnect', function() {
    if (screenName) {
      io.emit('chat', 'OP', screenName + 'さんが退室しました。');
    console.log('LOGOUT: ' + screenName);
    }
  });
});

var server = http.listen(3000, function() {
  console.log('Listening on *:%s', server.address().port);
});
