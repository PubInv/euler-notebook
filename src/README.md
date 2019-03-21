# Math Tablet src

This directory contains the source code for the math tablet web server and client.

## Running locally

To run a local version of the math-tablet web server you will need [node](https://nodejs.org/en/).

You also need to create a [MyScript developer account](https://developer.myscript.com/getting-started/web)
to obtain application keys for their handwriting recognition services.
After you create an account, MyScript will send you an email message with an `applicationKey` and an `hmacKey`.
In this `src` directory, create a `.credentials.json` file with your MyScript keys:

```json
{
  "myscript": {
    "applicationKey": "REPLACE-ME",
    "hmacKey": "REPLACE-ME"
  }
}
```

(The `.gitignore` file ensures the credentials file will not be commited to Git.)

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
Along with `express`, we use [Pug](https://pugjs.org/) for HTML templating and [Stylus](http://stylus-lang.com/)
for CSS simplification.

math-tablet is a single-page app.
The page HTML inside the `<body>` of the page is defined in `views/index.pug`.
The page HTML outside of that is defined in `views/layout.pug`.
The main stylesheet is defined in `public\stylesheets\style.styl`.
The HTML and CSS is generated from these templates on every page load in development, so you do not need to restart the web server if you make a change to a `.pug` or `.styl` file.
Just reload the page in your browser.

Static assets to be served by the web server are placed in the `public` directory.

The entry point of the app is the node script in `bin\www`. The `express` route that serves up the single-page app is in `routes\index.js`. Look for `router.get('/',...)`.
