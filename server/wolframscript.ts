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

const WOLFRAMSCRIPT_PATH = '/usr/local/bin/wolframscript';

const INPUT_PROMPT_RE = /\s*In\[(\d+)\]:=\s*$/;
const OUTPUT_PROMPT_RE = /^\s*Out\[(\d+)\](\/\/\w+)?=\s*/;

// Globals

let gChildProcess: ChildProcess;

// Exported functions

export async function execute(command: WolframData): Promise<WolframData> {
  // TODO: reject if server not started.
  //console.log(`WolframScript: executing: ${command}`);
  return new Promise((resolve, _reject)=>{
    gChildProcess.stdin!.write(command + '\n');
    let results = '';
    const stdoutListener = (data: Buffer)=>{
      let dataString: string = data.toString();
      // console.log(`data: ${showInvisible(dataString)}`);
      results += dataString;
      const outputPromptMatch = OUTPUT_PROMPT_RE.exec(results);
      if (outputPromptMatch) {
        const inputPromptMatch = INPUT_PROMPT_RE.exec(results);
        if (inputPromptMatch) {
          // console.dir(inputPromptMatch);
          // Strip output prompt from the beginning and input prompt from the end.
          results = results.substring(outputPromptMatch![0].length, inputPromptMatch.index);
          gChildProcess.stdout!.removeListener('data', stdoutListener);
          resolve(results);
        }
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
    child.stderr.on('data', (data: Buffer)=>{
      console.error(`ERROR: WolframScript: stderr output: ${data}`);
    })
  });
}

export async function stop(): Promise<void> {
  return new Promise((resolve, reject)=>{
    const child = gChildProcess;
    child.once('error', (err: Error)=>{
      console.error(`ERROR: WolframScript: child process error: ${err.message}`);
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

// function showInvisible(s: string): string {
//   return s.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t');
// }
