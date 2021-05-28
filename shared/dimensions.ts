/*
Euler Notebook
Copyright (C) 2021 Public Invention
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

import { CssLength, LengthInPixels } from "./css";

// Constants

// IMPORTANT: These are the defaults, but notebooks could have different page sizes, and users can resize cells,
//            so get the dimension from the notebook or cell rather than use the constant.

export const PAGE_WIDTH = <CssLength>'8.5in';
export const PAGE_HEIGHT = <CssLength>'11in';

export const LEFT_MARGIN = <CssLength>'1in';
export const TOP_MARGIN = <CssLength>'1in';
export const RIGHT_MARGIN = <CssLength>'1in';
export const BOTTOM_MARGIN = <CssLength>'1in';

export const FIGURE_CELL_HEIGHT = <CssLength>'3in';

export const FORMULA_CELL_HEIGHT = <CssLength>'1in';
export const FORMULA_INDENT = <CssLength>'0.5in';
export const FORMULA_NUMBER_INDENT = <CssLength>'0.5in'; // From right margin.

export const IMAGE_CELL_HEIGHT = <CssLength>'1.5in';

export const PLOT_CELL_HEIGHT = <CssLength>'3in';

export const TEXT_CELL_HEIGHT = <CssLength>'1in';

export const MINIMUM_CELL_HEIGHT: LengthInPixels = 12
