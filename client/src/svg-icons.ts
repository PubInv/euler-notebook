/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

import { CellType } from "./shared/cell";
import { CssClass } from "./shared/css";
import { SvgMarkup } from "./shared/svg";

// Requirements

// Types

// Keep this list in sync with server/views/iconmonstr.pug.
export type SvgIconId =
  'iconMonstrArrow49' | 'iconMonstrArrow71' | 'iconMonstrArrow72' |'iconMonstrBook14' | 'iconMonstrBook17' |
  'iconMonstrBug12' | 'iconMonstrCalculator2' | 'iconMonstrCheckMark2' | 'iconMonstrCircle1' | 'iconMonstrClothing18' | 'iconMonstrCursor19' | 'iconMonstrEdit9Modified' |
  'iconMonstrEraser2' | 'iconMonstrFile5' | 'iconMonstrFile12' | 'iconMonstrFile15' | 'iconMonstrFolder2' |
  'iconMonstrFolder5' | 'iconMonstrFullScreen7' | 'iconMonstrGlobe3' | 'iconMonstrHome6' | 'iconMonstrInfo6' | 'iconMonstrMagnifier6' |
  'iconMonstrPencil9' | 'iconMonstrPhotoCamera5' | 'iconMonstrPicture1' | 'iconMonstrPrinter6' | 'iconMonstrRedo4' | 'iconMonstrRefresh2' |
  'iconMonstrRuler30' | 'iconMonstrText1' | 'iconMonstrTrashcan2' | 'iconMonstrUndo4' | 'iconMonstrUpload5' | 'iconMonstrUser1' | 'iconMonstrChart20' | 'iconMonstrXMark2' ;

type CssColor = "black" | "red"; // Lots more of course...

export enum IconSize {
  Small = 0,
  Medium,
  Large,
}

export interface SvgIconOptions {
  size?: IconSize;    // Defaults to IconSize.Medium.
  fill?: CssColor;
  stroke?: CssColor;
}

// Constants

const ICON_SIZE_CLASSES: CssClass[] = [
  <CssClass>'smallIcon',
  <CssClass>'mediumIcon',
  <CssClass>'largeIcon',
];

export const CELL_ICONS: Map<CellType, SvgIconId> = new Map([
  [ CellType.Figure,  'iconMonstrRuler30' ],
  [ CellType.Formula, 'iconMonstrCalculator2' ],
  [ CellType.Image,   'iconMonstrPicture1' ],
  [ CellType.Plot,    'iconMonstrChart20' ],
  [ CellType.Text,    'iconMonstrText1' ],
]);

// Exported Functions

export function largeSvgIcon(id: SvgIconId, options?: SvgIconOptions): SvgMarkup {
  const options2 = { ...options, size: IconSize.Large };
  return svgIcon(id, options2);
}

export function smallSvgIcon(id: SvgIconId, options?: SvgIconOptions): SvgMarkup {
  const options2 = { ...options, size: IconSize.Small };
  return svgIcon(id, options2);
}

export function svgIcon(id: SvgIconId, options?: SvgIconOptions): SvgMarkup {
  options = { size: IconSize.Medium, ...options };
  let attributes: string = `class="${ICON_SIZE_CLASSES[options.size!]}"`;
  if (options.fill) { attributes += ` fill=${options.fill}`; }
  if (options.stroke) { attributes += ` stroke=${options.stroke}`; }
  return <SvgMarkup>`<svg ${attributes}><use href="#${id}"/></svg>`
}

