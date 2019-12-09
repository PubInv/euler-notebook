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

// REVIEW: Doesn't belong in observers folder as it is not an observer.
// Requirements

import * as debug1 from 'debug';
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { spawn, ChildProcess } from 'child_process';
import { WolframData, LatexData } from '../../client/math-tablet-api';
import { WolframScriptConfig } from '../config';

// Types

export interface NVPair { name: string; value: string }

// Constants

const WOLFRAM_LICENSE_EXPIRING_MSG = "\n\tWolfram Language 12.0.0 Engine license you are using is expiring.\n\tPlease contact Wolfram Research or an authorized\n\tWolfram product distributor to extend your license and\n\tobtain a new password.\n"

const DEFAULT_WOLFRAMSCRIPT_PATH: Map<NodeJS.Platform, string> = new Map([
  [ 'darwin', '/usr/local/bin/wolframscript' ],
  [ 'linux', '/usr/local/bin/wolframscript' ],
  [ 'win32', 'C:/Program Files (x86)/Wolfram Research/WolframScript/wolframscript' ],
]);

const INPUT_PROMPT_RE = /\s*In\[(\d+)\]:=\s*$/;
const OUTPUT_PROMPT_RE = /^\s*Out\[(\d+)\](\/\/\w+)?=\s*/;
const SYNTAX_ERROR_RE = /^\s*(Syntax::.*)/;

const OUR_PRIVATE_CTX_NAME = "runPrv`";

// Globals

let gChildProcess: ChildProcess;

// This promise is used to serialize sending commands to WolframScript.
let gExecutingPromise: Promise<WolframData> = Promise.resolve('');

let gServerStartingPromise: Promise<void>|undefined = undefined;
let gServerStoppingPromise: Promise<void>|undefined = undefined;

// Exported functions

export async function execute(command: WolframData): Promise<WolframData> {
  // Wait for the server to start.
  if (!gServerStartingPromise) { throw new Error("Can't execute -- WolframScript not started."); }
  if (gServerStoppingPromise) { throw new Error("Can't execute -- WolframScript is stopping."); }
  await gServerStartingPromise;

  // Create a promise for the next 'execute' invocation to wait on.
  const executingPromise = gExecutingPromise;
  gExecutingPromise = new Promise<WolframData>((resolve, reject)=>{
    // Wait on the previous 'execute' invocation.
    // LATER: Use .finally instead when everyone is at node 10 or later.
    executingPromise.then(
      // Execute the command.
      ()=>{ executeNow(command, resolve, reject); },
      (_err)=>{ executeNow(command, resolve, reject); }
    );
  });
  return gExecutingPromise;
}

export async function convertTeXtoWolfram(tex: string) : Promise<WolframData> {
  const wrapped = `InputForm[ToExpression["${tex}", TeXForm]]`;
  const escaped = wrapped.replace(/\\/g,"\\\\");
  return execute(escaped);
}

export async function start(config?: WolframScriptConfig): Promise<void> {
  debug(`starting`);
  await startProcess(config);
  await defineRunPrivate();
}

export async function stop(): Promise<void> {
  debug(`stopping`);
  if (!gServerStartingPromise) { throw new Error("WolframScript not started."); }
  if (gServerStoppingPromise) { throw new Error("WolframScript is already stopping."); }
  gServerStoppingPromise = new Promise((resolve, reject)=>{
    const child = gChildProcess;
    child.once('error', (err: Error)=>{ reject(err); });
    // REVIEW: should we wait for 'close', too?
    child.once('exit', (_code: number, _signal: string)=>{
      resolve();
      gServerStartingPromise = undefined;
      gServerStoppingPromise = undefined;
    });
    child.kill(/* 'SIGTERM' */);
  });
  return gServerStoppingPromise;
}

// HELPER FUNCTIONS

// TODO: at least the text of this should be retrieved from the wolframscript module!!
async function defineRunPrivate() : Promise<void> {
  // Create a promise for the next 'execute' invocation to wait on.
  // our execute function apparently can't yet handle multline scripts...
  // Also, our execute codes expects something to be returned, so I addded
  // a dummy return value
  debug(`defining runPrivate`);
  var defRunPrivateScript = 'SetAttributes[runPrivate, HoldAllComplete]; runPrivate[code_] := With[{body = MakeBoxes@code},  Block[{$ContextPath = {"System`"}, $Context = "runPrv`"}, Global`xxx = ToExpression@body;  Clear["runPrv`*"]; Global`xxx]]; 4+5';
  await execute(defRunPrivateScript);
}

export function constructSubstitution(expr: string,usedVariables: NVPair[]) {
  // now we construct the expr to include known
  // substitutions of symbols....
  const rules = usedVariables.map(s => {
    const q = <NVPair>s;
    return (` ${q.name} -> ${q.value}`);
  });
  debug("SUBSTITUIONS RULES",rules);
  var sub_expr;
  if (rules.length > 0) {
    const rulestring = rules.join(",");
    debug("RULESTRING",rulestring);
    sub_expr = "(" + expr + " /. " + "{ " + rulestring + " }" + ")";
  } else {
    sub_expr = expr;
  }
  return sub_expr;
}

function executeNow(command: WolframData, resolve: (data: string)=>void, reject: (reason: any)=>void): void {
  debug(`Executing: "${command}".`)
  let results = '';
  const stdoutListener = (data: Buffer)=>{
    let dataString: string = data.toString();
    debug(`data: ${showInvisible(dataString)}`);
    results += dataString;
    debug(`results: ${showInvisible(results)}`);

    // Once the results end with an input prompt, we have received the complete result.
    const inputPromptMatch = INPUT_PROMPT_RE.exec(results);
    if (inputPromptMatch) {

      gChildProcess.stdout!.removeListener('data', stdoutListener);

      // If the results start with an output prompt, then it was a successful execution:
      const outputPromptMatch = OUTPUT_PROMPT_RE.exec(results);
      if (outputPromptMatch) {

        // ... then fulfill with whatever came between the prompts.
        results = results.substring(outputPromptMatch![0].length, inputPromptMatch.index);
        results = draftChangeContextName(results);
        debug(`Execution results: "${results}".`);
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

        debug(`Rejecting: '${message}'`);
        reject(new Error(message));
      }
    } else {
      // Wait for more data events from Wolfram Script to complete the result.
    }
  }

  gChildProcess.stdout!.on('data', stdoutListener)
  debug(`WolframScript: executing: ${command}`);
  gChildProcess.stdin!.write(command + '\n');
}

function showInvisible(s: string): string {
  return s.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

async function startProcess(config?: WolframScriptConfig): Promise<void> {

  if (gServerStartingPromise) {
    // REVIEW: Should this throw an error or be ignored?
    // throw new Error("WolframScript already started.");
    console.warn("WARNING: Attempting to start WolframScript process when it is already started. Ignoring.");
    return;
  }

  gServerStartingPromise = new Promise((resolve, reject)=>{
    const platform = process.platform;
    const path = (config && config.path) || DEFAULT_WOLFRAMSCRIPT_PATH.get(platform);
    if (!path) { throw new Error(`Default path not set for wolframscript executable on platform '${platform}'.`); }
    const child = gChildProcess = spawn(path);

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
      debug(`WolframScript initial data: ${showInvisible(dataString)}`);
      if (INPUT_PROMPT_RE.test(dataString)) {
        debug("MATCHES. RESOLVING.")
        child.stdout.removeListener('data', stdoutListener);
        resolve();
      }
      else { /* debug("DOESN'T MATCH. WAITING."); */}
    }

    child.once('error', errorListener);
    child.once('exit', exitListener);
    child.stdout.on('data', stdoutListener);
    child.stderr.on('data', stderrListener);
  });
  return gServerStartingPromise;
}

export function draftChangeContextName(expr: string,_ctx = OUR_PRIVATE_CTX_NAME) {
  // figure out how to make this a variable
  return expr.replace(/runPrv`/g,'');
}

export async function checkEquiv(a:string, b:string) : Promise<boolean> {
  const wrapped = `InputForm[runPrivate[FullSimplify[(${a}) == (${b})]]]`;
  const result = await execute(wrapped);
  return (result == 'True');
}

// Note: As often happens, this does not handle the input
// being an assignment properly...it is best to texify
// both sides of an assignment and handle that way.
// REVIEW: Should be called convertWolframToTeX to parallel convertTeXtoWolfram above.
export async function findTeXForm(text: WolframData): Promise<LatexData> {
    const getTex = `TeXForm[HoldForm[${text}]]`;
    try {
      const tex = await execute(getTex);
      return tex;
    }  catch (e) {
      return "";
    }
  }
