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

// Exported Functions

// export function apiGetRequest(method: string) {
//   return new Promise((resolve, reject)=>{
//     const xhr = new XMLHttpRequest();
//     xhr.open('GET', `/api/${method}`);
//     xhr.onload = function() {
//       if (xhr.status === 200) {
//         try {
//           const results = JSON.parse(xhr.responseText);
//           resolve(results);
//         } catch (err) {
//           reject(new Error(`Ajax GET /api/${method} returned invalid JSON: ${err.message}`));
//         }
//       } else {
//         reject(new Error(`Ajax GET /api/${method} request failed: status ${xhr.status}`));
//       }
//     };
//     xhr.send();
//   });
// }

export function apiPostRequest<P,R>(method: string, data: P): Promise<R> {
  return new Promise<R>((resolve, reject)=>{
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/${method}`);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          const results = JSON.parse(xhr.responseText);
          resolve(results);
        } catch (err) {
          reject(new Error(`Ajax POST /api/${method} returned invalid JSON: ${err.message}`));
        }
      } else {
        reject(new Error(`Ajax POST /api/${method} request failed: status ${xhr.status}`));
      }
    };
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(data));
  });
}

