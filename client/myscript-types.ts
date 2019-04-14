

// NOTE: This is not a complete set of types for the library.
//       Just the stuff that we have used.
// REVIEW: Should the be a .d.ts declaration file instead?

// Requirements

// Exported Types

export type EditorType = 'TEXT'|'MATH';

export interface Configuration {
  recognitionParams: RecognitionParams;
}

export interface Editor {
  configuration: Configuration;
  exports: Exports;
  model: Model;
  clear(): void;
  convert(): void;
  redo(): void;
  undo(): void;
}

export interface EditorChangedEvent extends Event {
  detail: {
    canRedo: boolean;
    canUndo: boolean;
  };
}

export interface EditorElement extends HTMLElement {
  editor: Editor;
}

export interface EditorExportedEvent extends Event {
  detail: {
    exports: Exports
  };
}

export interface Jiix {

}

export interface ServerKeys {
  applicationKey: string;
  hmacKey: string;
}

export interface StrokeGroups {

}

// Private Types

interface Exports {
  [ mimeType: string]: any;
}

interface MyScriptGlobal {
  register($elt: HTMLElement, config: Configuration): void;
}

interface Model {
  strokeGroups: /* TYPESCRIPT: */ any;
}

interface RecognitionParams {
  apiVersion: 'V4';
  protocol: 'WEBSOCKET';
  server: ServerKeys;
  type: EditorType;
  v4: RecognitionParamsV4;
}

interface RecognitionParamsV4 {
  // TYPESCRIPT:
}

// Exported Functions

export function getMyScript(): MyScriptGlobal {
  return (<any>window).MyScript;
}
