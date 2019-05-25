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

// import { getKatex } from './katex-types.js';

// import { Html } from './dom.js';
import { StyleObject } from './math-tablet-api.js';

// Types

// type StyleRenderer = (s: any /* TYPESCRIPT: */)=>Html;

// interface StyleRendererMap {
//   [ styleType: /* StyleType */ string ]: StyleRenderer;
// }

// Constants

// const STYLE_RENDERERS: StyleRendererMap = {
//   'IMAGE': renderImageStyle,
//   'JIIX': renderJiixStyle,
//   'LATEX': renderLatexStyle,
//   'MATHJS': renderMathJsStyle,
//   'MATHML': renderMathMlStyle,
//   'MATHEMATICA': renderMathematicaStyle,
//   'SYMBOL': renderSymbolStyle,
//   'TOOL-MENU': renderToolMenuStyle,
//   'TEXT': renderTextStyle,
// };

// Exported Class

export class StyleElement {

  // Class Methods

  static insert(style: StyleObject): StyleElement {
    return new this(style);
  }

  // Instance Properties

  public style: StyleObject;

  // Instance Methods

  // PRIVATE

  // Private Constructor

  private constructor(style: StyleObject) {
    this.style = style;
  }

}

// Helper Functions

// // From: http://shebang.brandonmintern.com/foolproof-html-escaping-in-javascript/
// function escapeHtml(str: string): Html {
//   var div = document.createElement('div');
//   div.appendChild(document.createTextNode(str));
//   return div.innerHTML;
// }

// function renderImageStyle(style: StyleObject): Html {
//   return `<div><img src="${style.data}"/></div>`;
// }

// function renderJiixStyle(_style: StyleObject): Html {
//   return `<div><i>JIIX data</i></div>`;
// }

// function renderLatexStyle(style: StyleObject): Html {
//   // TODO: Catch errors and display.
//   const latexHtml = getKatex().renderToString(style.data, { throwOnError: false });
//   return `<div>${latexHtml}</div>`;
// }

// function renderMathematicaStyle(style: StyleObject): Html {
//   return `<div><tt>${style.data}</tt></div>`;
// }

// function renderSymbolStyle(style: StyleObject): Html {
//   if (style.meaning == 'SYMBOL-DEFINITION') {
//     return `<div><tt>def: ${style.data.name} = ${style.data.value}</tt></div>`;
//   } else {
//     return `<div><tt>use: ${style.data.name}</tt></div>`;
//   }
// }

// function renderMathJsStyle(style: StyleObject): Html {
//   return `<div><tt>${style.data}</tt></div>`;
// }

// function renderMathMlStyle(style: StyleObject): Html {
//   console.dir(style.data);
//   return `<div><i>MathML data</i></div>`;
// }

// function renderOtherStyle(style: StyleObject): Html {
//   return `<div><tt>${style.data}</tt></div>`;
// }

// function renderTextStyle(style: StyleObject): Html {
//   if (style.meaning == 'INDENTED') {
//     return `<pre>${style.data}</pre>`;
//   } else {
//     return `<div>${style.data}</div>`;
//   }
// }

// function renderToolMenuStyle(style: StyleObject): Html {
//   const toolMenu: ToolMenu = style.data;
//   return toolMenu.map((toolInfo)=>`<button class="tool" data-tool="${toolInfo.name}">${toolInfo.html}</button>`).join("&middot;");
// }
