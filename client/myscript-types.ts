
// REVIEW: Should the be a .d.ts declaration file instead?

// Requirements

// Exported Types

export type MyScriptEditorType = 'TEXT'|'MATH';

export interface MyScriptConfiguration {
  recognitionParams: MyScriptRecognitionParams;
}

export interface MyScriptEditor {
  configuration: MyScriptConfiguration;
  exports: MyScriptExports;
  model: MyScriptModel;
  clear(): void;
  convert(): void;
  redo(): void;
  undo(): void;
}

export interface MyScriptEditorChangedEvent extends Event {
  detail: {
    canRedo: boolean;
    canUndo: boolean;
  };
}

export interface MyScriptEditorElement extends HTMLElement {
  editor: MyScriptEditor;
}

export interface MyScriptEditorExportedEvent extends Event {
  detail: {
    exports: MyScriptExports
  };
}

export interface MyScriptServerKeys {
  applicationKey: string;
  hmacKey: string;
}

// Private Types

interface MyScriptExports {
  [ mimeType: string]: any;
}

interface MyScriptGlobal {
  register($elt: HTMLElement, config: MyScriptConfiguration): void;
}

interface MyScriptModel {
  strokeGroups: /* TYPESCRIPT: */ any;
}

interface MyScriptRecognitionParams {
  apiVersion: 'V4';
  protocol: 'WEBSOCKET';
  server: MyScriptServerKeys;
  type: MyScriptEditorType;
  v4: MyScriptRecognitionParamsV4;
}

interface MyScriptRecognitionParamsV4 {
  // TYPESCRIPT:
}

// Exported Functions

export function getMyScript(): MyScriptGlobal {
  return (<any>window).MyScript;
}
