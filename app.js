var express = require('express');

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

io.on('connection', function(socket) {
  socket.on('chat', function(msg){
    io.emit('chat', msg);
  });
});

var server = http.listen(3000, function() {
  console.log('Listening on *:%s', server.address().port);
});
