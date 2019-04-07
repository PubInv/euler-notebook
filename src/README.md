# Math Tablet src

This directory contains the source code for the math tablet web server and client.

## Running locally

To run a local version of the math-tablet web server you will need [node](https://nodejs.org/en/).

Step 1: Create a [MyScript developer account](https://developer.myscript.com/getting-started/web)
to obtain application keys for their handwriting recognition services.
After you create an account, MyScript will send you an email message with an <tt>applicationKey</tt>and an <tt>hmacKey</tt>.
In your HOME (<tt>echo $HOME</tt>) directory, create a <tt>.math-tablet-credentials.json</tt>file with your MyScript keys:

```json
{
  "myscript": {
    "applicationKey": "REPLACE-ME",
    "hmacKey": "REPLACE-ME"
  }
}
```

Step 2: Create a directory to store user notebooks.
In your HOME directory, create a subdirectory <tt>math-tablet-usr</tt>.
Then, create a subdirectory of that directory named after a user,
e.g. <tt>~/math-tablet-usr/david</tt>.
The following command should do the trick on Mac and Linux:

```bash
mkdir -p ~/math-tablet-usr/$USER
```

Step 3: Build and run math-tablet.

```bash
npm run clean
npm install
npm run build
npm test
npm start
```

Step 4: Open a browser to [localhost:3000](http://localhost:3000) and enjoy!

## Development

The server is an [express](https://expressjs.com/) server, so it would be helpful to be familiar with that.
Along with <tt>express</tt>, we use [Pug](https://pugjs.org/) for HTML templating and [Stylus](http://stylus-lang.com/)
for CSS simplification.

You need to restart the express server if you modify any of the web-server JavaScript files.
You do _not_ need to restart the server if you modify PUG HTML (<tt>.pug</tt>) or Stylus CSS (<tt>.styl</tt>) files.
Just refresh the browser page.
Nor do you need to restart the server if you modify a client-side JavaScript page.
However, if you modify a TypeScript (<tt>.ts</tt>) file, you will need to <tt>npm run-script build</tt>
before refreshing the browser.

Static assets to be served by the web server are placed in the <tt>public</tt>directory.

## Running Mocha tests

There is a set of Mocha unit tests in the <tt>test</tt> subdirectory. To run them:

```bash
npm test
```
