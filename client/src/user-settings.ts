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

import { assert } from "./shared/common";

// Types

export type MathKeyboardInputFormat = 'TEX-EXPRESSION'|'WOLFRAM-EXPRESSION'; // Subset of StyleType.

// Class

class UserSettings {

  public get defaultMathKeyboardInputFormat(): MathKeyboardInputFormat {
    return <MathKeyboardInputFormat|undefined>window.localStorage.getItem('mathKeyboardInputFormat') || 'WOLFRAM-EXPRESSION';
  }

  public set defaultMathKeyboardInputFormat(value: MathKeyboardInputFormat) {
    assert(value == 'TEX-EXPRESSION' || value == 'WOLFRAM-EXPRESSION');
    window.localStorage.setItem('mathKeyboardInputFormat', value);
  }

}

// Exported instance

export const userSettingsInstance = new UserSettings();