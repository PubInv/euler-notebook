
// Requirements

import { getKatex } from './katex-types.js';

import { $new, Html } from './dom.js';
import { StyleObject } from './math-tablet-api.js';

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

// Exported Class

export class StyleElement {

  // Class Methods

  static insert($parent: HTMLElement, style: StyleObject): StyleElement {
    var rval = new this(style);
    $parent.appendChild(rval.$elt);
    return rval;
  }

  // Instance Methods

  insertStyle(style: StyleObject): StyleElement {
    return StyleElement.insert(this.$elt, style);
  }

  // PRIVATE

  // Private Constructor

  private constructor(style: StyleObject) {
    const id = `S${style.id}`;
    const classes = ['style'];
    let html: Html = `<div class="styleId">S-${style.id} ${style.type} ${style.meaning} => ${style.stylableId}</div>`;
    const renderFn = STYLE_RENDERERS[style.type];
    if (renderFn) { html += renderFn(style); }
    this.$elt = $new<HTMLDivElement>('div', id, classes, html);
  }

  // Private Instance Properties

  private $elt: HTMLDivElement;

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
  if (style.meaning == 'INDENTED') {
    return `<pre>${style.data}</pre>`;
  } else {
    return `<div>${style.data}</div>`;
  }
}
