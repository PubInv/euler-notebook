// This file is for testing our communication mechanism with WolframScript
// and can be deleted when it is no longer serving any purpose.

var child_process = require('child_process');

var child = child_process.spawn('/usr/local/bin/wolframscript');

child.stdout.once('data',
         (data: string) => {
           var text = data.toString();
           console.log("INITIAL PIPE RESPONSE",text);
               })


child.stdout.on('data',
         (data: string) => {
           var text = data.toString();
           console.log("DATA RESPONSE",text,"|");

//           var regex = "/Out\[\d+\]\=\s(\w+) In[\d+\]:\=/g";
           const regex = /([\.\w]+)\[\d+\]\=\s([\.\w]+)/g;
           const found : string[] | null = regex.exec(text);
           console.log("FOUND :",found);
           console.log("Result :",found && found[2]);
               })

child.stdin.write("N[3+4]\n");
child.stdin.write("N[Sqrt[13]]\n");
