
import { $new, Html, } from './dom.js';
import { getKatex } from './katex-types.js';
import { Jiix, StrokeGroups } from './myscript-types.js';
import { ClientMessage, LatexMath, MathJsText, NotebookName, ServerMessage, StyleObject,
         TDocObject, ThoughtObject, UserName } from './math-tablet-api.js';

// Types

type StyleRenderer = (s: StyleObject)=>Html;

interface StyleRendererMap {
  [ styleType: /* StyleType */ string ]: StyleRenderer;
}

// Constants

const STYLE_RENDERERS: StyleRendererMap = {
  'LATEX': renderLatexStyle,
  'MATHJS': renderMathJsStyle,
  'TEXT': renderTextStyle,
};


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
    this.$tDocElt = $tDocElt;
    this.ws = ws;

    ws.addEventListener('open', ()=>{ this.onOpen() });
    ws.addEventListener('message', (event: MessageEvent)=>this.onMessage(event));

  }

  // Private Instance Properties

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

  private insertStyle(style: StyleObject): void {
    let html: Html = `<div class="styleId">S-${style.id} ${style.type} ${style.meaning} => ${style.stylableId}</div>`;
    const renderFn = STYLE_RENDERERS[style.type];
    if (renderFn) { html += renderFn(style); }
    const $elt = $new('div', `S${style.id}`, ['style'], html);
    const selector = `#S${style.stylableId}`;
    const $parentElt = this.$tDocElt.querySelector(selector);
    if (!$parentElt) { throw new Error(`Style parent element '${selector}' not found.`); }
    $parentElt.appendChild($elt);
  }

  private insertThought(thought: ThoughtObject): void {
    const $elt = $new('div', `S${thought.id}`, ['thought'], `<div class="thoughtId">T-${thought.id}</div>`);
    this.$tDocElt.appendChild($elt);
  }

  private refreshNotebook(tDoc: TDocObject): void {
    this.$tDocElt.innerHTML = '';
    const thoughts = tDoc.thoughts;
    for (const thought of thoughts) { this.insertThought(thought); }
    for (const style of tDoc.styles) { this.insertStyle(style); }
  }

  private sendMessage(obj: ClientMessage): void {
    const json = JSON.stringify(obj);
    this.ws.send(json);
  }

}

// Helper Functions

function renderLatexStyle(style: /* TYPESCRIPT: LatexMathStyleObject */ StyleObject): Html {
  // TODO: Catch errors and display.
  const latexHtml = getKatex().renderToString(style.data, { throwOnError: false });
  return `<div>${latexHtml}</div>`
}

function renderMathJsStyle(style: /* TYPESCRIPT: MathJsStyleObject */ StyleObject): Html {
  return `<div><tt>${style.data}</tt></div>`;
}

function renderTextStyle(style: /* TYPESCRIPT: TextStyleObject */ StyleObject): Html {
  return `<div>${style.data}</div>`;
}


