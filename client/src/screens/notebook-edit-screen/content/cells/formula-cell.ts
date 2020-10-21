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

import { CssClass, Html, assertFalse, assert } from "../../../../shared/common";
import { StyleObject, NotebookChange, StrokeData, StyleSubrole } from "../../../../shared/notebook";

import { $new, $newSvg, $outerSvg } from "../../../../dom";
import { Content as CellContainer } from "..";

import { CellBase, isDisplaySvgStyle, isInputStyle, isStrokeSvgStyle } from "./cell-base";
import { KeyboardPanel } from "../../../../components/keyboard-panel";
import { StrokePanel } from "../../../../components/stroke-panel";
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

  public constructor(container: CellContainer, rootStyle: StyleObject) {
    debug(`Creating instance: style ${rootStyle.id}`);

    const notebook = container.screen.notebook;
    const svgRepStyle = notebook.findStyle({ role: 'REPRESENTATION', type: 'SVG-MARKUP' }, rootStyle.id);
    const inputStyle = notebook.findStyle({ role: 'INPUT' }, rootStyle.id);

    const prefixHtml = rootStyle.subrole ? FORMULA_SUBROLE_PREFIX.get(rootStyle.subrole!)! : <Html>'';
    const $prefixPanel = $new({ tag: 'div', class: <CssClass>'prefixPanel', html: prefixHtml });

    // These two placeholders will be replaced, below.
    const $displayPanel = $newSvg<'svg'>({ tag: 'svg', class: <CssClass>'displayPanel', attrs: { height: '72pt' /* 1in */, width: '468pt' /* 6.5in */ }});
    const $editPanel = $new({ tag: 'div', class: <CssClass>'editPanel', html: <Html>"Placeholder" });

    const $handlePanel = $new({ tag: 'div', class: <CssClass>'handlePanel', html: <Html>`(${rootStyle.id})` });

    const $statusPanel = $new({ tag: 'div', class: <CssClass>'statusPanel', html: <Html>'&nbsp;' });

    const $content = $new({
      tag: 'div',
      classes: [ <CssClass>'content', <CssClass>'formulaCell' ],
      children: [
        $prefixPanel,
        $displayPanel,
        $editPanel,
        $handlePanel,
        $statusPanel,
      ]
    });

    super(container, rootStyle, $content);

    // this.$prefixPanel = $prefixPanel;
    this.$displayPanel = $displayPanel;
    this.$editPanel = $editPanel;

    this.replaceDisplayPanel(svgRepStyle);
    this.replaceEditPanel(inputStyle);
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
        if (isDisplaySvgStyle(changedStyle, this.styleId)) {
          this.updateDisplayPanel(change.type, changedStyle);
        } else if (isInputStyle(changedStyle, this.styleId)) {
          this.updateEditPanelData(change.type, changedStyle);
        } else if (isStrokeSvgStyle(changedStyle, this.styleId, this.container.screen.notebook)) {
          this.updateEditPanelDrawing(change.type, changedStyle);
        } else {
          // Ignore. Not something we are interested in.
        }
        break;
      }
      case 'styleConverted': {
        // Currently the styles that we use to update our display are never converted, so we
        // do not handle that case.
        const style = this.container.screen.notebook.getStyle(change.styleId);
        assert(!isDisplaySvgStyle(style, this.styleId));
        assert(!isInputStyle(style, this.styleId));
        assert(!isStrokeSvgStyle(style, this.styleId, this.container.screen.notebook));
        break;
      }
      case 'styleDeleted':
        // Styles relevant to display of the formula are only deleted when the entire formula is deleted,
        // so we can ignore styleDeleted messages.
        break;
      case 'styleMoved': assertFalse();
      default: assertFalse();
    }
  }

  public onChangesFinished(): void { /* Nothing to do. */ }

  // -- PRIVATE --

  // Private Instance Properties

  private $editPanel: HTMLDivElement;
  private $displayPanel: SVGSVGElement;
  // private $prefixPanel: HTMLDivElement;
  private keyboardPanel?: KeyboardPanel;
  private strokePanel?: StrokePanel;

  // Private Instance Methods

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

  private createKeyboardSubpanel(inputStyle: StyleObject): KeyboardPanel {
    return new KeyboardPanel(inputStyle.data, async (text: string)=>{
      const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: inputStyle.id, data: text };
      await this.container.screen.notebook.sendChangeRequest(changeRequest);
    });
  }

  private createStrokeSubpanel(inputStyle: StyleObject): StrokePanel {
    const svgRepStyle = this.container.screen.notebook.findStyle({ role: 'REPRESENTATION', type: 'SVG-MARKUP' }, inputStyle.id);
    const strokePanel = new StrokePanel(inputStyle.data, svgRepStyle?.data, async (strokeData: StrokeData)=>{
      const changeRequest: StyleChangeRequest = { type: 'changeStyle', styleId: inputStyle.id, data: strokeData };
      // TODO: We don't want to wait for *all* processing of the strokes to finish, just the svg update.
      // TODO: Incremental changes.
      await this.container.screen.notebook.sendChangeRequest(changeRequest);
    });
    return strokePanel;
  }

  private replaceDisplayPanel(svgRepStyle: StyleObject|undefined): void {
    let $newDisplayPanel: SVGSVGElement|undefined;
    if (svgRepStyle) {
      $newDisplayPanel = $outerSvg<'svg'>(svgRepStyle.data);
      this.$displayPanel.replaceWith($newDisplayPanel);
      this.$displayPanel = $newDisplayPanel;
    }
  }

  private replaceEditPanel(inputStyle: StyleObject|undefined): void {
    if (!inputStyle) {
      // No edit panel can be created yet because the root style doesn't have the necessary substyles yet,
      return;
    }

    let $newEditPanel: HTMLDivElement|undefined = undefined;
    switch(inputStyle.type) {
      case 'WOLFRAM-EXPRESSION':
        this.keyboardPanel = this.createKeyboardSubpanel(inputStyle);
        $newEditPanel = this.keyboardPanel.$elt;
        break;
      case 'STROKE-DATA': {
        this.strokePanel = this.createStrokeSubpanel(inputStyle);
        $newEditPanel = this.strokePanel.$elt;
        break;
      }
      default: assertFalse();
    }
    this.$editPanel.replaceWith($newEditPanel);
    this.$editPanel = $newEditPanel;
  }

  private updateEditPanelData(changeType: 'styleChanged'|'styleInserted', inputStyle: StyleObject): void {
    if (changeType == 'styleInserted') {
      assert(inputStyle.type == 'STROKE-DATA' || inputStyle.type == 'TEX-EXPRESSION' || inputStyle.type == 'WOLFRAM-EXPRESSION' );
      assert(!this.strokePanel && !this.keyboardPanel);
      this.replaceEditPanel(inputStyle);
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
    this.replaceDisplayPanel(svgRepStyle);
  }

  // Private Event Handlers

  protected onResize(deltaY: number, final: boolean): void {
    debug(`onResize: ${deltaY} ${final}`);
  }
}

// HELPER FUNCTIONS
