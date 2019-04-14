
import * as WebSocket from 'ws';

import { ClientMessage, UserName, NotebookName, ServerMessage } from '../client/math-tablet-api';
import { TDoc } from './tdoc/tdoc-class';
import { readNotebook, writeNotebook } from './users-and-files';

export class OpenTDoc {

  // Class Methods

  static async connect(userName: UserName, notebookName: NotebookName, ws: WebSocket): Promise<void> {
    // TODO: check if already open;
    const tDoc = await readNotebook(userName, notebookName);
    const openTDoc = new this(userName, notebookName, tDoc);
    openTDoc.attachSocket(ws);
  }

  // Instance Properties

  userName: UserName;
  notebookName: NotebookName;
  tDoc: TDoc;

  // PRIVATE

  constructor(userName: UserName, notebookName: NotebookName, tDoc: TDoc) {
    this.userName = userName;
    this.notebookName = notebookName;
    this.tDoc = tDoc;
  }

  // Private Event Handlers

  // ENHANCEMENT:
  //     const newStyles = tdoc.applyRules([mathSimplifyRule, mathExtractVariablesRule, mathEvaluateRule]).map(s=>s.toObject());

  // SAVING:
  // const tDoc = TDoc.fromJsonObject(params.tDoc);
  // await writeNotebook(userName, notebookName, tDoc);

  private async onMessage(ws: WebSocket, message: string) {
    try {
      const msg: ClientMessage = JSON.parse(message);
      console.log(`Received socket message: ${msg.action}`);
      // console.dir(msg);
      switch(msg.action) {
      case 'insertHandwrittenMath': {
        const thought = this.tDoc.createThought();
        const style1 = this.tDoc.createLatexStyle(thought, msg.latexMath, 'INPUT');
        const style2 = this.tDoc.createJiixStyle(thought, msg.jiix, 'HANDWRITING');
        // TODO: enhance
        this.save();
        // TODO: send to all sockets.
        this.sendMessage(ws, { action: 'appendThought', thought: thought.toObject(), styles: [ style1.toObject(), style2.toObject() ] })
        break;
      }
      case 'insertHandwrittenText': {
        const thought = this.tDoc.createThought();
        const style1 = this.tDoc.createTextStyle(thought, msg.text, 'INPUT');
        const style2 = this.tDoc.createStrokeStyle(thought, msg.strokeGroups, 'HANDWRITING');
        // TODO: enhance
        this.save();
        // TODO: send to all sockets.
        this.sendMessage(ws, { action: 'appendThought', thought: thought.toObject(), styles: [ style1.toObject(), style2.toObject() ] })
        break;
      }
      case 'insertMathJsText': {
        const thought = this.tDoc.createThought();
        const style1 = this.tDoc.createMathJsStyle(thought, msg.mathJsText, 'INPUT');
        // TODO: enhance
        this.save();
        // TODO: send to all sockets.
        this.sendMessage(ws, { action: 'appendThought', thought: thought.toObject(), styles: [ style1.toObject() ] })
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

  private attachSocket(ws: WebSocket): void {
    ws.on('message', (message: string) => this.onMessage(ws, message));
    this.sendRefresh(ws);
  }

  // LATER: We need something more efficient that saving the whole notebook every time there is a change.
  //        Instead we should just write deltas on to the end of a file or something.
  private async save(): Promise<void> {
    await writeNotebook(this.userName, this.notebookName, this.tDoc);
  }

  private sendRefresh(ws: WebSocket): void {
    this.sendMessage(ws, { action: 'refreshNotebook', tDoc: this.tDoc.toObject() });
  }

  private sendMessage(ws: WebSocket, msg: ServerMessage): void {
    ws.send(JSON.stringify(msg));
  }
}