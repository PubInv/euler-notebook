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

import { assert } from "./common";

// Types

type Path = string;

export interface OpenOptions<W extends Watcher> {
  mustExist?: boolean;
  mustNotExist?: boolean;
  watcher?: W;
}

export interface Watcher {
  onClosed(reason: string): void;
}

// Exported Function

export abstract class WatchedResource<P extends Path, W extends Watcher> {

  // Public Class Properties

  public static isOpen(path: Path): boolean {
    return this.instanceMap.has(path);
  }

  // Public Class Methods

  public static close(path: Path, reason: string): boolean {
    // Closes the specified resource.
    // All watchers are notified.
    // Has no effect if the resource is not open.
    // Returns true iff the resource was open.
    if (this.isOpen(path)) {
      const instance = this.getInstance(path);
      instance.terminate(reason);
      return true;
    } else {
      return false;
    }
  }

  public static closeAll(reason: string): void {
    // REVIEW: Prevent new resouces from being opened while we are closing all existing ones?
    // LATER: Close in parallel?
    for (const instance of this.instanceMap.values()) {
      instance.terminate(reason);
    }
  }

  // Public Instance Properties

  public path: P;

  // Public Instance Methods

  public close(watcher?: Watcher): void {
    assert(!this.terminated);
    const instance = WatchedResource.getInstance(this.path);
    if (watcher) {
      const had = instance.watchers.delete(watcher);
      assert(had);
    }
    if (--instance.openTally == 0) {
      // LATER: Set timer to destroy in the future.
      this.terminate("Closed by all clients");
    }
  }

  // Private Class Properties

  private static instanceMap: Map<Path, WatchedResource<Path, Watcher>> = new Map();

  // Private Class Property Functions

  protected static getInstance(path: Path): WatchedResource<Path, Watcher> {
    const instance = this.instanceMap.get(path)!;
    assert(instance);
    return instance;
  }

  protected static setInstance(path: Path, instance: WatchedResource<Path, Watcher>): void {
    assert(!this.instanceMap.has(path));
    this.instanceMap.set(path, instance);
  }

  // Private Class Methods

  // Private Constructor

  protected constructor(path: P) {
    this.path = path;
    this.openTally = 0;
    this.watchers = new Set();
  }

  // Private Instance Properties

  // DO NOT USE THESE. For internal use only.
  private openTally: number;
  protected openPromise!: Promise<this>;
  protected watchers: Set<W>; // REVIEW: Make private and provide enumerator?

  // LATER: busyPromise.
  protected initialized?: boolean;
  protected terminated?: boolean;

  // Private Overridable Instance Methods

  protected abstract async initialize(_options: OpenOptions<W>): Promise<void>;

  protected terminate(reason: string): void {
    assert(this.initialized);
    assert(!this.terminated);
    this.terminated = true;
    const had = WatchedResource.instanceMap.delete(this.path);
    assert(had);
    for (const watcher of this.watchers) { watcher.onClosed(reason); }
  };

  // Private Instance Methods

  protected open(options: OpenOptions<W>, isOpen: boolean): void {
    if (!isOpen) {
      WatchedResource.setInstance(this.path, this);
      this.openPromise = this.initialize(options).then(
        ()=>{
          this.initialized = true;
          return this;
        }
      );
    }
    assert(options.mustExist || options.mustNotExist);
    assert(!isOpen || !options.mustNotExist); // LATER: Throw exception with useful error message.
    this.openTally++;
    if (options.watcher) { this.watchers.add(options.watcher); }
  }
}
