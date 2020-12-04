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

import * as fs from "fs";

// import * as debug1 from "debug";
// const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
// const debug = debug1(`tests:${MODULE}`);
import { assert } from "chai";
const latex = require('node-latex'); // REVIEW: why not import?
import 'mocha';
// import * as sinon from "sinon";

import { FormulaCellObject, PlainTextFormula } from "../shared/formula";
import { InsertCellRequest, TexExpression } from "../shared/math-tablet-api";
import { ServerNotebook }  from "../server-notebook";

import { ensureGlobalLoaded } from "./global";
import { CellType, InputType } from "../shared/cell";
import { EMPTY_SVG, PlainText } from "../shared/common";
ensureGlobalLoaded();

// Unit Tests

describe("LaTeX export tests", function() {

  let notebook: ServerNotebook;
  beforeEach(async function(){ notebook = await ServerNotebook.openEphemeral(); });
  afterEach(function(){ notebook.close(); });

  it("export LaTeX is actually generated", async function(){
    const data:PlainTextFormula[] = [
      <PlainTextFormula>"X = 4",
      <PlainTextFormula>"X + Y",
      <PlainTextFormula>"X = 5",
      <PlainTextFormula>"X = 6",
      <PlainTextFormula>"Y = X^2",
    ];
    const changeRequests = generateInsertRequests(data);
    await notebook.requestChange('TEST', changeRequests[0]);
    const latexInput = await notebook.exportLatex();
    // console.log(latexInput);
    assert(latexInput.length > 10,"The latex file should be at least 10 characters long:"+latexInput);

    // TODO: Use TMPDIR environment variable instead of having a directory in the repository.
    // TODO: Delete the file after verifying that it was created.
    const path = "src/test/tmp/basictest";

    writeLaTeX(latexInput,path);
    const input = fs.createReadStream(path+".tex")
    writePDFfromStream(input,path);

    writePDFfromString(latexInput,path);
  });
});

// Helper Functions

function generateInsertRequests(inputs: PlainTextFormula[]) : InsertCellRequest[] {
  var reqs : InsertCellRequest[] = [];
  for(const wolframData of inputs) {
    const formulaData: FormulaCellObject = {
      type: CellType.Formula,
      inputType: InputType.None,
      height: 72, // points
      inputText: <PlainText>wolframData,
      plainTextFormula: wolframData,
    };
    reqs.push({
      type: 'insertEmptyCell',
      cellObject: {
        role: 'FORMULA',
        type: 'FORMULA-DATA',
        data: formulaData,
      }
    });
  }
  return reqs;
}

// Supply path with no extension; we will use .tex
// for the LaTeX and .pdf for pdf by convention!
function writeLaTeX(latex : TexExpression,path: string) {
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
function writePDFfromString(latex : TexExpression,path: string) {
  writeLaTeX(latex,path);
  const input = fs.createReadStream(path+".tex");
  writePDFfromStream(input,path);
}

