
import { $, $new, } from './dom.js';
import { getKatex } from './katex-types.js';
import { Jiix, StrokeGroups } from './myscript-types.js';
import { ClientMessage, LatexMath, MathJsText, NotebookName, ServerMessage, StyleObject,
         TDocObject, ThoughtObject, UserName } from './math-tablet-api.js';

// Types

type StyleRenderer = (s: StyleObject)=>HTMLElement;

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

  public static connect(url: string, userName: UserName, notebookName: NotebookName): NotebookConnection {

    const ws = new WebSocket(url);
    const notebookConnection = new NotebookConnection(userName, notebookName, ws);
    return notebookConnection;
  }

  // Instance Properties

  public notebookName: NotebookName;
  public userName: UserName;

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

  private constructor(userName: UserName, notebookName: NotebookName, ws: WebSocket) {
    this.userName = userName;
    this.notebookName = notebookName;
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
      case 'appendThought': appendThought(msg.thought, msg.styles); break;
      case 'refreshNotebook': refreshNotebook(msg.tDoc); break;
      default:
        console.error(`Unexpected action '${(<any>msg).action}' in WebSocket message`);
        break;
      }
    } catch(err) {
      console.error("Unexpected client error handling WebSocket message event.");
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

  private sendMessage(obj: ClientMessage): void {
    const json = JSON.stringify(obj);
    this.ws.send(json);
  }
}

// Helper Functions

function appendThought(thought: ThoughtObject, styles: StyleObject[]): void {
  const thoughtElt = renderThought(thought, styles);
  $('#tDoc').appendChild(thoughtElt);
}

function refreshNotebook(tDoc: TDocObject): void {
  const $tDoc = $('#tDoc');
  $tDoc.innerHTML = '';
  const thoughts = tDoc.thoughts;
  for (const thought of thoughts) {
    const $elt = renderThought(thought, tDoc.styles);
    $tDoc.appendChild($elt);
  }
}

function renderLatexStyle(style: StyleObject) {
  const $elt = $new('div', ['style'], `<div class="styleId">S-${style.id} ${style.type} => ${style.stylableId}</div>`);
  const $subElt = $new('div');
  getKatex().render(style.data, $subElt, { throwOnError: false });
  $elt.appendChild($subElt);
  return $elt;
}

function renderMathJsStyle(style: StyleObject) {
  return $new('div', ['style'], `<div class="styleId">S-${style.id} ${style.type} => ${style.stylableId}</div><div><tt>${style.data}</tt></div>`);
}

function renderStyle(style: StyleObject, styles: StyleObject[], recursionLevel: number) {
  // Render the style itself using a style renderer.
  const renderFn = STYLE_RENDERERS[style.type];
  let $elt;
  if (renderFn) {
    $elt = renderFn(style);
  } else {
    $elt = $new('div', ['style'], `<div class="styleId">S-${style.id} ${style.type}  => ${style.stylableId}: Not rendered</div>`);
  }

  // Render styles attached to this style.
  renderStyles($elt, style.id, styles, recursionLevel+1);

  return $elt;
}

function renderStyles($elt: HTMLElement, id: number, styles: StyleObject[], recursionLevel: number=0) {
  if (recursionLevel>10) { throw new Error("Recursion limit reached. Styles nested too deeply or circular."); }
  for (const style of styles.filter(s=>(s.stylableId == id))) {
    const $styleElt = renderStyle(style, styles, recursionLevel);
    $elt.appendChild($styleElt);
  }
}

function renderTextStyle(style: StyleObject) {
  return $new('div', ['style'], `<div class="styleId">S-${style.id} ${style.type} => ${style.stylableId}</div><div>${style.data}</div>`);
}

function renderThought(thought: ThoughtObject, styles: StyleObject[]) {
  const $elt = $new('div', ['thought'], `<div class="thoughtId">T-${thought.id}</div>`);
  renderStyles($elt, thought.id, styles);
  if (styles.length == 0) { $elt.innerHTML = `<i>Thought ${thought.id} has no styles attached.</i>`; }
  return $elt;
}

