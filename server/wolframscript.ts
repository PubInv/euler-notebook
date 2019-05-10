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

import { spawn, ChildProcess } from 'child_process';
import { WolframData } from '../client/math-tablet-api';

// Constants

const WOLFRAM_LICENSE_EXPIRING_MSG = "\n\tWolfram Language 12.0.0 Engine license you are using is expiring.\n\tPlease contact Wolfram Research or an authorized\n\tWolfram product distributor to extend your license and\n\tobtain a new password.\n"
const WOLFRAMSCRIPT_PATH = '/usr/local/bin/wolframscript';

const INPUT_PROMPT_RE = /\s*In\[(\d+)\]:=\s*$/;
const OUTPUT_PROMPT_RE = /^\s*Out\[(\d+)\](\/\/\w+)?=\s*/;
const SYNTAX_ERROR_RE = /^\s*(Syntax::.*)/;

// Globals

let gChildProcess: ChildProcess;

// Exported functions

export async function execute(command: WolframData): Promise<WolframData> {
  // TODO: reject if server not started.
  //console.log(`WolframScript: executing: ${command}`);
  return new Promise((resolve, reject)=>{
    gChildProcess.stdin!.write(command + '\n');
    let results = '';
    const stdoutListener = (data: Buffer)=>{
      let dataString: string = data.toString();
      // console.log(`data: ${showInvisible(dataString)}`);
      results += dataString;

      // Once the results end with an input prompt, we have received the complete result.
      const inputPromptMatch = INPUT_PROMPT_RE.exec(results);
      if (inputPromptMatch) {

        gChildProcess.stdout!.removeListener('data', stdoutListener);

        // If the results start with an output prompt, then it was a successful execution:
        const outputPromptMatch = OUTPUT_PROMPT_RE.exec(results);
        if (outputPromptMatch) {

          // ... then fulfill with whatever came between the prompts.
          results = results.substring(outputPromptMatch![0].length, inputPromptMatch.index);
          // console.log(`Resolving: '${results}'`);
          resolve(results);
        } else {
          let message: string = "WolframScript Error: ";

          // Extract a useful error message as best we can:
          const syntaxErrorMatch = SYNTAX_ERROR_RE.exec(results);
          if (syntaxErrorMatch) {
            message += `${syntaxErrorMatch[1]}`;
          } else {
            message += `Unexpected result: ${results.slice(0, 20)}`;
          }

          // console.log(`Rejecting: '${message}'`);
          reject(new Error(message));
        }
      } else {
        // Wait for more data events from Wolfram Script to complete the result.
      }

    };
    gChildProcess.stdout!.on('data', stdoutListener)
  });
}

export async function start(): Promise<void> {
  return new Promise((resolve, reject)=>{
    const child = gChildProcess = spawn(WOLFRAMSCRIPT_PATH);

    const errorListener = (err: Error)=>{
      reject(new Error(`WolframScript error on start: ${err.message}`));
    };
    const exitListener = (code: number, signal: string)=>{
      reject(new Error(`WolframScript exited prematurely. Code ${code}, signal ${signal}`));
    };
    const stderrListener = (data: Buffer)=>{
      const dataString = data.toString();
      // Ignore any text to standard out that is part of the license expiring string.
      // TODO: This is specific to the version encoded in the string (12.0.0). Make this version independent.
      if (WOLFRAM_LICENSE_EXPIRING_MSG.indexOf(dataString)>=0) { return; }
      console.error(`ERROR: WolframScript: stderr output: ${showInvisible(dataString)}`);
    };
    const stdoutListener = (data: Buffer) => {
      // console.dir(data);
      let dataString = data.toString();
      // console.log(`WolframScript initial data: ${showInvisible(dataString)}`);
      if (INPUT_PROMPT_RE.test(dataString)) {
        // console.log("MATCHES. RESOLVING.")
        child.stdout.removeListener('data', stdoutListener);
        resolve();
      }
      else { /* console.log("DOESN'T MATCH. WAITING."); */}
    }

    child.once('error', errorListener);
    child.once('exit', exitListener);
    child.stdout.on('data', stdoutListener);
    child.stderr.on('data', stderrListener);
  });
}

export async function stop(): Promise<void> {
  return new Promise((resolve, reject)=>{
    const child = gChildProcess;
    child.once('error', (err: Error)=>{
      // console.error(`ERROR: WolframScript: child process error: ${err.message}`);
      reject(err);
    });
    // REVIEW: should we wait for 'close', too?
    child.once('exit', (_code: number, _signal: string)=>{
      resolve();
    });
    child.kill(/* 'SIGTERM' */);
  });
}

// HELPER FUNCTIONS

function showInvisible(s: string): string {
  return s.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}
