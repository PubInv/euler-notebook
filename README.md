# Euler Notebook

This directory contains the source code for the Euler Notebook, a project of
[Public Invention](https://pubinv.github.io/PubInv/).

## Purpose

Euler Notebook seeks to make an electronic notebook for doing math with an emphasis on stylus (handwritten) input, with an "expert assistant" typesetting formulas, verifying the work, and making helpful suggestions.
The notebook should also allow writing prose, drawing diagrams, performing calculations, plotting results, etc.

Math has been done for 300 years in a conventional way with convential syntax, typography, and style. Using Euler Notebook should feel like doing math on paper, only better.

## Governance

Euler Notebook was created by David Jeschke, and he is the Invention Coach and "Benevelont Dictator For Now" of this project.
The project is currently licensed under the [Affero GPL](https://www.gnu.org/licenses/agpl-3.0.en.html).
We actively seek volunteers and contributors.

## Supported Browsers and Devices

For Euler Notebook we use the __Google Chrome__ browser on computers and devices.
There is a good chance that Euler Notebook will not work properly on other browsers because we currently do not test them.

As for devices with a stylus, we test with the __Apple iPad Pro__ (12.9" 3rd gen).
Note that Google Chrome is not the default browser on this device, so you will need to install it.

You need to turn off the iPad's Scribble feature when using Euler Notebook (Settings -> Apple Pencil -> Scribble). If you don't turn it off, then when writing quickly with the Apple Pen every other stroke will be dropped.

Tip: If you would like a more paper-like feel when using the Apple Pencil with the iPad
you might consider a [Paperlike](https://paperlike.com) screen protector.

We run the server on Apple Mac computers with the latest version of OS X.

If you want Euler Notebook to support other browsers, devices, or operating systems, [let us know](https://www.pubinv.org/contact-us/).

## Running Locally

### Step 1: Install node and git

You may already have [node](https://nodejs.org/en/) and [git](https://git-scm.com/downloads) on your computer.

We use the most recent LTS release of node, version 18.12.1 as of this writing.

### Step 2: Clone the repository

```bash
git clone git@github.com:PubInv/euler-notebook.git ~/euler-notebook
```

### Step 3: Create supporting directories

This will create a configuration directory and a directory to store user notebooks.

```bash
mkdir ~/.euler-notebook
mkdir ~/euler-notebook-usr
```

### Step 4: Create a user account

_This is a temporary step required in the absence of program functionality to create user accounts._
This step assumes a username of `sam`. Replace it with the username of your choice.

```bash
mkdir ~/euler-notebook-usr/sam
cp ~/euler-notebook/server/config-dir/user-info.json ~/euler-notebook-usr/sam/.user-info.json
```

Also, obtain a 26-pixel square .PNG image for the user account and place it in `~/euler-notebook/server/public/images/profile-pics/sam-26x26.png`.

In step 6, you will be able to log in to this account using username `sam` and password `abracadabra`.

You can change the password by editing the `.user-info.json` file that you copied into the `sam` directory, above. _Yes, we know it is a bad practice to keep passwords in plain text_, and we will store the passwords encrypted when we implement functionality to create user accounts.

If you add additional users, ensure `clientObj.id` is a unique integer in the `.user-info.json` file for each user.

### Step 5: Build and run

This will install dependencies, build, run unit tests, and run the euler-notebook server.

```bash
scripts/go
```

### Step 6: Open euler-notebook in a browser

Point your browser to [localhost](http://localhost).
Log in with the username and password from step 4.

We actively encourage you to send us feedback about these instructions and your experience with Euler Notebook. Thank you!

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
