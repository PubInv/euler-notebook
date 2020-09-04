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

import { StyleObject, FindRelationshipOptions, FindStyleOptions } from "../../../shared/notebook"

import { $new, escapeHtml, Html } from "../../../dom"
import { NotebookView } from "../../../notebook-screen/notebook-view"
import { getRenderer } from "../../../renderers"
import { FORMULA_SUBROLE_PREFIX } from "../../../role-selectors"

import { CellView } from "./index"
import { NotebookTools } from "../../../notebook-screen/notebook-tools"

// Types

// Constants

// Class

export class FormulaCellView extends CellView {

  // Class Methods

  public static create(notebookView: NotebookView, style: StyleObject): FormulaCellView {
    const instance = new this(notebookView, style);
    instance.render(style);
    return instance;
  }

  // Instance Methods

  public render(style: StyleObject): void {
    this.$prefix.innerHTML = style.subrole ? FORMULA_SUBROLE_PREFIX.get(style.subrole!)! : '';

    // Look for a LATEX REPRESENTATION.
    const repStyles = this.view.screen.notebook.findStyles({ role: 'REPRESENTATION', type: 'TEX-EXPRESSION' }, style.id);
    let repStyle: StyleObject|undefined;
    if (repStyles.length > 0) {
      if (repStyles.length > 1) { console.warn("More than one REPRESENTATION/TEX-EXPRESSION styles found."); }
      repStyle = repStyles[0];
    } else { repStyle = undefined; }

    let html: Html|undefined
    if (repStyle) {
      let errorHtml: Html|undefined;
      // Render the formula data.
      const renderer = getRenderer(repStyle.type);
      ({ html, errorHtml } = renderer(repStyle.data));
      if (errorHtml) {
        html = `<div class="error">${errorHtml}</div><tt>${escapeHtml(style.data.toString())}</tt>`;
      }
    } else {
      html = "<i>No TeX representations for formula</i>";
    }

    // Render Wolfram evaluation if it exists.
    // REVIEW: Rendering evaluation annotations should probably be
    //         done separately from rendering the formula,
    //         but for now, for lack of a better place to put them,
    //         we are just appending the evaluation
    //         to the end of the formula.
    {
      const findOptions: FindStyleOptions = { role: 'EVALUATION', recursive: true };
      const evaluationStyles = this.view.screen.notebook.findStyles(findOptions, style.id);
      for (const evaluationStyle of evaluationStyles) {
        // HACK ALERT: We only take evaluations that are numbers:
        const evalStr = evaluationStyle.data.toString();
        if (/^\d+$/.test(evalStr)) {
          html += ` [=${evalStr}]`;
        }
      }
    }

    // Render list of equivalent styles, if there are any.
    // REVIEW: Rendering equivalency annotations should probably be
    //         done separately from rendering the formula,
    //         but for now, for lack of a better place to put them,
    //         we are just appending the list of equivalent formulas
    //         to the end of the formula.
    {
      const findOptions: FindRelationshipOptions = { fromId: style.id, toId: style.id, role: 'EQUIVALENCE' };
      const relationships = this.view.screen.notebook.findRelationships(findOptions);
      const equivalentStyleIds = relationships.map(r=>(r.toId!=style.id ? r.toId : r.fromId)).sort();
      if (equivalentStyleIds.length>0) {
        html += ` {${equivalentStyleIds.join(', ')}}`;
      }
    }

    this.$formula.innerHTML = html!;
  }

  public renderTools(tools: NotebookTools): void {
    super.renderTools(tools);
    tools.render(this.styleId);
  }

  // -- PRIVATE --

  // Constructor

  private constructor(notebookView: NotebookView, style: StyleObject) {
    super(notebookView, style, 'formulaCell');

    // Create our child elements: handle, status, formula, tools, and delete button.
    // REVIEW: Use $new above to create children declaratively.
    this.$prefix = $new({ tag: 'div', class: 'prefix', appendTo: this.$elt });
    this.$formula = $new({ tag: 'div', class: 'formula', appendTo: this.$elt });
    $new({ tag: 'div', class: 'handle', html: `(${style.id})`, appendTo: this.$elt });
    $new({ tag: 'div', class: 'status', html: "&nbsp;", appendTo: this.$elt });
  }

  // Private Instance Properties

  private $formula: HTMLDivElement;
  private $prefix: HTMLDivElement;

  // Private Instance Methods

}
