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


// Mathematica is a very powerful system; we could in theory
// analyze any expression in a number of ways with Mathematica.
// for the time being, I will assume what I hope is simple:
// an expression is intended to be evaluated by Mathematica,
// producing what you would get if you typed that expression into
// a notebook.
// This also implies the creation of symbols in the kernel
// which can be evaulated in separate styles. Since
// Mathematica is declarative-oriented, this should not be
// a giant problem in the short term. Eventually, the tdoc may
// need to have some of the same "kernel" functionality that the WolframKernel
// does, even if you are not using Mathematica.

// The basic way to read Mathematica is by using a ZeroMQ queue, and
// to have initialized the kernel previously. This is handled by
// a server-side script at present. The port numbers 52817 and 52818 are
// magic numbers expressed both here and in that script; these
// should be moved into a global configuration.
var socket_uri_A = 'tcp://127.0.0.1:52817';
var socket_uri_B = 'tcp://127.0.0.1:52818';

// producer.js
var zmq = require('zeromq');
var sockPush = zmq.socket('push');
var sockPull = zmq.socket('pull');

function initiateQueue() {
  sockPush.bindSync(socket_uri_A);
  sockPull.bindSync(socket_uri_B);

}

async function evaluateExpressionPromise(expr: string) {
  return new Promise(function(resolve,reject) {
    sockPush.send(expr);
    // QUESTION: Here I am re-assigning the "on" handler
    // with each call, which cost us little, but is inelegant.
    // However, this is the noly obvious way to embed the "resolve"
    // object in it.
    sockPull.on('message', function(msg: any) {
      // WARNING!!! This seems to work, but is a fragile
      // about the way zeromq is serilalizing a message.
      // Probably a careful analysis of the Wolfram Client Python
      // library would allow us to duplciate the deserialization
      // fully in Node, rather than this crummy hack, which
      // seems to work.
      let preamble_len = "8:fsTimesS�".length+3;
      var gmsg_str = msg.toString().substring(preamble_len);
      // WARNING!!! yet another hack to remove the
      // some trailing data.
      gmsg_str = gmsg_str.replace('s\u0004Null','');
      try {
        var obj = JSON.parse(gmsg_str);
        resolve(obj);
      } catch (e) {
        reject(e);
      }
    });
  });
}

export async function mathMathematicaRule(tdoc: TDoc, style: StyleObject): Promise<StyleObject[]> {

  console.log("INSIDE RULE :",style);
  // We only extract symbols from Wolfram expressions that are user input.
  if (style.type != 'WOLFRAM' || style.meaning != 'INPUT') { return []; }

  var styles = [];

  var assoc;
  try {
    assoc = await evaluateExpressionPromise(style.data);
  } catch (e) {
    console.log("MATHEMATICA EVALUATION FAILED :",e);
    return [];
  }

  console.log("RESULT :", assoc);
  // Mathematica returns an "association" with a lot of
  // information. We will eventually wish to place all of
  // this in a style. For the time being, we will extract
  // only the most concise result.

  // @ts-ignore --- I don't know how to type this.
  let result = assoc[1][2]; // "magic" for Mathematica
  console.log(" RESULT STRING :",result);
  var exemplar = tdoc.insertStyle({ type: 'MATHEMATICA', id: 0, stylableId: style.id, data: <string>result, meaning: 'EVALUATION', source: 'MATHEMATICA' })

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
                tdoc.insertStyle({ type: 'IMAGE', id: 0, stylableId: style.id,
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


// What is the best way to call this?
// How do we know if the queue is alive and well?
initiateQueue();
