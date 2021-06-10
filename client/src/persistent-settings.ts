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

// TODO: Handle case where user disallows camera.
// TODO: Cancel camera button.

// Requirements

import { StylusMode } from "./screens/notebook-edit-screen/notebook-edit-view/cell-edit-view/stroke-panel";
import { CellType } from "./shared/cell";

// Types

type StorageKey = '{StorageKey}';

// REVIEW: Do these belong somewhere else?
export type MediaDeviceId = '{MediaDeviceId}';
type UsedCameras = MediaDeviceId[];


// Constants

const INSERT_MODE_KEY = <StorageKey>'insertMode';
const STYLUS_MODE_KEY = <StorageKey>'stylusMode';
const USED_CAMERAS_KEY = <StorageKey>'usedCameras';

// Exported Class

export class PersistentSettings {

  // Public Class Property Functions

  public static get insertMode(): CellType {
    return this.getObject<CellType>(INSERT_MODE_KEY) || CellType.Formula;
  }

  public static set insertMode(value: CellType) {
    this.setObject<CellType>(INSERT_MODE_KEY, value);
  }

  public static get stylusMode(): StylusMode {
    return this.getObject<StylusMode>(STYLUS_MODE_KEY) || StylusMode.Draw;
  }

  public static set stylusMode(value: StylusMode) {
    this.setObject<StylusMode>(STYLUS_MODE_KEY, value);
  }

  public static get usedCameras(): UsedCameras {
    return this.getObject<UsedCameras>(USED_CAMERAS_KEY) || [];
  }

  public static set usedCameras(value: UsedCameras) {
    this.setObject<UsedCameras>(USED_CAMERAS_KEY, value);
  }

  // --- PRIVATE ---

  // Private Class Property Functions

  private static getObject<T>(key: StorageKey): T|undefined {
    const json = window.localStorage.getItem(key);
    if (!json) { return undefined; }
    const rval = <T>JSON.parse(json);
    return rval;
  }

  private static setObject<T>(key: StorageKey, obj: T): void {
    const json = JSON.stringify(obj);
    window.localStorage.setItem(key, json);
  }
}
