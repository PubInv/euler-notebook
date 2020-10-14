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

import { Config, Credentials } from "../config";
import { ServerNotebook } from "../server-notebook";

import { AlgebraicDataflowObserver } from "./algebraic-dataflow-observer";
import { AlgebraicToolsObserver } from "./algebraic-tools";
import { EquationSolverObserver } from "./equation-solver";
import { TexObserver } from "./tex-observer";
import { MathematicaObserver } from "./mathematica-cas";
import { MyScriptObserver } from "./myscript-observer";
import { RepresentationObserver } from "./system-observer";
import { SandboxObserver } from "./sandbox";
import { SubtrivClassifierObserver } from "./subtriv-classifier";
import { SymbolClassifierObserver } from "./symbol-classifier";
// REVIEW: import { SymbolTableObserver } from "./symbol-table";
import { TeXFormatterObserver } from "./tex-formatter";
import { WolframObserver } from "./wolfram-observer";

// Globals

let initializing: boolean = false;
let initialized: boolean = false;
let useMathematica: boolean = false;
let useMyScript: boolean = false;

// Exported functions

export async function initialize(config: Config, credentials: Credentials): Promise<void> {

  if (initializing) { throw new Error("Observer initialize called while initializing."); }
  if (initialized) {
    console.warn("Observer initialize called multiple times.");
    return;
  }

  initializing = true;

  // IMPORTANT: Keep in sync with 'terminate'
  ServerNotebook.registerObserver('SYSTEM', RepresentationObserver);
  useMathematica = !!config.mathematica;
  if (useMathematica) {
    await MathematicaObserver.initialize(config);
    ServerNotebook.registerObserver('ALGEBRAIC-DATAFLOW-OBSERVER', AlgebraicDataflowObserver);
    ServerNotebook.registerObserver('MATHEMATICA', MathematicaObserver);
    ServerNotebook.registerObserver('SUBTRIV-CLASSIFIER', SubtrivClassifierObserver);
    ServerNotebook.registerObserver('SYMBOL-CLASSIFIER', SymbolClassifierObserver);
    // REVIEW: ServerNotebook.registerObserver('SYMBOL-TABLE', SymbolTableObserver);
    ServerNotebook.registerObserver('EQUATION-SOLVER', EquationSolverObserver);
    ServerNotebook.registerObserver('TEX-FORMATTER', TeXFormatterObserver);
    ServerNotebook.registerObserver('WOLFRAM-OBSERVER', WolframObserver);
    ServerNotebook.registerObserver('ALGEBRAIC-TOOLS', AlgebraicToolsObserver);
  }
  useMyScript = !!credentials.myscript;
  if (useMyScript) {
    await MyScriptObserver.initialize(config, credentials.myscript);
    ServerNotebook.registerObserver('MYSCRIPT', MyScriptObserver);
  }
  ServerNotebook.registerObserver('TEX-OBSERVER', TexObserver);
  await SandboxObserver.initialize(config);
  ServerNotebook.registerObserver('SANDBOX', SandboxObserver);

  initializing = false;
  initialized = true;
}

export function terminate(): void {

  if (!initialized) { throw new Error("Observer terminate called when not initialized."); }

  // IMPORTANT: Keep in sync with 'initialize'
  ServerNotebook.deregisterObserver('SYSTEM');
  if (useMathematica) {
    ServerNotebook.deregisterObserver('ALGEBRAIC-DATAFLOW-OBSERVER');
    ServerNotebook.deregisterObserver('MATHEMATICA');
    ServerNotebook.deregisterObserver('SUBTRIV-CLASSIFIER');
    ServerNotebook.deregisterObserver('SYMBOL-CLASSIFIER');
    ServerNotebook.deregisterObserver('SYMBOL-TABLE');
    ServerNotebook.deregisterObserver('EQUATION-SOLVER');
    ServerNotebook.deregisterObserver('TEX-FORMATTER');
    ServerNotebook.deregisterObserver('MATHJAX-OBSERVER');
    ServerNotebook.deregisterObserver('WOLFRAM-OBSERVER');
    ServerNotebook.deregisterObserver('ALGEBRAIC-TOOLS');
  }
  if (useMyScript) {
    ServerNotebook.deregisterObserver('MYSCRIPT');
  }
  ServerNotebook.deregisterObserver('TEX-OBSERVER');
  ServerNotebook.deregisterObserver('SANDBOX');

  initialized = false;
}
