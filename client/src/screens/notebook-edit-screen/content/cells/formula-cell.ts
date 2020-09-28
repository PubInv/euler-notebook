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

import * as debug1 from "debug";
const debug = debug1('client:formula-cell');

import { Html, assertFalse, assert } from "../../../../shared/common";
import { StyleId, StyleObject, NotebookChange, StrokeData, StyleSubrole } from "../../../../shared/notebook";

import { $new, $newSvg, $outerSvg, ElementClass } from "../../../../dom";
import { Content } from "..";

import { CellBase } from "./cell-base";
import { ClientNotebook } from "../../../../client-notebook";
import { KeyboardPanel } from "../../../../keyboard-panel";
import { StrokePanel } from "../../../../stroke-panel";
import { StyleChangeRequest } from "../../../../shared/math-tablet-api";

// Types

// Constants

const FORMULA_SUBROLE_PREFIX = new Map<StyleSubrole,Html>([
  // IMPORTANT: Keep in sync with FORMULA_SUBROLE_OPTIONS
  [ 'UNKNOWN', <Html>"<i>Unknown</i>&nbsp;" ],
  [ 'ASSUME', <Html>"<i>Assume</i>&nbsp;" ],
  [ 'DEFINITION', <Html>"<i>Definition</i>&nbsp;" ],
  [ 'PROVE', <Html>"<i>Prove </i>&nbsp;" ],
  [ 'OTHER', <Html>"<i>Other </i>&nbsp;" ],
]);

// Class

export class FormulaCell extends CellBase {

  // Public Class Methods

  // Public Constructor

  public constructor(view: Content, rootStyle: StyleObject) {
    debug(`Creating instance: style ${rootStyle.id}`);

    super(view, rootStyle, <ElementClass>'formulaCell', []);

    this.$prefixPanel = this.createPrefixPanel(rootStyle);
    this.$elt.appendChild(this.$prefixPanel);

    const notebook = view.screen.notebook;
    const svgRepStyle = notebook.findStyle({ role: 'REPRESENTATION', type: 'SVG-MARKUP' }, rootStyle.id);
    const inputStyle = notebook.findStyle({ role: 'INPUT' }, rootStyle.id);

    this.$displayPanel = this.createDisplayPanel(svgRepStyle);
    this.$elt.appendChild(this.$displayPanel);

    this.$editPanel = this.createEditPanel(inputStyle);
    this.$elt.appendChild(this.$editPanel);

    const $handlePanel = this.createHandlePanel(rootStyle);
    this.$elt.appendChild($handlePanel);

    const $statusPanel = this.createStatusPanel(rootStyle);
    this.$elt.appendChild($statusPanel);
  }

  // Public Instance Methods

  // ClientNotebookWatcher Methods

  public onChange(change: NotebookChange): void {
    debug(`onChange: cell ${this.styleId}, type ${change.type}`);
    // TODO: Changes that affect the prefix panel.

    // TODO: Do we deal with showing the Wolfram Evaluation values in the formula,
    //       and therefore deal with updating them here, or should we move their display to the tools panel?
    switch (change.type) {
      case 'relationshipDeleted':
      case 'relationshipInserted': {
        // TODO: Do we continue to show equivalent style relationships in the formula, and therefore deal with
        //       updating them here, or should we move their display to the tools panel?
        break;
      }
      case 'styleInserted':
      case 'styleChanged': {
        const changedStyle = change.style;
        if (isDisplayStyle(changedStyle, this.styleId)) {
          this.updateDisplayPanel(change.type, changedStyle);
        } else if (isInputStyle(changedStyle, this.styleId)) {
          this.updateEditPanelData(change.type, changedStyle);
        } else if (isStrokeSvgStyle(changedStyle, this.styleId, this.content.screen.notebook)) {
          this.updateEditPanelDrawing(change.type, changedStyle);
        } else {
          // Ignore. Not something we are interested in.
        }
        break;
      }
      case 'styleConverted': {
        // Currently the styles that we use to update our display are never converted, so we
        // do not handle that case.
        const style = this.content.screen.notebook.getStyle(change.styleId);
        assert(!isDisplayStyle(style, this.styleId));
        assert(!isInputStyle(style, this.styleId));
        assert(!isStrokeSvgStyle(style, this.styleId, this.content.screen.notebook));
        break;
      }
      case 'styleDeleted': {
        // Currently the styles that we use to update our display are never deleted, so we
        // do not handle that case.
        const style = change.style;
        assert(!isDisplayStyle(style, this.styleId));
        assert(!isInputStyle(style, this.styleId));
        assert(!isStrokeSvgStyle(style, this.styleId, this.content.screen.notebook));
        break;
      }
      case 'styleMoved':  assertFalse();
      default: assertFalse();
    }
  }

  public onChangesFinished(): void { /* Nothing to do. */ }

  // -- PRIVATE --

  // Private Instance Properties

  private $editPanel: HTMLDivElement;
  private $displayPanel: SVGSVGElement;
  private $prefixPanel: HTMLDivElement;
  private keyboardPanel?: KeyboardPanel;
  private strokePanel?: StrokePanel;

  // Private Instance Methods

  private createDisplayPanel(svgRepStyle: StyleObject|undefined): SVGSVGElement {
    let $svg: SVGSVGElement;
    if (svgRepStyle) {
      $svg = $outerSvg<'svg'>(svgRepStyle.data);
    } else {
      $svg = $newSvg<'svg'>({ tag: 'svg', class: <ElementClass>'displayPanel', attrs: { height: '72pt' /* 1in */, width: '468pt' /* 6.5in */ }});
    }
    return $svg;
  }

  private createEditPanel(inputStyle: StyleObject|undefined): HTMLDivElement {
    let errorHtml: Html|undefined;
    if (inputStyle) {
      switch(inputStyle.type) {
        case 'WOLFRAM-EXPRESSION':
          this.keyboardPanel = this.createKeyboardSubpanel(inputStyle);
          return this.keyboardPanel.$elt;
        case 'STROKE-DATA': {
          this.strokePanel = this.createStrokeSubpanel(inputStyle);
          return this.strokePanel.$elt;
        }
        default:
          errorHtml = <Html>`<i>Unknown formula input type '${inputStyle.type}'.`;
          break;
      }
    }
    // Either (1) No edit panel can be created yet because the root style doesn't have the necessary substyles yet,
    // or (2)
    // So, create a placeholder/error element instead.
    return $new({ tag: 'div', class: <ElementClass>'editPanel', html: errorHtml || <Html>"Placeholder", appendTo: this.$elt });
  }

  private createHandlePanel(style: StyleObject): HTMLDivElement {
    const html = <Html>`(${style.id})`;
    return $new({ tag: 'div', class: <ElementClass>'handlePanel', html });
  }

  private createKeyboardSubpanel(inputStyle: StyleObject): KeyboardPanel {
    return new KeyboardPanel(inputStyle.data, async (text: string)=>{
      const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: inputStyle.id, data: text };
      await this.content.screen.notebook.sendChangeRequest(changeRequest);
    });
  }

  private createPrefixPanel(style: StyleObject): HTMLDivElement {
    const html = style.subrole ? FORMULA_SUBROLE_PREFIX.get(style.subrole!)! : <Html>'';
    return $new({ tag: 'div', class: <ElementClass>'prefixPanel', html });
  }

  private createStatusPanel(_style: StyleObject): HTMLDivElement {
    const html = <Html>'&nbsp;';  // TODO: ???
    return $new({ tag: 'div', class: <ElementClass>'statusPanel', html, appendTo: this.$elt });
  }

  private createStrokeSubpanel(inputStyle: StyleObject): StrokePanel {
    const svgRepStyle = this.content.screen.notebook.findStyle({ role: 'REPRESENTATION', type: 'SVG-MARKUP' }, inputStyle.id);
    const strokePanel = new StrokePanel(inputStyle.data, svgRepStyle?.data, async (strokeData: StrokeData)=>{
      const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: inputStyle.id, data: strokeData };
      // TODO: We don't want to wait for *all* processing of the strokes to finish, just the svg update.
      // TODO: Incremental changes.
      await this.content.screen.notebook.sendChangeRequest(changeRequest);
    });
    return strokePanel;
  }

  // private formulaPanelHtml(notebook: ClientNotebook, rootStyleId: StyleId, texRepStyle: StyleObject): Html {
  //   let html: Html;
  //   // Render the formula data.
  //   const renderer = getRenderer(texRepStyle.type);
  //   const { html: contentHtml, errorHtml } = renderer(texRepStyle.data);
  //   if (!errorHtml) {
  //     html = contentHtml!;
  //   } else {
  //     html = <Html>`<div class="error">${errorHtml}</div><tt>${escapeHtml(texRepStyle.data.toString())}</tt>`;
  //   }

  //   // Render Wolfram evaluation if it exists.
  //   // REVIEW: Rendering evaluation annotations should probably be
  //   //         done separately from rendering the formula,
  //   //         but for now, for lack of a better place to put them,
  //   //         we are just appending the evaluation
  //   //         to the end of the formula.
  //   {
  //     const findOptions: FindStyleOptions = { role: 'EVALUATION', recursive: true };
  //     const evaluationStyles = notebook.findStyles(findOptions, rootStyleId);
  //     for (const evaluationStyle of evaluationStyles) {
  //       // HACK ALERT: We only take evaluations that are numbers:
  //       const evalStr = evaluationStyle.data.toString();
  //       if (/^\d+$/.test(evalStr)) {
  //         html = <Html>(html + ` [=${evalStr}]`);
  //       }
  //     }
  //   }

  //   // Render list of equivalent styles, if there are any.
  //   // REVIEW: Rendering equivalency annotations should probably be
  //   //         done separately from rendering the formula,
  //   //         but for now, for lack of a better place to put them,
  //   //         we are just appending the list of equivalent formulas
  //   //         to the end of the formula.
  //   {
  //     const findOptions: FindRelationshipOptions = { fromId: rootStyleId, toId: rootStyleId, role: 'EQUIVALENCE' };
  //     const relationships = notebook.findRelationships(findOptions);
  //     const equivalentStyleIds = relationships.map(r=>(r.toId!=rootStyleId ? r.toId : r.fromId)).sort();
  //     if (equivalentStyleIds.length>0) {
  //       html = <Html>(html + ` {${equivalentStyleIds.join(', ')}}`);
  //     }
  //   }

  //   return html;
  // }

  private updateEditPanelData(changeType: 'styleChanged'|'styleInserted', inputStyle: StyleObject): void {
    if (changeType == 'styleInserted') {
      assert(inputStyle.type == 'STROKE-DATA' || inputStyle.type == 'TEX-EXPRESSION' || inputStyle.type == 'WOLFRAM-EXPRESSION' );
      assert(!this.strokePanel && !this.keyboardPanel);
      const $newEditPanel = this.createEditPanel(inputStyle);
      this.$editPanel.replaceWith($newEditPanel);
      this.$editPanel = $newEditPanel;
    } else {
      // 'styleChanged'
      switch(inputStyle.type) {
        case 'STROKE-DATA':
          assert(this.strokePanel);
          this.strokePanel!.updateStrokeData(inputStyle.data);
          break;
        case 'TEX-EXPRESSION':
        case 'WOLFRAM-EXPRESSION':
          assert(this.keyboardPanel);
          this.keyboardPanel!.updateText(inputStyle.data);
          break;
        default: assertFalse();
      }
    }
  }

  private updateEditPanelDrawing(_changeType: 'styleChanged'|'styleInserted', svgRepStyle: StyleObject): void {
    assert(this.strokePanel);
    this.strokePanel!.updateSvgMarkup(svgRepStyle.data);
  }

  private updateDisplayPanel(_changeType: 'styleChanged'|'styleInserted', svgRepStyle: StyleObject): void {
    const $newFormulaPanel = this.createDisplayPanel(svgRepStyle);
    this.$displayPanel.replaceWith($newFormulaPanel);
    this.$displayPanel = $newFormulaPanel;
  }

  // Private Event Handlers

}

// HELPER FUNCTIONS

function isDisplayStyle(style: StyleObject, parentId: StyleId): boolean {
  return style.role == 'REPRESENTATION' && style.type == 'SVG-MARKUP' && style.parentId == parentId;
}

function isInputStyle(style: StyleObject, parentId: StyleId): boolean {
  return style.role == 'INPUT' && style.parentId == parentId;
}

function isStrokeSvgStyle(style: StyleObject, parentId: StyleId, notebook: ClientNotebook): boolean {
  let rval = false;
  if (style.role == 'REPRESENTATION' && style.type == 'SVG-MARKUP' && style.parentId != parentId) {
    const parentStyle = notebook.getStyle(style.parentId);
    if (parentStyle.role == 'INPUT' && parentStyle.type == 'STROKE-DATA' && parentStyle.parentId == parentId) {
      rval = true;
    }
  }
  return rval;
}
