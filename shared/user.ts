/*
Euler Notebook
Copyright (C) 2019-21 Public Invention
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

import { ClientId } from "./common";

// Requirements

// Types

export type UserId = number;
export type UserName = '{UserName}';
export type UserPassword = '{UserPassword}';

export interface CollaboratorObject {
  // These objects are sent to clients to identify other users that are collaborating
  // on the notebook or folder. Only put public information in this structure.
  clientId: ClientId;
  userId: UserId;
  userName: UserName;
}

export interface UserObject {
  // These objects are sent to clients when the user successfully logs in.
  id: UserId;
  userName: UserName;
}

// Constants

export const USERNAME_RE = /^[a-z0-9_]+$/;
