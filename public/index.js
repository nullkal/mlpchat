
var Scene = (function() {
  var currentScene = null;

  return function(name, initialize) {
    var self = {};
    self.name = name;
    self.initialize = initialize;
    self.finalize = null;
    intervals = [];

    self.setInterval = function() {
      intervals.push(setInterval.apply(window, arguments));
      return this;
    }
    self.clearAllIntervals = function() {
      for (var i = 0; i < intervals.length; i++) {
        clearInterval(intervals[i]);
      }
      intervals = [];
      return this;
    }
    self.show = function() {
      $('#loader').show();
      if (currentScene) {
        $('#scene_' + this.name).fadeIn(200);
        $('#scene_' + currentScene.name).fadeOut(200, function() {
          currentScene.clearAllIntervals();
        });
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

function drawCanvas() {
  var canvas = $('#canvas')[0];
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function updateCanvasSize() {
  var width = $(window).width();
  var height = $(window).height();

  var canvas = $('#canvas');
  canvas.attr('width', width);
  canvas.attr('height', height);

  drawCanvas();
}

$(function() {
  updateCanvasSize();
  interval = setInterval(drawCanvas, 16);
  $(window).resize(updateCanvasSize);

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
    $('#chat-text-input').val('');
    $(window).on('keydown', function(evt) {
      if (evt.which == 84) {
        if (!$('#chat-text-input').is(':focus')) {
          $('#chat-text-input').focus();
          return false;
        }
      } else if (evt.which == 27 || evt.ctrlKey && evt.which == 219) {
        $('#chat-text-input').val('');
        $('#chat-text-input').blur();
      }
    });
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
      $('#scene_chat *').off();
    }
    return new Promise(function(resolve, reject) {
      scene_chat.socket = io({multiplex: false});
      scene_chat.socket.connect();
      scene_chat.socket.on('chat', function(screenName, msg) {
        var toast = $('<div>');
        toast.addClass('messages__msg');
        toast.append($('<strong>').text(screenName));
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
      scene_chat.socket.emit('login', screenName, function() {
        resolve();
      });
    });
  });
});
