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
import { StyleObject } from '../client/math-tablet-api';
import { TDoc, TDocChange } from './tdoc';
import * as fs from 'fs';

// Exports

export async function initialize(): Promise<void> {
  TDoc.on('open', (tDoc: TDoc)=>{
    tDoc.on('change', function(this: TDoc, change: TDocChange){ onChange(this, change); });
    tDoc.on('close', function(this: TDoc){ onClose(this); });
    onOpen(tDoc);
  });
}

// Private Functions

function onChange(tDoc: TDoc, change: TDocChange): void {
  switch (change.type) {
  case 'styleDeleted':
    console.log(`Mathematica tDoc ${tDoc._path}/${change.type} change: `);
    break;
  case 'styleInserted':
    console.log(`Mathematica tDoc ${tDoc._path}/${change.type} change: `);
    mathMathematicaRule(tDoc, change.style);
    break;
  case 'thoughtDeleted':
    console.log(`Mathematica tDoc ${tDoc._path}/${change.type} change: `);
    break;
  case 'thoughtInserted':
    console.log(`Mathematica tDoc ${tDoc._path}/${change.type} change: `);
    break;
  default:
    console.log(`Mathematica tDoc unknown change: ${tDoc._path} ${(<any>change).type}`);
    break;
  }
}

function onClose(tDoc: TDoc): void {
  console.log(`Mathematica tDoc close: ${tDoc._path}`);
}

function onOpen(tDoc: TDoc): void {
  console.log(`Mathematica: tDoc open: ${tDoc._path}`);
}

var child_process = require('child_process');

var child = child_process.spawn('/usr/local/bin/wolframscript');

child.stdout.once('data',
         (data: string) => {
           console.log("INITIAL PIPE RESPONSE",data.toString());
             })

child.stdin.write('Print["hello"]\n');

async function evaluateExpressionPromiseWS(expr: string) : Promise<string> {
  console.log("INSIDE EVALUATE WS");
  return new Promise(function(resolve,reject) {
    child.stdout.once('data',
                      (data: string) => {
                        try {
                          var ret_text = data.toString();
                          console.log("DATA",ret_text);
                          // Typical response: Out[2]= 7. In[3]:=
                          const regex = /([\.\w]+)\[\d+\]\=\s([\.\w]+)/g;
                          const found : string[] | null =
                                regex.exec(ret_text);
                          console.log("FOUND :",found);
                          const result = found && found[2];
                          console.log("Result :",result);
                          if (found)
                            resolve(found[2]);
                          else
                            reject(new Error("unexpected null from wolframscript"));
                        } catch (e) {
                          reject(e);
                        }});
    child.stdin.write(expr+"\n");
  });
}

export async function mathMathematicaRule(tdoc: TDoc, style: StyleObject): Promise<StyleObject[]> {

  console.log("INSIDE RULE :",style);
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
    return [];
  }

  // Mathematica returns an "association" with a lot of
  // information. We will eventually wish to place all of
  // this in a style. For the time being, we will extract
  // only the most concise result.

  // @ts-ignore --- I don't know how to type this.
  //  let result = assoc[1][2]; // "magic" for Mathematica
  let result = assoc.toString();
  console.log(" RESULT STRING :",result);
  var exemplar = tdoc.insertStyle(style, { type: 'MATHEMATICA',
                                           data: <string>result,
                                           meaning: 'EVALUATION',
                                           source: 'MATHEMATICA' });

  styles.push(exemplar);

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
      console.log(items);
      for (var i=0; i <items.length; i++) {
        console.log(items[i]);
        const ext = items[i].split('.').pop();
        if (ext == "gif") {
          const fn = items[i]
          var dest = targetPath+"/"+fn;
          fs.copyFile(fn, dest, err => {
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
  return styles;
}
