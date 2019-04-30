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

import { TDoc, TDocChange } from './tdoc';

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
    console.log(`Mathematica tDoc ${tDoc._name}/${change.type} change: `);
    break;
  case 'styleInserted':
    console.log(`Mathematica tDoc ${tDoc._name}/${change.type} change: `);
    mathMathematicaRule(tDoc, change.style);
    break;
  case 'thoughtDeleted':
    console.log(`Mathematica tDoc ${tDoc._name}/${change.type} change: `);
    break;
  case 'thoughtInserted':
    console.log(`Mathematica tDoc ${tDoc._name}/${change.type} change: `);
    break;
  default:
    console.log(`Mathematica tDoc unknown change: ${tDoc._name} ${(<any>change).type}`);
    break;
  }
}

function onClose(tDoc: TDoc): void {
  console.log(`Mathematica tDoc close: ${tDoc._name}`);
}

function onOpen(tDoc: TDoc): void {
  console.log(`Mathematica: tDoc open: ${tDoc._name}`);
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

var gmsg;
var gmsg_str;
var gobj;

function initiateQueue() {
  sockPush.bindSync(socket_uri_A);
  sockPull.bindSync(socket_uri_B);

}

async function evaluateExpressionPromise(expr) {
  return new Promise(function(resolve,reject) {
    sockPull.on('message', function(msg) {

      console.log('work: %s', msg.toString());

      gmsg = msg;
      // WARNING!!! This seems to work, but is a fragile
      // about the way zeromq is serilalizing a message.
      // Probably a careful analysis of the Wolfram Client Python
      // library would allow us to duplciate the deserialization
      // fully in Node, rather than this crummy hack, which
      // seems to work.
      let preamble_len = "8:fsTimesS�".length+3;
      gmsg_str = gmsg.toString().substring(preamble_len);
      console.log('gmsg_str: %s', gmsg_str);

      // WARNING!!! yet another hack to remove the
      // some trailing data.
      gmsg_str = gmsg_str.replace('s\u0004Null','');
      console.log('Replaced gmsg_str: %s', gmsg_str);
      gobj = JSON.parse(gmsg_str);
      resolve(gmsg_str);
    });

  });
}

async function evaluateExpression(expr) {
  sockPush.send(expr);
  var value = await evaluateExpressionPromise(expr);
}


export function mathMathematicaRule(tdoc: TDoc, style: Style): Style[] {
  // We only extract symbols from MathJS expressions that are user input.
  if (style.type != 'MATHEMATICA' || style.meaning != 'INPUT') { return []; }

  var styles = [];

  let result = await evaluateExpression(style.data);

  const s = "DUMMY TEXT";

  var exemplar = tdoc.insertMthMtcaStyle(style, result, 'SYMBOL', 'MATHEMATICA')

  styles.push(exemplar);

  return styles;
}


// What is the best way to call this?
// How do we know if the queue is alive and well?
initiateQueue();
