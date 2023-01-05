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

// TODO: Figure out how to run WolframScript with the --cloud option so users do not need to install the engine.

// Requirements

import { spawn, ChildProcess } from "child_process";

import * as debug1 from "debug";
import { logWarning } from "../error-handler";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { assert } from "../shared/common";
import { WolframExpression } from "../shared/formula";
import { FileName, readConfigFile } from "./file-system";

// Types

export interface Config {
  path?: string; // Path to executable.
}

// export interface NVPair { name: string; value: string }

// Constants

const CONFIG_FILENAME = <FileName>'wolframscript.json';

// REVIEW: Current verson of Wolfram Language will continue to change (currently 12.2.0)
//         We are going to need a regex instead of a hardcoded version number.
const WOLFRAM_LICENSE_EXPIRING_MSG = "\n\tWolfram Language 12.0.0 Engine license you are using is expiring.\n\tPlease contact Wolfram Research or an authorized\n\tWolfram product distributor to extend your license and\n\tobtain a new password.\n"
const WOLFRAM_ENGINE_ACTIVATED_MSG = "Wolfram Engine activated. See https://www.wolfram.com/wolframscript/ for more information.\n";

const DEFAULT_WOLFRAMSCRIPT_PATH: Map<NodeJS.Platform, string> = new Map([
  [ 'darwin', '/usr/local/bin/wolframscript' ],
  [ 'linux', '/usr/local/bin/wolframscript' ],
  [ 'win32', 'C:/Program Files (x86)/Wolfram Research/WolframScript/wolframscript' ],
]);

const INPUT_PROMPT_RE = /\s*In\[(\d+)\]:=\s*$/;
// const OUTPUT_PROMPT_RE = /^\s*Out\[(\d+)\](\/\/\w+)?=\s*/;
// sometimes Wofram prints out a warning on its own line which
// we wish to discard, so we used this moderately dangerous regex
const OUTPUT_PROMPT_RE = /.*Out\[(\d+)\](\/\/\w+)?=\s*/s;
const SYNTAX_ERROR_RE = /^\s*(Syntax::.*)/;

const OUR_PRIVATE_CTX_NAME = "runPrv`";

// Note: The execute function doesn't handle multline scripts (yet).
//       Also, our execute codes expects a return value so we return a dummy value.
const RUN_PRIVATE_SCRIPT = <WolframExpression>'SetAttributes[runPrivate, HoldAllComplete]; runPrivate[code_] := With[{body = MakeBoxes@code},  Block[{$ContextPath = {"System`"}, $Context = "runPrv`"}, Global`xxx = ToExpression@body;  Clear["runPrv`*"]; Global`xxx]]; 4+5';

// Globals

let gConfig: Config;
let gChildProcess: ChildProcess;

// This promise is used to serialize sending commands to WolframScript.
let gExecutingPromise: Promise<WolframExpression> = Promise.resolve(<WolframExpression>'');

let gServerStartingPromise: Promise<void>|undefined = undefined;
let gServerStoppingPromise: Promise<void>|undefined = undefined;

// Exported functions

export async function initialize(): Promise<boolean> {
  assert(!gConfig);
  try {
    gConfig = await readConfigFile(CONFIG_FILENAME);
  } catch(err) {
    // LATER: A more helpful error message would indicate the exact location when the file is expected
    if ('code' in <any>err) {
      logWarning(MODULE, `Cannot read ${CONFIG_FILENAME} config file: ${(<any>err).code}. Suggestions from Wolfram Engine disabled.`);
    } else {
      logWarning(MODULE, `Cannot read ${CONFIG_FILENAME} config file: Error without code. Suggestions from Wolfram Engine disabled.`);
    }
  }
  return !!gConfig;
}

export function isEnabled(): boolean { return !!gConfig; }

export async function execute(command: WolframExpression): Promise<WolframExpression> {
  assert(isEnabled());
  assert(gServerStartingPromise);
  assert(!gServerStoppingPromise);

  // Wait for the server to start.
  await gServerStartingPromise;

  // Create a promise for the next 'execute' invocation to wait on.
  const executingPromise = gExecutingPromise;
  gExecutingPromise = new Promise<WolframExpression>((resolve, reject)=>{
    // Wait on the previous 'execute' invocation.
    executingPromise.finally(
      // Execute the command.
      ()=>{ executeNow(command, resolve, reject); },
    );
  });
  return gExecutingPromise;
}

export async function start(): Promise<void> {
  assert(isEnabled());
  debug(`Starting WolframScript`);
  assert(!gServerStartingPromise);
  gServerStartingPromise = startProcess(gConfig);
  await gServerStartingPromise;
  // debug(`Executing runPrivate script.`);
  await execute(RUN_PRIVATE_SCRIPT);
}

export async function stop(): Promise<void> {
  assert(isEnabled());
  debug(`Stopping WolframScript`);
  assert(gServerStartingPromise);
  assert(!gServerStoppingPromise);
  gServerStoppingPromise = stopProcess();
  await gServerStoppingPromise;
}

// Helper Functions

function executeNow(command: WolframExpression, resolve: (data: WolframExpression)=>void, reject: (reason: any)=>void): void {
  let results = <WolframExpression>'';
  const stdoutListener = (data: Buffer)=>{
    let dataString: string = data.toString();
    // debug(`Data rec'd: ${showInvisible(dataString)}`);
    results += dataString;
    // debug(`Accum data: ${showInvisible(results)}`);

    // Once the results end with an input prompt, we have received the complete result.
    const inputPromptMatch = INPUT_PROMPT_RE.exec(results);
    if (inputPromptMatch) {

      gChildProcess.stdout!.removeListener('data', stdoutListener);

      // If the results start with an output prompt, then it was a successful execution:
      const outputPromptMatch = OUTPUT_PROMPT_RE.exec(results);
      if (outputPromptMatch) {

        // ... then fulfill with whatever came between the prompts.
        results = <WolframExpression>results.substring(outputPromptMatch![0].length, inputPromptMatch.index);
        results = removeContextPrefix(results);
        debug(`Results: "${results}".`);
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
  debug(`Executing: ${command}`);
  gChildProcess.stdin!.write(command + '\n');
}

function removeContextPrefix(expr: WolframExpression,_ctx = OUR_PRIVATE_CTX_NAME): WolframExpression {
  // figure out how to make this a variable
  return <WolframExpression>expr.replace(/runPrv`/g,'');
}

function showInvisible(s: string): string {
  return s.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

function startProcess(config?: Config): Promise<void> {
  return new Promise((resolve, reject)=>{
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
      // Ignore any text to stderr that is part of the license expiring string.
      // TODO: This is specific to the version encoded in the string (12.0.0). Make this version independent.
      // REVIEW: Some small chunks of text could coincidentally match some substring of these messages.
      if (WOLFRAM_LICENSE_EXPIRING_MSG.indexOf(dataString)>=0) { return; }
      if (WOLFRAM_ENGINE_ACTIVATED_MSG.indexOf(dataString)>=0) { return; }
      console.error(`ERROR: WolframScript: stderr output: ${showInvisible(dataString)}`);
    };
    const stdoutListener = (data: Buffer) => {
      // console.dir(data);
      let dataString = data.toString();
      // debug(`WolframScript initial data: ${showInvisible(dataString)}`);
      if (INPUT_PROMPT_RE.test(dataString)) {
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
}

function stopProcess(): Promise<void> {
  return new Promise((resolve, reject)=>{
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
}

// async function checkEquiv(a:string, b:string) : Promise<boolean> {
//   const wrapped = <WolframExpression>`InputForm[runPrivate[FullSimplify[(${a}) == (${b})]]]`;
//   const result = await execute(wrapped);
//   return (<unknown>result == 'True');
// }

// function constructSubstitution(expr: WolframExpression, usedVariables: NVPair[]): WolframExpression {
//   // now we construct the expr to include known
//   // substitutions of symbols....
//   const rules = usedVariables.map(s => {
//     const q = <NVPair>s;
//     return (` ${q.name} -> ${q.value}`);
//   });
//   debug("SUBSTITUIONS RULES",rules);
//   var sub_expr: WolframExpression;
//   if (rules.length > 0) {
//     const rulestring = rules.join(",");
//     debug("RULESTRING",rulestring);
//     sub_expr = <WolframExpression>("(" + expr + " /. " + "{ " + rulestring + " }" + ")");
//   } else {
//     sub_expr = expr;
//   }
//   return sub_expr;
// }

// async function convertEvaluatedWolframToTeX(text: WolframExpression): Promise<TexExpression> {
//   if (<unknown>text == '') { return <TexExpression>''; }
//   const getTex = <WolframExpression>`TeXForm[HoldForm[Evaluate[${text}]]]`;
//   try {
//     const tex = <TexExpression>(await execute(getTex));
//     return tex;
//   }  catch (e) {
//     console.log("error",e);
//     return <TexExpression>'';
//   }
// }

// async function convertTeXtoWolfram(tex: TexExpression) : Promise<WolframExpression> {
//   const wrapped = <WolframExpression>`InputForm[ToExpression["${tex}", TeXForm]]`;
//   const escaped = <WolframExpression>wrapped.replace(/\\/g,"\\\\");
//   return execute(escaped);
// }

// async function convertWolframToTeX(text: WolframExpression): Promise<TexExpression> {
//   // Note: As often happens, this does not handle the input
//   // being an assignment properly...it is best to texify
//   // both sides of an assignment and handle that way.
//   if (<unknown>text == '') { return <TexExpression>''; }
//   const getTex = <WolframExpression>`TeXForm[HoldForm[${text}]]`;
//   try {
//     const tex = <TexExpression>(await execute(getTex));
//     return tex;
//   }  catch (e) {
//     return <TexExpression>'';
//   }
// }

