# Math Tablet

This directory contains the source code for the Math Tablet, a project of
[Public Invention](https://pubinv.github.io/PubInv/).

## Purpose

Math Tablet seeks to make a useful math assistant for stylus-based tablets and other hand-written input means.
Our goal is have a genius looking over our shoulder and magically helping as we do math the way we normally do,
including drawing diagrams, performing calculations, and producing proofs.

## Governance

Math Tablet was create by David Jeschke, and he is the Invention Coach and "Benevelont Dictator For Now" of this project.
The project is currently licensed under the [Affero GPL](https://www.gnu.org/licenses/agpl-3.0.en.html).
We are actively seeking volunteers and contributors.

## Current Screenshot

Our current code can accept handwriting and put togetether simple mathematical assertions to perform calculations.

![Screen Shot 2019-04-25 at 12 49 54 PM](https://user-images.githubusercontent.com/5296671/56757194-3e827c80-6759-11e9-969d-e0a49395ce0d.png)

## Running locally

Step 1: Create a [MyScript developer account](https://developer.myscript.com/getting-started/web)
to obtain application keys for their handwriting recognition services.
After you create an account, MyScript will send you an email message with an <tt>applicationKey</tt>and an <tt>hmacKey</tt>.

Step 2: Install [node](https://nodejs.org/en/) if you don't have it already.

Step 3: Create a credentials and configuration directory:

```bash
cp -r ~/math-tablet/server/config-dir/ ~/.math-tablet
```

Edit ~/.math-tablet/credentials.json to insert your MyScript applicationKey and hmacKey.

If you don't have Mathematica, then edit ~/.math-tablet/config.json to remove the "mathematica" section.

Step 4: Create a directory to store user notebooks.
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

Step 5: Open a browser to [localhost:3000](http://localhost:3000) and enjoy!

## Mathematica Integration

We are currently experimenting with integrating with Mathematica.
A goal is to be able to render Mathematica plots. We currently have
integration at the most basic level of expression evaluation working, although it
is fragile.

For this to work, you need to have a running local WolframKernel, which
probably means you need a Mathematica license. This
must be started with the script
> ./scripts/start_wolfram_kernel
which must be begun before the server is started. This executes an init file,
and produces a simple log.

This work is preliminary and actively under development. There is not
good way to kill the kernel except by hand at present.

## Credits

* Folder icon, [IconMonster](https://iconmonstr.com/folder-thin-svg/).

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

## Developing with Wolfram Functionality for Free

MathTablet hopes to use a plug-in strategy; at present, we are leveraging the
computer algebra system and graphing capabilities of Wolfram Technology (i.e., Mathematica.)
We also use MathJS, but as of this writing our main work is via wolframscript.

If you pay for Mathematica, you can develop on your home machine as we (David and Rob) do.
Happily, Wolfram now offers a [free-of-charge development license](https://blog.stephenwolfram.com/2019/05/launching-today-free-wolfram-engine-for-developers/) for key pieces
for pre-production use. MathTablet is currently an experimental open-source system
in pre-alpha development, so we believe it definitely qualifies. This means that
you can develop for MathTablet without paying a license fee.

To do this you will need to install two pieces of Wolfram technology:
the [engine](https://www.wolfram.com/engine/) and [wolframscript](http://www.wolfram.com/wolframscript/?source=nav). This requires you to create an account at Wolfram and
follow the instructions for installation and activation.  We have mocha unit test
for wolframscript which should allow you to confirm when it is probably installed.


## Running Mocha tests

There is a set of Mocha unit tests in <tt>server/test</tt> subdirectory. To run them:

```bash
scripts/test
# -or-
cd server; npm test
```
