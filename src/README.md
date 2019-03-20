# Math Tablet Src

This directory contains the source code for the math tablet web server and client.

Create a file .credentials.json with your MyScript credentials:

```json
{
  "myscript": {
    "applicationKey": "REPLACE-ME",
    "hmacKey": "REPLACE-ME"
  }
}
```

To run the server locally, in this directory:

```bash
npm install
DEBUG=src:* npm start
```