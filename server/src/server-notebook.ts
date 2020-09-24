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

// REVIEW: Where should we be checking if this.terminated is set?
// REVIEW: Have a "read-only" notebook that only lets you read but not make any changes?
//         This would enforce all changes being made through the observer interfaces
//         rather than directly on the notebook.

// Requirements

import * as debug1 from "debug";
import { readdirSync, writeFileSync } from "fs"; // LATER: Eliminate synchronous file operations.
import { join } from "path";

import { assert, ExpectedError, Timestamp } from "./shared/common";
import { NotebookPath, NOTEBOOK_PATH_RE, NotebookName, FolderPath, NotebookEntry } from "./shared/folder";
import {
  Notebook, NotebookObject, NotebookChange, StyleObject, StyleRole, StyleType, StyleSource, StyleId,
  RelationshipObject, StyleMoved, StylePosition, VERSION, StyleChanged, RelationshipDeleted,
  RelationshipInserted, StyleInserted, StyleDeleted, StyleConverted, NotebookWatcher, WolframExpression
} from "./shared/notebook";
import {
  NotebookChangeRequest, StyleMoveRequest, StyleInsertRequest, StyleChangeRequest,
  RelationshipDeleteRequest, StyleDeleteRequest, RelationshipInsertRequest,
  StylePropertiesWithSubprops, TexExpression, StyleConvertRequest, ServerNotebookChangedMessage, ClientNotebookChangeMessage, ClientNotebookUseToolMessage, RequestId,
} from "./shared/math-tablet-api";

import { ClientId } from "./client-socket";
import { AbsDirectoryPath, ROOT_DIR_PATH, mkDir, readFile, rename, rmRaf, writeFile } from "./adapters/file-system";
import { constructSubstitution } from "./adapters/wolframscript";
import { OpenOptions } from "./shared/watched-resource";
import { logError } from "./error-handler";


// LATER: Convert these to imports.
const svg2img = require('svg2img');

const MODULE = __filename.split(/[/\\]/).slice(-1)[0].slice(0,-3);
const debug = debug1(`server:${MODULE}`);

// Types

type AbsFilePath = string; // Absolute path to a file in the file system.

export interface ObserverInstance {
  onChangesAsync: (changes: NotebookChange[], startIndex: number, endIndex: number) => Promise<NotebookChangeRequest[]>;
  onChangesSync: (changes: NotebookChange[], startIndex: number, endIndex: number) => NotebookChangeRequest[];
  onClose: () => void;
  useTool: (styleObject: StyleObject) => Promise<NotebookChangeRequest[]>;
}

export interface ObserverClass {
  onOpen: (notebook: ServerNotebook)=>Promise<ObserverInstance>;
}

export interface OpenNotebookOptions extends OpenOptions<ServerNotebookWatcher> {
  ephemeral?: boolean;    // true iff notebook not persisted to the file system and disappears after last close.
}

export interface RequestChangesOptions {
  clientId?: ClientId;
}

export interface ServerNotebookWatcher extends NotebookWatcher {
  onChanged(msg: ServerNotebookChangedMessage): void;
}

interface StyleOrderMapping {
  sid: StyleId;
  tls: number;
}

// Constants

const MAX_ASYNC_ROUNDS = 10;
const MAX_SYNC_ROUNDS = 10;
const NOTEBOOK_ENCODING = 'utf8';
const NOTEBOOK_FILE_NAME = 'notebook.json';

// Base Class

export class ServerNotebook extends Notebook<ServerNotebookWatcher> {

  // Public Class Constants

  public static NOTEBOOK_DIR_SUFFIX = '.mtnb';

  // Public Class Properties

  // Public Class Property Functions

  public static isValidNotebookPath(path: NotebookPath): boolean {
    return NOTEBOOK_PATH_RE.test(path);
  }

  public static nameFromPath(path: NotebookPath): NotebookName {
    const match = NOTEBOOK_PATH_RE.exec(path);
    if (!match) { throw new Error(`Invalid notebook path: ${path}`); }
    return <NotebookName>match[3];
  }

  public static validateNotebookName(name: NotebookName): void {
    if (!this.isValidNotebookName(name)) { throw new Error(`Invalid notebook name: ${name}`); }
  }

  // Public Class Property Functions

  public static get allInstances(): ServerNotebook[]/* LATER: IterableIterator<ServerNotebook> */ {
    // LATER: ServerNotebook.instanceMap should only have notebooks, not notebooks and folders.
    return <ServerNotebook[]>Array.from(this.instanceMap.values()).filter(r=>r instanceof ServerNotebook);
  }

  // Public Class Methods

  public static async delete(path: NotebookPath): Promise<void> {
    // REVIEW: Race conditions?
    this.close(path, "Notebook has been deleted."); // no-op if the notebook is not open.
    const absPath = absDirPathFromNotebookPath(path);
    debug(`Deleting notebook directory ${absPath}`);
    await rmRaf(absPath); // TODO: Handle failure.
  }

  public static deregisterObserver(source: StyleSource): void {
    debug(`Deregistering observer: ${source}`);
    this.observerClasses.delete(source);
  }

  public static async move(path: NotebookPath, newPath: NotebookPath): Promise<NotebookEntry> {
    // Called by the containing ServerFolder when one of its notebooks is renamed.

    this.close(path, `Notebook is moving to ${newPath}.`)
    const oldAbsPath = absDirPathFromNotebookPath(path);
    const newAbsPath = absDirPathFromNotebookPath(newPath);

    // REVIEW: If there is an existing *file* (not directory) at the new path then it will be overwritten silently.
    //         However, we don't expect random files to be floating around out notebook storage filesystem.
    await rename(oldAbsPath, newAbsPath);
    return { path: newPath, name: this.nameFromPath(newPath) }
  }

  public static registerObserver(source: StyleSource, observerClass: ObserverClass): void {
    debug(`Registering observer: ${source}`);
    this.observerClasses.set(source, observerClass);
  }

  public static open(path: NotebookPath, options: OpenNotebookOptions): Promise<ServerNotebook> {
    // IMPORTANT: This is a standard open pattern that all WatchedResource-derived classes should use.
    //            Do not modify unless you know what you are doing!
    const isOpen = this.isOpen(path);
    const instance = isOpen ? this.getInstance(path) : new this(path, options);
    instance.open(options, isOpen);
    return instance.openPromise;
  }

  public static openEphemeral(): Promise<ServerNotebook> {
    // For units testing, etc., to create a notebook that is not persisted to the filesystem.
    return this.open(this.generateUniqueEphemeralPath(), { ephemeral: true, mustNotExist: true });
  }

  // Public Class Event Handlers

  // Public Instance Properties

  // Public Instance Property Functions

  public absoluteDirectoryPath(): AbsDirectoryPath {
    return absDirPathFromNotebookPath(this.path);
  }

  public async exportLatex(): Promise<TexExpression> {
    const ourPreamble = <TexExpression>`\\documentclass[12pt]{article}
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
    const close = <TexExpression>`\\end{document}`;

    // Our basic approach is to apply a function to each
    // top level style in order. This function will preferentially
    // take the LaTeX if there is any.
    function displayFormula(f : string) : string {
      return `\\begin{align}\n ${f} \\end{align}\n`;
    }
    function renderHintAsIndependent(hint: string, relationship: number, from: string, to: string, status: number) : string {
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
          var from_id : string;
          try {
             from_id = "" + this.topLevelStyleOf(styleObject.data.fromId).id;
          } catch (e) {
            console.error("Internal Error:",e);
            from_id = "\\text{Internal Error}";
          }
          var to_id : string;
          try {
            to_id = "" + this.topLevelStyleOf(styleObject.data.toId).id;
          } catch (e) {
            console.error("Internal Error:",e);
            to_id = "\\text{Internal Error}";
          }
          const status = styleObject.data.status;
          const relationship = styleObject.data.relationship;

          const reps = this.findStyles({ type: 'PLAIN-TEXT', recursive: true }, tls);
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
        const latex = this.findStyles({ type: 'TEX-EXPRESSION', recursive: true }, tls);
        if (latex.length > 1) { // here we have to have some disambiguation
          retLaTeX += "ambiguous: " +displayFormula(latex[0].data);
        } else if (latex.length == 1) {  // here it is obvious, maybe...
          retLaTeX += displayFormula(latex[0].data);
        }


        // REVIEW: Does this search need to be recursive?
        const image = this.findStyles({ type: 'IMAGE-URL', role: 'PLOT', recursive: true }, tls);
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
        const svgs = this.findStyles({ type: 'SVG-MARKUP', recursive: true }, tls);

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

            function fileIsEarlierVersionThan(id:number, ts: number|undefined, name: string) : boolean {
              if (!ts) return false;
              const filets = getTimeStampOfCompatibleFileName(id, name);
              return !!filets && ts>filets;
            }

            // function fileIsLaterVersionThan(id:number, ts: number|undefined, name: string) : boolean {
            //   if (!ts) return false;
            //   const filets = getTimeStampOfCompatibleFileName(id, name);
            //   return !!filets && ts<filets;
            // }

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
            debug("BEGIN", directory);
            // @ts-ignore
            var files = fs.readdirSync(directory);
            debug("files", files);
            // TODO: We removed timestamp from the style, so we need to make whatever changes are necessary here.
            // for (const file of files) {
            //   // I don't know why this is needed!
            //   if (fileIsLaterVersionThan(s.id, s.timestamp, file)) {
            //     foundfile = file;
            //   }
            // }
            debug("END");
            if (foundfile) {
              abs_filename = `${apath}/${foundfile}`;
            } else {
              writeFileSync(abs_filename, b);
              debug("directory",directory);
              var files = readdirSync(directory);

              for (const file of files) {
                debug("file",file);
                // I don't know why this is needed!
                if (fileIsEarlierVersionThan(s.id,ts,file)) {
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

    const finalTeX = <TexExpression>(ourPreamble + cells.join('\n') + close);
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
    rs.forEach(r => {
      try {
        // TODO: I don't know why this can be an error....
        // doing a catch here seems to make it work but this is a concurrency
        // problem, one way or another...we should not have relationship
        // that is not pointing to something, though of course concurrent
        // operation makes this difficult.
        const rp = this.topLevelStyleOf(r.toId);
        if (rp.id == mp.id) {
          // We are a user of this definition...
          try {
            symbolStyles.push(this.getStyle(r.fromId));
          } catch (Error) {
            // REVIEW: Proper error handling??
            console.error(`GSSIDO Error: fromId ${r.fromId} missing (inner)`);
            // console.error(this);
            // I believe now what we have "reserve" ids
            // It should always be possible to remove this relation.
            // The danger here is that we are covering up where these are
            // coming from! REVIEW - rlr
            this.deleteRelationship(r);
          }

        }
      } catch (Error) {
        // REVIEW: Proper error handling??
        console.error(`GSSIDO Errior: fromId ${r.fromId} missing (outer)`);
        // console.error(this);
        this.deleteRelationship(r);
      }
    });
    return symbolStyles;
  }

  public getSymbolStylesThatDependOnMe(style:StyleObject): StyleObject[] {
    const rs = this.allRelationships();
    var symbolStyles: StyleObject[] = [];
    rs.forEach(r => {
      if (r.fromId == style.id) {
        // REVIEW: The should not be any relationships that point to non-existent styles.
        const toStyle = this.getStyleThatMayNotExist(r.toId);
        if (toStyle) { symbolStyles.push(toStyle); }
      }
    });
    return symbolStyles;
  }

  public toJSON(): NotebookObject {
    const rval: NotebookObject = {
      nextId: this.nextId,
      pageConfig: this.pageConfig,
      pages: this.pages,
      relationshipMap: this.relationshipMap,
      styleMap: this.styleMap,
      version: VERSION,
    }
    return rval;
  }

  // Public Instance Methods

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
      const syms = this.findStyles({ type: 'SYMBOL-DATA', recursive: true }, tls);
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
      const syms = this.findStyles({ type: 'SYMBOL-DATA', recursive: true }, tls);
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
            const toId = us[i].sid;
            var r : RelationshipObject = {
              source: 'TEST',
              id: -1,
              fromId,
              toId,
              role: 'SYMBOL-DEPENDENCY',
              inStyles: [ { role: 'LEGACY', id: fromId } ],
              outStyles: [ { role: 'LEGACY', id: toId } ],
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
          const toId = ds[i].sid;
          var r : RelationshipObject = {
            source: 'TEST',
            id: -1,
            fromId,
            toId,
            role: 'DUPLICATE-DEFINITION',
            inStyles: [ { role: 'LEGACY', id: fromId } ],
            outStyles: [ { role: 'LEGACY', id: toId } ],
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

  public registerObserver(source: StyleSource, instance: ObserverInstance): void {
    this.observers.set(source, instance);
  }

  public async requestChange(
    source: StyleSource,
    changeRequest: NotebookChangeRequest,
  ): Promise<NotebookChange[]> {
    return this.requestChanges(source, [changeRequest]);
  }

  public async requestChanges(
    source: StyleSource,
    changeRequests: NotebookChangeRequest[],
    originatingWatcher?: NotebookWatcher,
    requestId?: RequestId,
  ): Promise<NotebookChange[]> {
    // Applies the change requests to the notebook,
    // then runs the resulting changes through all of the
    // observers synchronously, until there are no more changes,
    // or we reach a limit.

    assert(!this.terminated);
    debug(`requestChanges ${changeRequests.length}`);

    // Make the requested changes to the notebook.
    const changes: NotebookChange[] = [];
    const undoChangeRequests = this.applyRequestedChanges(source, changeRequests, changes);

    let asyncStartIndex = 0;
    let syncStartIndex = 0;
    syncStartIndex = this.processChangesSync(changes, syncStartIndex);

    this.notifyWatchersOfChanges(changes, undoChangeRequests, false, originatingWatcher, requestId);
    let notifyStartIndex = changes.length;

    for (let round = 0; asyncStartIndex<changes.length && round<MAX_ASYNC_ROUNDS; round++) {
      debug(`Async round ${round}.`);
      asyncStartIndex = await this.processChangesAsync(changes, asyncStartIndex);
      syncStartIndex = this.processChangesSync(changes, syncStartIndex);

      this.notifyWatchersOfChanges(changes.slice(notifyStartIndex), undefined, true, originatingWatcher, requestId);
      notifyStartIndex = changes.length;
    }

    if (asyncStartIndex<changes.length) {
      // TODO: What do we do? Just drop the changes on the floor?
      logError(new Error("Dropping async changes due to running out of rounds"));
    }


    await this.save();

    return changes;
  }

  public reserveId(): StyleId {
    const styleId = this.nextId++;
    this.reservedIds.add(styleId);
    return styleId;
  }

  public substitutionExpression(text: WolframExpression, variables: string[], style: StyleObject) : [string[],string] {
    // I think "variables" should be a parameter...
    // That parameter will be different when used by
    // SUBTRIVARIATE, and when used by EQUATION

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

  public async useTool(styleId: StyleId): Promise<NotebookChange[]> {
    debug(`useTool ${styleId}`);
    assert(!this.terminated);
    const style = this.getStyle(styleId);
    const source = style.source;
    if (!style) { throw new Error(`Notebook useTool style ID not found: ${styleId}`); }
    const observer = this.observers.get(source);
    const changeRequests = await observer!.useTool(style);
    const changes = await this.requestChanges(source, changeRequests);
    return changes;
  }

  // Public Event Handlers

  public onNotebookChangeMessage(
    originatingWatcher: NotebookWatcher,
    msg: ClientNotebookChangeMessage,
  ): void {
    assert(!this.terminated);
    // TODO: pass request ID on responses to originatingWatcher.
    // TODO: options.client ID
    this.requestChanges('USER', msg.changeRequests, originatingWatcher, msg.requestId);
  }

  public onNotebookUseToolMessage(
    _originatingWatcher: NotebookWatcher,
    msg: ClientNotebookUseToolMessage,
  ): void {
    // TODO: pass request ID on responses to originatingWatcher.
    // TODO: options.client ID
    this.useTool(msg.styleId);
  }


  // --- PRIVATE ---

  // Private Class Properties

  private static lastEphemeralPathTimestamp: Timestamp = 0;
  private static observerClasses: Map<StyleSource, ObserverClass> = new Map();

  // Private Class Property Functions

  protected static getInstance(path: NotebookPath): ServerNotebook {
    return <ServerNotebook>super.getInstance(path);
  }

  // Private Class Methods

  private static generateUniqueEphemeralPath(): NotebookPath {
    let timestamp = <Timestamp>Date.now();
    if (timestamp <= this.lastEphemeralPathTimestamp) {
      timestamp = this.lastEphemeralPathTimestamp+1;
    }
    this.lastEphemeralPathTimestamp = timestamp;
    return  <NotebookPath>`/eph${timestamp}${this.NOTEBOOK_DIR_SUFFIX}`;
  }


  // Private Class Event Handlers

  // Private Constructor

  private constructor(path: NotebookPath, options: OpenNotebookOptions) {
    super(path);
    this.ephemeral = options.ephemeral;
    this.observers = new Map();
    this.reservedIds = new Set();
  }

  // Private Instance Properties

  // TODO: purge changes in queue that have been processed asynchronously.
  private ephemeral?: boolean;     // Not persisted to the filesystem.
  private observers: Map<StyleSource, ObserverInstance>;
  private reservedIds: Set<StyleId>;
  private saving?: boolean;

  // Private Instance Property Functions

  // Private Instance Methods

  private appendChange(
    source: StyleSource,
    change: NotebookChange,
    rval: NotebookChange[],
  ): void {
    debug(`Applying change: source ${source}, type ${change.type}.`);
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
      inStyles: [ { role: 'LEGACY', id: relationship.fromId } ],
      outStyles: [ { role: 'LEGACY', id: relationship.toId } ],
      props: { role: relationship.role },
    }
    return undoChangeRequest;
  }

  private applyRelationshipInsertRequest(
    source: StyleSource,
    request: RelationshipInsertRequest,
    rval: NotebookChange[],
  ): RelationshipDeleteRequest {

    const relationshipProps = request.props;

    let id: StyleId;
    if (relationshipProps.id) {
      id = relationshipProps.id;
      if (!this.reservedIds.has(id)) { throw new Error(`Specified relationship ID is not reserved: ${id}`); }
      this.reservedIds.delete(id);
    } else {
      id = this.nextId++;
    }

    const relationship: RelationshipObject = {
      id,
      source,
      fromId: request.fromId,
      toId: request.toId,
      inStyles: request.inStyles,   // REVIEW: Make a copy of the array?
      outStyles: request.outStyles, // REVIEW: Make a copy of the array?
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
    if (request.role) { style.role = request.role; }
    if (request.subrole) { style.subrole = request.subrole; }
    if (request.styleType) { style.type = request.styleType; }
    if (request.data) { style.data = request.data; }
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

    var style = this.getStyleThatMayNotExist(request.styleId);
    if (!style) {
      // This may be sloppy thought, but it is the best I can do.
      // I don't know if concurrency makes this an inevitable happenstance,
      // or if a coding error has produced this. The way this arose
      // makes me think the latter---our code is probably creating a
      // "double delete" somewhere. This is the best I can do for now,
      // and I have created a test that covers the bug that led me
      // here. - rlr
      debug("requested to delete unknown style",request.styleId);
      return undefined;
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

    // If exclusive flag is set then delete any other descendants that are of the same type and role.
    // REVIEW: Does this search need to be recursive or can we limit it to children?
    // TODO: Gather undo info for these delete requests.
    if (styleProps.exclusiveChildTypeAndRole) {
      const children = this.findStyles({ role: style.role, type: style.type, recursive: true }, parentId);
      for (const child of children) {
        const request2: StyleDeleteRequest = { type: 'deleteStyle', styleId: child.id };
        this.applyStyleDeleteRequest(source, request2, rval);
      }
    }

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
        const fromId = parseInt(idStr, 10);
        const toId = style.id;
        const request2: RelationshipInsertRequest = {
          type: 'insertRelationship',
          fromId,
          toId,
          inStyles: [ { role: 'LEGACY', id: fromId } ],
          outStyles: [ { role: 'LEGACY', id: toId } ],
          props
        };
        this.applyRelationshipInsertRequest(source, request2, rval);
      }
    }

    if (styleProps.relationsTo) {
      for (const [idStr, props] of Object.entries(styleProps.relationsTo)) {
        const fromId = style.id;
        const toId = parseInt(idStr, 10);
        const request2: RelationshipInsertRequest = {
          type: 'insertRelationship',
          fromId,
          toId ,
          inStyles: [ { role: 'LEGACY', id: fromId } ],
          outStyles: [ { role: 'LEGACY', id: toId } ],
          props
        };
        this.applyRelationshipInsertRequest(source, request2, rval);
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

    const oldPosition: StylePosition = this.pages[0].styleIds.indexOf(style.id);
    if (oldPosition < 0) { throw new Error(`Style ${styleId} can't be moved: not found in styleOrder array.`); }

    let oldAfterId: number;
    if (oldPosition == 0) { oldAfterId = 0; }
    else if (oldPosition == this.pages[0].styleIds.length-1) { oldAfterId = -1; }
    else { oldAfterId = this.pages[0].styleIds[oldPosition-1]; }

    let newPosition: StylePosition;
    if (afterId == 0) { newPosition = 0; }
    else if (afterId == -1) { newPosition = this.pages[0].styleIds.length  - 1; }
    else {
      newPosition = this.pages[0].styleIds.indexOf(afterId);
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

  protected async initialize(options: OpenNotebookOptions): Promise<void> {
    if (options.mustExist) {
      assert(ServerNotebook.isValidNotebookPath(this.path));
      const absPath = absFilePathFromNotebookPath(this.path);
      // REVIEW: Create file-system readJsonFile function?
      const json = await readFile(absPath, NOTEBOOK_ENCODING);
      const obj = JSON.parse(json);
      assert(typeof obj == 'object');
      Notebook.validateObject(obj);
      this.initializeFromObject(obj);
    } else if (options.mustNotExist) {
      await this.saveNew();
    } else {
      // LATER: Neither mustExist or mustNotExist specified. Open if it exists, or create if it doesn't exist.
      //        Currently this is an illegal option configuration.
    }

    // TODO: Use watcher interface for observers instead of separate observer interface?
    // Call "onOpen" to get an observer instance for every registered observer class.
    for (const [name, observerClass] of ServerNotebook.observerClasses.entries()) {
      const observer = await observerClass.onOpen(this);
      this.registerObserver(name, observer)
    }
  }

  private notifyWatchersOfChanges(
    changes: NotebookChange[],
    undoChangeRequests: NotebookChangeRequest[]|undefined,
    complete?: boolean,
    originatingWatcher?: NotebookWatcher,
    requestId?: RequestId,
  ): void {
    for (const watcher of this.watchers) {
      // TODO: Include request ID for message to initiating client.
      // const isTrackingClient = (clientId == options.clientId);
      // const requestId = isTrackingClient ? <RequestId>'TODO:' : undefined;
      //socket.notifyNotebookChanged(this.path, changes, undoChangeRequests, requestId, complete);
      const msg: ServerNotebookChangedMessage = {
        type: 'notebook',
        path: this.path,
        operation: 'changed',
        changes,
        undoChangeRequests, // TODO: Only undo for initiating client.
      }
      if (complete) {
        msg.complete = true;
      }
      if (watcher == originatingWatcher && requestId) {
        msg.requestId = requestId;
      }
      watcher.onChanged(msg);
    };
  }

  private async processChangesAsync(changes: NotebookChange[], startIndex: number): Promise<number> {

    // TODO: timeout on observer processing of changes.
    // TODO: Don't allow multiple asynchronous requestChanges to be operating at the same time per observer.

    // Submit the changes to each observer in parallel to determine if they want to make
    // additional changes as the result of the previous changes.
    // Make apply the changes to the notebook as they come back,
    // and accumulate all of the changes in the newChanges array.
    // REVIEW: What if a requested change fails? (e.g. modify a style that another observer already deleted.)
    const endIndex = changes.length;
    assert(startIndex<endIndex);
    const promises: Promise<void>[] = [];
    for (const [source, observer] of this.observers) {
      promises.push(
        observer.onChangesAsync(changes, startIndex, endIndex)
        .then(
          (changeRequests)=>{ this.applyRequestedChanges(source, changeRequests, changes); },
          // TODO: (err)=>
        )
      );
    };
    await Promise.all(promises);
    return endIndex;
  }

  private processChangesSync(changes: NotebookChange[], startIndex: number): number {
    let round: number;
    for (round = 0; startIndex<changes.length && round<MAX_SYNC_ROUNDS; round++) {
      debug(`Sync round ${round}.`);

      // Pass the new changes to each observer synchronously to determine if
      // the observer wants to make additional change requests as the result of
      // the changes.
      const endIndex = changes.length;
      const observerChangeRequests: Map<StyleSource, NotebookChangeRequest[]> = new Map();
      for (const [source, observer] of this.observers) {
        assert(startIndex<endIndex);
        const changeRequests = observer.onChangesSync(changes, startIndex, endIndex);
        observerChangeRequests.set(source, changeRequests);
      };

      // Apply the change requests from the observers, if there are any.
      // The changes resulting from the change requests will be appended
      // to the changes array, and processed in the next round.
      startIndex = endIndex;
      for (const [source, changeRequests] of observerChangeRequests) {
        this.applyRequestedChanges(source, changeRequests, changes);
      }
    }

    if (startIndex<changes.length) {
      // TODO: What do we do? Just drop the changes on the floor?
      logError(new Error("Dropping sync changes due to running out of rounds"));
    }

    return startIndex;
  }

  // Do not call this directly.
  // Changes to the document should result in calls to notifyChange,
  // which will schedule a save, eventually getting here.
  private async save(): Promise<void> {

    // "Ephemeral" notebooks are not persisted in the filesystem.
    if (this.ephemeral) { return; }

    assert(!this.saving); // LATER: Saving promise?
    assert(ServerNotebook.isValidNotebookPath(this.path));
    debug(`saving ${this.path}`);
    this.saving = true;

    const json = JSON.stringify(this);
    const filePath = absFilePathFromNotebookPath(this.path);
    await writeFile(filePath, json, NOTEBOOK_ENCODING)
    this.saving = false;
  }

  protected terminate(reason: string): void {
    // TODO: Ensure notebook is not in the middle of processing change requests or saving.
    for (const observer of this.observers.values()) {
      observer.onClose();
    }
    super.terminate(reason);
  }

  private async saveNew(): Promise<void> {
    // "Ephemeral" notebooks are not persisted in the filesystem.
    if (this.ephemeral) { return; }
    assert(!this.saving);

    // Create the directory if it does not exists.
    // LATER: Don't attempt to create the directory every time we save. Only the first time.
    this.saving = true;
    try {
      const dirPath = absDirPathFromNotebookPath(this.path);
      await mkDir(dirPath);
    } catch(err) {
      if (err.code == 'EEXIST') {
        err = new ExpectedError(`Notebook '${this.path}' already exists.`);
      }
      throw err;
    } finally {
      this.saving = false;
    }

    await this.save();
  }
}

// Exported Functions

export function absDirPathFromNotebookPath(path: NotebookPath): AbsDirectoryPath {
  const pathSegments = path.split('/').slice(1);  // slice removes leading slash
  return join(ROOT_DIR_PATH, ...pathSegments);
}

// TODO: Rewrite this to using findStyles
export function assertHasStyle(styles: StyleObject[], type: StyleType, role: StyleRole, data: any): StyleObject {
  const style = styles.find(s=>s.type==type && s.role==role && s.data==data);
  assert(style);
  return style!;
}

export function notebookPath(path: FolderPath, name: NotebookName): NotebookPath {
  return <NotebookPath>`${path}${name}${ServerNotebook.NOTEBOOK_DIR_SUFFIX}`;
}

// Helper Functions

function absFilePathFromNotebookPath(path: NotebookPath): AbsFilePath {
  const absPath = absDirPathFromNotebookPath(path);
  return join(absPath, NOTEBOOK_FILE_NAME);
}


