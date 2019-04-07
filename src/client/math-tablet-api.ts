

export type NotebookName = string;
export type UserName = string;

// Plain object version of TDoc

export interface StyleObject {
  id: number;
  stylableId: number;
  type: string;
  data: any;
}

export interface TDocObject {
  nextId: number;
  version: string;
  thoughts: ThoughtObject[];
  styles: StyleObject[];
}

export interface ThoughtObject {
  id: number;
}

// API Calls

export interface EnhanceParams {
  tDoc: TDocObject;
}

export interface EnhanceResults {
  ok: true;
  newStyles: StyleObject[];
}

export interface OpenParams {
  userName: UserName;
  notebookName: NotebookName;
}

export interface OpenResults {
  ok: true,
  tDoc: TDocObject,
}

export interface SaveParams {
  userName: UserName;
  notebookName: NotebookName;
  tDoc: TDocObject;
}

export interface SaveResults {
  ok: true;
}

