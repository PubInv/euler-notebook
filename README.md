# Math Tablet

This directory contains the source code for the math tablet project.

## Running locally

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

Step 2: Install [node](https://nodejs.org/en/) if you don't have it already.

Step 3: Create a directory to store user notebooks.
In your HOME directory, create a subdirectory <tt>math-tablet-usr</tt>.
Then, create a subdirectory of that directory named after a user,
e.g. <tt>~/math-tablet-usr/david</tt>.
The following command should do the trick on Mac and Linux:

```bash
mkdir -p ~/math-tablet-usr/$USER
```

Step 4: Install dependencies, build, test, and run math-tablet:

```bash
scripts/go
```

Step 4: Open a browser to [localhost:3000](http://localhost:3000) and enjoy!

## Development

The scripts/go command runs the following bash scripts:

```bash
scripts/clean
scripts/install
scripts/build
scripts/test
scripts/run
```

The source code is divided into two subdirectories, <tt>client</tt> and <tt>server</tt>.

The server is an [express](https://expressjs.com/) server, so it would be helpful to be familiar with that.
Along with <tt>express</tt>, we use [Pug](https://pugjs.org/) for HTML templating and [Stylus](http://stylus-lang.com/)
for CSS simplification.

You need to restart the express server if you modify any of the web-server JavaScript files.
You do _not_ need to restart the server if you modify PUG HTML (<tt>server/views/*.pug</tt>) or Stylus CSS (<tt>server/public/stylesheets/*.styl</tt>) files.
Just refresh the browser page.

Static assets to be served by the web server are placed in the <tt>server/public</tt>directory.

## Running Mocha tests

There is a set of Mocha unit tests in <tt>server/test</tt> subdirectory. To run them:

```bash
scripts/test
# -or-
cd server; npm test
```
