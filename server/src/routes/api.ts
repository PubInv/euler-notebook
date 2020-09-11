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

import * as debug1 from "debug";
const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

import { NextFunction, Request, Response, Router } from "express";

import { escapeHtml, StyleId, StyleObject } from "../shared/notebook";
import { DebugParams, DebugResults, SymbolTable } from "../shared/math-tablet-api";

import { ServerNotebook } from "../server-notebook";

import { execute } from "../wolframscript";

// Types

// Constants

// Globals

// Exports

export var router = Router();

// Routes

// Prototype API call:

router.post('/debug', async function(req: Request, res: Response, _next: NextFunction) {
  try {
    const params: DebugParams = req.body;
    const notebook = await ServerNotebook.open(params.notebookPath, { mustExist: true });
    try {
      const styleId = params.styleId || notebook.topLevelStyleOrder().slice(-1)[0];
      const style = notebook.getStyle(styleId);
      var sym_table : SymbolTable  = await obtainFormulaeInContext(notebook, style);
      const html = formatSymTable(styleId, sym_table);
      const results: DebugResults = { html };
      res.json(results);
    } finally {
      notebook.close();
    }
  } catch (err) {
    // TODO: Distinguish 400 from 500 responses
    console.error(`Error in /debug API: ${err.message}`)
    debug(err.stack);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// HELPER FUNCTIONS

// TODO: Make this accept a set of style instead, so it is generic
// to any set of formulae; we can invoke it by collecting top-level styles
// up to the current point
async function obtainFormulaeInContext(notebook: ServerNotebook, style: StyleObject) : Promise<SymbolTable> {
  var tls = notebook.topLevelStyleOrder();
  var ctxpos = notebook.topLevelStylePosition(style.id);
  var context_forms = tls.filter(s =>
                                 notebook.topLevelStylePosition(s) <= ctxpos
                                 &&
                                 notebook.getStyle(s).type == 'FORMULA-DATA');

  var exprs_styles = context_forms.map(s =>
                                       notebook.getStyle(s));

  // These styles should be moved out...
  // Some of these may be empty, though that is probably wrong on our part...
  var exprs = exprs_styles.map(s => notebook.findStyle({role: 'REPRESENTATION', type: 'WOLFRAM-EXPRESSION'},s.id)!.data).filter(x => x);

  var symbols : string[] = [];
  var use_styles: StyleObject[] = [];
  var def_styles: StyleObject[] = [];

  exprs_styles.forEach( s => {
    debug("xxx",notebook.findStyles(
      { role : 'SYMBOL-USE' , type: 'SYMBOL-DATA',recursive: true },s.id,use_styles));
  });

  exprs_styles.forEach( s => {
    debug("yyy",notebook.findStyles(
      { role : 'SYMBOL-DEFINITION' , type: 'SYMBOL-DATA', recursive: true },s.id,def_styles))
  })
  debug("use_styles",use_styles);
  debug("def_styles",def_styles);


  // WARNING: This adds duplicate symbols. This does not appear to be a problem
  // for Wolfram but it makes it messy and harder to understand. These
  // strings could just be de-dupped.
  use_styles.forEach(s => symbols.push(s.data.name));
  def_styles.forEach(s => symbols.push(s.data.name));

  var sym_table : SymbolTable = {};
  // Experimental attempt to use wolfram "solver" function...
  if (symbols.length > 0) {
    var symbols_in_curlies = symbols.join(',');

    // Assignments in these expressions are not allowed; nonetheless we ahve bene rather ambigous as to
    // whether a single or double = is required. We are at
    exprs = exprs.map(str => str.replace(/=/g, "=="));

    // WARNING: This needs to be strengthened to check not for equality,
    // but any constraining relation (such as <) should be legal. However,
    // Wolfram does requires each expression to be a constraing of some kind,
    // so we need a modestly sophisticated test for that.
    exprs = exprs.filter(x => x.includes("=="));

    var formulae_anded = exprs.join(' && ');
    var code = `ExportString[InputForm[Solve[${formulae_anded}, {${symbols_in_curlies}}]],"ExpressionJSON"]`;
    debug("code = ",code);
    var results = await execute(code);
    debug("results = ",results,typeof(results));


    // WARNING: This only parses the most simple output.
    // We need a more general parsing to handle all of the
    // solutions that can be returned by Wolfram.
    // Possibly this should be moved to a top level function.
    function convert_wolfram_solver_results_to_object(solutions: string) : SymbolTable {
      var table = JSON.parse(solutions);
      var sym_table : SymbolTable = {};
      var inner0 = table[1];
      if (inner0.length < 2) return sym_table;
      for(var i = 1; i < inner0[1].length; i++) {
        var solution = inner0[1][i];
        sym_table[solution[1]] = [ solution[2] ];
      }
      return sym_table;
    }
    var table = convert_wolfram_solver_results_to_object(results);
    debug("table =", table);
    return table;
  }
  return sym_table;
}

function formatSymTable(styleId: StyleId, symTable: SymbolTable): string /* TYPESCRIPT: HTML */ {
  let html = `<table border="1"><tr><td colspan="2">Symbol Table for Style ${styleId}</td></tr>`
  for (const [ symbol, values ] of Object.entries(symTable)) {
    html += `<tr><td>${escapeHtml(symbol)}</td><td>${values.map(v=>escapeHtml(v.toString())).join("; ")}</td></tr>`;
  }
  html += `</table>`
  return html;
}
