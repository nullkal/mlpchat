var express = require('express');

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var autoprefixer = require('express-autoprefixer');

app.use(autoprefixer({browsers: 'last 2 versions'}));
app.use(express.static(__dirname + '/public'));

var playerList = {}; var lastId = 1;
io.on('connection', function(socket) {
  var player;

  socket.on('login', function(p, ack) {
    player = p;
    player.id = lastId++;
    ack(player.id);
    for (var i in playerList) {
      socket.emit('player add', playerList[i]);
    }
    playerList[player.id] = player;
    socket.broadcast.emit('player add', player);
    io.emit('chat', {name: 'OP'}, player['name'] + 'さんが入室しました。');
    console.log('LOGIN: ' + player['name']);
  });

  socket.on('chat', function(msg){
    if (player) {
      io.emit('chat', player, msg);
    }
  });

  socket.on('player move', function(p){
    if (player) {
      player['x'] = p['x'];
      player['y'] = p['y'];
      player['flipped'] = p['flipped'];
      player['state'] = p['state'];
      socket.broadcast.emit('player move', player);
    }
  });

  socket.on('player stop', function(p){
    if (player) {
      player['x'] = p['x'];
      player['y'] = p['y'];
      player['flipped'] = p['flipped'];
      player['state'] = p['state'];
      socket.broadcast.emit('player stop', player);
    }
  });

  socket.on('disconnect', function() {
    if (player) {
      io.emit('chat', {name: 'OP'}, player['name'] + 'さんが退室しました。');
      delete playerList[player.id];
      socket.broadcast.emit('player remove', player);
      console.log('LOGOUT: ' + player['name']);
    }
  });
});

var server = http.listen(3000, function() {
  console.log('Listening on *:%s', server.address().port);
});
