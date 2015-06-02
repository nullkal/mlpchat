var Scene = (function() {
  var currentScene = null;

  return function(name, initialize) {
    var self = {};
    self.name = name;
    self.initialize = initialize;
    self.finalize = null;
    self.intervals = [];

    self.setInterval = function() {
      self.intervals.push(setInterval.apply(window, arguments));
      return this;
    }
    self.clearAllIntervals = function() {
      for (var i = 0; i < self.intervals.length; i++) {
        clearInterval(self.intervals[i]);
      }
      self.intervals = [];
      return this;
    }
    self.show = function() {
      $('#loader').show();
      if (currentScene) {
        $('#scene_' + this.name).fadeIn(200);
        $('#scene_' + currentScene.name).fadeOut(200, function() {
          this.clearAllIntervals();
        }.bind(currentScene));
        if (currentScene.finalize) {
          currentScene.finalize();
        }
      } else {
        $('#scene_' + this.name).show();
      }
      Promise.resolve(this.initialize.apply(this, arguments))
        .catch(function(err) {
          console.log(err);
        })
        .then(function() {
          $('#loader').hide();
        });
      currentScene = this;
      return this;
    }
    return self;
  }
})();

var Pony = (function() {
  return function(opts) {
    var self = opts;
    var img = $('<img>')
      .addClass('player__image')
      .attr('src', 'img/' + self.avatar + '.gif');
    var playerInfo = $('<div>')
      .addClass('player__info')
      .text(self.name);
    var elem = $('<div>')
      .append(playerInfo)
      .append(img);
    $('#players').append(elem);
    if (!('id' in self)) {
      self.id = 0;
    }
    if (!('x' in self)) {
      self.x = 0;
    }
    if (!('y' in self)) {
      self.y = 0;
    }
    if (!('state' in self)) {
      self.state = 'stopped';
    }
    if (!('flipped' in self)) {
      self.flipped = false;
    }
    self.finalize = function() {
      elem.remove();
    }
    self.refresh = function() {
      var unit = $(window).height() * 0.2;
      var real_x = $(window).width()  / 2   + (self.x - 0.5) * unit;
      var real_y = $(window).height() * 0.92 - (self.y + 1  ) * unit;
      elem
        .css('left', real_x + 'px')
        .css('top' , real_y + 'px');
      if (self.state != self.prevState) {
        if (self.state == 'moving') {
          img.attr('src', 'img/' + self.avatar + '_trotting.gif'); 
        } else {
          img.attr('src', 'img/' + self.avatar + '.gif'); 
        }
        self.prevState = self.state;
      }
      if (self.flipped) {
        img.addClass('player--flipped');
      } else {
        img.removeClass('player--flipped');
      }
    }
    return self;
  } 
})();

function randomAvatar() {
  var avatars = [
    'twilight-sparkle',
    'sunset-shimmer',
    'ak-yearling',
    'applejack'
  ];
  return avatars[Math.floor(Math.random() * avatars.length)];
}

$(function() {
  var scene_loginForm = Scene('login-form', function() {
    var screenName = localStorage.getItem('screen-name');
    if (screenName) {
      $('#login-form__screen-name').val(screenName);
    }
    $('#login-form').on('submit', function() {
      if ($('#login-form__screen-name').val() != '') {
        scene_chat.show($('#login-form__screen-name').val());
      }
      return false;
    });
    this.finalize = function() {
      localStorage.setItem('screen-name', $('#login-form__screen-name').val());
      $('#scene_login-form *').off();
    }
  }).show();

  var scene_chat = Scene('chat', function(screenName) {
    $('#messages').empty();
    $('#players').empty();
    $('#chat-text-input').val('');
    scene_chat.me = Pony({name: screenName, avatar: randomAvatar()});
    scene_chat.players = {};
    scene_chat.setInterval(function() {
      for (var i in scene_chat.players) {
        if (scene_chat.players[i].state == 'moving') {
          if (scene_chat.players[i].flipped) {
            scene_chat.players[i].x -= 0.02;
          } else {
            scene_chat.players[i].x += 0.02;
          }
        }
        scene_chat.players[i].refresh();
      }
    }, 16);
    var holding_left  = false;
    var holding_right = false;
    $(window).on('keydown', function(evt) {
      if (evt.which == 84) {
        if (!$('#chat-text-input').is(':focus')) {
          $('#chat-text-input').focus();
          return false;
        }
      } else if (evt.which == 27 || evt.ctrlKey && evt.which == 219) {
        $('#chat-text-input').val('');
        $('#chat-text-input').blur();
      } else if (evt.which == 37 && !holding_left) {
        scene_chat.me.state = 'moving';
        scene_chat.me.flipped = true;
        scene_chat.socket.emit('player move', scene_chat.me);
        holding_left = true;
      } else if (evt.which == 39 && !holding_right) {
        scene_chat.me.state = 'moving';
        scene_chat.me.flipped = false;
        scene_chat.socket.emit('player move', scene_chat.me);
        holding_right = true;
      }
    });
    $(window).on('keyup', function(evt) {
      if (evt.which == 37) {
        scene_chat.me.state = 'stopped';
        scene_chat.socket.emit('player stop', scene_chat.me);
        holding_left = false;
        if (holding_right) {
          scene_chat.me.state = 'moving';
          scene_chat.me.flipped = false;
          scene_chat.socket.emit('player move', scene_chat.me);
        }
      } else if (evt.which == 39) {
        scene_chat.me.state = 'stopped';
        scene_chat.socket.emit('player stop', scene_chat.me);
        holding_right = false;
        if (holding_left) {
          scene_chat.me.state = 'moving';
          scene_chat.me.flipped = true;
          scene_chat.socket.emit('player move', scene_chat.me);
        }
      }
    })
    $('#chat-form').on('submit', function() {
      var chatInput = $('#chat-text-input');
      if (chatInput.val() != '') {
        scene_chat.socket.emit('chat', chatInput.val());
        chatInput.val('');
        chatInput.blur();
      }
      return false;
    });
    this.finalize = function() {
      scene_chat.socket.disconnect();
      scene_chat.socket.removeAllListeners();
      $(window).off('keydown');
      $(window).off('keyup');
      $('#scene_chat *').off();
    }
    return new Promise(function(resolve, reject) {
      scene_chat.socket = io({multiplex: false});
      scene_chat.socket.connect();
      scene_chat.socket.on('chat', function(p, msg) {
        var toast = $('<div>');
        toast.addClass('messages__msg');
        toast.append($('<strong>').text(p['name']));
        toast.append(document.createTextNode(': ' + msg));
        $('#messages').append(toast);
        toast.hide();
        toast.slideDown(100);
        $('#messages').children('div:nth-last-child(n+5)')
          .delay(1000)
          .animate({left: '+=120%'}, 600, 'swing', function() {
            $(this).remove();
          });
      });
      scene_chat.socket.on('disconnect', function() {
        scene_loginForm.show();       
      });
      scene_chat.socket.on('player add', function(p) {
        scene_chat.players[p.id] = Pony(p);
      });
      scene_chat.socket.on('player remove', function(p) {
        scene_chat.players[p.id].finalize();
        delete scene_chat.players[p.id];
      });
      scene_chat.socket.on('player move', function(p) {
        scene_chat.players[p.id].state = p.state;
        scene_chat.players[p.id].flipped = p.flipped;
        scene_chat.players[p.id].x = p.x;
        scene_chat.players[p.id].y = p.y;
      });
      scene_chat.socket.on('player stop', function(p) {
        scene_chat.players[p.id].state = p.state;
        scene_chat.players[p.id].flipped = p.flipped;
        scene_chat.players[p.id].x = p.x;
        scene_chat.players[p.id].y = p.y;
      });
      scene_chat.socket.emit('login', scene_chat.me, function(id) {
        scene_chat.me.id = id;
        scene_chat.players[id] = scene_chat.me;
        resolve();
      });
    });
  });
});
