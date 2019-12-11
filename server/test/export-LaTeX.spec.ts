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

// import * as debug1 from 'debug';
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`server:${MODULE}`);
import { assert } from 'chai';
import 'mocha';
// import * as sinon from 'sinon';

import { NotebookChange,  StyleObject,
         //         StyleId
       } from '../../client/notebook';
import { NotebookChangeRequest, StyleInsertRequest,
         LatexData
         //         StylePropertiesWithSubprops
       } from '../../client/math-tablet-api';
import { ServerNotebook, ObserverInstance }  from '../server-notebook';

import { SymbolClassifierObserver } from '../observers/symbol-classifier';
import { EquationSolverObserver } from '../observers/equation-solver';
import { MathematicaObserver } from '../observers/mathematica-cas';
import { TeXFormatterObserver } from '../observers/tex-formatter';
import { AnyInputObserver } from '../observers/any-input';
import { WolframObserver } from '../observers/wolfram-cas';
import { start as startWolframscript } from '../wolframscript';
import { Config, loadConfig } from '../config';
import * as fs from 'fs';
//import latex from 'node-latex';
const latex = require('node-latex')


// Test Observer

export class TestObserver implements ObserverInstance {
  static async initialize(_config: Config): Promise<void> { }
  static async onOpen(_notebook: ServerNotebook): Promise<TestObserver> { return new this(); }
  constructor() {}
  async onChangesAsync(_changes: NotebookChange[]): Promise<NotebookChangeRequest[]> { return []; }
  public onChangesSync(_changes: NotebookChange[]): NotebookChangeRequest[] { return []; }
  async onClose(): Promise<void> {}
  async useTool(_style: StyleObject): Promise<NotebookChangeRequest[]> { return []; }
}

// Unit Tests

function generateInsertRequests(inputs :string[]) : StyleInsertRequest[] {
  var reqs : StyleInsertRequest[] = [];
  for(const i of inputs) {
    reqs.push( { type: 'insertStyle',
                 styleProps: { type: 'WOLFRAM', meaning: 'INPUT', data: i } }
             );
  }
  return reqs;
}
// Supply path with no extension; we will use .tex
// for the LaTeX and .pdf for pdf by convention!
function writeLaTeX(latex : LatexData,path: string) {
  // @ts-ignore
  fs.writeFile(path+".tex", latex, (err) => {
    // throws an error, you could also catch it here
    // REVIEW: Where is this exception being caught?
    if (err) throw err;

    // success case, the file was saved
    // console.log('LaTeX Saved!');
  });
}

// Supply path with no extension; we will use .tex
// for the LaTeX and .pdf for pdf by convention!
// const input = fs.createReadStream(temp)
// @ts-ignore
function writePDFfromStream(input,path: string) {
  const output = fs.createWriteStream(path+".pdf")
  const pdf = latex(input);

  pdf.pipe(output);
  // @ts-ignore
  pdf.on('error', err => { console.error(err);
                           // REVIEW: Where is this exception being caught?
                           throw err;
                         })
  // pdf.on('finish', () => console.log('PDF generated!'))
}


// Supply path with no extension; we will use .tex
// for the LaTeX and .pdf for pdf by convention!
// @ts-ignore
function writePDFfromString(latex : LatexData,path: string) {
  writeLaTeX(latex,path);
  const input = fs.createReadStream(path+".tex");
  writePDFfromStream(input,path);
}


// const insertRequest:StyleInsertRequest[] = generateInsertRequests(data);

describe("test symbol observer", function() {
  let notebook: ServerNotebook;

  before("correctly configure stuff", async function(){
    // We can't do this test if we don't have mathematica
    const config = await loadConfig();

    // TODO: stopWolframscript before exiting.
    if (config.mathematica) { await startWolframscript(config.wolframscript); }

    if (config.mathematica) {
      await MathematicaObserver.initialize(config);
    } else {
    }
  });

  beforeEach("Reinitialize notebook",async function(){
    // Create a notebook
    notebook = await ServerNotebook.createAnonymous();

    // Register the observer
    const testObserver = await TestObserver.onOpen(notebook);
    const symbolClassifierObserver = await SymbolClassifierObserver.onOpen(notebook);
    const mathematicaObserver = await MathematicaObserver.onOpen(notebook);
    const equationSolverObserver = await EquationSolverObserver.onOpen(notebook);
    const teXFormatterObserver = await TeXFormatterObserver.onOpen(notebook);
    const anyInputObserver = await AnyInputObserver.onOpen(notebook);
    const wolframObserver = await WolframObserver.onOpen(notebook);

    notebook.registerObserver('TEST', testObserver);
    notebook.registerObserver('SYMBOL-CLASSIFIER', symbolClassifierObserver);
    notebook.registerObserver('MATHEMATICA', mathematicaObserver);
    notebook.registerObserver('EQUATION-SOLVER', equationSolverObserver);
    notebook.registerObserver('TEX-FORMATTER', teXFormatterObserver);
    notebook.registerObserver('ANY-INPUT', anyInputObserver);
    notebook.registerObserver('WOLFRAM', wolframObserver);

  });
  afterEach("Close notebook",async function(){
    // Close the notebook.
    await notebook.close();
  });

  after("onClose is called when notebook is closed", async function(){

  });


  describe("observer", function(){
    it("export LaTeX is actually generated", async function(){
      const data:string[] = [
        "X = 4",
        "X + Y",
        "X = 5",
        "X = 6",
        "Y = X^2"];
      const changeRequests = generateInsertRequests(data);
      await notebook.requestChanges('TEST', [changeRequests[0]]);
      const latexInput = notebook.exportLatex();
      // console.log(latexInput);
      assert(latexInput.length > 10,"The latex file should be at least 10 characters long:"+latexInput);

      const path = "test/tmp/basictest";

      writeLaTeX(latexInput,path);
      const input = fs.createReadStream(path+".tex")
      writePDFfromStream(input,path);

      writePDFfromString(latexInput,path);
    });
  });
});
