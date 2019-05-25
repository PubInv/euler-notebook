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

import { RelationshipObject } from './math-tablet-api.js';

// Types

// Constants

// Exported Class

export class RelationshipElement {

  // Class Methods

  static insert(relationship: RelationshipObject): RelationshipElement {
   return new this(relationship);
  }

  // Instance Properties

  public relationship: RelationshipObject;

  // Instance Methods

  // PRIVATE

  // Private Constructor

  private constructor(relationship: RelationshipObject) {
    this.relationship = relationship;
  }

  // Private Instance Properties


}
