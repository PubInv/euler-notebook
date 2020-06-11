# Math Tablet

This directory contains the source code for the Math Tablet, a project of
[Public Invention](https://pubinv.github.io/PubInv/).

## Purpose

Math Tablet seeks to make a useful math assistant for stylus-based tablets and other hand-written input means.
Our goal is have an expert assistant looking over our shoulder and helping as we do math the way we otherwise normally do,
including drawing diagrams, performing calculations, and producing proofs.

## Governance

Math Tablet was created by David Jeschke, and he is the Invention Coach and "Benevelont Dictator For Now" of this project.
The project is currently licensed under the [Affero GPL](https://www.gnu.org/licenses/agpl-3.0.en.html).
We are actively seeking volunteers and contributors.

## Running locally

Step 1: Create a [MyScript developer account](https://developer.myscript.com/getting-started/web)
to obtain application keys for their handwriting recognition services.
After you create an account, MyScript will send you an email message with an <tt>applicationKey</tt>and an <tt>hmacKey</tt>.

Step 2: Install the [Free Wolfram Engine for Developers](https://www.wolfram.com/engine/).
Also install WolframScript.
You will need to set up a Wolfram Account to get a license.
Run the Wolfram Engine app once in order to activate it.

Step 3: Install [node](https://nodejs.org/en/).

Step 4: Create a credentials and configuration directory:

```bash
cp -r ~/math-tablet/server/config-dir/ ~/.math-tablet
```

Edit `~/.math-tablet/credentials.json` to insert your MyScript applicationKey and hmacKey.

Step 4: Create a directory to store user notebooks.
In your `HOME` directory, create a subdirectory <tt>math-tablet-usr</tt>.
Then, create a subdirectory of that directory named after a user,
e.g. <tt>~/math-tablet-usr/david</tt>.
The following command should do the trick on Mac and Linux:

```bash
mkdir -p ~/math-tablet-usr/$USER
```

Step 5: Install dependencies, build, run unit tests, and run the math-tablet server:

```bash
scripts/go
```

Step 6: Open a browser to [localhost:3000](http://localhost:3000) and enjoy!

## Development

To delete any automatically-generated files run `scripts/clean`.

To install libraries that math tablet depends on run `scripts/install`.

To build an executable math-tablet client and server from source run `scripts/build`.

To run unit tests after math tablet has been built run `scripts/test`.

To start the math tablet server run `scripts/run`.

The `scripts/go` command runs the above scripts in the order listed.

The source code is divided into two subdirectories, <tt>client</tt> and <tt>server</tt>.

The server is an [express](https://expressjs.com/) server, so it would be helpful to be familiar with that.
Along with <tt>express</tt>, we use [Pug](https://pugjs.org/) for HTML templating and [Stylus](http://stylus-lang.com/)
for CSS simplification.

You need to restart the express server if you modify any of the web-server JavaScript files.
You do _not_ need to restart the server if you modify PUG HTML (<tt>server/views/*.pug</tt>) or Stylus CSS (<tt>server/public/stylesheets/*.styl</tt>) files.
Just refresh the browser page.

Static assets to be served by the web server are placed in the <tt>server/public</tt>directory.

If you modify a client source file you need to rebuild the client before re-running the server.
This can be accomplished with `scripts/build && scripts/run`.

## Credits

* Various icons, [IconMonster](https://iconmonstr.com/).
