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

// REVIEW: Have a "read-only" notebook that only lets you read but not make any changes?
//         This would enforce all changes being made through the observer interfaces
//         rather than directly on the notebook.

// Requirements

import * as debug1 from 'debug';

import { assert } from 'chai';
import {
  Notebook, NotebookObject, NotebookChange, StyleObject, StyleRole, StyleType, StyleSource, StyleId,
  RelationshipObject, StyleMoved, StylePosition, VERSION, StyleChanged, RelationshipDeleted,
  RelationshipInserted, StyleIdDoesNotExistError, StyleInserted, StyleDeleted, StyleConverted
} from '../client/notebook';
import {
  NotebookChangeRequest, StyleMoveRequest, StyleInsertRequest, StyleChangeRequest,
  RelationshipDeleteRequest, StyleDeleteRequest, RelationshipInsertRequest,
  StylePropertiesWithSubprops, ChangeNotebookOptions, LatexData, NotebookPath, StyleConvertRequest
} from '../client/math-tablet-api';

import {
  readNotebookFile, AbsDirectoryPath, absDirPathFromNotebookPath, writeNotebookFile,
} from './files-and-folders';
import { constructSubstitution } from './wolframscript';
import { ClientObserver } from './observers/client-observer';
import { ClientId } from './client-socket';

// import { v4 as uuid } from 'uuid';

const fs = require('fs');
const path = require('path');

const svg2img = require('svg2img');

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Types

export interface ObserverInstance {
  onChangesAsync: (changes: NotebookChange[]) => Promise<NotebookChangeRequest[]>;
  onChangesSync: (changes: NotebookChange[]) => NotebookChangeRequest[];
  onClose: ()=>Promise<void>;
  useTool: (styleObject: StyleObject) => Promise<NotebookChangeRequest[]>;
}

export interface ObserverClass {
  onOpen: (notebook: ServerNotebook)=>Promise<ObserverInstance>;
}

export interface RequestChangesOptions extends ChangeNotebookOptions {
  clientId?: ClientId;
}

interface StyleOrderMapping {
  sid: StyleId;
  tls: number;
}

// Constants

const MAX_CHANGE_ROUNDS = 10;

// Helper Functions
// TODO: Rewrite this to using findStyles
export function assertHasStyle(styles: StyleObject[], type: StyleType, role: StyleRole, data: any): StyleObject {
  const style = styles.find(s=>s.type==type && s.role==role && s.data==data);
  assert.exists(style);
  return style!;
}


// Exported Class

export class ServerNotebook extends Notebook {

  // Class Properties

  // Note: contrary to the name, this only returns persistent notebooks.
  public static allNotebooks(): IterableIterator<ServerNotebook> {
    return this.persistentNotebooks.values();
  }

  // Class Methods

  public static async close(notebookName: NotebookPath): Promise<void> {
    const instance = this.persistentNotebooks.get(notebookName);
    if (!instance) { throw new Error(`Unknown notebook ${notebookName} requested in close.`); }
    await instance.close();
  }

  public static async closeAll(): Promise<void> {
    debug(`closing all: ${this.persistentNotebooks.size}`);
    const notebooks = Array.from(this.persistentNotebooks.values());
    const promises = notebooks.map(td=>td.close());
    await Promise.all(promises);
  }

  public static async create(notebookPath: NotebookPath): Promise<ServerNotebook> {
    const openNotebook = this.persistentNotebooks.get(notebookPath);
    if (openNotebook) { throw new Error(`A notebook with that name already exists: ${notebookPath}`); }
    const notebook = new this(notebookPath);
    await notebook.initialize(this.observerClasses);
    await notebook.save();
    this.persistentNotebooks.set(notebookPath, notebook);
    return notebook;
  }

  public static async createAnonymous(): Promise<ServerNotebook> {
    const notebook = new this();
    await notebook.initialize(this.observerClasses);
    return notebook;
  }

  public static async open(notebookPath: NotebookPath): Promise<ServerNotebook> {
    // If the document is already open, then return the existing instance.
    const openNotebook = this.persistentNotebooks.get(notebookPath);
    if (openNotebook) { return openNotebook; }
    const json = await readNotebookFile(notebookPath);
    const notebook = await this.fromJSON(json, notebookPath);
    this.persistentNotebooks.set(notebookPath, notebook);
    return notebook;
  }

  public static registerObserver(source: StyleSource, observerClass: ObserverClass): void {
    debug(`Registering observer: ${source}`);
    this.observerClasses.set(source, observerClass);
  }

  // NFC: Move this to instance methods section.
  // I think "variables" should be a parameter...
  // That parameter will be different when used by
  // SUBTRIVARIATE, and when used by EQUATION
  public substitutionExpression(text: string,variables : string[],style: StyleObject) : [string[],string] {

      // The parent of the TOOL/ATTRIBUTE style will be a WOLFRAM/EVALUATION style
    const evaluationStyle = this.getStyle(style.parentId);

    // We are only plottable if we make the normal substitutions...
    const rs = this.getSymbolStylesIDependOn(evaluationStyle);
    debug("RS",rs);

    var cvariables  = [...variables];

    const namevalues = rs.map(
                              s => {
                                cvariables = cvariables.filter(ele => (
                                  ele != s.data.name));
                                return { name: s.data.name,
                                         value: s.data.value};
                              });

    const sub_expr =
      constructSubstitution(text,
                            namevalues);
    return [cvariables,sub_expr];
  }

  // Instance Properties

  // NOTE: Properties with an underscore prefix are not persisted.
  public _path?: NotebookPath;  // TODO: Don't need underscore prefix.

  // Instance Property Functions

  public absoluteDirectoryPath(): AbsDirectoryPath {
    if (!this._path) { throw new Error("No path for anonymous notebook."); }
    return absDirPathFromNotebookPath(this._path);
  }

  public async exportLatex(): Promise<LatexData> {
    const ourPreamble = `\\documentclass[12pt]{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage[normalem]{ulem}
\\usepackage{graphicx}
\\usepackage{epstopdf}
\\epstopdfDeclareGraphicsRule{.gif}{png}{.png}{convert gif:#1 png:\\OutputFile}
\\AppendGraphicsExtensions{.gif}
\\begin{document}
\\title{Magic Math Table}
\\author{me}
\\maketitle
`;
    const close = `\\end{document}`;

    // Our basic approach is to apply a function to each
    // top level style in order. This function will preferentially
    // take the LaTeX if there is any.
    function displayFormula(f : string) : string {
      return `\\begin{align}\n ${f} \\end{align}\n`;
    }
    function renderHintAsIndependent(hint: string, relationship: number, from: number, to: number, status: number) : string {
      // a checkmark or an X for monochrome rendering.
      const statussym = (status == 1) ? "\\checkmark" : "\\sout{\\checkmark}";

      // TODO: I don't what the other statuses are supposed to be!
      const relationsym = (relationship == 1) ? "\\equiv" : "\\implies";
      return `$ ${relationsym} ${statussym} $ \\{  ${hint} \\}  $ (${from}) \\mapsto (${to}) $`;
    }
    const tlso = this.topLevelStyleOrder();
    const cells = [];
    debug("TOP LEVEL",tlso);
    for(const tls of tlso) {
      var retLaTeX = "";
      const styleObject = this.getStyle(tls);
      if (styleObject.role == 'HINT') {
        if (styleObject.type == 'HINT-DATA') {

          // TODO: This will be off in terms of equation numbering. We need to decide
          // If we should number by notebook numbers of equational order! It is currently inconsistent.
          const from_id = this.topLevelStyleOf(styleObject.data.fromId).id;
          console.log("from",from_id);
          const to_id = this.topLevelStyleOf(styleObject.data.toId).id;
          console.log("to",to_id);
          const status = styleObject.data.status;
          console.log("from",from_id);
          const relationship = styleObject.data.relationship;

          const reps = this.findStyles({ type: 'TEXT', recursive: true }, tls);
          var hint = "";
          for(const r of reps) {
            hint += r.data;
          }
          retLaTeX += renderHintAsIndependent(hint,relationship,from_id,to_id,status);
        } else {
          console.error("HINT role of type other than HINT-DATA not implemented");
        }
      } else {
        // REVIEW: Does this search need to be recursive?
        const latex = this.findStyles({ type: 'LATEX', recursive: true }, tls);
        if (latex.length > 1) { // here we have to have some disambiguation
          retLaTeX += "ambiguous: " +displayFormula(latex[0].data);
        } else if (latex.length == 1) {  // here it is obvious, maybe...
          retLaTeX += displayFormula(latex[0].data);
        }


        // REVIEW: Does this search need to be recursive?
        const image = this.findStyles({ type: 'IMAGE', role: 'PLOT', recursive: true }, tls);
        if (image.length > 0) {
          const plot = image[0];
          const apath = this.absoluteDirectoryPath();
          // The notebook name is both a part of the plot.data,
          // AND is a part of the absolute path. So we take only
          // the final file name of local.data here.
          const final = plot.data.split("/");
          const graphics = `\\includegraphics{${apath}/${final[2]}}`;
          retLaTeX += graphics;
          retLaTeX += `\n`;
          if (image.length > 1) {
            retLaTeX += " more than one plot, not sure how to handle that";
          }
        }
        // Now we search for .PNGs --- most likely generated from
        // .svgs, but not necessarily, which allows the possibility
        // of photographs being included in output later.
        // REVIEW: Does this search need to be recursive?
        const svgs = this.findStyles({ type: 'SVG', recursive: true }, tls);

        debug("SVGS:",svgs);
        debug("tlso:",styleObject);
        for(const s of svgs) {
          // NOTE: At present, this is using a BUFFER, which is volatile.
          // It does not correctly survive resets of the notebook.
          // In fact when we output the file to a file, we need to change
          // the notebook do have a durable 'PNG-FILE' type generated from
          // the buffer. This may seem awkward, but it keeps the
          // function "ruleConvertSvgToPng" completely pure and static,
          // which is a paradigm worth preserving. However, this means
          // we have to handle the data being null until we have consistent
          // file handling.
          if (s.data) {
            // from : https://stackoverflow.com/questions/5010288/how-to-make-a-function-wait-until-a-callback-has-been-called-using-node-js
            // myFunction wraps the above API call into a Promise
            // and handles the callbacks with resolve and reject
            function apiFunctionWrapper(data: string) : Promise<Buffer> {
              // @ts-ignore
              return new Promise((resolve, reject) => {
                // @ts-ignore
                svg2img(data,function(error, buffer) {
                  resolve(buffer);
                });
              });
            };

            function getTimeStampOfCompatibleFileName(id:number, name: string) : number|undefined{
              const parts = name.split('-');
              if (parts.length < 3) return;
              if (parseInt(parts[1]) != id) return;
              const third = parts[2];
              const nametsAndExtension = third.split('.');
              if (nametsAndExtension.length < 2) return;
              return parseInt(nametsAndExtension[0]);
            }


            function fileIsEarlierVersionThan(id:number, ts : string|undefined,name: string) : boolean {
              if (!ts) return false;
              const filets = getTimeStampOfCompatibleFileName(id, name);
              if (filets) {
                return parseInt(ts) > filets;
              } else {
                return false;
              }
            }

            function fileIsLaterVersionThan(id:number, ts : string|undefined,name: string) : boolean {
              if (!ts) return false;
              const filets = getTimeStampOfCompatibleFileName(id, name);
              if (filets) {
                return parseInt(ts) < filets;
              } else {
                return false;
              }
            }
            const b: Buffer = await apiFunctionWrapper(s.data);
            const ts = Date.now();
            console.log(tls);
            console.log(ts);
            const filename = `image-${s.id}-${ts}.png`;
            console.log("filename",filename);
            const apath = this.absoluteDirectoryPath();
            var abs_filename = `${apath}/${filename}`;
            const directory = apath;

            var foundfile = "";
            debug("BEGIN",directory);
            // @ts-ignore
            var files = fs.readdirSync(directory);
            debug("files",files);
            for (const file of files) {
              // I don't know why this is needed!
              if (fileIsLaterVersionThan(s.id,s.timestamp,file)) {
                foundfile = file;
              }
            }
            debug("END");
            if (foundfile) {
              abs_filename = `${apath}/${foundfile}`;
            } else {
              fs.writeFileSync(abs_filename, b);
              debug("directory",directory);
              var files = fs.readdirSync(directory);

              for (const file of files) {
                debug("file",file);
                // I don't know why this is needed!
                if (fileIsEarlierVersionThan(s.id,""+ts,file)) {
                  // @ts-ignore
                  fs.unlink(path.join(directory, file), err  => {
                    if (err) throw err;
                  });
                }
              }
            }
            const graphics = `\\includegraphics{${abs_filename}}`;
            retLaTeX += graphics;
          }
        }
      }
      cells.push(retLaTeX);
    }

    const finalTeX = ourPreamble +
      cells.join('\n') +
      close;
    debug("finalTeX", finalTeX);
    return finalTeX;
  }

  // Find the def whose top level symbol appears just before this one.
  public findLatestDefinitionEarlierThanThis(thoughtIndex : number,defs : StyleOrderMapping[]) : StyleId | null {
    var curi = -1;
    var curtlspos = -1;
    for(var i = 0; i < defs.length; i++) {
      var pos = this.topLevelStylePosition(defs[i].tls);
      if ((pos < thoughtIndex) &&
          (pos > curtlspos))
      {
        curtlspos = pos;
        curi = i;
      }
    }
    // Now we hope cur is the currect object...
    return curi < 0 ? null : defs[curi].sid;
  }

  // Return all StyleObjects which are Symbols for which
  // there is a Symbol Dependency relationship with this
  // object as the the target
  // Note: The defintion is the "source" of the relationship
  // and the "use" is "target" of the relationship.
  public getSymbolStylesIDependOn(style:StyleObject): StyleObject[] {
    // simplest way to do this is to iterate over all relationships,
    // computing the source and target thoughts. If the target thought
    // is the same as our ancestor thought, then we return the
    // source style, which should be of type Symbol and role Definition.
    const rs = this.allRelationships();
    var symbolStyles: StyleObject[] = [];
    const mp = this.topLevelStyleOf(style.id);
    // TODO: Remove this check. topLevelStyleOf will throw error if style not found.
    if (!mp) {
      throw new Error(`INTERNAL ERROR: did not produce ancenstor: ${style.id}`);
    }
    rs.forEach(r => {
      try {  // TODO: I don't know why this can be an error....
        // doing a catch here seems to make it work but this is a concurrency
        // problem, one way or another...we should not have relationship
        // that is not pointing to something, though of course concurrent
        // operation makes this difficult.
        const rp = this.topLevelStyleOf(r.toId);
        // TODO: Remove this check. topLevelStyleOf will throw error if style not found.
        if (!rp) {
          throw new Error(`INTERNAL ERROR: did not produce ancenstor: ${style.id}`);
        }
        if (rp.id == mp.id) {
          // We are a user of this definition...
          try {
            symbolStyles.push(this.getStyle(r.fromId));
          } catch (Error) {
            // REVIEW: Proper error handling??
            console.error(`GSSIDO Error: fromId ${r.fromId} missing (inner)`);
            // console.error(this);
          }

        }
      } catch (Error) {
        // REVIEW: Proper error handling??
        console.error(`GSSIDO Errior: fromId ${r.fromId} missing (outer)`);
        // console.error(this);
      }
    });
    return symbolStyles;
  }

  public getSymbolStylesThatDependOnMe(style:StyleObject): StyleObject[] {
    const rs = this.allRelationships();
    var symbolStyles: StyleObject[] = [];
    rs.forEach(r => {
      if (r.fromId == style.id) {
        try {
          symbolStyles.push(this.getStyle(r.toId));
        } catch (e) {
          if (e instanceof StyleIdDoesNotExistError) {
          } else {
            throw new Error("Internal Error"+e.name);
          }
        }
      }
    });
    return symbolStyles;
  }

  public toJSON(): NotebookObject {
    const rval: NotebookObject = {
      nextId: this.nextId,
      relationshipMap: this.relationshipMap,
      styleMap: this.styleMap,
      styleOrder: this.styleOrder,
      version: VERSION,
    }
    return rval;
  }

  // Instance Methods

  public async close(): Promise<void> {
    // TODO: Ensure notebook is not in the middle of processing change requests or saving.
    if (this.closed) { throw new Error("Closing notebook that is already closed."); }
    debug(`closing: ${this._path}`);
    this.closed = true;
    if (this._path) { ServerNotebook.persistentNotebooks.delete(this._path); }
    await Promise.all(Array.from(this.observers.values()).map(o=>o.onClose()));
    for (const observer of this.clientObservers.values()) {
      observer.onClose();
    };

    debug(`closed: ${this._path}`);
  }

  public deregisterClientObserver(clientId: ClientId): void {
    const deleted = this.clientObservers.delete(clientId);
    if (!deleted) {
      console.error(`Cannot deregister non-registered client observer: ${clientId}`);
    }
  }

  public registerClientObserver(clientId: ClientId, instance: ClientObserver): void {
    this.clientObservers.set(clientId, instance)
  }

  public registerObserver(source: StyleSource, instance: ObserverInstance): void {
    this.observers.set(source, instance);
  }

  public deRegisterObserver(source: StyleSource): void {
    this.observers.delete(source);
  }

  // This is intended to be used by tests; it is slightly
  // inefficient. I think DEJ wants us to incrementally recompute everything,
  // but especially in the presence of concurrency we need a standard to
  // test against.
  // The algorithm is straightforward:
  // If we are "use", we create a relationship based on the last (in thought order)
  // definition that matches our symbol.

  // TODO: This is not handling equivalence relationships.
  // For the purpose of testing we possibly have to deal with that.
  public recomputeAllSymbolRelationships() : RelationshipObject[] {
    // I am attempting here to code the most straight-forward and simplest
    // algorithm I can think of without regard to performance.
    // 1) Compute the set of all symbols in the notebook.
    // 2) For each symbol s:
    //    A) produce an array of all uses and defintions of that
    // symbol (these will be style ids). Sort by top level thought order.
    //    B) produce an array of all definitions of that symbol.
    //  Sort by top level thought order.
    //    C) Run a loop over uses, establishing a relation on the use
    // to the most recent (thought order) definition
    //    D) Run a a loop over definitions, starting from the second.
    // Establish DUPLICATE-DEFINITION relationships
    const tlso = this.topLevelStyleOrder();
    const symbols : Set<string> = new Set<string>();

    tlso.forEach( tls => {
      // console.error("operating on tls:",tls);
      // REVIEW: Does this search need to be recursive?
      const syms = this.findStyles({ type: 'SYMBOL', recursive: true }, tls);
      syms.forEach(sym => {
        const s = sym.data.name;
        symbols.add(s);
      }
                  );
    });

    return this.recomputeAllSymbolRelationshipsForSymbols(symbols);
  }

  public recomputeAllSymbolRelationshipsForSymbols(symbols: Set<string> ) : RelationshipObject[] {
    interface SymbolToMap {
      [key: string]: StyleOrderMapping[];
    }
    const uses : SymbolToMap = {};
    const defs : SymbolToMap = {};

    const tlso = this.topLevelStyleOrder();
    tlso.forEach( tls => {
      // console.error("operating on tls:",tls);
      // REVIEW: Does this search need to be recursive?
      const syms = this.findStyles({ type: 'SYMBOL', recursive: true }, tls);
      syms.forEach(sym => {
        const s = sym.data.name;
        if (symbols.has(s)) {
          if (sym.role == 'SYMBOL-USE') {
            if (!(s in uses))
              uses[s] = [];
            uses[s].push({ sid: sym.id, tls: tls});
          }
          if (sym.role == 'SYMBOL-DEFINITION') {
            if (!(s in defs))
              defs[s] = [];
            defs[s].push({ sid: sym.id, tls: tls});
          }
        }
      });
    });

    const rs : RelationshipObject[] = [];


    // Now hopefully defs and uses are maps of all symbols properly ordered...
    // Build the symbol use relationships...
    symbols.forEach( sym => {
      const us = uses[sym];
      const ds = defs[sym];
      if (us) {
        for(var i = 0; i < us.length; i++) {
          const fromId : number | null =
            this.findLatestDefinitionEarlierThanThis(
              this.topLevelStylePosition(us[i].tls),
              ds);


          if (fromId) {
            // console.error("fromId for i",fromId,us[i]);
            // Since we are not at present injecting into the notebook,
            // the id will remain -1.
            var r : RelationshipObject = {
              source: 'TEST',
              id: -1,
              fromId: fromId,
              toId: us[i].sid,
              role: 'SYMBOL-DEPENDENCY',
            };
            rs.push(r);
          } else {
            // REVIEW: Throw exception??
            console.error("fromId not found:",us[i],ds);
          }
        }
      }
    });

    // Now handle the duplicate definitions....
    symbols.forEach( sym => {
      const ds = defs[sym];

      // TODO: this needs to be a key iteration, not a number iteration!
      for(var i = 0; i < ds.length; i++) {
        const fromId  : number | null =
          this.findLatestDefinitionEarlierThanThis(
            this.topLevelStylePosition(ds[i].tls),
            ds);

        // Since we are not at present injecting into the notebook,
        // the id will remain -1.
        if (fromId) {
          var r : RelationshipObject = {
            source: 'TEST',
            id: -1,
            fromId: fromId,
            toId: ds[i].sid,
            role: 'DUPLICATE-DEFINITION',
          };
          rs.push(r);
        }
      }
    });

    // console.error("RS = ",rs);
    // Now I am not producing "EQIVALENCE" meanings...
    // However, those are a function of evaluation, and so are quite different.
    return rs;

  }

  public async requestChanges(
    source: StyleSource,
    changeRequests: NotebookChangeRequest[],
    options?: RequestChangesOptions,
  ): Promise<NotebookChange[]> {
    // Applies the change requests to the notebook,
    // then runs the resulting changes through all of the
    // observers synchronously, until there are no more changes,
    // or we reach a limit.

    this.assertNotClosed('requestChanges');
    options = options || {};
    debug(`requestChanges ${changeRequests.length}`);

    // Make the requested changes to the notebook.
    const changes: NotebookChange[] = [];
    const undoChangeRequests = this.applyRequestedChanges(source, changeRequests, changes);
    const newSyncChanges = this.processChangesSync(changes);
    const allSyncChanges = changes.concat(newSyncChanges);
    this.notifyClientsOfChanges(allSyncChanges, undoChangeRequests, options, false);
    const asyncChanges = await this.processChangesAsync(allSyncChanges);
    this.notifyClientsOfChanges(asyncChanges, undefined, options, true);

    if (this._path) { await this.save(); }

    return allSyncChanges.concat(asyncChanges);
  }

  public reserveId(): StyleId {
    const styleId = this.nextId++;
    this.reservedIds.add(styleId);
    return styleId;
  }

  public async useTool(styleId: StyleId): Promise<NotebookChange[]> {
    debug(`useTool ${styleId}`);
    this.assertNotClosed('useTool');
    const style = this.getStyle(styleId);
    const source = style.source;
    if (!style) { throw new Error(`Notebook useTool style ID not found: ${styleId}`); }
    const observer = this.observers.get(source);
    const changeRequests = await observer!.useTool(style);
    const changes = await this.requestChanges(source, changeRequests);
    return changes;
  }

  // --- PRIVATE ---

  // Private Class Properties

  private static observerClasses: Map<StyleSource, ObserverClass> = new Map();
  private static persistentNotebooks = new Map<NotebookPath, ServerNotebook>();

  // Private Class Methods

  private static async fromJSON(json: /* TYPESCRIPT: JSON string type? */ string, notebookPath: NotebookPath): Promise<ServerNotebook> {
    const obj = JSON.parse(json);
    const notebook = new this(notebookPath, obj);
    await notebook.initialize(this.observerClasses);
    return notebook;
  }

  // Private Constructor

  private constructor(
    notebookPath?: NotebookPath,
    obj?: NotebookObject
  ) {
    super(obj);
    this.clientObservers = new Map();
    this.observers = new Map();
    this._path = notebookPath;
    this.reservedIds = new Set();
  }

  // Private Instance Properties

  // TODO: purge changes in queue that have been processed asynchronously.
  private clientObservers: Map<ClientId, ClientObserver>;
  private closed?: boolean;
  private observers: Map<StyleSource, ObserverInstance>;
  private reservedIds: Set<StyleId>;
  private saving?: boolean;

  // Private Instance Property Functions

  private assertNotClosed(action: string): void {
    if (this.closed) { throw new Error(`Attempting ${action} on closed notebook.`); }
  }

  // Private Instance Methods

  private appendChange(
    source: StyleSource,
    change: NotebookChange,
    rval: NotebookChange[],
  ): void {
    debug(`Applying change from ${source}: ${JSON.stringify(change)}`);
    this.applyChange(change);
    rval.push(change);
  }

  private applyRequestedChanges(
    source: StyleSource,
    changeRequests: NotebookChangeRequest[],
    rval: NotebookChange[],
  ): NotebookChangeRequest[] {
    const undoChangeRequests: NotebookChangeRequest[] = [];
    for (const changeRequest of changeRequests) {

      if (!changeRequest) {
        // REVIEW: Should not get null change requests.
        console.error("WARNING: falsy notebook change request.");
        continue;
      }

      // debug(`Change request from ${source}: ${JSON.stringify(changeRequest)}`);

      let undoChangeRequest: NotebookChangeRequest|undefined;
      switch(changeRequest.type) {
        case 'changeStyle':         undoChangeRequest = this.applyStyleChangeRequest(source, changeRequest, rval); break;
        case 'convertStyle':        undoChangeRequest = this.applyStyleConvertRequest(source, changeRequest, rval); break;
        case 'deleteRelationship':  undoChangeRequest = this.applyRelationshipDeleteRequest(source, changeRequest, rval); break;
        case 'deleteStyle':         undoChangeRequest = this.applyStyleDeleteRequest(source, changeRequest, rval); break;
        case 'insertRelationship':  undoChangeRequest = this.applyRelationshipInsertRequest(source, changeRequest, rval); break;
        case 'insertStyle':         undoChangeRequest = this.applyStyleInsertRequest(source, changeRequest, rval); break;
        case 'moveStyle':           undoChangeRequest = this.applyStyleMoveRequest(source, changeRequest, rval); break;
        default:
          throw new Error(`Unexpected change request type ${(<any>changeRequest).type}`);
      }
      if (undoChangeRequest) {
        // debug(`Undo change request is: ${JSON.stringify(undoChangeRequest)}`);
        undoChangeRequests.unshift(undoChangeRequest);
      }

    }
    return undoChangeRequests;
  }

  private applyRelationshipDeleteRequest(
    source: StyleSource,
    request: RelationshipDeleteRequest,
    rval: NotebookChange[],
  ): RelationshipInsertRequest|undefined {
    if (!this.hasRelationshipId(request.id)) { /* REVIEW/TODO emit warning */ return undefined; }
    const relationship = this.getRelationship(request.id);
    const change: RelationshipDeleted = { type: 'relationshipDeleted', relationship, };
    this.appendChange(source, change, rval);
    const undoChangeRequest: RelationshipInsertRequest = {
      type: 'insertRelationship',
      fromId: relationship.fromId,
      toId: relationship.toId,
      props: { role: relationship.role },
    }
    return undoChangeRequest;
  }

  private applyRelationshipInsertRequest(
    source: StyleSource,
    request: RelationshipInsertRequest,
    rval: NotebookChange[],
  ): RelationshipDeleteRequest {
    const relationship: RelationshipObject = {
      id: this.nextId++,
      source,
      fromId: request.fromId,
      toId: request.toId,
      ...request.props,
    };
    const change: RelationshipInserted = { type: 'relationshipInserted', relationship };
    this.appendChange(source, change, rval);
    const undoChangeRequest: RelationshipDeleteRequest = {
      type: 'deleteRelationship',
      id: relationship.id,
    };
    return undoChangeRequest;
  }

  private applyStyleChangeRequest(
    source: StyleSource,
    request: StyleChangeRequest,
    rval: NotebookChange[],
  ): StyleChangeRequest {
    const style = this.getStyle(request.styleId);
    const previousData = style.data;
    style.data = request.data;
    const change: StyleChanged = { type: 'styleChanged', style, previousData };
    this.appendChange(source, change, rval);
    const undoChangeRequest: StyleChangeRequest = {
      type: 'changeStyle',
      styleId: style.id,
      data: previousData,
    }
    return undoChangeRequest;
  }

  private applyStyleConvertRequest(
    source: StyleSource,
    request: StyleConvertRequest,
    rval: NotebookChange[],
  ): StyleConvertRequest {
    const style = this.getStyle(request.styleId);
    const previousRole = style.role;
    const previousSubrole = style.subrole;
    style.role = request.role;
    style.subrole = request.subrole;
    const change: StyleConverted = { type: 'styleConverted', styleId: style.id, role: request.role, subrole: request.subrole };
    this.appendChange(source, change, rval);
    const undoChangeRequest: StyleConvertRequest = {
      type: 'convertStyle',
      styleId: style.id,
      role: previousRole,
      subrole: previousSubrole,
    }
    return undoChangeRequest;
  }

  private applyStyleDeleteRequest(
    source: StyleSource,
    request: StyleDeleteRequest,
    rval: NotebookChange[],
  ): StyleInsertRequest|undefined {

    var style: StyleObject;
    try {
      style = this.getStyle(request.styleId);
    } catch(e) {
      if(e instanceof StyleIdDoesNotExistError) {
        // This may be sloppy thought, but it is the best I can do.
        // I don't know if concurrency makes this an inevitable happenstance,
        // or if a coding error has produced this. The way this arose
        // makes me think the latter---our code is probably creating a
        // "double delete" somewhere. This is the best I can do for now,
        // and I have created a test that covers the bug that led me
        // here. - rlr
        debug("requested to delete unknown style",request.styleId);
        return undefined;
      } else {
        throw e;
      }
    }

    // Assemble the undo change request before we delete anything
    // from the notebook.
    // TODO: gather substyles and relationships from the same source, etc.
    const styleProps: StylePropertiesWithSubprops = {
      type: style.type,
      role: style.role,
      data: style.data,
    };
    const undoChangeRequest: StyleInsertRequest = {
      type: 'insertStyle',
      // TODO: afterId
      // TODO: parentId
      styleProps,
    };

    // Delete substyles recursively
    const substyles = this.childStylesOf(style.id);
    for(const substyle of substyles) {
      const request2: StyleDeleteRequest = { type: 'deleteStyle', styleId: substyle.id };
      this.applyStyleDeleteRequest(source, request2, rval);
    }

    // // Delete any relationships attached to this style.
    // Note: We actually can't do this automatically.
    // Although deleting a "from" or "to" style in a relationship
    // certainly invalidates that relationship, we may need the
    // relationship to compute how to "repair" or "reroute" the dependency
    // const relationships = this.relationshipsOf(id);
    // for(const relationship of relationships) {
    //   changes.push(this.deleteRelationshipChange(relationship.id));
    // }

    const change: StyleDeleted = { type: 'styleDeleted', style };
    this.appendChange(source, change, rval);

    return undoChangeRequest;
  }

  private applyStyleInsertRequest(
    source: StyleSource,
    request: StyleInsertRequest,
    rval: NotebookChange[],
  ): StyleDeleteRequest {
    const parentId = request.parentId||0;
    const styleProps = request.styleProps;
    const afterId = request.hasOwnProperty('afterId') ? request.afterId : -1;

    let id: StyleId;
    if (styleProps.id) {
      id = styleProps.id;
      if (!this.reservedIds.has(id)) { throw new Error(`Specified style ID is not reserved: ${id}`); }
      this.reservedIds.delete(id);
    } else {
      id = this.nextId++;
    }

    const style: StyleObject = {
      data: styleProps.data,
      id,
      role: styleProps.role,
      parentId: parentId || 0,
      source,
      type: styleProps.type,
    };
    if (styleProps.subrole) { style.subrole = styleProps.subrole; }
    const change: StyleInserted =  { type: 'styleInserted', style, afterId };
    this.appendChange(source, change, rval);

    if (styleProps.subprops) {
      for (const substyleProps of styleProps.subprops) {
        const request2: StyleInsertRequest = { type: 'insertStyle', parentId: style.id, styleProps: substyleProps };
        this.applyStyleInsertRequest(source, request2, rval);
      }
    }

    if (styleProps.relationsFrom) {
      for (const [idStr, props] of Object.entries(styleProps.relationsFrom)) {
        const request2: RelationshipInsertRequest = { type: 'insertRelationship', fromId: parseInt(idStr, 10), toId: style.id, props };
        this.applyRelationshipInsertRequest(source, request2, rval);
      }
    }

    if (styleProps.relationsTo) {
      for (const [idStr, props] of Object.entries(styleProps.relationsTo)) {
        const request2: RelationshipInsertRequest = { type: 'insertRelationship', fromId: style.id, toId: parseInt(idStr, 10), props };
        this.applyRelationshipInsertRequest(source, request2, rval);
      }
    }

    if (styleProps.exclusiveChildTypeAndRole) {
      // REVIEW: Does this search need to be recursive?
      const children = this.findStyles({ type: style.type, recursive: true }, parentId);

      // console.log("KIDS FOUND OF PARENT",children);
      // now in the set to be removed, remove ourself, and anyting with a different meaning
      const toRemove = children.filter(c => ((c.id != parentId) && (c.id != style.id) && (c.role == style.role) && (c.type == style.type)));
      // now remove the remainder
      // console.log("TO REMOVE",toRemove);
      for (const childToRemove of toRemove) {
        const request2: StyleDeleteRequest = { type: 'deleteStyle', styleId: childToRemove.id };
        this.applyStyleDeleteRequest(source, request2, rval);
      }
    }

    const undoChangeRequest: StyleDeleteRequest = {
      type: 'deleteStyle',
      styleId: style.id,
    }
    return undoChangeRequest;
  }

  private applyStyleMoveRequest(
    source: StyleSource,
    request: StyleMoveRequest,
    rval: NotebookChange[],
  ): StyleMoveRequest|undefined {
    const { styleId, afterId } = request;
    if (afterId == styleId) { throw new Error(`Style ${styleId} can't be moved after itself.`); }

    const style = this.getStyle(styleId);
    if (style.parentId) {
      // REVIEW: Why are we attempting to move substyles? Should be:
      // throw new Error(`Attempting to move substyle ${styleId}`);
      return undefined;
    }

    const oldPosition: StylePosition = this.styleOrder.indexOf(style.id);
    if (oldPosition < 0) { throw new Error(`Style ${styleId} can't be moved: not found in styleOrder array.`); }

    let oldAfterId: number;
    if (oldPosition == 0) { oldAfterId = 0; }
    else if (oldPosition == this.styleOrder.length-1) { oldAfterId = -1; }
    else { oldAfterId = this.styleOrder[oldPosition-1]; }

    let newPosition: StylePosition;
    if (afterId == 0) { newPosition = 0; }
    else if (afterId == -1) { newPosition = this.styleOrder.length  - 1; }
    else {
      newPosition = this.styleOrder.indexOf(afterId);
      if (newPosition < 0) { throw new Error(`Style ${styleId} can't be moved: other style ${afterId} not found in styleOrder array.`); }
      if (oldPosition > newPosition) { newPosition++; }
    }

    const change: StyleMoved = { type: 'styleMoved', styleId, afterId, oldPosition, newPosition };
    this.appendChange(source, change, rval);

    const undoChangeRequest: StyleMoveRequest = {
      type: 'moveStyle',
      styleId: style.id,
      afterId: oldAfterId
    };
    return undoChangeRequest;
  }

  // This should be called on any newly created notebook immediately after the constructor.
  private async initialize(observerClasses: Map<StyleSource,ObserverClass>): Promise<void> {

    if (this._path) {
      if (ServerNotebook.persistentNotebooks.has(this._path)) { throw new Error(`Initializing a notebook with a name that already exists.`); }
      ServerNotebook.persistentNotebooks.set(this._path, this);
    }

    // Call "onOpen" to get an observer instance for every registered observer class.
    for (const [name, observerClass] of observerClasses.entries()) {
      const instance = await observerClass.onOpen(this);
      this.registerObserver(name, instance)
    }
  }

  private notifyClientsOfChanges(
    changes: NotebookChange[],
    undoChangeRequests: NotebookChangeRequest[]|undefined,
    options: RequestChangesOptions,
    complete: boolean,
  ): void {
    for (const [ clientId, observer ] of this.clientObservers) {
      const isTrackingClient = (clientId == options.clientId);
      let tracker = (options.tracker && isTrackingClient ? options.tracker : undefined);
      observer.onChanges(changes, undoChangeRequests, complete, tracker);
    };
  }

  private async processChangesAsync(changes: NotebookChange[]): Promise<NotebookChange[]> {
    // TODO: run resulting async changes through sync observers.
    // TODO: submit changes to asynchronous observers simultaneously.
    // TODO: timeout on observer processing of changes.
    // TODO: Don't allow multiple asynchronous requestChanges to be operating at the same time.
    let allChanges: NotebookChange[] = [];
    for (let round = 0; changes.length>0 && round<MAX_CHANGE_ROUNDS; round++) {
      debug(`Async round ${round}.`);

      // Pass the changes to each observer to determine if it wants to make
      // additional changes as the result of the previous changes.
      // LATER: Submit to all observers in parallel.
      // IMPORTANT: We don't actually make the changes to the notebook
      // until *after* all observers have submitted their change requests for this round.
      const observerChangeRequests: Map<StyleSource, NotebookChangeRequest[]> = new Map();
      for (const [source, observer] of this.observers) {
        const changeRequests = await observer.onChangesAsync(changes);
        observerChangeRequests.set(source, changeRequests);
      };

      // Apply the changes requested by the observers.
      const newChanges: NotebookChange[] = [];
      for (const [source, changeRequests] of observerChangeRequests) {
        this.applyRequestedChanges(source, changeRequests, newChanges);
      }

      // Get the changes made in this round for the next round of processing.
      changes = newChanges;
      allChanges = allChanges.concat(newChanges);
    }

    if (changes.length>0) {
      // TODO: What do we do? Just drop the changes on the floor?
      console.error(`Dropping async changes due to running out of rounds: ${changes.length}`);
    }

    return allChanges;
  }

  private processChangesSync(changes: NotebookChange[]): NotebookChange[] {
    let allChanges: NotebookChange[] = [];
    for (let round = 0; changes.length>0 && round<MAX_CHANGE_ROUNDS; round++) {
      debug(`Sync round ${round}.`);

      // Pass the changes to each observer synchronously to determine if
      // the observer wants to make additional changes as the result of
      // the previous changes.
      // IMPORTANT: We don't actually make the changes to the notebook
      // until *after* all observers have submitted their change requests for this round.
      const observerChangeRequests: Map<StyleSource, NotebookChangeRequest[]> = new Map();
      for (const [source, observer] of this.observers) {
        const changeRequests = observer.onChangesSync(changes);
        observerChangeRequests.set(source, changeRequests);
      };

      // Apply the changes requested by the observers.
      const newChanges: NotebookChange[] = [];
      for (const [source, changeRequests] of observerChangeRequests) {
        this.applyRequestedChanges(source, changeRequests, newChanges);
      }

      // Get the changes made in this round for the next round of processing.
      changes = newChanges;
      allChanges = allChanges.concat(newChanges);
    }

    if (changes.length>0) {
      // TODO: What do we do? Just drop the changes on the floor?
      console.error(`Dropping sync changes due to running out of rounds: ${changes.length}`);
    }

    return allChanges;
  }

  // Do not call this directly.
  // Changes to the document should result in calls to notifyChange,
  // which will schedule a save, eventually getting here.
  private async save(): Promise<void> {
    if (!this._path) { throw new Error("Cannot save non-persistent notebook."); }
    // TODO: Handle this in a more robust way.
    if (this.saving) { throw new Error(`Trying to save while save already in progress.`); }
    debug(`saving ${this._path}`);
    this.saving = true;
    const json = JSON.stringify(this);
    await writeNotebookFile(this._path, json);
    this.saving = false;
  }
}
