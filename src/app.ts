var debug = require('debug')('src:server');
var http = require('http');

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var stylus = require('stylus');

var apiRouter = require('./routes/api');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

// Helper Functions

function normalizePort(val) {
  var port = parseInt(val, 10);
  if (isNaN(port)) { /* named pipe */ return val; }
  if (port >= 0) { /* port number */ return port; }
  return false;
}

// Application Entry Point

function main() {

  var app = express();

  // view engine setup
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'pug');

  app.use(logger('dev'));

  app.get('/stylesheets/myscript.min.css', (_req, res)=>res.sendFile(`${__dirname}/node_modules/myscript/dist/myscript.min.css`));
  app.get('/javascripts/myscript.min.js', (_req, res)=>res.sendFile(`${__dirname}/node_modules/myscript/dist/myscript.min.js`));
  app.get('/javascripts/myscript.min.js.map', (_req, res)=>res.sendFile(`${__dirname}/node_modules/myscript/dist/myscript.min.js.map`));

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(stylus.middleware(path.join(__dirname, 'public')));
  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/', indexRouter);
  app.use('/api', apiRouter);
  app.use('/users', usersRouter);

  // catch 404 and forward to error handler
  app.use(function(_req, _res, next) {
    next(createError(404));
  });

  // error handler
  app.use(function(err, req, res, _next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });

  const port = normalizePort(process.env.PORT || '3000');
  app.set('port', port);

  const server = http.createServer(app);
  server.listen(port);

  server.on('error', (error)=>{
    if (error.syscall !== 'listen') { throw error; }
    var bind = (typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port);
    switch (error.code) {
      case 'EACCES':
        console.error(`ERROR: ${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(`ERROR: ${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  server.on('listening', ()=>{
    var addr = server.address();
    var bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
    debug('Listening on ' + bind);
  });
}

main();
