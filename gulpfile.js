var g = require('gulp');
var gls = require('gulp-live-server');

g.task('server', function() {
  var server = gls.new('app.js');
  server.start();

  g.watch('app.js', server.start);
});

g.task('default', ['server']);
