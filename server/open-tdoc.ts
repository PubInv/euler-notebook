
import * as WebSocket from 'ws';

// TODO: Handle websocket lifecycle: closing, unexpected disconnects, errors, etc.

import { ClientMessage, UserName, NotebookName, ServerMessage } from '../client/math-tablet-api';
import { Style, TDoc, Thought } from './tdoc';
import { readNotebook, writeNotebook } from './users-and-files';

export class OpenTDoc {

  // Class Methods

  static async connect(userName: UserName, notebookName: NotebookName, ws: WebSocket): Promise<OpenTDoc> {
    const key = `${userName}/${notebookName}`;
    let rval = this.openTDocs.get(key);
    if (!rval) {
      // REVIEW: What if messages come in while we are reading the notebook?
      // TODO: Gracefully handle error if readNotebook throws error. (e.g. invalid version)
      const tDoc = await readNotebook(userName, notebookName);
      rval = new this(userName, notebookName, tDoc);
      this.openTDocs.set(key, rval);
    }
    rval.addSocket(ws);
    return rval;
  }

  // Instance Properties

  userName: UserName;
  notebookName: NotebookName;
  tDoc: TDoc;

  // PRIVATE

  // Private Class Properties

  private static openTDocs: Map<string, OpenTDoc> = new Map<string, OpenTDoc>();

  // Private Constructor
  constructor(userName: UserName, notebookName: NotebookName, tDoc: TDoc) {
    this.notebookName = notebookName;
    this.tDoc = tDoc;
    this.userName = userName;
    this.webSockets = new Set<WebSocket>();
  }

  // Private Instance Properties
  webSockets: Set<WebSocket>;

  // Private Event Handlers

  // ENHANCEMENT:
  //     const newStyles = tdoc.applyRules([mathSimplifyRule, mathExtractVariablesRule, mathEvaluateRule]).map(s=>s.toObject());

  // SAVING:
  // const tDoc = TDoc.fromJsonObject(params.tDoc);
  // await writeNotebook(userName, notebookName, tDoc);

  private async onMessage(_ws: WebSocket, message: string) {
    try {
      const msg: ClientMessage = JSON.parse(message);
      console.log(`Received socket message: ${msg.action}`);
      // console.dir(msg);
      switch(msg.action) {
      case 'insertHandwrittenMath': {
        const thought = this.tDoc.createThought();
        this.sendInsertThought(thought);
        const style1 = this.tDoc.createLatexStyle(thought, msg.latexMath, 'INPUT');
        this.sendInsertStyle(style1);
        const style2 = this.tDoc.createJiixStyle(thought, msg.jiix, 'HANDWRITING');
        this.sendInsertStyle(style2);
        // TODO: enhance
        this.save();
        break;
      }
      case 'insertHandwrittenText': {
        const thought = this.tDoc.createThought();
        this.sendInsertThought(thought);
        const style1 = this.tDoc.createTextStyle(thought, msg.text, 'INPUT');
        this.sendInsertStyle(style1);
        const style2 = this.tDoc.createStrokeStyle(thought, msg.strokeGroups, 'HANDWRITING');
        this.sendInsertStyle(style2);
        // TODO: enhance
        this.save();
        break;
      }
      case 'insertMathJsText': {
        const thought = this.tDoc.createThought();
        this.sendInsertThought(thought);
        const style1 = this.tDoc.createMathJsStyle(thought, msg.mathJsText, 'INPUT');
        this.sendInsertStyle(style1);
        // TODO: enhance
        this.save();
        break;
      }
      default:
        console.error(`Unexpected WebSocket message action ${(<any>msg).action}. Ignoring.`);
        break;
      }
    } catch(err) {
      console.error("Unexpected error handling web-socket message event.");
    }
  }

  // Private Instance Methods

  private addSocket(ws: WebSocket): void {
    this.webSockets.add(ws);
    ws.on('message', (message: string) => this.onMessage(ws, message));
    this.sendRefresh(ws);
  }

  // LATER: We need something more efficient that saving the whole notebook every time there is a change.
  //        Instead we should just write deltas on to the end of a file or something.
  private async save(): Promise<void> {
    await writeNotebook(this.userName, this.notebookName, this.tDoc);
  }

  private sendInsertStyle(style: Style): void {
    this.sendMessage({ action: 'insertStyle', style });
  }

  private sendInsertThought(thought: Thought): void {
    this.sendMessage({ action: 'insertThought', thought });
  }

  private sendRefresh(ws?: WebSocket): void {
    const msg: ServerMessage = { action: 'refreshNotebook', tDoc: this.tDoc.toObject() };
    this.sendMessage(msg, ws);
  }

  private sendMessage(msg: ServerMessage, ws?: WebSocket): void {
    const json = JSON.stringify(msg);
    if (ws) { ws.send(json); }
    else {
      for (const ws of this.webSockets) {
        ws.send(json);
      }
    }
  }
}