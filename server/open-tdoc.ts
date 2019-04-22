/*
Math Tablet
Copyright (C) 2019 Public Invention
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

import * as WebSocket from 'ws';

// TODO: Handle websocket lifecycle: closing, unexpected disconnects, errors, etc.

import { ClientMessage, UserName, NotebookName, ServerMessage, ThoughtId, StyleId } from '../client/math-tablet-api';

import { mathJsCas, parseMathJsExpression, ParseResults } from './mathjs-cas';
import { mathStepsCas } from './math-steps-cas';

import { Style, TDoc, Thought } from './tdoc';
import { readNotebook, writeNotebook } from './users-and-files';

// Types

export interface Cas {
  onTDocOpened(tDoc: TDoc): Promise<void>;
  onThoughtInserted(tDoc: TDoc, thought: Thought): Promise<void>;
  onStyleInserted(tDoc: TDoc, style: Style): Promise<void>;
}

// Class

export class OpenTDoc {

  // Class Methods

  static async connect(userName: UserName, notebookName: NotebookName, ws: WebSocket): Promise<OpenTDoc> {
    const key = `${userName}/${notebookName}`;
    let rval = this.openTDocs.get(key);
    if (!rval) {
      // REVIEW: What if messages come in while we are reading the notebook?
      // TODO: Gracefully handle error if readNotebook throws error. (e.g. invalid version)
      const tDoc = await readNotebook(userName, notebookName);
      await mathJsCas.onTDocOpened(tDoc);
      await mathStepsCas.onTDocOpened(tDoc);
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

  // Instance Methods

  // Deletes the specified style and any styles attached to it recursively.
  // Also, notifies all clients to delete the style.
  // Does not save the TDoc!
  public deleteThought(thoughtId: ThoughtId): void {
    console.log(`Deleting thought ${thoughtId}`);

    // Delete all of the styles attached to the thought.
    const styles = this.tDoc.getStyles(thoughtId);
    console.log(`${styles.length} styles attached to thought ${thoughtId}`);
    for(const style of styles) {
      this.deleteStyle(style.id);
    }

    // Delete the thought itself.
    this.tDoc.deleteThought(thoughtId);
    this.sendMessage({ action: 'deleteThought', thoughtId });
  }

  // Deletes the specified style and any styles attached to it recursively.
  // Also, notifies all clients to delete the style.
  // Does not save the TDoc!
  public deleteStyle(styleId: StyleId): void {
    console.log(`Deleting style ${styleId}`);

    // Delete all of the styles attached to the style.
    const styles = this.tDoc.getStyles(styleId);
    console.log(`${styles.length} styles attached to thought ${styleId}`);
    for(const style of styles) {
      this.deleteStyle(style.id);
    }

    // Delete the style itself.
    this.tDoc.deleteStyle(styleId);
    this.sendMessage({ action: 'deleteStyle', styleId });
  }

  // PRIVATE

  // Private Class Properties

  private static openTDocs: Map<string, OpenTDoc> = new Map<string, OpenTDoc>();

  // Private Constructor
  constructor(userName: UserName, notebookName: NotebookName, tDoc: TDoc) {
    this.notebookName = notebookName;
    this.tDoc = tDoc;
    this.userName = userName;
    this.webSockets = new Set<WebSocket>();

    tDoc.on('styleInserted', s=>this.onStyleInserted(s));
    tDoc.on('thoughtInserted', t=>this.onThoughtInserted(t));
  }

  // Private Instance Properties
  webSockets: Set<WebSocket>;

  // Private Event Handlers

  private onClose(ws: WebSocket, code: number, reason: string): void {
    // Normal close appears to be code 1001, reason empty string.
    console.log(`Web socket closed: ${code} - ${reason}`);
    this.webSockets.delete(ws);
  }

  private onError(_ws: WebSocket, err: Error): void {
    console.error(`Web socket error: ${(<any>err).code} ${err.message}`);
    // REVIEW: is the error recoverable? is the websocket closed? will we get a closed event?
  }

  private async onMessage(_ws: WebSocket, message: string) {
    try {
      const msg: ClientMessage = JSON.parse(message);
      console.log(`Received socket message: ${msg.action}`);
      // console.dir(msg);
      switch(msg.action) {
      case 'deleteThought': {
        this.deleteThought(msg.thoughtId);
        await this.save();
        break;
      }
      case 'insertHandwrittenMath': {
        const thought = this.tDoc.insertThought();
        this.tDoc.insertLatexStyle(thought, msg.latexMath, 'INPUT', 'USER');
        this.tDoc.insertJiixStyle(thought, msg.jiix, 'HANDWRITING', 'USER');
        this.save();
        break;
      }
      case 'insertHandwrittenText': {
        const thought = this.tDoc.insertThought();
        this.tDoc.insertTextStyle(thought, msg.text, 'INPUT', 'USER');
        this.tDoc.insertStrokeStyle(thought, msg.strokeGroups, 'HANDWRITING', 'USER');
        await this.save();
        break;
      }
      case 'insertMathJsText': {
        let parseResults: ParseResults|undefined = undefined;
        try {
          parseResults = parseMathJsExpression(msg.mathJsText);
        } catch(err) {
          console.error(`insertMathJsText parse error: ${err.message}`);
          break;
        }
        const thought = this.tDoc.insertThought();
        const style = this.tDoc.insertMathJsStyle(thought, parseResults.mathJsText, 'INPUT', 'USER');
        this.tDoc.insertLatexStyle(style, parseResults.latexMath, 'PRETTY', 'USER');
        await this.save();
        break;
      }
      default:
        console.error(`Unexpected WebSocket message action ${(<any>msg).action}. Ignoring.`);
        break;
      }
    } catch(err) {
      console.error(`Unexpected error handling web-socket message event: ${err.message}`);
    }
  }

  private async onStyleInserted(style: Style): Promise<void> {
    this.sendMessage({ action: 'insertStyle', style });
    await mathJsCas.onStyleInserted(this.tDoc, style);
    await mathStepsCas.onStyleInserted(this.tDoc, style);
  }

  private async onThoughtInserted(thought: Thought): Promise<void> {
    this.sendMessage({ action: 'insertThought', thought });
    await mathJsCas.onThoughtInserted(this.tDoc, thought);
    await mathStepsCas.onThoughtInserted(this.tDoc, thought);
  }

  // Private Instance Methods

  private addSocket(ws: WebSocket): void {
    this.webSockets.add(ws);
    ws.on('close', (code: number, reason: string) => this.onClose(ws, code, reason))
    ws.on('error', (err: Error) => this.onError(ws, err))
    ws.on('message', (message: string) => this.onMessage(ws, message));
    this.sendRefresh(ws);
  }

  // LATER: We need something more efficient that saving the whole notebook every time there is a change.
  //        Instead we should just write deltas on to the end of a file or something.
  private async save(): Promise<void> {
    await writeNotebook(this.userName, this.notebookName, this.tDoc);
  }

  private sendRefresh(ws?: WebSocket): void {
    // TODO: Instead, end empty 'refresh' message, followed by insert-thought and insert-style messages
    const msg: ServerMessage = { action: 'refreshNotebook', tDoc: this.tDoc.toJSON() };
    this.sendMessage(msg, ws);
  }

  private sendMessage(msg: ServerMessage, ws?: WebSocket): void {
    const json = JSON.stringify(msg);
    const sockets = ws ? [ ws ] : this.webSockets;
    console.log(`Sending socket message ${msg.action}.`);
    for (const ws of sockets) {
      try {
        // REVIEW: Should we check ws.readyState
        ws.send(json);
      } catch(err) {
        console.error(`Error sending websocket message: ${ws.readyState} ${(<any>err).code} ${err.message}`)
      }
    }
  }

  // Client Message Handlers

}
