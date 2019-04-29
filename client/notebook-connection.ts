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

import { addErrorMessageToHeader } from './global.js';
import { Jiix, StrokeGroups } from './myscript-types.js';
import { ClientMessage, LatexMath, MathJsText, NotebookName, ServerMessage, StyleId, StyleObject,
         ThoughtId, ThoughtObject, UserName } from './math-tablet-api.js';
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

    ws.addEventListener('close', (event: CloseEvent)=>this.onWsClose(event));
    ws.addEventListener('error', (event: Event)=>this.onWsError(event));
    ws.addEventListener('message', (event: MessageEvent)=>this.onWsMessage(event));
    ws.addEventListener('open', ()=>{ this.onWsOpen(); });

    $tDocElt.addEventListener('click', (event: MouseEvent)=>{ this.onClick(event); })
  }

  // Private Instance Properties

  private styleElements: Map<StyleId, StyleElement>;
  private thoughtElements: Map<ThoughtId, ThoughtElement>;
  private ws: WebSocket;

  // Private Event Handlers

  private onClick(event: MouseEvent): void {
    const $target = <HTMLElement>event.target;
    if (!$target) { throw new Error("TDoc click event has no target!"); }
    if ($target.nodeName == 'BUTTON' && $target.classList.contains('deleteThought')) {
      const $parent = $target.parentElement;
      if (!$parent) { throw new Error("TDoc button has no parent!"); }
      const thoughtId = parseInt($parent.id.slice(1));
      this.sendMessage({ action: 'deleteThought', thoughtId });
    }
  }

  private onWsClose(event: CloseEvent): void {
    // For terminating server: code = 1006, reason = "";
    console.log(`Notebook Conn: socket closed: ${event.code} ${event.reason}`);
    console.dir(event);
    addErrorMessageToHeader(`Socket closed by server. Refresh this page in your browser to reconnect.`);
    // LATER: Attempt to reconnect after a few seconds with exponential backoff.
  }

  private onWsError(event: Event): void {
    console.error(`Notebook Conn: socket error.`);
    console.dir(event);
    // REVIEW: Is the socket stull usable? Is the socket closed? Will we also get a close event?
    addErrorMessageToHeader(`Socket error. Refresh this page in your browser to reconnect.`);
  }

  private onWsMessage(event: MessageEvent): void {
    try {
      const msg: ServerMessage = JSON.parse(event.data);
      console.log(`Notebook Conn: socket message: ${msg.action}`);
      // console.dir(msg);
      switch(msg.action) {
      case 'deleteStyle': this.deleteStyle(msg.styleId); break;
      case 'deleteThought': this.deleteThought(msg.thoughtId); break;
      case 'insertStyle': this.insertStyle(msg.style); break;
      case 'insertThought': this.insertThought(msg.thought); break;
      default:
        console.error(`Unexpected action '${(<any>msg).action}' in WebSocket message`);
        break;
      }
    } catch(err) {
      console.error("Unexpected client error handling `WebSocket message event.");
      console.dir(err);
    }
  }

  private onWsOpen(): void {
    try {
      console.log("Notebook Conn: socket opened.");
      this.clear();
      this.sendMessage({ action: 'refreshNotebook' });
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

  private sendMessage(obj: ClientMessage): void {
    const json = JSON.stringify(obj);
    try {
      this.ws.send(json);
    } catch(err) {
      console.error(`Error sending websocket message: ${this.ws.readyState} ${(<any>err).code} ${err.message}`)
    }
  }

  // Server Message Handlers

  private deleteStyle(styleId: StyleId): void {
    const styleElt = this.styleElements.get(styleId);
    if (!styleElt) { throw new Error("Delete style message for unknown style"); }
    styleElt.delete();
    this.styleElements.delete(styleId);
  }

  private deleteThought(thoughtId: ThoughtId): void {
    const thoughtElt = this.thoughtElements.get(thoughtId);
    if (!thoughtElt) { throw new Error("Delete thought message for unknown thought"); }
    thoughtElt.delete();
    this.thoughtElements.delete(thoughtId);
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

}
