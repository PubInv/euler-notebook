# Math Tablet src

This directory contains the source code for the math tablet web server and client.

## Running locally

To run a local version of the math-tablet web server you will need [node](https://nodejs.org/en/).

You also need to create a [MyScript developer account](https://developer.myscript.com/getting-started/web)
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

(The <tt>.gitignore</tt>file ensures the credentials file will not be commited to Git.)

Then, install the npm dependencies:

```bash
npm install
```

Some files are in TypeScript an need to be transpiled to JavaScript, so:

```bash
npm run-script build
```

You will need to re-run the build command if you modify any .ts files.

Start the express server:

```bash
DEBUG=src:* npm start
```

And open a browser to [localhost:3000](http://localhost:3000).

You need to restart the express server if you modify any of the web-server JavaScript files.
You do _not_ need to restart the server if you modify PUG HTML (<tt>.pug</tt>) or Stylus CSS (<tt>.styl</tt>) files.
Just refresh the browser page.
Nor do you need to restart the server if you modify a client-side JavaScript page.
However, if you modify a TypeScript (<tt>.ts</tt>) file, you will need to <tt>npm run-script build</tt>
before refreshing the browser.

## Modifying the code

The server is an [express](https://expressjs.com/) server, so it would be helpful to be familiar with that.
Along with <tt>express</tt>, we use [Pug](https://pugjs.org/) for HTML templating and [Stylus](http://stylus-lang.com/)
for CSS simplification.

math-tablet is a single-page app.
The page HTML inside the <tt><body></tt>of the page is defined in <tt>views/index.pug</tt>.
The page HTML outside of that is defined in <tt>views/layout.pug</tt>.
The main stylesheet is defined in <tt>public\stylesheets\style.styl</tt>.
The HTML and CSS is generated from these templates on every page load in development, so you do not need to restart the web server if you make a c
hange to a <tt>.pug</tt>or <tt>.styl</tt>file.
Just reload the page in your browser.

Static assets to be served by the web server are placed in the <tt>public</tt>directory.

The entry point of the app is the node script in <tt>bin\www</tt>. The <tt>express</tt>route that serves up the single-page app is in <tt>routes\index.js</tt>. Look for <tt>router.get('/',...)</tt>.

## Running Mocha tests

Running Mocha is a little awkward because it requires the TypeScript files to be
rebuilt with the <tt>es5</tt> target. Do:

```bash
npm run build-test
npm test
```

Switching back, you will need to <tt>npm run build</tt> to rebuild the TypeScript files to
the <tt>es2017</tt> target.

## TODOs in the Current Branch and Status

The biggest problem in the current branch is the file api.js
in the routes directory, which needs to import the TDoc and
mathSimplifyRule objects into api.js. David is going to work on this.

The current code (in the Mocha tests) does indeed use the math.js
package correctly to execute a test. In that sense, some of our
main functionality under test has been restored, but there
remains some TDoc functionality that used to be under test which
needs to be done.