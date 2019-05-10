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

import { $new, Html } from './dom.js';
import { RelationshipObject } from './math-tablet-api.js';

// Types

// Constants

// Exported Class

export class RelationshipElement {

  // Class Methods

  static insert($parent: HTMLElement, relationship: RelationshipObject): RelationshipElement {
    var rval = new this(relationship);
    $parent.appendChild(rval.$elt);
    return rval;
  }

  // Instance Methods

  delete(): void {
    const $parent = this.$elt.parentElement;
    if (!$parent) { throw new Error("Relationship element has no parent in delete."); }
    $parent.removeChild(this.$elt);
  }

  // PRIVATE

  // Private Constructor

  private constructor(relationship: RelationshipObject) {
    const id = `R${relationship.id}`;
    const classes = ['relationship' /* relationship.meaning? */ ];
    // const showButtonHtml: Html = `<button class="showStyle">&#x1F5E8;</button>`;
    const html: Html = `<div class="header">R-${relationship.id} ${relationship.meaning} => ${relationship.targetId}</div>`;
    this.$elt = $new<HTMLDivElement>('div', id, classes, html);
  }

  // Private Instance Properties

  private $elt: HTMLDivElement;

}
