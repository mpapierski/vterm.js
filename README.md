vterm.js
===

JavaScript bindings for libvterm library.

# Why?

This library wraps `libvterm` which is an abstract implementation of a VT220/xterm/ECMA-48 terminal emulator.

You can use this library to build your web based TTY.

# How to use

TBD.

```javascript
var VTerm = require('vterm.js');
var term = new VTerm(25, 80);
term.write('Hello world!');
term.close();
```

# License

TBD

# Authors

Michał Papierski <michal@papierski.net>

