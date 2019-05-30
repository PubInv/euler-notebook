
* Formula equivalence thought. Implement MathJS/Mathematica simplification/solve tools that generate formula equivalence thoughts.
* Ability to select thoughts using the keyboard. Arrow up, arrow down, top, bottom, esc. to cancel selection, shift+arrow to extend selection
* Ability to edit an existing thought. Enter/double tap to start editing. Thought changed events.
* More efficient TDoc data structures: object mapping IDs to thoughts, styles, relationships. Linked list of IDs to order thoughts?
* Ability to reorder thoughts with keyboard. option+arrow to move?
* Ability to reorder thoughts with pointer. Drag/drop.
* Rewrite dispatch of notebook events. Use promises. Go in batches and rounds. Have timeouts and limits on the number of rounds. Have routing options.
* Unify web-client and observer interfaces: send and return a list of notebook changes. Make web-client just another observer.

* MyScript MathML to Wolfram conversion issues
* Socket and TDoc lifecycle
* Show original math handwriting in notebook if user wants
* Drawings
* Ordering/positioning of thoughts
* Draggable/zoomable canvas
* Move notebooks and folders to trash folder instead of deleting them.
