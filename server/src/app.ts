/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
https://pubinv.github.io/PubInv/

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// Requirements

import { createServer } from "http";
import { join } from "path";

import * as debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import * as cookieParser from "cookie-parser";
import * as express from "express";
import * as  createError from "http-errors";
import * as morgan from "morgan";
import * as nodeCleanup from "node-cleanup";
import { satisfies as semverSatisfies } from "semver";
import { middleware as stylusMiddleware } from "stylus";

import { assert } from "./shared/common";
import { initialize as initializeFormula } from "./shared/formula";

import { MathJaxTypesetter } from "./adapters/mathjax-typesetter";
import { start as startWolframscript } from "./adapters/wolframscript";
import { initialize as initializeMathPix } from "./adapters/mathpix";
import { initialize as initializeMyScript } from "./adapters/myscript";
import { initialize as initializeWolframAlpha } from "./adapters/wolframalpha";

import { ServerSocket } from "./models/server-socket";
import { loadConfig, loadCredentials } from "./config";

import { router as apiRouter } from "./routes/api";
import { router as exportRouter } from "./routes/export";
import { router as indexRouter } from "./routes/index";
import { router as xrayRouter } from "./routes/xray";
import { router as pdfRouter } from "./routes/pdf";
import { UserSession } from "./models/user-session";

// Constants

const NODE_REQUIREMENT = ">=12.16.3";

// Application Entry Point

async function main() {

  checkNodeVersion();

  // Perform any cleanup actions when the process exits.
  // nodemon uses SIGUSR2 to terminate the process before restarting it,
  // but node-cleanup doesn't catch SIGUSR2, so we have to catch that
  // separately.
  nodeCleanup(cleanupHandler);
  process.once('SIGUSR2', function(){ cleanupHandler(null, 'SIGUSR2'); });

  const config = await loadConfig();
  const credentials = await loadCredentials();

  await UserSession.loadIfAvailable();

  // TODO: stopWolframscript before exiting.
  if (config.wolframscript) { await startWolframscript(config.wolframscript); }
  initializeFormula(MathJaxTypesetter.create());
  initializeMathPix(credentials.mathpix);
  initializeMyScript(credentials.myscript);
  initializeWolframAlpha(credentials.wolframalpha);

  const app: express.Express = express();

  // view engine setup
  app.set('views', join(__dirname, '..', 'views'));
  app.set('view engine', 'pug');

  app.use(stylusMiddleware(join(__dirname, '..', 'public')));
  app.use(express.static(join(__dirname, '..', 'public')));

  // REVIEW: Putting this logger *after* the static routes means the static routes are not logged.
  //         This is generally what we want for development, but may not be what we want for production.
  app.use(morgan('dev'));

  app.use(express.json());
  // REVIEW: There seems to be some reason not to use extended flag. Investigate.
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use('/api', apiRouter);
  app.use('/export', exportRouter);
  app.use('/pdf', pdfRouter);
  app.use('/xray', xrayRouter);
  app.use('/', indexRouter);

  // catch 404 and forward to error handler
  app.use(function(_req: express.Request, _res: express.Response, next) {
    next(createError(404));
  });

  // error handler
  app.use(function(err: any, req: express.Request, res: express.Response, _next: express.NextFunction) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });

  const port = normalizePort(process.env.PORT || '3000');
  app.set('port', port);

  const server = createServer(app);
  server.listen(port);

  server.on('error', (error: Error)=>{
    if ((<any>error).syscall !== 'listen') { throw error; }
    var bind = (typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port);
    switch ((<any>error).code) {
      case 'EACCES':
        console.error(`ERROR ${MODULE}: ${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(`ERROR ${MODULE}: ${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  server.on('listening', ()=>{
    const addr = server.address();
    const bind = (typeof addr === 'string' ? `pipe ${addr}` : `port ${addr && addr.port}`);
    console.log(`Listening on ${bind}`);
  });

  ServerSocket.initialize(server);

}

main().then(
  ()=>{   debug("Main promise resolved.");
      },
  (err)=>{ console.error(`ERROR ${MODULE}: Error initializing app: ${err.message}`); },
);

// Helper Functions

async function asyncCleanupHandler(_signal: string): Promise<void> {
  debug("Saving user session tokens.");
  await UserSession.save();
  debug("User session tokens saved.");
}

function cleanupHandler(exitCode: number|null, signal: string|null): boolean {
  // NOTE: Put all cleanup in asyncCleanupHandler unless it must be done for
  //       non-signal exits.
  if (signal) {
    console.log(`ASYNC CLEANUP HANDLER CALLED: ${exitCode} [${signal}]`);
    debug(`Node cleanup handler called for signal: ${signal}`);
    asyncCleanupHandler(signal)
    .finally(()=>{
      console.log(`ASYNC CLEANUP HANDLER RETURNED. KILLING PROCESS.`);
      process.kill(process.pid, signal);
    });
    nodeCleanup.uninstall(); // don't call cleanup handler again
    return false;
  } else {
    console.log(`SYNC CLEANUP HANDLER CALLED: [${exitCode}] ${signal}`);
    // Process always exits after the cleanup handlers for non-signals.
    // We cannot do any asynchronous cleanup.
    debug(`Node cleanup handler called with exit code: ${exitCode}`);
    return true;
  }
}

function checkNodeVersion(): void {
  assert(semverSatisfies(process.versions.node, NODE_REQUIREMENT), `Node version must satisfy requirement '${NODE_REQUIREMENT}'`);
}

function normalizePort(val: string): string|number|boolean {
  var port = parseInt(val, 10);
  if (isNaN(port)) { /* named pipe */ return val; }
  if (port >= 0) { /* port number */ return port; }
  return false;
}
