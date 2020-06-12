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

## Supported Browsers and Devices

For Math Tablet we use the __Google Chrome__ browser on computers and devices.
There is a good chance that Math Tablet will not work properly on other browsers because we do not test them.

As for devices with a stylus, we use the __Apple iPad Pro TBD:version__ and __Microsoft Surface Pro 6__.
Note that Google Chrome is not the default browser on either of these devices, so you will need to install it.

We run the server on Apple Mac computers with the latest version of OS X.

If you want Math Tablet to support other browsers, devices, or operating systems, [let us know](https://www.pubinv.org/contact-us/).

## Running Locally

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
In your `HOME` directory, create a subdirectory <tt>math-tablet-usr</tt>:

```bash
mkdir -p ~/math-tablet-usr
```

Step 5: Install dependencies, build, run unit tests, and run the math-tablet server:

```bash
scripts/go
```

Step 6: Open a browser to [localhost:3000](http://localhost:3000) and enjoy!

## Useful Tips

In the Chrome browser on Windows, press `F11` to go fullscreen,
or tap the three vertical dots to the right of the browser address bar,
then tap on the incomplete square icon to the right of "Zoom".
To exit fullscreen mode, press `F11` again,
or hover the mouse cursor at the top of the screen with pen or mouse,
and a close button will appear.

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
