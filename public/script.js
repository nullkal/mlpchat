var socket, chat;

function Chat() {

}
Chat.prototype = {

};

function update() {

}

function draw() {
  var canvas = $('#canvas')[0];
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function updateCanvasSize() {
  var width = $(window).width();
  var height = $(window).height() * 0.95;

  var canvas = $('#canvas');
  canvas.attr('width', width);
  canvas.attr('height', height);

  draw();
}

$(function() {
  var interval;

  socket = io();
  socket.on('connect', function() {
    updateCanvasSize();
    $(window).resize(function() {
      updateCanvasSize();
    });

    chat = new Chat();

    interval = setInterval(function() {
      update();
      draw();
    }, 16);

    $('#loader').addClass('hidden');
  });

  socket.on('disconnect', function() {
    $('#loader').removeClass('hidden');
    chat = null;
  });

  socket.on('chat', function(message) {
    var toast = $('<div>');
    toast.addClass('log-message');
    toast.addClass('log-message--new');
    toast.append($('<strong>').text('nullkal'));
    toast.append(document.createTextNode(': ' + message));
    $('#log').append(toast);
    toast.hide();
    toast.slideDown(200);

    var logCnt = $('#log').children().length;
    if (logCnt > 4) {
      $('#log').children('div:nth-child(-n+' + (logCnt - 4) +')')
        .animate({left: '+=120%'}, 800, 'swing', function() {
          $(this).remove();
        });
    }
  });

  $('#chat-form').on('submit', function() {
    var chatInput = $('#chat-text-input');
    if (chatInput.val() != '') {
      socket.emit('chat', chatInput.val());
      chatInput.val('');
    }
    return false;
  });
});
