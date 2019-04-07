
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

