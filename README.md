selfcertbot
===========

A tool for conveniently self-signing certificates for development.

This is currently very scuffed but just about limps over the finish line to create certificates.
I intend to go back, clean this up, add tests, and make it more reliable and add more features but I'm publishing it now for reference and convenience.

## Installing
1. Be sure to update `openssl` to the latest version first.
   - If you're on macOS, you may need to install a more up-to-date version from Homebrew with `brew install openssl`
     and then add it to your PATH.
2. (In future) Install the CLI: `npm i -g selfcertbot`
