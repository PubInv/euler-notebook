
* Create a "setup" script that
(1) checks for existence of WolframScript and activated Wolfram Kernel,
(2) asks the user for their MyScript credentials,
(3) creates the credentials and configuration directory with the MyScript credentials filled in,
(4) creates the user notebook directory.
Update the README.md instructions.
* Ensure scripts/go degrades gracefully if (1) there is not credentials and configuration directory, (2) there are no MyScript credentials specified, (3) there is no notebook directory, (4) WolframScript is not installed, (5) Wolfram Kernel is not installed, (6) Wolfram Kernel is not activated.

* Formula equivalence thought. Implement MathJS/Mathematica simplification/solve tools that generate formula equivalence thoughts.
* Ability to select thoughts using the keyboard. Arrow up, arrow down, top, bottom, esc. to cancel selection, shift+arrow to extend selection
* Ability to edit an existing thought. Enter/double tap to start editing. Thought changed events.
* Index styles by the id of what they are attached to, so we can get the substyles efficiently.
* Ability to reorder thoughts with keyboard. option+arrow to move?
* Ability to input thoughts at any position. Insert at top, between any two thoughts, or at the bottom.
* Rewrite dispatch of notebook events. Use promises. Go in batches and rounds. Have timeouts and limits on the number of rounds. Have routing options.
* Unify web-client and observer interfaces: send and return a list of notebook changes. Make web-client just another observer.
* Ability to reorder thoughts with pointer. Drag/drop.
* Stylus-based editing of formulas.

* MyScript MathML to Wolfram conversion issues
* Socket and TDoc lifecycle
* Show original math handwriting in notebook if user wants
* Drawings
* Move notebooks and folders to trash folder instead of deleting them.
