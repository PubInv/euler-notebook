
// Requirements

import { Server } from 'http';

import { Request } from 'express';
import * as WebSocket from 'ws';

import { OpenTDoc } from './open-tdoc';

// Exported Functions

export function initialize(server: Server) {
  const wss = new WebSocket.Server({ server });
  wss.on('connection', onConnection);
}

// Event Handlers

async function onConnection(ws: WebSocket, req: Request): Promise<void> {
  try {
    console.log(`New socket connection to: ${req.url}`);
    const urlComponents = req.url.split('/');
    if (urlComponents.length!=3) { throw new Error("Unexpected path in socket connection URL."); }
    const userName = urlComponents[1];
    const notebookName = urlComponents[2];
    await OpenTDoc.connect(userName, notebookName, ws);
  } catch(err) {
    console.error("Unexpected error handling web-socket connection event.");
  }
}
