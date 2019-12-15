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

import { configure, escapeHtml, Html } from './dom.js';
import { OpenNotebook } from './open-notebook.js';
import { RelationshipObject, StyleObject } from './notebook.js';
import { Header } from './header.js';

// Types

// Constants

// Global Variables

// Class

export class DebugPopup {

  // Class Methods

  public static attach($elt: HTMLDivElement): DebugPopup {
    return new this($elt);
  }

  // Instance Methods

  public connect(header: Header, openNotebook: OpenNotebook): void {
    this.header = header;
    this.openNotebook = openNotebook;
  }

  public hide(): void {
    this.$content.innerHTML = '';
    this.$elt.style.display = 'none';
  }

  public show(): void {
    this.$content.innerHTML = this.renderHtml();
    this.$elt.style.display = 'block';
  }

  // -- PRIVATE --

  // Constructor

  private constructor($elt: HTMLDivElement) {
    this.$elt = $elt;
    this.$closeButton = $elt.querySelector<HTMLButtonElement>('.close')!;
    this.$content = $elt.querySelector<HTMLDivElement>('.content')!;

    configure(this.$content, { listeners: { 'click': e=>this.onContentClick(e) }});
    configure(this.$closeButton, { listeners: { 'click': e=> this.onCloseClick(e) }});
  }

  // Private Instance Properties

  private $elt: HTMLDivElement;
  private $content: HTMLDivElement;
  private $closeButton: HTMLButtonElement;

  private header!: Header;
  private openNotebook!: OpenNotebook

  // Private Instance Property Functions

  // Private Instance Methods

  private renderHtml(): Html {
    return this.openNotebook.topLevelStyleOrder()
    .map(styleId=>{
      const style = this.openNotebook.getStyleById(styleId);
      return this.renderStyleHtml(style);
    })
    .join('');
  }

  private renderRelationshipHtml(relationship: RelationshipObject): Html {
    return `<div><span class="leaf">R${relationship.id} ${relationship.fromId} &#x27a1; ${relationship.toId} ${relationship.role}</span></div>`;
  }

  private renderStyleHtml(style: StyleObject): Html {
    // TODO: This is very inefficient as notebook.childStylesOf goes through *all* styles.
    const childStyleObjects = this.openNotebook.childStylesOf(style.id);
    // TODO: This is very inefficient as notebook.relationshipOf goes through *all* relationships.
    const relationshipObjects = this.openNotebook.relationshipsOf(style.id);
    const json = escapeHtml(JSON.stringify(style.data));
    const roleSubrole = (style.subrole ? `${style.role}|${style.subrole}` : style.role);
    const styleInfo = `S${style.id} ${roleSubrole} ${style.type} ${style.source}`
    if (childStyleObjects.length == 0 && relationshipObjects.length == 0 && json.length<30) {
      return `<div><span class="leaf">${styleInfo} <tt>${json}</tt></span></div>`;
    } else {
      const stylesHtml = childStyleObjects.map(s=>this.renderStyleHtml(s)).join('');
      const relationshipsHtml = relationshipObjects.map(r=>this.renderRelationshipHtml(r)).join('');
      const [ shortJsonTt, longJsonTt ] = json.length<30 ? [` <tt>${json}</tt>`, ''] : [ '', `<tt>${json}</tt>` ];
      return `<div>
  <span class="collapsed">${styleInfo}${shortJsonTt}</span>
  <div class="nested" style="display:none">${longJsonTt}
    ${stylesHtml}
    ${relationshipsHtml}
  </div>
</div>`;
    }
  }

  // Private Event Handlers

  private onCloseClick(_event: MouseEvent): void {
    this.hide();
    this.header.enableDebugButton(true);
  }

  private onContentClick(event: MouseEvent): void {
    const $target: HTMLElement = <HTMLElement>event.target;
    if ($target.tagName == 'SPAN') {
      if ($target.classList.contains('collapsed')) {
        (<HTMLElement>$target.nextElementSibling).style.display = 'block';
        $target.classList.remove('collapsed');
        $target.classList.add('expanded');
      } else if ($target.classList.contains('expanded')) {
        (<HTMLElement>$target.nextElementSibling).style.display = 'none';
        $target.classList.remove('expanded');
        $target.classList.add('collapsed');
      }
    }
  }

}
