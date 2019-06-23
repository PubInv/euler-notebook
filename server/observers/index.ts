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

import { Config } from '../config';

import { MathematicaObserver } from './mathematica-cas';
import { MathJsObserver } from './mathjs-cas';
import { MathStepsObserver } from './mathsteps-cas';
import { SandboxObserver } from './sandbox';
import { SubtrivClassifierObserver } from './subtriv-classifier';
import { SymbolClassifierObserver } from './symbol-classifier';
import { ServerNotebook } from '../server-notebook';

// Exported functions

export async function initialize(config: Config): Promise<void> {

  if (config.mathematica) {
    await MathematicaObserver.initialize(config);
    ServerNotebook.registerObserver('MATHEMATICA', MathematicaObserver);
    ServerNotebook.registerObserver('SUBTRIV-CLASSIFIER', SubtrivClassifierObserver);
    ServerNotebook.registerObserver('SYMBOL-CLASSIFIER', SymbolClassifierObserver);
  }
  if (config.mathjs) {
    await MathJsObserver.initialize(config);
    ServerNotebook.registerObserver('MATHJS', MathJsObserver);
  }
  if (config.mathsteps) {
    await MathStepsObserver.initialize(config);
    ServerNotebook.registerObserver('MATHSTEPS', MathStepsObserver);
  }
  await SandboxObserver.initialize(config);
  ServerNotebook.registerObserver('SANDBOX', SandboxObserver);
}
