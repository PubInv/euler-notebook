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

import { initialize as initializeMathematicaCas } from './mathematica-cas';
import { initialize as initializeMathJsCas } from './mathjs-cas';
import { initialize as initializeMathStepsCas } from './math-steps-cas';
import { initialize as initializeQuadClassifier } from './quad-classifier';
import { initialize as initializeQuadPlotter } from './quad-plotter';
import { initialize as initializeSandbox } from './sandbox';
import { initialize as initializeSymbolClassifier } from './symbol-classifier';

// Exported functions

export async function initialize(config: Config): Promise<void> {
  await Promise.all([
    config.mathematica && initializeMathematicaCas(config),
    config.mathjs && initializeMathJsCas(config),
    config.mathsteps && initializeMathStepsCas(config),
    config.mathematica && initializeQuadClassifier(config),
    config.mathematica && initializeQuadPlotter(config),
    initializeSandbox(config),
    config.mathematica && initializeSymbolClassifier(config),
  ]);
}
