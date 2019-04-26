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

// To use this file, invoke node,
// and past this file in.
// Then invoke Mathematica with the following line:
// /Applications/Mathematica.app/Contents/MacOS/WolframKernel -noprompt -initfile initkernel_pln.m -run 'ClientLibrary`Private`SlaveKernelPrivateStart["tcp://127.0.0.1:52817", "tcp://127.0.0.1:52818"]';.

// Then execute in node things like: sockPush.send('x = 6');
// Our goal in this experiment is to be able to send
// and receive expressions and their results in
// the node object space. The evnetual goal is to create
// a Mathematica integration Computer Algebra System.


var socket_uri_A = 'tcp://127.0.0.1:52817';
var socket_uri_B = 'tcp://127.0.0.1:52818';

// producer.js
var zmq = require('zeromq');
var sockPush = zmq.socket('push');

sockPush.bindSync(socket_uri_A);
console.log('Producer bound to port 3000');

var i = 0;


// Examples:
// sockPush.send('x = 6');
// The Result object of this should be 6

// We can send commands to Mathematica as well;
// however, the results will be sent back in the 'OutputLog'

// sockPush.send('Print[x]');

// worker.js
var sockPull = zmq.socket('pull');

// sock.connect(socket_uri_B);
sockPull.bindSync(socket_uri_B);
console.log('Worker connected to port 3000');

var gmsg;
var gmsg_str;
var gobj;

sockPull.on('message', function(msg){

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
});
