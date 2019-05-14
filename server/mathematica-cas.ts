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

import * as debug1 from 'debug';
const MODULE = __filename.split('/').slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// import { MthMtcaText } from '../client/math-tablet-api';
import { StyleObject, NotebookChange } from '../client/math-tablet-api';
import { TDoc } from './tdoc';
import { execute } from './wolframscript';
import * as fs from 'fs';
import { runAsync } from './common';

// Exports

export async function initialize(): Promise<void> {
  TDoc.on('open', (tDoc: TDoc)=>{
    tDoc.on('change', function(this: TDoc, change: NotebookChange){ onChange(this, change); });
    tDoc.on('close', function(this: TDoc){ onClose(this); });
    onOpen(tDoc);
  });
}

// Private Functions

function onChange(tDoc: TDoc, change: NotebookChange): void {
  switch (change.type) {
  case 'styleInserted':
    runAsync(mathMathematicaRule(tDoc, change.style), MODULE, 'mathMathematicaRule');
    runAsync(convertMathMlToWolframRule(tDoc, change.style), MODULE, 'convertMathMlToWolframRule');
    break;
  default: break;
  }
}

function onClose(tDoc: TDoc): void {
  debug(`Mathematica tDoc close: ${tDoc._path}`);
}

function onOpen(tDoc: TDoc): void {
  debug(`Mathematica: tDoc open: ${tDoc._path}`);
}

// var child_process = require('child_process');

// var child = child_process.spawn('/usr/local/bin/wolframscript');

// child.stdout.once('data',
//          (data: string) => {
//            debug("INITIAL PIPE RESPONSE",data.toString());
//              })

// child.stdin.write('Print["hello"]\n');

async function evaluateExpressionPromiseWS(expr: string) : Promise<string> {
  debug("INSIDE EVALUATE WS",expr);
  let result : string = await execute("InputForm["+expr+"]");
  debug("RESULT FROM WS",result);
  return result;
  // return new Promise(function(resolve,reject) {
  //   child.stdout.once('data',
  //                     (data: string) => {
  //                       try {
  //                         var ret_text = data.toString();
  //                         debug("DATA",ret_text);
  //                         // Typical response: Out[2]= 7. In[3]:=
  //                         const regex = /([\.\w]+)\[\d+\]\=\s([\.\w]+)/g;
  //                         const found : string[] | null =
  //                               regex.exec(ret_text);
  //                         debug("FOUND :",found);
  //                         const result = found && found[2];
  //                         debug("Result :",result);
  //                         if (found)
  //                           resolve(found[2]);
  //                         else
  //                           reject(new Error("unexpected null from wolframscript"));
  //                       } catch (e) {
  //                         reject(e);
  //                       }});
  //   child.stdin.write(expr+"\n");
  // });
}

// REVIEW: Caller doesn't do anything with the return value. Does not need to return a value.
// REVIEW: This does not need to be exported, as it does not occur anywhere else in the source.
export async function mathMathematicaRule(tdoc: TDoc, style: StyleObject): Promise<StyleObject[]> {

  debug("INSIDE RULE :",style);
  // We only extract symbols from Wolfram expressions that are user input.
  if (style.type != 'WOLFRAM' || style.meaning != 'INPUT') { return []; }

  var styles = [];

  var assoc;
  try {
    //    assoc = await evaluateExpressionPromiseWS(style.data);
    assoc = await evaluateExpressionPromiseWS(style.data);
    debug("ASSOC RETURNED",assoc,assoc.toString());
  } catch (e) {
    debug("MATHEMATICA EVALUATION FAILED :",e);
    assoc = null;
  }

  // Mathematica returns an "association" with a lot of
  // information. We will eventually wish to place all of
  // this in a style. For the time being, we will extract
  // only the most concise result.


  // now we will attempt to discern if a .gif file was created,
  // and if so, move it into the notebook directory and create
  // a style.  This is a bit of a hacky means that allows
  // us to avoid having to understand too much about the expression.
  var path = tdoc.absoluteDirectoryPath();
  debug("path",path);
  // we do not yet have the code to use the tdoc path quite ready, so instead we are going to use
  // public/tmp as a place for images until we are ready.
  const targetPath = "./public/tmp";
  const urlPath = "/tmp";
  path = ".";

  try {
    fs.readdir(path, function(_err, items) {
      for (var i=0; i <items.length; i++) {
        const ext = items[i].split('.').pop();
        if (ext == "gif") {
          const fn = items[i]
          var dest = targetPath+"/"+fn;
          fs.rename(fn, dest, err => {
            if (err) return console.error(err);
            debug('success!');
            var imageStyle =
                tdoc.insertStyle(style,{ type: 'IMAGE',
                                   data: urlPath+"/"+fn,
                                   meaning: 'PLOT',
                                   source: 'MATHEMATICA' })
            styles.push(imageStyle);
          });
        }
      }
    });
  } catch(e) {
    debug("ERROR Trying to read: ",e);
  }

  // @ts-ignore --- I don't know how to type this.
  //  let result = assoc[1][2]; // "magic" for Mathematica
  if (assoc) {
  let result = assoc.toString();
  debug(" RESULT STRING :",result);
  var exemplar = tdoc.insertStyle(style, { type: 'MATHEMATICA',
                                           data: <string>result,
                                           meaning: 'EVALUATION',
                                           source: 'MATHEMATICA' });

    styles.push(exemplar);
  }
  return styles;
}

async function convertMathMlToWolframRule(tdoc: TDoc, style: StyleObject): Promise<void> {

  if (style.type != 'MATHML' || style.meaning != 'INPUT') { return; }

  const mathMl = style.data.split('\n').join('').replace(/"/g, '\\"');
  const cmd = `InputForm[ToExpression[ImportString["${mathMl}", "MathML"]]]`;
  debug(cmd);
  try {
    const data = await execute(cmd);
    // REVIEW: Attach it to the thought instead of the style?
    tdoc.insertStyle(style, { type: 'WOLFRAM', source: 'MATHEMATICA', meaning: 'INPUT', data });
  } catch(err) {
    tdoc.insertStyle(style, { type: 'TEXT', source: 'MATHEMATICA', meaning: 'EVALUATION-ERROR', data: `Cannot convert to Wolfram expression: ${err.message}` });
  }
}
