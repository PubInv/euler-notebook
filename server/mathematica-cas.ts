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

// import { MthMtcaText } from '../client/math-tablet-api';
import { StyleObject, NotebookChange } from '../client/math-tablet-api';
import { TDoc } from './tdoc';
import { execute } from './wolframscript';
import * as fs from 'fs';

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
    mathMathematicaRule(tDoc, change.style)
    .catch((err)=>{ console.error(`Error applying mathMathematicaRule: ${err.message}`); });
    convertMathMlToWolframRule(tDoc, change.style)
    .catch((err)=>{ console.error(`Error applying convertMathMlToWolframRule: ${err.message}`); });
    break;
  default: break;
  }
}

function onClose(tDoc: TDoc): void {
  // console.log(`Mathematica tDoc close: ${tDoc._path}`);
}

function onOpen(tDoc: TDoc): void {
  // console.log(`Mathematica: tDoc open: ${tDoc._path}`);
}

// var child_process = require('child_process');

// var child = child_process.spawn('/usr/local/bin/wolframscript');

// child.stdout.once('data',
//          (data: string) => {
//            console.log("INITIAL PIPE RESPONSE",data.toString());
//              })

// child.stdin.write('Print["hello"]\n');

async function evaluateExpressionPromiseWS(expr: string) : Promise<string> {
  // console.log("INSIDE EVALUATE WS",expr);
  let result : string = await execute("InputForm["+expr+"]");
  // console.log("RESULT FROM WS",result);
  return result;
  // return new Promise(function(resolve,reject) {
  //   child.stdout.once('data',
  //                     (data: string) => {
  //                       try {
  //                         var ret_text = data.toString();
  //                         console.log("DATA",ret_text);
  //                         // Typical response: Out[2]= 7. In[3]:=
  //                         const regex = /([\.\w]+)\[\d+\]\=\s([\.\w]+)/g;
  //                         const found : string[] | null =
  //                               regex.exec(ret_text);
  //                         console.log("FOUND :",found);
  //                         const result = found && found[2];
  //                         console.log("Result :",result);
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

  // console.log("INSIDE RULE :",style);
  // We only extract symbols from Wolfram expressions that are user input.
  if (style.type != 'WOLFRAM' || style.meaning != 'INPUT') { return []; }

  var styles = [];

  var assoc;
  try {
    //    assoc = await evaluateExpressionPromiseWS(style.data);
    assoc = await evaluateExpressionPromiseWS(style.data);
    console.log("ASSOC RETURNED",assoc,assoc.toString());
  } catch (e) {
    console.log("MATHEMATICA EVALUATION FAILED :",e);
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
  console.log("path",path);
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
            console.log('success!');
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
    console.log("ERROR Trying to read: ",e);
  }

  // @ts-ignore --- I don't know how to type this.
  //  let result = assoc[1][2]; // "magic" for Mathematica
  if (assoc) {
  let result = assoc.toString();
  console.log(" RESULT STRING :",result);
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
  console.log(cmd);
  try {
    const data = await execute(cmd);
    // REVIEW: Attach it to the thought instead of the style?
    tdoc.insertStyle(style, { type: 'WOLFRAM', source: 'MATHEMATICA', meaning: 'INPUT', data });
  } catch(err) {
    tdoc.insertStyle(style, { type: 'TEXT', source: 'MATHEMATICA', meaning: 'EVALUATION-ERROR', data: `Cannot convert to Wolfram expression: ${err.message}` });
  }
}
