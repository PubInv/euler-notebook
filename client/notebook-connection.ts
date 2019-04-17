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

// Requirements

import { Jiix, StrokeGroups } from './myscript-types.js';
import { ClientMessage, LatexMath, MathJsText, NotebookName, ServerMessage, StyleId, StyleObject,
         TDocObject, ThoughtId, ThoughtObject, UserName } from './math-tablet-api.js';
import { ThoughtElement } from './thought-element.js';
import { StyleElement } from './style-element.js';

// Types

// Class

export class NotebookConnection {

  // Class Methods

  public static connect(url: string, userName: UserName, notebookName: NotebookName, $tDocElt: HTMLElement): NotebookConnection {

    const ws = new WebSocket(url);
    const notebookConnection = new NotebookConnection(userName, notebookName, $tDocElt, ws);
    return notebookConnection;
  }

  // Instance Properties

  public notebookName: NotebookName;
  public userName: UserName;
  public $tDocElt: HTMLElement;

  // Instance Methods

  public insertHandwrittenMath(latexMath: LatexMath, jiix: Jiix): void {
    this.sendMessage({ action: 'insertHandwrittenMath', latexMath, jiix });
  }

  public insertHandwrittenText(text: string, strokeGroups: StrokeGroups): void {
    this.sendMessage({ action: 'insertHandwrittenText', text, strokeGroups });
  }

  public insertMathJsText(mathJsText: MathJsText): void {
    this.sendMessage({ action: 'insertMathJsText', mathJsText });
  }

  // PRIVATE

  private constructor(userName: UserName, notebookName: NotebookName, $tDocElt: HTMLElement, ws: WebSocket) {
    this.userName = userName;
    this.notebookName = notebookName;
    this.styleElements = new Map();
    this.$tDocElt = $tDocElt;
    this.thoughtElements = new Map();
    this.ws = ws;

    ws.addEventListener('open', ()=>{ this.onOpen() });
    ws.addEventListener('message', (event: MessageEvent)=>this.onMessage(event));

  }

  // Private Instance Properties

  private styleElements: Map<StyleId, StyleElement>;
  private thoughtElements: Map<ThoughtId, ThoughtElement>;
  private ws: WebSocket;

  // Private Event Handlers

  private onMessage(event: MessageEvent): void {
    try {
      const msg: ServerMessage = JSON.parse(event.data);
      console.log(`Received socket message: ${msg.action}`);
      // console.dir(msg);
      switch(msg.action) {
      case 'deleteStyle': throw new Error("TODO: deleteStyle not implemented");
      case 'deleteThought': throw new Error("TODO: deleteThought not implemented");
      case 'insertThought': this.insertThought(msg.thought); break;
      case 'insertStyle': this.insertStyle(msg.style); break;
      case 'refreshNotebook': this.refreshNotebook(msg.tDoc); break;
      default:
        console.error(`Unexpected action '${(<any>msg).action}' in WebSocket message`);
        break;
      }
    } catch(err) {
      console.error("Unexpected client error handling WebSocket message event.");
      console.dir(err);
    }
  }

  private onOpen(): void {
    try {
      console.log("WebSocket opened.");
    } catch(err) {
      console.error("Unexpected client error handling WebSocket open event.");
    }
  }

  // Private Instance Methods

  private clear(): void {
    this.$tDocElt.innerHTML = '';
    this.thoughtElements.clear();
    this.styleElements.clear();
  }

  private insertStyle(style: StyleObject): void {
    let elt: ThoughtElement|StyleElement|undefined;
    elt = this.thoughtElements.get(style.stylableId);
    if (!elt) {
      elt = this.styleElements.get(style.stylableId);
    }
    if (!elt) { throw new Error("Style attached to unknown thought or style."); }
    const styleElt = elt.insertStyle(style);
    this.styleElements.set(style.id, styleElt);
  }

  private insertThought(thought: ThoughtObject): void {
    const thoughtElt = ThoughtElement.insert(this.$tDocElt, thought);
    this.thoughtElements.set(thought.id, thoughtElt);
  }

  private refreshNotebook(tDoc: TDocObject): void {
    this.clear();
    const thoughts = tDoc.thoughts;
    for (const thought of thoughts) { this.insertThought(thought); }
    for (const style of tDoc.styles) { this.insertStyle(style); }
  }

  private sendMessage(obj: ClientMessage): void {
    const json = JSON.stringify(obj);
    this.ws.send(json);
  }

}
