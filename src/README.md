# Math Tablet src

This directory contains the source code for the math tablet web server and client.

## Running locally

To run a local version of the math-tablet web server you will need [node](https://nodejs.org/en/).

You also need to create a [MyScript developer account](https://developer.myscript.com/getting-started/web)
to obtain application keys for their handwriting recognition services.
After you create an account, MyScript will send you an email message with an <tt>applicationKey</tt>and an <tt>hmacKey</tt>.
In this <tt>src</tt>directory, create a <tt>.credentials.json</tt>file with your MyScript keys:

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

Start the express server:

```bash
DEBUG=src:* npm start
```

And open a browser to [localhost:3000](http://localhost:3000).

## Modifying the code

The server is an [express](https://expressjs.com/) server, so it would be helpful to be familiar with that.
Along with <tt>express</tt>, we use [Pug](https://pugjs.org/) for HTML templating and [Stylus](http://stylus-lang.com/)
for CSS simplification.

math-tablet is a single-page app.
The page HTML inside the <tt><body></tt>of the page is defined in <tt>views/index.pug</tt>.
The page HTML outside of that is defined in <tt>views/layout.pug</tt>.
The main stylesheet is defined in <tt>public\stylesheets\style.styl</tt>.
The HTML and CSS is generated from these templates on every page load in development, so you do not need to restart the web server if you make a change to a <tt>.pug</tt>or <tt>.styl</tt>file.
Just reload the page in your browser.

Static assets to be served by the web server are placed in the <tt>public</tt>directory.

The entry point of the app is the node script in <tt>bin\www</tt>. The <tt>express</tt>route that serves up the single-page app is in <tt>routes\index.js</tt>. Look for <tt>router.get('/',...)</tt>.
