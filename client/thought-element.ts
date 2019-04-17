
// Requirements

import { $new, Html } from './dom.js';
import { StyleObject, ThoughtObject } from './math-tablet-api.js';
import { StyleElement } from './style-element.js';

// Exported Class

export class ThoughtElement {

  // Class Methods

  static insert($tDoc: HTMLElement, thought: ThoughtObject): ThoughtElement {
    var rval = new this(thought);
    $tDoc.appendChild(rval.$elt);
    return rval;
  }

  // Instance Methods

  insertStyle(style: StyleObject): StyleElement {
    return StyleElement.insert(this.$elt, style);
  }

  // PRIVATE

  // Private Constructor

  private constructor(thought: ThoughtObject) {
    const id = `S${thought.id}`;
    const classes = ['thought'];
    const html: Html = `<div class="thoughtId">T-${thought.id}</div>`;
    this.$elt = $new<HTMLDivElement>('div', id, classes, html);
  }

  // Private Instance Properties
  
  private $elt: HTMLDivElement;

}