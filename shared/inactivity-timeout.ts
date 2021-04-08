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

import { assert, Milliseconds, Timestamp } from "./common";

// Requirements

// Types

type InactivityCallback = ()=>Promise<void>;

// Constants

// Global Variables

// Exported Class

export class InactivityTimeout {

  // Public Class Properties
  // Public Class Property Functions
  // Public Class Methods
  // Public Class Event Handlers

  // Public Constructor

  public constructor(interval: Milliseconds, callback: InactivityCallback) {
    this.interval = interval;
    this.callback = callback;
  }

  // Public Instance Properties
  // Public Instance Property Functions

  public get isRunning(): boolean { return !!this.timeoutId; }

  // Public Instance Methods

  public postpone(): void {
    this.stop();
    this.start();
  }

  public start(intervalOverride?: Milliseconds): void {
    assert(!this.isRunning);
    if (this.callbackPromise) {
      // console.log(`Starting timeout when callback running.`);
      this.startedDuringCallbackAt = Date.now();
    } else {
      const interval = (typeof intervalOverride == 'number' ? intervalOverride : this.interval);
      // console.log(`Starting timeout timer: ${interval}ms`);
      this.timeoutId = setTimeout(()=>this.onTimeoutExpired(), interval);
    }
  }

  public startOrPostpone(): void {
    if (!this.isRunning) { this.start() }
    else { this.postpone(); }
  }

  public stop(): void {
    // console.log(`Stopping timeout.`);
    assert(this.isRunning);
    clearTimeout(this.timeoutId);
    delete this.timeoutId;
  }

  // Public Instance Event Handlers

  // --- PRIVATE ---

  // Private Class Properties
  // Private Class Property Functions

  // Private Class Methods

  // Private Class Event Handlers

  private onTimeoutExpired() {
    // console.log(`Timeout expired.`);
    delete this.timeoutId;
    this.callbackPromise = this.callback().finally(()=>{
      // console.log(`Timeout callback finished.`)
      delete this.callbackPromise;
      if (this.startedDuringCallbackAt) {
        const elapsed = Date.now() - this.startedDuringCallbackAt;
        delete this.startedDuringCallbackAt;
        const interval = Math.max(this.interval - elapsed, 0);
        // console.log(`Resuming timer: ${interval}ms`);
        this.start(interval);
      }
    }).catch(err=>{
      // TODO: How to log errors properly on server and client?
      console.error(`Error in inactivity-timeout callback.`);
      console.dir(err);
    });
  }

  // Private Instance Properties

  private callback: InactivityCallback;
  private callbackPromise?: Promise<void>;
  private interval: Milliseconds;
  private startedDuringCallbackAt?: Timestamp;
  private timeoutId?: any; // TYPESCRIPT: number /* Browser */ | Timeout /* node */;

  // Private Instance Property Functions
  // Private Instance Methods
  // Private Instance Event Handlers

}

