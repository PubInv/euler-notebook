
import * as WebSocket from 'ws';

import { ClientMessage, UserName, NotebookName, ServerMessage } from '../client/math-tablet-api';
import { Style, TDoc, Thought } from './tdoc/tdoc-class';
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
        this.sendInsertThought(ws, thought);
        const style1 = this.tDoc.createLatexStyle(thought, msg.latexMath, 'INPUT');
        this.sendInsertStyle(ws, style1);
        const style2 = this.tDoc.createJiixStyle(thought, msg.jiix, 'HANDWRITING');
        this.sendInsertStyle(ws, style2);
        // TODO: enhance
        this.save();
        break;
      }
      case 'insertHandwrittenText': {
        const thought = this.tDoc.createThought();
        this.sendInsertThought(ws, thought);
        const style1 = this.tDoc.createTextStyle(thought, msg.text, 'INPUT');
        this.sendInsertStyle(ws, style1);
        const style2 = this.tDoc.createStrokeStyle(thought, msg.strokeGroups, 'HANDWRITING');
        this.sendInsertStyle(ws, style2);
        // TODO: enhance
        this.save();
        break;
      }
      case 'insertMathJsText': {
        const thought = this.tDoc.createThought();
        this.sendInsertThought(ws, thought);
        const style1 = this.tDoc.createMathJsStyle(thought, msg.mathJsText, 'INPUT');
        this.sendInsertStyle(ws, style1);
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

  private attachSocket(ws: WebSocket): void {
    ws.on('message', (message: string) => this.onMessage(ws, message));
    this.sendRefresh(ws);
  }

  // LATER: We need something more efficient that saving the whole notebook every time there is a change.
  //        Instead we should just write deltas on to the end of a file or something.
  private async save(): Promise<void> {
    await writeNotebook(this.userName, this.notebookName, this.tDoc);
  }

  private sendInsertStyle(ws: WebSocket, style: Style): void {
    this.sendMessage(ws, { action: 'insertStyle', style });
  }

  private sendInsertThought(ws: WebSocket, thought: Thought): void {
    this.sendMessage(ws, { action: 'insertThought', thought });
  }

  private sendRefresh(ws: WebSocket): void {
    this.sendMessage(ws, { action: 'refreshNotebook', tDoc: this.tDoc.toObject() });
  }

  private sendMessage(ws: WebSocket, msg: ServerMessage): void {
    ws.send(JSON.stringify(msg));
  }
}