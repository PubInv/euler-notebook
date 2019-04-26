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
// /Applications/Mathematica.app/Contents/MacOS/WolframKernel -noprompt -initfile /Users/robertread/PubInv/math-tablet/experiments/wolframClientForPython-exper/WolframClientForPython/wolframclient/evaluation/kernel/initkernel_pln.m -run 'ClientLibrary`Private`SlaveKernelPrivateStart["tcp://127.0.0.1:52817", "tcp://127.0.0.1:52818"]';.

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
// EX: sockPush.send('x = 6');

// worker.js
var sockPull = zmq.socket('pull');

// sock.connect(socket_uri_B);
sockPull.bindSync(socket_uri_B);
console.log('Worker connected to port 3000');

sockPull.on('message', function(msg){

  gmsg = msg;
  console.log('work: %s', msg.toString());
  console.log('raw: %s', msg);
});
