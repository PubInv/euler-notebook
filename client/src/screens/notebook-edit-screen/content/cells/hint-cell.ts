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
const debug = debug1('client:hint-cell');

import { CssClass } from "../../../../shared/common";
import { StyleObject, /* HintData, HintStatus, HintRelationship, */ NotebookChange } from "../../../../shared/notebook";

import { $new } from "../../../../dom";
import { Content } from "../index";

import { CellBase } from "./cell-base";
import { Html } from "../../../../shared/common";

// Types

// Constants

// Class

export class HintCell extends CellBase {

  // Public Class Methods

  // Public Constructor

  public constructor(container: Content, style: StyleObject) {

    const $tempPlaceholder = $new<'div'>({ tag: 'div', class: <CssClass>'hintCell', html: <Html>"<i>Not implemented</i>" });
    super(container, style,  $tempPlaceholder);
    // this.render(style);
  }

  // Public Instance Methods


  // ClientNotebookWatcher Methods

  public onChange(change: NotebookChange): void {
    debug(`Hint cell received change: ${this.styleId} ${JSON.stringify(change)}`);
    // TODO: update rendering?
  }

  public onChangesFinished(): void {}

  // -- PRIVATE --

  // Private Instance Methods

  // private render(style: StyleObject): void {
  //   // TODO: If hint cell is moved then it needs to be re-rendered.
  //   const repStyle = this.container.screen.notebook.findStyle({ role: 'INPUT' }, style.id);
  //   if (!repStyle) {
  //     // TODO: Better way to handle this error.
  //     this.$elt.innerHTML = "ERROR: No REPRESENTATION/INPUT substyle.";
  //     return;
  //   }

  //   const hintData = <HintData>style.data;
  //   let relationshipMark: string;
  //   let statusMark: string;

  //   if (typeof hintData === 'string' || hintData instanceof String) {
  //     relationshipMark = "???";
  //     statusMark = '<b style="color:blue"><i>?</i></b> ';
  //   } else {

  //     // TODO: Use ..._ENTITY constants from dom.ts.
  //     switch(hintData.relationship) {
  //       case HintRelationship.Unknown: relationshipMark = ""; break;
  //       case HintRelationship.Equivalent: relationshipMark = "&#x2261 "; break;
  //       case HintRelationship.NotEquivalent: relationshipMark = "&#x2262 "; break;
  //       case HintRelationship.Implies: relationshipMark = "&#x221D2 "; break;
  //       case HintRelationship.ImpliedBy: relationshipMark = "&#x21D0 "; break;
  //       default: assertFalse();
  //     }

  //     if (hintData.relationship == HintRelationship.Unknown) {
  //       statusMark = '';
  //     } else {
  //       // TODO: Use ..._ENTITY constants from dom.ts.
  //       switch(hintData.status) {
  //         case HintStatus.Unknown: statusMark = '<b style="color:blue"><i>?</i></b> '; break;
  //         case HintStatus.Correct: statusMark = '<span style="color:green">&#x2714;</span> '; break;
  //         case HintStatus.Incorrect: statusMark = '<span style="color:red">&#x2718;</span> '; break;
  //         default: assertFalse();
  //       }
  //     }
  //   }
  //   let innerHtml = `${relationshipMark}${statusMark}<i>${escapeHtml(repStyle.data||'blank')}</i> `;
  //   const precedingStyleId = this.container.screen.notebook.precedingStyleId(style.id);
  //   const hintedRelId : number | undefined = hintData.idOfRelationshipDecorated;
  //   if (hintedRelId) {
  //     const hintedRel = this.container.screen.notebook.getRelationship(hintedRelId);
  //     const afterFrom = (precedingStyleId == hintedRel.fromId);
  //     const followingStyleId = this.container.screen.notebook.followingStyleId(style.id);
  //     const beforeTo = (followingStyleId == hintedRel.toId);
  //     const inBetween =  afterFrom && beforeTo;
  //     if (!inBetween) {
  //       innerHtml =  `${innerHtml}: ${hintedRel.fromId} &#x290F; ${hintedRel.toId}`;
  //     }
  //   }
  //   this.$elt.innerHTML = innerHtml;
  // }

  protected onResize(deltaY: number, final: boolean): void {
    debug(`onResize: ${deltaY} ${final}`);
  }
}
