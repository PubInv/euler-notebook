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

import { escapeHtml } from "../../../../dom"
import { StyleObject, HintData, HintStatus, HintRelationship } from "../../../../shared/notebook"
import { Content } from ".."
// import { getRenderer } from "../renderers"

import { CellView } from "./index"

// Types

// Constants

// Class

export class HintCellView extends CellView {

  // Class Methods

  public static create(notebookView: Content, style: StyleObject): HintCellView {
    const instance = new this(notebookView, style);
    instance.render(style);
    return instance;
  }

  // Instance Methods

  public render(style: StyleObject): void {
    // TODO: If hint cell is moved then it needs to be re-rendered.
    const repStyle = this.view.screen.notebook.findStyle({ role: 'INPUT' }, style.id);
    if (!repStyle) {
      // TODO: Better way to handle this error.
      this.$elt.innerHTML = "ERROR: No REPRESENTATION/INPUT substyle.";
      return;
    }

    const hintData = <HintData>style.data;
    let relationshipMark: string;
    let statusMark: string;

    if (typeof hintData === 'string' || hintData instanceof String) {
      relationshipMark = "???";
      statusMark = '<b style="color:blue"><i>?</i></b> ';
    } else {

      switch(hintData.relationship) {
        case HintRelationship.Unknown: relationshipMark = ""; break;
        case HintRelationship.Equivalent: relationshipMark = "&#x2261 "; break;
        case HintRelationship.NotEquivalent: relationshipMark = "&#x2262 "; break;
        case HintRelationship.Implies: relationshipMark = "&#x221D2 "; break;
        case HintRelationship.ImpliedBy: relationshipMark = "&#x21D0 "; break;
        default: throw new Error('Unexpected relationship:'+ hintData.relationship);
      }

      if (hintData.relationship == HintRelationship.Unknown) {
        statusMark = '';
      } else {
        switch(hintData.status) {
          case HintStatus.Unknown: statusMark = '<b style="color:blue"><i>?</i></b> '; break;
          case HintStatus.Correct: statusMark = '<span style="color:green">&#x2714;</span> '; break;
          case HintStatus.Incorrect: statusMark = '<span style="color:red">&#x2718;</span> '; break;
          default: throw new Error('Unexpected status:'+hintData.status);
        }
      }
    }
    let innerHtml = `${relationshipMark}${statusMark}<i>${escapeHtml(repStyle.data||'blank')}</i> `;
    const precedingStyleId = this.view.screen.notebook.precedingStyleId(style.id);
    const hintedRelId : number | undefined = hintData.idOfRelationshipDecorated;
    if (hintedRelId) {
      const hintedRel = this.view.screen.notebook.getRelationship(hintedRelId);
      const afterFrom = (precedingStyleId == hintedRel.fromId);
      const followingStyleId = this.view.screen.notebook.followingStyleId(style.id);
      const beforeTo = (followingStyleId == hintedRel.toId);
      const inBetween =  afterFrom && beforeTo;
      if (!inBetween) {
        innerHtml =  `${innerHtml}: ${hintedRel.fromId} &#x290F; ${hintedRel.toId}`;
      }
    }
    this.$elt.innerHTML = innerHtml;
  }

  // -- PRIVATE --

  // Constructor

  private constructor(notebookView: Content, style: StyleObject) {
    super(notebookView, style, 'hintCell');
  }
}
