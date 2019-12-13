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

import { Config, Credentials } from '../config';
import { ServerNotebook } from '../server-notebook';

import { MathematicaObserver } from './mathematica-cas';
import { MyScriptObserver } from './myscript-observer';
import { SandboxObserver } from './sandbox';
import { SubtrivClassifierObserver } from './subtriv-classifier';
import { AlgebraicToolsObserver } from './algebraic-tools';
import { EquationSolverObserver } from './equation-solver';
import { TeXFormatterObserver } from './tex-formatter';
import { SymbolClassifierObserver } from './symbol-classifier';
import { SvgObserver } from './svg-observer';
import { WolframObserver } from './wolfram-cas';

// Exported functions

export async function initialize(config: Config, credentials: Credentials): Promise<void> {

  if (config.mathematica) {
    await MathematicaObserver.initialize(config);
    ServerNotebook.registerObserver('MATHEMATICA', MathematicaObserver);
    ServerNotebook.registerObserver('SUBTRIV-CLASSIFIER', SubtrivClassifierObserver);
    ServerNotebook.registerObserver('SYMBOL-CLASSIFIER', SymbolClassifierObserver);
    ServerNotebook.registerObserver('EQUATION-SOLVER', EquationSolverObserver);
    ServerNotebook.registerObserver('TEX-FORMATTER', TeXFormatterObserver);
    ServerNotebook.registerObserver('WOLFRAM', WolframObserver);
    ServerNotebook.registerObserver('ALGEBRAIC-TOOLS', AlgebraicToolsObserver);
  }
  if (credentials.myscript) {
    await MyScriptObserver.initialize(config, credentials.myscript);
    ServerNotebook.registerObserver('MYSCRIPT', MyScriptObserver);
  }
  await SandboxObserver.initialize(config);
  ServerNotebook.registerObserver('SANDBOX', SandboxObserver);
  ServerNotebook.registerObserver('SVG', SvgObserver);
}
