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

export async function start(): Promise<void> {
  return new Promise((resolve, reject)=>{
    const child = gChildProcess = spawn(WOLFRAMSCRIPT_PATH);
    child.on('error', (err: Error)=>{
      console.error(`ERROR: WolframScript: child process error: ${err.message}`);
      reject(err);
    });
    child.on('close', (code: number, signal: string)=>{ 
      console.error(`WolframScript child process close event: ${code} '${signal}'`);
    });
    child.on('exit', (code: number, signal: string)=>{ 
      console.error(`WolframScript child process exit event: ${code} '${signal}'`);
    });
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
    child.stdout.on('data', stdoutListener);
    child.stderr.on('data', (data: Buffer)=>{
      console.error(`ERROR: WolframScript: stderr output: ${data}`);
    })
  });
}

export async function execute(command: WolframData): Promise<WolframData> {
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

// HELPER FUNCTIONS

// function showInvisible(s: string): string {
//   return s.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t');
// }

// TESTING

// const TEST_COMMANDS = [
//   'N[Sqrt[3]]',
//   'InputForm[ToExpression[ImportString["<math xmlns=\'http://www.w3.org/1998/Math/MathML\'><msup><mrow><mi>x</mi></mrow><mrow><mn>2</mn></mrow></msup><mo>+</mo><mn>3</mn><mi>x</mi><mo>+</mo><mn>5</mn></math>", "MathML"]]]',
// ]
// async function main(): Promise<void> {
//   // console.log("Starting WolframScript");
//   await start();
//   // console.log("WolframScript started.");

//   for (const cmd of TEST_COMMANDS) {
//     console.log(`In ${cmd}`);
//     const results = await execute(cmd);
//     console.log(`Out ${results}`);
//   }
// }

// main()
// .then(
//   ()=> { console.log(`Main promise resolved.`); },
//   err=>{ console.error(`WolframScript.ts ERROR: ${err.message}`) }
// );
