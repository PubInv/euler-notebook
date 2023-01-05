# Euler Notebook

This directory contains the source code for the Euler Notebook, a project of
[Public Invention](https://pubinv.github.io/PubInv/).

## Purpose

Euler Notebook seeks to make a useful math assistant for stylus-based tablets and other hand-written input means.
Our goal is have an expert assistant looking over our shoulder and helping as we do math the way we otherwise normally do,
including drawing diagrams, performing calculations, and producing proofs.

## Governance

Euler Notebook was created by David Jeschke, and he is the Invention Coach and "Benevelont Dictator For Now" of this project.
The project is currently licensed under the [Affero GPL](https://www.gnu.org/licenses/agpl-3.0.en.html).
We are actively seeking volunteers and contributors.

## Principles

Euler Notebook aims to uphold certain principles:
1. Math has been done for 300 years in a conventional way with convential syntax, typography, and style. Using Euler Notebook should feel like doing math on paper, only better.
2. There are powerful computer programming systems; Euler Notebook is not one of them. We are not attempting to create a programming system, but a math system.

## Supported Browsers and Devices

For Euler Notebook we use the __Google Chrome__ browser on computers and devices.
There is a good chance that Euler Notebook will not work properly on other browsers because we currently do not test them.

As for devices with a stylus, we test with the __Apple iPad Pro__ (12.9" 3rd gen) and __Microsoft Surface Pro__ (6).
Note that Google Chrome is not the default browser on either of these devices, so you will need to install it.

We run the server on Apple Mac computers with the latest version of OS X.

If you want Euler Notebook to support other browsers, devices, or operating systems, [let us know](https://www.pubinv.org/contact-us/).

## Apple iPad Note

You need to turn off the iPad's Scribble feature when using Euler Notebook (Settings -> Apple Pencil -> Scribble). If you don't turn it off, then when writing quickly with the Apple Pen every other stroke will be dropped.

## Running Locally

Step 1: Install [node](https://nodejs.org/en/). We are using version 18.12.1 LTS.

Step 2: Create a configuration directory and a directory to store user notebooks:

```bash
mkdir ~/.euler-notebook
mkdir ~/euler-notebook-usr
```

Step 3: Install dependencies, build, run unit tests, and run the euler-notebook server:

```bash
scripts/go
```

Step 4: Open a browser to [localhost](http://localhost) and enjoy!

See the `Development` section below for more information about running locally.

## Connect to MyScript

Euler Notebook can do a lot more when connected to some third-party services.
[MyScript](https://www.myscript.com/technology) has a Cloud API that can typeset handwritten, stylus-input formulas and text.

To connect Euler Notebook to MyScript, first create a [MyScript developer account](https://developer.myscript.com/getting-started/web).
After you create an account, MyScript will send you an email message with an <tt>applicationKey</tt>and an <tt>hmacKey</tt>.
Copy `server/config-dir/myscript.json` to `~/.euler-notebook/` and edit the file to insert the keys you received from MyScript.
Restart the Euler Notebook server for the configuration changes to take effect.

## Connect to Mathpix OCR

[Mathpix OCR](https://mathpix.com/ocr) is a Cloud API that can recognize typeset and handwritten formulas and text in images.

To connect Euler Notebook to Mathpix, create a [Mathpix account](https://accounts.mathpix.com/login).
TODO: describe how to get the keys from Mathpix.
Copy `server/config-dir/mathpix.json` to `~/.euler-notebook/` and edit the file to insert the keys you received from Mathpix.
Restart the Euler Notebook server for the configuration changes to take effect.

## Connect to WolframScript

[WolframScript](https://www.wolfram.com/wolframscript/) is a free functional scripting language with extensive mathematical capabilities.

To connect Euler Notebook to WolframScript, install the free [Wolfram Engine for Developers](https://www.wolfram.com/engine/).
Then install [WolframScript](https://www.wolfram.com/wolframscript/).
You will need to set up a Wolfram Account to get a license.
Run the Wolfram Engine app once in order to activate it.
Copy `server/config-dir/wolframscript.json` to `~/.euler-notebook/` and edit the file to insert the keys you received from Wolfram.
Restart the Euler Notebook server for the configuration changes to take effect.

## Connect to Wolfram Alpha

[Wolfram|Alpha](https://www.wolframalpha.com) is a mathematical search engine.

To connect Euler Notebook to Wolfram|Alpha, ... TODO.
Copy `server/config-dir/wolfram-alpha.json` to `~/.euler-notebook/` and edit the file to insert the keys you received from Wolfram.
Restart the Euler Notebook server for the configuration changes to take effect.

## Useful Tips

In the Chrome browser on Windows, press `F11` to go fullscreen,
or tap the three vertical dots to the right of the browser address bar,
then tap on the incomplete square icon to the right of "Zoom".
To exit fullscreen mode, press `F11` again,
or hover the mouse cursor at the top of the screen with pen or mouse,
and a close button will appear.

If you would like a more paper-like feel when using the Apple Pencil with the iPad
you could consider a [Paperlike screen protector](https://paperlike.com).

## Development

To delete any automatically-generated files run `scripts/clean`.

To install libraries that euler notebook depends on run `scripts/install`.

To build an executable euler-notebook client and server from source run `scripts/build`.

To run unit tests after euler notebook has been built run `scripts/test`.

To start the euler notebook server run `scripts/run`.

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

To rebuild the client every time there are changes: `~/euler-notebook/client$ npx webpack --watch`

To restart the server every time there are changes: `~/euler-notebook/server$ npx nodemon`

## Debugging

We use the [debug](https://www.npmjs.com/package/debug) library for emitting debugging information.

For server debug information, set the DEBUG environment variable to turn on debugging information:

```bash
DEBUG="server:*" npx nodemon
```

For client debug information, use the browser console to set localStorage.debug:

```
localStorage.debug="client:*"
```

To get debugging information from a specific file, specify the filename instead of the asterisk wildcard, e.g.
`DEBUG="server:client-socket`. You can specify multiple files by comma-separating them, and exclude debug
messages from a specific file by prefixing it with a minus sign. See the documentation for [debug](https://www.npmjs.com/package/debug).

To see JavaScript console messages in Chrome on an iPad, open another tab to [chrome://inspect](chrome://inspect).

## Testing

To run a specific file of unit tests, in the server directory:

```bash
DEBUG="server:example" npx mocha -r ./node_modules/ts-node/register test/example.spec.ts
```

## Credits

* Various icons, [IconMonster](https://iconmonstr.com/).
