// This prevents pollution of the global namespace
var VTerm = (function () {

// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_WEB = typeof window === 'object';
// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (!Module['thisProgram']) {
    if (process['argv'].length > 1) {
      Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
    } else {
      Module['thisProgram'] = 'unknown-program';
    }
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WORKER) {
    Module['load'] = importScripts;
  }

  if (typeof Module['setWindowTitle'] === 'undefined') {
    Module['setWindowTitle'] = function(title) { document.title = title };
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  prepVararg: function (ptr, type) {
    if (type === 'double' || type === 'i64') {
      // move so the load is aligned
      if (ptr & 7) {
        assert((ptr & 7) === 4);
        ptr += 4;
      }
    } else {
      assert((ptr & 3) === 0);
    }
    return ptr;
  },
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      assert(args.length == sig.length-1);
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      assert(sig.length == 1);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16);(assert((((STACKTOP|0) < (STACK_MAX|0))|0))|0); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + (assert(!staticSealed),size))|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + (assert(DYNAMICTOP > 0),size))|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) { var success = enlargeMemory(); if (!success) { DYNAMICTOP = ret;  return 0; } }; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}



Module["Runtime"] = Runtime;



//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try {
      func = eval('_' + ident); // explicit lookup
    } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    assert(returnType !== 'array', 'Return type should not be "array".');
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if ((!opts || !opts.async) && typeof EmterpreterAsync === 'object') {
      assert(!EmterpreterAsync.state, 'cannot start async op with normal JS calling ccall');
    }
    if (opts && opts.async) assert(!returnType, 'async ccalls cannot return values');
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) {
      if (opts && opts.async) {
        EmterpreterAsync.asyncFinalizers.push(function() {
          Runtime.stackRestore(stack);
        });
        return;
      }
      Runtime.stackRestore(stack);
    }
    return ret;
  }

  var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }
  var JSsource = {};
  for (var fun in JSfuncs) {
    if (JSfuncs.hasOwnProperty(fun)) {
      // Elements of toCsource are arrays of three items:
      // the code, and the return value
      JSsource[fun] = parseJSFunc(JSfuncs[fun]);
    }
  }

  
  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=' + convertCode.returnValue + ';';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    funcstr += "if (typeof EmterpreterAsync === 'object') { assert(!EmterpreterAsync.state, 'cannot start async op with normal JS calling cwrap') }";
    if (!numericArgs) {
      // If we had a stack, restore it
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;

function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module["setValue"] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module["getValue"] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module["allocate"] = allocate;

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return Runtime.staticAlloc(size);
  if ((typeof _sbrk !== 'undefined' && !_sbrk.called) || !runtimeInitialized) return Runtime.dynamicAlloc(size);
  return _malloc(size);
}
Module["getMemory"] = getMemory;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return Module['UTF8ToString'](ptr);
}
Module["Pointer_stringify"] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module["AsciiToString"] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module["stringToAscii"] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

function UTF8ArrayToString(u8Array, idx) {
  var u0, u1, u2, u3, u4, u5;

  var str = '';
  while (1) {
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    u0 = u8Array[idx++];
    if (!u0) return str;
    if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
    u1 = u8Array[idx++] & 63;
    if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
    u2 = u8Array[idx++] & 63;
    if ((u0 & 0xF0) == 0xE0) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u3 = u8Array[idx++] & 63;
      if ((u0 & 0xF8) == 0xF0) {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
      } else {
        u4 = u8Array[idx++] & 63;
        if ((u0 & 0xFC) == 0xF8) {
          u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
        } else {
          u5 = u8Array[idx++] & 63;
          u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
        }
      }
    }
    if (u0 < 0x10000) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    }
  }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8,ptr);
}
Module["UTF8ToString"] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module["stringToUTF8Array"] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}
Module["stringToUTF8"] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module["UTF16ToString"] = UTF16ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}
Module["stringToUTF16"] = stringToUTF16;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}
Module["lengthBytesUTF16"] = lengthBytesUTF16;

function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module["UTF32ToString"] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}
Module["stringToUTF32"] = stringToUTF32;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}
Module["lengthBytesUTF32"] = lengthBytesUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var parsed = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    parsed = parse();
  } catch(e) {
    parsed += '?';
  }
  if (parsed.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return parsed;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module["stackTrace"] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;

function alignMemoryPage(x) {
  if (x % 4096 > 0) {
    x += (4096 - (x % 4096));
  }
  return x;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk


function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}

function enlargeMemory() {
  abortOnCannotGrowMemory();
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be compliant with the asm.js spec (and given that TOTAL_STACK=' + TOTAL_STACK + ')');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer;



buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);


// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module["addOnPreRun"] = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module["addOnInit"] = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module["addOnPreMain"] = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module["addOnExit"] = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module["addOnPostRun"] = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
Module["intArrayFromString"] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module["intArrayToString"] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module["writeStringToMemory"] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[((buffer++)>>0)]=array[i];
  }
}
Module["writeArrayToMemory"] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}


// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


if (!Math['clz32']) Math['clz32'] = function(x) {
  x = x >>> 0;
  for (var i = 0; i < 32; i++) {
    if (x & (1 << (31 - i))) return i;
  }
  return 32;
};
Math.clz32 = Math['clz32']

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 10000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module["addRunDependency"] = addRunDependency;

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module["removeRunDependency"] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;



// === Body ===

var ASM_CONSTS = [];




STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 7680;
  /* global initializers */  __ATINIT__.push();
  

/* memory initializer */ allocate([0,0,0,0,117,0,0,0,68,0,0,0,1,0,0,0,48,0,0,0,76,0,0,0,1,0,0,0,65,0,0,0,84,2,0,0,1,0,0,0,66,0,0,0,92,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,2,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,198,37,0,0,146,37,0,0,9,36,0,0,12,36,0,0,13,36,0,0,10,36,0,0,176,0,0,0,177,0,0,0,36,36,0,0,11,36,0,0,24,37,0,0,16,37,0,0,12,37,0,0,20,37,0,0,60,37,0,0,186,35,0,0,187,35,0,0,0,37,0,0,188,35,0,0,189,35,0,0,28,37,0,0,36,37,0,0,52,37,0,0,44,37,0,0,2,37,0,0,125,42,0,0,126,42,0,0,192,3,0,0,96,34,0,0,163,0,0,0,183,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,163,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,13,0,0,0,0,0,0,0,2,0,0,0,9,0,0,0,0,0,0,0,1,0,0,0,127,0,0,0,0,0,0,0,1,0,0,0,27,0,0,0,0,0,0,0,6,0,0,0,65,0,0,0,0,0,0,0,6,0,0,0,66,0,0,0,0,0,0,0,6,0,0,0,68,0,0,0,0,0,0,0,6,0,0,0,67,0,0,0,0,0,0,0,7,0,0,0,126,0,0,0,2,0,0,0,7,0,0,0,126,0,0,0,3,0,0,0,6,0,0,0,72,0,0,0,0,0,0,0,6,0,0,0,70,0,0,0,0,0,0,0,7,0,0,0,126,0,0,0,5,0,0,0,7,0,0,0,126,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,80,0,0,0,0,0,0,0,6,0,0,0,81,0,0,0,0,0,0,0,6,0,0,0,82,0,0,0,0,0,0,0,6,0,0,0,83,0,0,0,0,0,0,0,7,0,0,0,126,0,0,0,15,0,0,0,7,0,0,0,126,0,0,0,17,0,0,0,7,0,0,0,126,0,0,0,18,0,0,0,7,0,0,0,126,0,0,0,19,0,0,0,7,0,0,0,126,0,0,0,20,0,0,0,7,0,0,0,126,0,0,0,21,0,0,0,7,0,0,0,126,0,0,0,23,0,0,0,7,0,0,0,126,0,0,0,24,0,0,0,8,0,0,0,48,0,0,0,112,0,0,0,8,0,0,0,49,0,0,0,113,0,0,0,8,0,0,0,50,0,0,0,114,0,0,0,8,0,0,0,51,0,0,0,115,0,0,0,8,0,0,0,52,0,0,0,116,0,0,0,8,0,0,0,53,0,0,0,117,0,0,0,8,0,0,0,54,0,0,0,118,0,0,0,8,0,0,0,55,0,0,0,119,0,0,0,8,0,0,0,56,0,0,0,120,0,0,0,8,0,0,0,57,0,0,0,121,0,0,0,8,0,0,0,42,0,0,0,106,0,0,0,8,0,0,0,43,0,0,0,107,0,0,0,8,0,0,0,44,0,0,0,108,0,0,0,8,0,0,0,45,0,0,0,109,0,0,0,8,0,0,0,46,0,0,0,110,0,0,0,8,0,0,0,47,0,0,0,111,0,0,0,8,0,0,0,10,0,0,0,77,0,0,0,8,0,0,0,61,0,0,0,88,0,0,0,0,0,0,0,51,0,0,0,102,0,0,0,153,0,0,0,204,0,0,0,255,0,0,0,0,0,0,0,11,0,0,0,22,0,0,0,33,0,0,0,44,0,0,0,55,0,0,0,66,0,0,0,77,0,0,0,88,0,0,0,99,0,0,0,110,0,0,0,121,0,0,0,133,0,0,0,144,0,0,0,155,0,0,0,166,0,0,0,177,0,0,0,188,0,0,0,199,0,0,0,210,0,0,0,221,0,0,0,232,0,0,0,243,0,0,0,255,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,0,0,0,0,8,0,0,0,0,0,0,0,9,0,0,0,10,0,0,0,11,0,0,0,12,0,0,0,13,0,0,0,14,0,0,0,15,0,0,0,16,0,0,0,17,0,0,0,18,0,0,0,19,0,0,0,20,0,0,0,69,0,0,0,0,0,0,0,0,3,0,0,111,3,0,0,131,4,0,0,134,4,0,0,136,4,0,0,137,4,0,0,145,5,0,0,189,5,0,0,191,5,0,0,191,5,0,0,193,5,0,0,194,5,0,0,196,5,0,0,197,5,0,0,199,5,0,0,199,5,0,0,0,6,0,0,3,6,0,0,16,6,0,0,21,6,0,0,75,6,0,0,94,6,0,0,112,6,0,0,112,6,0,0,214,6,0,0,228,6,0,0,231,6,0,0,232,6,0,0,234,6,0,0,237,6,0,0,15,7,0,0,15,7,0,0,17,7,0,0,17,7,0,0,48,7,0,0,74,7,0,0,166,7,0,0,176,7,0,0,235,7,0,0,243,7,0,0,1,9,0,0,2,9,0,0,60,9,0,0,60,9,0,0,65,9,0,0,72,9,0,0,77,9,0,0,77,9,0,0,81,9,0,0,84,9,0,0,98,9,0,0,99,9,0,0,129,9,0,0,129,9,0,0,188,9,0,0,188,9,0,0,193,9,0,0,196,9,0,0,205,9,0,0,205,9,0,0,226,9,0,0,227,9,0,0,1,10,0,0,2,10,0,0,60,10,0,0,60,10,0,0,65,10,0,0,66,10,0,0,71,10,0,0,72,10,0,0,75,10,0,0,77,10,0,0,112,10,0,0,113,10,0,0,129,10,0,0,130,10,0,0,188,10,0,0,188,10,0,0,193,10,0,0,197,10,0,0,199,10,0,0,200,10,0,0,205,10,0,0,205,10,0,0,226,10,0,0,227,10,0,0,1,11,0,0,1,11,0,0,60,11,0,0,60,11,0,0,63,11,0,0,63,11,0,0,65,11,0,0,67,11,0,0,77,11,0,0,77,11,0,0,86,11,0,0,86,11,0,0,130,11,0,0,130,11,0,0,192,11,0,0,192,11,0,0,205,11,0,0,205,11,0,0,62,12,0,0,64,12,0,0,70,12,0,0,72,12,0,0,74,12,0,0,77,12,0,0,85,12,0,0,86,12,0,0,188,12,0,0,188,12,0,0,191,12,0,0,191,12,0,0,198,12,0,0,198,12,0,0,204,12,0,0,205,12,0,0,226,12,0,0,227,12,0,0,65,13,0,0,67,13,0,0,77,13,0,0,77,13,0,0,202,13,0,0,202,13,0,0,210,13,0,0,212,13,0,0,214,13,0,0,214,13,0,0,49,14,0,0,49,14,0,0,52,14,0,0,58,14,0,0,71,14,0,0,78,14,0,0,177,14,0,0,177,14,0,0,180,14,0,0,185,14,0,0,187,14,0,0,188,14,0,0,200,14,0,0,205,14,0,0,24,15,0,0,25,15,0,0,53,15,0,0,53,15,0,0,55,15,0,0,55,15,0,0,57,15,0,0,57,15,0,0,113,15,0,0,126,15,0,0,128,15,0,0,132,15,0,0,134,15,0,0,135,15,0,0,144,15,0,0,151,15,0,0,153,15,0,0,188,15,0,0,198,15,0,0,198,15,0,0,45,16,0,0,48,16,0,0,50,16,0,0,50,16,0,0,54,16,0,0,55,16,0,0,57,16,0,0,57,16,0,0,88,16,0,0,89,16,0,0,96,17,0,0,255,17,0,0,95,19,0,0,95,19,0,0,18,23,0,0,20,23,0,0,50,23,0,0,52,23,0,0,82,23,0,0,83,23,0,0,114,23,0,0,115,23,0,0,180,23,0,0,181,23,0,0,183,23,0,0,189,23,0,0,198,23,0,0,198,23,0,0,201,23,0,0,211,23,0,0,221,23,0,0,221,23,0,0,11,24,0,0,13,24,0,0,169,24,0,0,169,24,0,0,32,25,0,0,34,25,0,0,39,25,0,0,40,25,0,0,50,25,0,0,50,25,0,0,57,25,0,0,59,25,0,0,23,26,0,0,24,26,0,0,0,27,0,0,3,27,0,0,52,27,0,0,52,27,0,0,54,27,0,0,58,27,0,0,60,27,0,0,60,27,0,0,66,27,0,0,66,27,0,0,107,27,0,0,115,27,0,0,192,29,0,0,202,29,0,0,254,29,0,0,255,29,0,0,11,32,0,0,15,32,0,0,42,32,0,0,46,32,0,0,96,32,0,0,99,32,0,0,106,32,0,0,111,32,0,0,208,32,0,0,239,32,0,0,42,48,0,0,47,48,0,0,153,48,0,0,154,48,0,0,6,168,0,0,6,168,0,0,11,168,0,0,11,168,0,0,37,168,0,0,38,168,0,0,30,251,0,0,30,251,0,0,0,254,0,0,15,254,0,0,32,254,0,0,35,254,0,0,255,254,0,0,255,254,0,0,249,255,0,0,251,255,0,0,1,10,1,0,3,10,1,0,5,10,1,0,6,10,1,0,12,10,1,0,15,10,1,0,56,10,1,0,58,10,1,0,63,10,1,0,63,10,1,0,103,209,1,0,105,209,1,0,115,209,1,0,130,209,1,0,133,209,1,0,139,209,1,0,170,209,1,0,173,209,1,0,66,210,1,0,68,210,1,0,1,0,14,0,1,0,14,0,32,0,14,0,127,0,14,0,0,1,14,0,239,1,14,0,21,0,0,0,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,112,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,23,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,24,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,25,0,0,0,26,0,0,0,227,27,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,100,59,37,100,117,0,27,0,37,115,37,99,0,90,0,49,59,37,100,90,0,13,10,0,49,59,37,100,37,99,0,37,100,37,99,0,37,100,59,37,100,37,99,0,50,48,48,126,0,50,48,49,126,0,77,37,99,37,99,37,99,0,77,37,115,0,60,37,100,59,37,100,59,37,100,37,99,0,37,100,59,37,100,59,37,100,77,0,84,79,68,79,58,32,85,110,104,97,110,100,108,101,100,32,98,121,116,101,32,37,48,50,120,32,105,110,32,69,115,99,97,112,101,10,0,108,105,98,118,116,101,114,109,58,32,84,79,68,79,32,117,110,104,97,110,100,108,101,100,32,67,83,73,32,98,121,116,101,115,32,34,37,46,42,115,34,10,0,108,105,98,118,116,101,114,109,58,32,85,110,104,97,110,100,108,101,100,32,67,83,73,32,37,46,42,115,32,37,99,10,0,112,97,114,115,101,114,46,99,58,32,84,79,68,79,58,32,78,111,32,115,116,114,98,117,102,102,101,114,32,95,97,110,100,95,32,110,111,32,102,105,110,97,108,32,102,114,97,103,109,101,110,116,63,63,63,10,0,108,105,98,118,116,101,114,109,58,32,85,110,104,97,110,100,108,101,100,32,116,101,120,116,32,40,37,122,117,32,99,104,97,114,115,41,10,0,108,105,98,118,116,101,114,109,58,32,85,110,104,97,110,100,108,101,100,32,101,115,99,97,112,101,32,69,83,67,32,48,120,37,48,50,120,10,0,108,105,98,118,116,101,114,109,58,32,85,110,104,97,110,100,108,101,100,32,79,83,67,32,37,46,42,115,10,0,108,105,98,118,116,101,114,109,58,32,85,110,104,97,110,100,108,101,100,32,68,67,83,32,37,46,42,115,10,0,108,105,98,118,116,101,114,109,58,32,65,82,71,72,33,32,83,104,111,117,108,100,32,110,101,118,101,114,32,100,111,95,115,116,114,105,110,103,40,41,32,105,110,32,69,83,67,95,73,78,95,123,79,83,67,44,68,67,83,125,10,0,108,105,98,118,116,101,114,109,58,32,85,110,104,97,110,100,108,101,100,32,99,111,110,116,114,111,108,32,48,120,37,48,50,120,10,0,84,114,117,110,99,97,116,105,110,103,32,115,116,114,98,117,102,102,101,114,32,112,114,101,115,101,114,118,101,32,116,111,32,37,122,100,32,98,121,116,101,115,10,0,0,0,0,224,0,0,0,224,0,224,224,0,0,0,224,224,0,224,0,224,224,224,224,224,128,128,128,255,64,64,64,255,64,255,255,64,64,64,255,255,64,255,64,255,255,255,255,255,108,105,98,118,116,101,114,109,58,32,85,110,104,97,110,100,108,101,100,32,67,83,73,32,83,71,82,32,37,108,117,10,0,67,97,110,110,111,116,32,115,101,116,32,97,116,116,114,32,37,100,32,97,115,32,105,116,32,104,97,115,32,116,121,112,101,32,37,100,44,32,110,111,116,32,116,121,112,101,32,37,100,10,0,85,110,114,101,99,111,103,110,105,115,101,100,32,99,111,108,111,117,114,32,112,97,108,101,116,116,101,32,37,100,10,0,84,79,68,79,58,32,74,117,115,116,32,102,108,117,115,104,32,97,110,100,32,114,101,100,111,32,100,97,109,97,103,101,100,61,40,37,100,44,37,100,45,37,100,44,37,100,41,32,114,101,99,116,61,40,37,100,44,37,100,45,37,100,44,37,100,41,10,0,84,79,68,79,58,32,77,97,121,98,101,32,109,101,114,103,101,32,100,97,109,97,103,101,32,102,111,114,32,108,101,118,101,108,32,37,100,10,0,49,36,114,0,37,100,58,0,37,100,59,0,37,100,0,109,0,49,36,114,37,100,59,37,100,114,0,49,36,114,37,100,59,37,100,115,0,32,113,0,49,36,114,37,100,32,113,0,34,113,0,49,36,114,37,100,34,113,0,48,36,114,37,46,115,0,36,113,0,48,59,0,49,59,0,50,59,0,63,37,100,59,37,100,36,121,0,108,105,98,118,116,101,114,109,58,32,85,110,107,110,111,119,110,32,68,69,67,32,109,111,100,101,32,37,100,10,0,108,105,98,118,116,101,114,109,58,32,85,110,107,110,111,119,110,32,109,111,100,101,32,37,100,10,0,63,49,59,50,99,0,62,37,100,59,37,100,59,37,100,99,0,63,0,37,115,48,110,0,37,115,37,100,59,37,100,82,0,80,111,115,105,116,105,111,110,32,111,117,116,32,111,102,32,98,111,117,110,100,115,32,97,102,116,101,114,32,67,83,73,32,37,99,58,32,40,37,100,44,37,100,41,10,0,83,99,114,111,108,108,32,114,101,103,105,111,110,32,104,101,105,103,104,116,32,111,117,116,32,111,102,32,98,111,117,110,100,115,32,97,102,116,101,114,32,67,83,73,32,37,99,58,32,37,100,32,60,61,32,37,100,10,0,83,99,114,111,108,108,32,114,101,103,105,111,110,32,119,105,100,116,104,32,111,117,116,32,111,102,32,98,111,117,110,100,115,32,97,102,116,101,114,32,67,83,73,32,37,99,58,32,37,100,32,60,61,32,37,100,10,0,80,111,115,105,116,105,111,110,32,111,117,116,32,111,102,32,98,111,117,110,100,115,32,97,102,116,101,114,32,67,116,114,108,32,37,48,50,120,58,32,40,37,100,44,37,100,41,10,0,108,105,98,118,116,101,114,109,58,32,85,110,104,97,110,100,108,101,100,32,112,117,116,103,108,121,112,104,32,85,43,37,48,52,120,32,97,116,32,40,37,100,44,37,100,41,10,0,108,105,98,118,116,101,114,109,58,32,84,79,68,79,58,32,83,107,105,112,32,111,118,101,114,32,115,112,108,105,116,32,99,104,97,114,43,99,111,109,98,105,110,105,110,103,10,0,84,101,120,116,32,119,105,116,104,32,110,101,103,97,116,105,118,101,45,119,105,100,116,104,32,99,111,100,101,112,111,105,110,116,32,85,43,37,48,52,120,10,0,80,111,115,105,116,105,111,110,32,111,117,116,32,111,102,32,98,111,117,110,100,115,32,97,102,116,101,114,32,116,101,120,116,58,32,40,37,100,44,37,100,41,10,0,118,116,101,114,109,95,112,117,115,104,95,111,117,116,112,117,116,40,41,58,32,98,117,102,102,101,114,32,111,118,101,114,102,108,111,119,59,32,116,114,117,110,99,97,116,105,110,103,32,111,117,116,112,117,116,10,0,27,37,99,0,37,99,0,0,84,33,34,25,13,1,2,3,17,75,28,12,16,4,11,29,18,30,39,104,110,111,112,113,98,32,5,6,15,19,20,21,26,8,22,7,40,36,23,24,9,10,14,27,31,37,35,131,130,125,38,42,43,60,61,62,63,67,71,74,77,88,89,90,91,92,93,94,95,96,97,99,100,101,102,103,105,106,107,108,114,115,116,121,122,123,124,0,73,108,108,101,103,97,108,32,98,121,116,101,32,115,101,113,117,101,110,99,101,0,68,111,109,97,105,110,32,101,114,114,111,114,0,82,101,115,117,108,116,32,110,111,116,32,114,101,112,114,101,115,101,110,116,97,98,108,101,0,78,111,116,32,97,32,116,116,121,0,80,101,114,109,105,115,115,105,111,110,32,100,101,110,105,101,100,0,79,112,101,114,97,116,105,111,110,32,110,111,116,32,112,101,114,109,105,116,116,101,100,0,78,111,32,115,117,99,104,32,102,105,108,101,32,111,114,32,100,105,114,101,99,116,111,114,121,0,78,111,32,115,117,99,104,32,112,114,111,99,101,115,115,0,70,105,108,101,32,101,120,105,115,116,115,0,86,97,108,117,101,32,116,111,111,32,108,97,114,103,101,32,102,111,114,32,100,97,116,97,32,116,121,112,101,0,78,111,32,115,112,97,99,101,32,108,101,102,116,32,111,110,32,100,101,118,105,99,101,0,79,117,116,32,111,102,32,109,101,109,111,114,121,0,82,101,115,111,117,114,99,101,32,98,117,115,121,0,73,110,116,101,114,114,117,112,116,101,100,32,115,121,115,116,101,109,32,99,97,108,108,0,82,101,115,111,117,114,99,101,32,116,101,109,112,111,114,97,114,105,108,121,32,117,110,97,118,97,105,108,97,98,108,101,0,73,110,118,97,108,105,100,32,115,101,101,107,0,67,114,111,115,115,45,100,101,118,105,99,101,32,108,105,110,107,0,82,101,97,100,45,111,110,108,121,32,102,105,108,101,32,115,121,115,116,101,109,0,68,105,114,101,99,116,111,114,121,32,110,111,116,32,101,109,112,116,121,0,67,111,110,110,101,99,116,105,111,110,32,114,101,115,101,116,32,98,121,32,112,101,101,114,0,79,112,101,114,97,116,105,111,110,32,116,105,109,101,100,32,111,117,116,0,67,111,110,110,101,99,116,105,111,110,32,114,101,102,117,115,101,100,0,72,111,115,116,32,105,115,32,100,111,119,110,0,72,111,115,116,32,105,115,32,117,110,114,101,97,99,104,97,98,108,101,0,65,100,100,114,101,115,115,32,105,110,32,117,115,101,0,66,114,111,107,101,110,32,112,105,112,101,0,73,47,79,32,101,114,114,111,114,0,78,111,32,115,117,99,104,32,100,101,118,105,99,101,32,111,114,32,97,100,100,114,101,115,115,0,66,108,111,99,107,32,100,101,118,105,99,101,32,114,101,113,117,105,114,101,100,0,78,111,32,115,117,99,104,32,100,101,118,105,99,101,0,78,111,116,32,97,32,100,105,114,101,99,116,111,114,121,0,73,115,32,97,32,100,105,114,101,99,116,111,114,121,0,84,101,120,116,32,102,105,108,101,32,98,117,115,121,0,69,120,101,99,32,102,111,114,109,97,116,32,101,114,114,111,114,0,73,110,118,97,108,105,100,32,97,114,103,117,109,101,110,116,0,65,114,103,117,109,101,110,116,32,108,105,115,116,32,116,111,111,32,108,111,110,103,0,83,121,109,98,111,108,105,99,32,108,105,110,107,32,108,111,111,112,0,70,105,108,101,110,97,109,101,32,116,111,111,32,108,111,110,103,0,84,111,111,32,109,97,110,121,32,111,112,101,110,32,102,105,108,101,115,32,105,110,32,115,121,115,116,101,109,0,78,111,32,102,105,108,101,32,100,101,115,99,114,105,112,116,111,114,115,32,97,118,97,105,108,97,98,108,101,0,66,97,100,32,102,105,108,101,32,100,101,115,99,114,105,112,116,111,114,0,78,111,32,99,104,105,108,100,32,112,114,111,99,101,115,115,0,66,97,100,32,97,100,100,114,101,115,115,0,70,105,108,101,32,116,111,111,32,108,97,114,103,101,0,84,111,111,32,109,97,110,121,32,108,105,110,107,115,0,78,111,32,108,111,99,107,115,32,97,118,97,105,108,97,98,108,101,0,82,101,115,111,117,114,99,101,32,100,101,97,100,108,111,99,107,32,119,111,117,108,100,32,111,99,99,117,114,0,83,116,97,116,101,32,110,111,116,32,114,101,99,111,118,101,114,97,98,108,101,0,80,114,101,118,105,111,117,115,32,111,119,110,101,114,32,100,105,101,100,0,79,112,101,114,97,116,105,111,110,32,99,97,110,99,101,108,101,100,0,70,117,110,99,116,105,111,110,32,110,111,116,32,105,109,112,108,101,109,101,110,116,101,100,0,78,111,32,109,101,115,115,97,103,101,32,111,102,32,100,101,115,105,114,101,100,32,116,121,112,101,0,73,100,101,110,116,105,102,105,101,114,32,114,101,109,111,118,101,100,0,68,101,118,105,99,101,32,110,111,116,32,97,32,115,116,114,101,97,109,0,78,111,32,100,97,116,97,32,97,118,97,105,108,97,98,108,101,0,68,101,118,105,99,101,32,116,105,109,101,111,117,116,0,79,117,116,32,111,102,32,115,116,114,101,97,109,115,32,114,101,115,111,117,114,99,101,115,0,76,105,110,107,32,104,97,115,32,98,101,101,110,32,115,101,118,101,114,101,100,0,80,114,111,116,111,99,111,108,32,101,114,114,111,114,0,66,97,100,32,109,101,115,115,97,103,101,0,70,105,108,101,32,100,101,115,99,114,105,112,116,111,114,32,105,110,32,98,97,100,32,115,116,97,116,101,0,78,111,116,32,97,32,115,111,99,107,101,116,0,68,101,115,116,105,110,97,116,105,111,110,32,97,100,100,114,101,115,115,32,114,101,113,117,105,114,101,100,0,77,101,115,115,97,103,101,32,116,111,111,32,108,97,114,103,101,0,80,114,111,116,111,99,111,108,32,119,114,111,110,103,32,116,121,112,101,32,102,111,114,32,115,111,99,107,101,116,0,80,114,111,116,111,99,111,108,32,110,111,116,32,97,118,97,105,108,97,98,108,101,0,80,114,111,116,111,99,111,108,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,83,111,99,107,101,116,32,116,121,112,101,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,78,111,116,32,115,117,112,112,111,114,116,101,100,0,80,114,111,116,111,99,111,108,32,102,97,109,105,108,121,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,65,100,100,114,101,115,115,32,102,97,109,105,108,121,32,110,111,116,32,115,117,112,112,111,114,116,101,100,32,98,121,32,112,114,111,116,111,99,111,108,0,65,100,100,114,101,115,115,32,110,111,116,32,97,118,97,105,108,97,98,108,101,0,78,101,116,119,111,114,107,32,105,115,32,100,111,119,110,0,78,101,116,119,111,114,107,32,117,110,114,101,97,99,104,97,98,108,101,0,67,111,110,110,101,99,116,105,111,110,32,114,101,115,101,116,32,98,121,32,110,101,116,119,111,114,107,0,67,111,110,110,101,99,116,105,111,110,32,97,98,111,114,116,101,100,0,78,111,32,98,117,102,102,101,114,32,115,112,97,99,101,32,97,118,97,105,108,97,98,108,101,0,83,111,99,107,101,116,32,105,115,32,99,111,110,110,101,99,116,101,100,0,83,111,99,107,101,116,32,110,111,116,32,99,111,110,110,101,99,116,101,100,0,67,97,110,110,111,116,32,115,101,110,100,32,97,102,116,101,114,32,115,111,99,107,101,116,32,115,104,117,116,100,111,119,110,0,79,112,101,114,97,116,105,111,110,32,97,108,114,101,97,100,121,32,105,110,32,112,114,111,103,114,101,115,115,0,79,112,101,114,97,116,105,111,110,32,105,110,32,112,114,111,103,114,101,115,115,0,83,116,97,108,101,32,102,105,108,101,32,104,97,110,100,108,101,0,82,101,109,111,116,101,32,73,47,79,32,101,114,114,111,114,0,81,117,111,116,97,32,101,120,99,101,101,100,101,100,0,78,111,32,109,101,100,105,117,109,32,102,111,117,110,100,0,87,114,111,110,103,32,109,101,100,105,117,109,32,116,121,112,101,0,78,111,32,101,114,114,111,114,32,105,110,102,111,114,109,97,116,105,111,110,0,0,0,0,0,0,0,0,0,0,17,0,10,0,17,17,17,0,0,0,0,5,0,0,0,0,0,0,9,0,0,0,0,11,0,0,0,0,0,0,0,0,17,0,15,10,17,17,17,3,10,7,0,1,19,9,11,11,0,0,9,6,11,0,0,11,0,6,17,0,0,0,17,17,17,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,17,0,10,10,17,17,17,0,10,0,0,2,0,9,11,0,0,0,9,0,11,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,12,0,0,0,0,9,12,0,0,0,0,0,12,0,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,0,0,0,0,0,0,0,0,0,0,0,13,0,0,0,4,13,0,0,0,0,9,14,0,0,0,0,0,14,0,0,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,0,0,0,0,0,0,0,0,0,0,0,15,0,0,0,0,15,0,0,0,0,9,16,0,0,0,0,0,16,0,0,16,0,0,18,0,0,0,18,18,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,18,0,0,0,18,18,18,0,0,0,0,0,0,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,0,10,0,0,0,0,9,11,0,0,0,0,0,11,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,12,0,0,0,0,9,12,0,0,0,0,0,12,0,0,12,0,0,48,49,50,51,52,53,54,55,56,57,65,66,67,68,69,70,45,43,32,32,32,48,88,48,120,0,40,110,117,108,108,41,0,45,48,88,43,48,88,32,48,88,45,48,120,43,48,120,32,48,120,0,105,110,102,0,73,78,70,0,110,97,110,0,78,65,78,0,46,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);





/* no memory initializer */
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


  var _BDtoIHigh=true;

   
  Module["_i64Subtract"] = _i64Subtract;

  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      else Module.printErr('failed to set errno from JS');
      return value;
    }
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 85: return totalMemory / PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 79:
          return 0;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  function _pthread_cleanup_push(routine, arg) {
      __ATEXIT__.push(function() { Runtime.dynCall('vi', routine, [arg]) })
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

   
  Module["_memset"] = _memset;

  var _BDtoILow=true;

   
  Module["_bitshift64Lshr"] = _bitshift64Lshr;

   
  Module["_bitshift64Shl"] = _bitshift64Shl;

  function _pthread_cleanup_pop() {
      assert(_pthread_cleanup_push.level == __ATEXIT__.length, 'cannot pop if something else added meanwhile!');
      __ATEXIT__.pop();
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

  function _abort() {
      Module['abort']();
    }

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  function _llvm_stackrestore(p) {
      var self = _llvm_stacksave;
      var ret = self.LLVM_SAVEDSTACKS[p];
      self.LLVM_SAVEDSTACKS.splice(p, 1);
      Runtime.stackRestore(ret);
    }

   
  Module["_i64Add"] = _i64Add;

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) {
        var success = self.alloc(bytes);
        if (!success) return -1 >>> 0; // sbrk failure code
      }
      return ret;  // Previous break location.
    }

  function _llvm_stacksave() {
      var self = _llvm_stacksave;
      if (!self.LLVM_SAVEDSTACKS) {
        self.LLVM_SAVEDSTACKS = [];
      }
      self.LLVM_SAVEDSTACKS.push(Runtime.stackSave());
      return self.LLVM_SAVEDSTACKS.length-1;
    }

   
  Module["_memmove"] = _memmove;

  var _BItoD=true;

  var _abs=Math_abs;

  
  var PATH=undefined;
  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        console.error('emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.');
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout() {
          setTimeout(Browser.mainLoop.runner, value); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      } else if (mode == 2 /*EM_TIMING_SETIMMEDIATE*/) {
        if (!window['setImmediate']) {
          // Emulate setImmediate. (note: not a complete polyfill, we don't emulate clearImmediate() to keep code size to minimum, since not needed)
          var setImmediates = [];
          var emscriptenMainLoopMessageId = '__emcc';
          function Browser_setImmediate_messageHandler(event) {
            if (event.source === window && event.data === emscriptenMainLoopMessageId) {
              event.stopPropagation();
              setImmediates.shift()();
            }
          }
          window.addEventListener("message", Browser_setImmediate_messageHandler, true);
          window['setImmediate'] = function Browser_emulated_setImmediate(func) {
            setImmediates.push(func);
            window.postMessage(emscriptenMainLoopMessageId, "*");
          }
        }
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate() {
          window['setImmediate'](Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'immediate';
      }
      return 0;
    }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
      Module['noExitRuntime'] = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
  
        if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
          Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          Browser.mainLoop.method = ''; // just warn once per call to set main loop
        }
  
        Browser.mainLoop.runIter(function() {
          if (typeof arg !== 'undefined') {
            Runtime.dynCall('vi', func, [arg]);
          } else {
            Runtime.dynCall('v', func);
          }
        });
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (!noSetTiming) {
        if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
        else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
        Browser.mainLoop.scheduler();
      }
  
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function () {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true /* do not set timing and call scheduler, we will do it on the next lines */);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
          Browser.mainLoop.scheduler();
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function (func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          assert(typeof url == 'string', 'createObjectURL must return a url as a string');
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            assert(typeof url == 'string', 'createObjectURL must return a url as a string');
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
          
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && canvas.requestPointerLock) {
                canvas.requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          contextHandle = GL.createContext(canvas, contextAttributes);
          if (contextHandle) {
            ctx = GL.getContext(contextHandle).GLctx;
          }
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas, vrDevice) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        Browser.vrDevice = vrDevice;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
        if (typeof Browser.vrDevice === 'undefined') Browser.vrDevice = null;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
  
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
  
        if (vrDevice) {
          canvasContainer.requestFullScreen({ vrDisplay: vrDevice });
        } else {
          canvasContainer.requestFullScreen();
        }
      },nextRAF:0,fakeRequestAnimationFrame:function (func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          Browser.fakeRequestAnimationFrame(func);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           Browser.fakeRequestAnimationFrame;
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },allowAsyncCallbacks:true,queuedAsyncCallbacks:[],pauseAsyncCallbacks:function () {
        Browser.allowAsyncCallbacks = false;
      },resumeAsyncCallbacks:function () { // marks future callbacks as ok to execute, and synchronously runs any remaining ones right now
        Browser.allowAsyncCallbacks = true;
        if (Browser.queuedAsyncCallbacks.length > 0) {
          var callbacks = Browser.queuedAsyncCallbacks;
          Browser.queuedAsyncCallbacks = [];
          callbacks.forEach(function(func) {
            func();
          });
        }
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        });
      },safeSetTimeout:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setTimeout(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setInterval(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } // drop it on the floor otherwise, next interval will kick in
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll': 
            delta = event.detail;
            break;
          case 'mousewheel': 
            delta = event.wheelDelta;
            break;
          case 'wheel': 
            delta = event['deltaY'];
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
          // If this assert lands, it's likely because the browser doesn't support scrollX or pageXOffset
          // and we have no viable fallback.
          assert((typeof scrollX !== 'undefined') && (typeof scrollY !== 'undefined'), 'Unable to retrieve scroll position, mouse positions likely broken.');
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              var last = Browser.touches[touch.identifier];
              if (!last) last = coords;
              Browser.lastTouches[touch.identifier] = last;
              Browser.touches[touch.identifier] = coords;
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  function _pthread_self() {
      //FIXME: assumes only a single thread
      return 0;
    }

  
  var SYSCALLS={varargs:0,get:function (varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function () {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret;
      },get64:function () {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function () {
        assert(SYSCALLS.get() === 0);
      }};function ___syscall140(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // llseek
      var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
      var offset = offset_low;
      assert(offset_high === 0);
      FS.llseek(stream, offset, whence);
      HEAP32[((result)>>2)]=stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall6(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // close
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall146(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // writev
      // hack to support printf in NO_FILESYSTEM
      var stream = SYSCALLS.get(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      var ret = 0;
      if (!___syscall146.buffer) ___syscall146.buffer = [];
      var buffer = ___syscall146.buffer;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[(((iov)+(i*8))>>2)];
        var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
        for (var j = 0; j < len; j++) {
          var curr = HEAPU8[ptr+j];
          if (curr === 0 || curr === 10) {
            Module['print'](UTF8ArrayToString(buffer, 0));
            buffer.length = 0;
          } else {
            buffer.push(curr);
          }
        }
        ret += len;
      }
      return ret;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas, vrDevice) { Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
  Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) { return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes) }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);


var debug_table_iiii = ["0", "0", "0", "0", "0", "_putglyph", "0", "0", "_erase", "_setpenattr34", "_settermprop", "0", "0", "0", "_on_text", "0", "_on_escape", "0", "_on_osc", "_on_dcs", "_on_resize", "0", "0", "_sn_write", "0", "___stdio_write", "___stdio_seek", "_moverect_user", "_erase_user", "_moverect_internal", "_erase_internal", "0"];
var debug_table_vi = ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "_cleanup565"];
var debug_table_vii = ["0", "_init_utf8", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "_default_free", "0", "0", "0", "0", "0", "0", "0", "0", "0"];
var debug_table_iiiiiii = ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "_on_csi", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"];
var debug_table_ii = ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "_bell", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "___stdio_close", "0", "0", "0", "0", "0", "0", "0"];
var debug_table_viii = ["0"];
var debug_table_viiiiiiii = ["0", "0", "_decode_utf8", "_decode_table", "_decode_usascii", "0", "0", "0"];
var debug_table_iiiii = ["0", "0", "0", "0", "0", "0", "_movecursor", "_scrollrect", "0", "0", "0", "0", "_resize", "_setlineinfo", "0", "0"];
var debug_table_iii = ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "_on_control", "0", "0", "0", "0", "0", "_default_malloc", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"];
function nullFunc_iiii(x) { Module["printErr"]("Invalid function pointer '" + x + "' called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("This pointer might make sense in another type signature: iii: " + debug_table_iii[x] + "  ii: " + debug_table_ii[x] + "  iiiii: " + debug_table_iiiii[x] + "  iiiiiii: " + debug_table_iiiiiii[x] + "  viii: " + debug_table_viii[x] + "  vii: " + debug_table_vii[x] + "  vi: " + debug_table_vi[x] + "  viiiiiiii: " + debug_table_viiiiiiii[x] + "  "); abort(x) }

function nullFunc_vi(x) { Module["printErr"]("Invalid function pointer '" + x + "' called with signature 'vi'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("This pointer might make sense in another type signature: vii: " + debug_table_vii[x] + "  viii: " + debug_table_viii[x] + "  viiiiiiii: " + debug_table_viiiiiiii[x] + "  ii: " + debug_table_ii[x] + "  iii: " + debug_table_iii[x] + "  iiii: " + debug_table_iiii[x] + "  iiiii: " + debug_table_iiiii[x] + "  iiiiiii: " + debug_table_iiiiiii[x] + "  "); abort(x) }

function nullFunc_vii(x) { Module["printErr"]("Invalid function pointer '" + x + "' called with signature 'vii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("This pointer might make sense in another type signature: vi: " + debug_table_vi[x] + "  viii: " + debug_table_viii[x] + "  viiiiiiii: " + debug_table_viiiiiiii[x] + "  ii: " + debug_table_ii[x] + "  iii: " + debug_table_iii[x] + "  iiii: " + debug_table_iiii[x] + "  iiiii: " + debug_table_iiiii[x] + "  iiiiiii: " + debug_table_iiiiiii[x] + "  "); abort(x) }

function nullFunc_iiiiiii(x) { Module["printErr"]("Invalid function pointer '" + x + "' called with signature 'iiiiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("This pointer might make sense in another type signature: iiii: " + debug_table_iiii[x] + "  iiiii: " + debug_table_iiiii[x] + "  iii: " + debug_table_iii[x] + "  ii: " + debug_table_ii[x] + "  viii: " + debug_table_viii[x] + "  vii: " + debug_table_vii[x] + "  vi: " + debug_table_vi[x] + "  viiiiiiii: " + debug_table_viiiiiiii[x] + "  "); abort(x) }

function nullFunc_ii(x) { Module["printErr"]("Invalid function pointer '" + x + "' called with signature 'ii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("This pointer might make sense in another type signature: iii: " + debug_table_iii[x] + "  iiii: " + debug_table_iiii[x] + "  iiiii: " + debug_table_iiiii[x] + "  iiiiiii: " + debug_table_iiiiiii[x] + "  vii: " + debug_table_vii[x] + "  vi: " + debug_table_vi[x] + "  viii: " + debug_table_viii[x] + "  viiiiiiii: " + debug_table_viiiiiiii[x] + "  "); abort(x) }

function nullFunc_viii(x) { Module["printErr"]("Invalid function pointer '" + x + "' called with signature 'viii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("This pointer might make sense in another type signature: vii: " + debug_table_vii[x] + "  vi: " + debug_table_vi[x] + "  viiiiiiii: " + debug_table_viiiiiiii[x] + "  iii: " + debug_table_iii[x] + "  ii: " + debug_table_ii[x] + "  iiii: " + debug_table_iiii[x] + "  iiiii: " + debug_table_iiiii[x] + "  iiiiiii: " + debug_table_iiiiiii[x] + "  "); abort(x) }

function nullFunc_viiiiiiii(x) { Module["printErr"]("Invalid function pointer '" + x + "' called with signature 'viiiiiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("This pointer might make sense in another type signature: viii: " + debug_table_viii[x] + "  vii: " + debug_table_vii[x] + "  vi: " + debug_table_vi[x] + "  iiiii: " + debug_table_iiiii[x] + "  iiii: " + debug_table_iiii[x] + "  iii: " + debug_table_iii[x] + "  iiiiiii: " + debug_table_iiiiiii[x] + "  ii: " + debug_table_ii[x] + "  "); abort(x) }

function nullFunc_iiiii(x) { Module["printErr"]("Invalid function pointer '" + x + "' called with signature 'iiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("This pointer might make sense in another type signature: iiii: " + debug_table_iiii[x] + "  iii: " + debug_table_iii[x] + "  ii: " + debug_table_ii[x] + "  iiiiiii: " + debug_table_iiiiiii[x] + "  viii: " + debug_table_viii[x] + "  vii: " + debug_table_vii[x] + "  vi: " + debug_table_vi[x] + "  viiiiiiii: " + debug_table_viiiiiiii[x] + "  "); abort(x) }

function nullFunc_iii(x) { Module["printErr"]("Invalid function pointer '" + x + "' called with signature 'iii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("This pointer might make sense in another type signature: ii: " + debug_table_ii[x] + "  iiii: " + debug_table_iiii[x] + "  iiiii: " + debug_table_iiiii[x] + "  iiiiiii: " + debug_table_iiiiiii[x] + "  viii: " + debug_table_viii[x] + "  vii: " + debug_table_vii[x] + "  vi: " + debug_table_vi[x] + "  viiiiiiii: " + debug_table_viiiiiiii[x] + "  "); abort(x) }

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vii(index,a1,a2) {
  try {
    Module["dynCall_vii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiiiii(index,a1,a2,a3,a4,a5,a6) {
  try {
    return Module["dynCall_iiiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viii(index,a1,a2,a3) {
  try {
    Module["dynCall_viii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8) {
  try {
    Module["dynCall_viiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiii(index,a1,a2,a3,a4) {
  try {
    return Module["dynCall_iiiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity };

Module.asmLibraryArg = { "abort": abort, "assert": assert, "nullFunc_iiii": nullFunc_iiii, "nullFunc_vi": nullFunc_vi, "nullFunc_vii": nullFunc_vii, "nullFunc_iiiiiii": nullFunc_iiiiiii, "nullFunc_ii": nullFunc_ii, "nullFunc_viii": nullFunc_viii, "nullFunc_viiiiiiii": nullFunc_viiiiiiii, "nullFunc_iiiii": nullFunc_iiiii, "nullFunc_iii": nullFunc_iii, "invoke_iiii": invoke_iiii, "invoke_vi": invoke_vi, "invoke_vii": invoke_vii, "invoke_iiiiiii": invoke_iiiiiii, "invoke_ii": invoke_ii, "invoke_viii": invoke_viii, "invoke_viiiiiiii": invoke_viiiiiiii, "invoke_iiiii": invoke_iiiii, "invoke_iii": invoke_iii, "_pthread_cleanup_pop": _pthread_cleanup_pop, "_llvm_stacksave": _llvm_stacksave, "_emscripten_set_main_loop": _emscripten_set_main_loop, "_pthread_self": _pthread_self, "_abort": _abort, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "___syscall6": ___syscall6, "_sbrk": _sbrk, "_time": _time, "___setErrNo": ___setErrNo, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_pthread_cleanup_push": _pthread_cleanup_push, "___syscall140": ___syscall140, "_llvm_stackrestore": _llvm_stackrestore, "_sysconf": _sysconf, "___syscall146": ___syscall146, "_abs": _abs, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8 };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'almost asm';
  
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var cttz_i8=env.cttz_i8|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var Math_min=global.Math.min;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var nullFunc_iiii=env.nullFunc_iiii;
  var nullFunc_vi=env.nullFunc_vi;
  var nullFunc_vii=env.nullFunc_vii;
  var nullFunc_iiiiiii=env.nullFunc_iiiiiii;
  var nullFunc_ii=env.nullFunc_ii;
  var nullFunc_viii=env.nullFunc_viii;
  var nullFunc_viiiiiiii=env.nullFunc_viiiiiiii;
  var nullFunc_iiiii=env.nullFunc_iiiii;
  var nullFunc_iii=env.nullFunc_iii;
  var invoke_iiii=env.invoke_iiii;
  var invoke_vi=env.invoke_vi;
  var invoke_vii=env.invoke_vii;
  var invoke_iiiiiii=env.invoke_iiiiiii;
  var invoke_ii=env.invoke_ii;
  var invoke_viii=env.invoke_viii;
  var invoke_viiiiiiii=env.invoke_viiiiiiii;
  var invoke_iiiii=env.invoke_iiiii;
  var invoke_iii=env.invoke_iii;
  var _pthread_cleanup_pop=env._pthread_cleanup_pop;
  var _llvm_stacksave=env._llvm_stacksave;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var _pthread_self=env._pthread_self;
  var _abort=env._abort;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var ___syscall6=env.___syscall6;
  var _sbrk=env._sbrk;
  var _time=env._time;
  var ___setErrNo=env.___setErrNo;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var _pthread_cleanup_push=env._pthread_cleanup_push;
  var ___syscall140=env.___syscall140;
  var _llvm_stackrestore=env._llvm_stackrestore;
  var _sysconf=env._sysconf;
  var ___syscall146=env.___syscall146;
  var _abs=env._abs;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS
function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
  STACKTOP = (STACKTOP + 15)&-16;
if ((STACKTOP|0) >= (STACK_MAX|0)) abort();

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}
function establishStackSpace(stackBase, stackMax) {
  stackBase = stackBase|0;
  stackMax = stackMax|0;
  STACKTOP = stackBase;
  STACK_MAX = stackMax;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
  HEAP8[tempDoublePtr+4>>0] = HEAP8[ptr+4>>0];
  HEAP8[tempDoublePtr+5>>0] = HEAP8[ptr+5>>0];
  HEAP8[tempDoublePtr+6>>0] = HEAP8[ptr+6>>0];
  HEAP8[tempDoublePtr+7>>0] = HEAP8[ptr+7>>0];
}

function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _vterm_lookup_encoding($type,$designation) {
 $type = $type|0;
 $designation = $designation|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $type;
 $2 = $designation;
 $i = 0;
 while(1) {
  $3 = $i;
  $4 = (8 + (($3*12)|0)|0);
  $5 = ((($4)) + 4|0);
  $6 = HEAP8[$5>>0]|0;
  $7 = ($6<<24>>24)!=(0);
  if (!($7)) {
   label = 7;
   break;
  }
  $8 = $i;
  $9 = (8 + (($8*12)|0)|0);
  $10 = HEAP32[$9>>2]|0;
  $11 = $1;
  $12 = ($10|0)==($11|0);
  if ($12) {
   $13 = $i;
   $14 = (8 + (($13*12)|0)|0);
   $15 = ((($14)) + 4|0);
   $16 = HEAP8[$15>>0]|0;
   $17 = $16 << 24 >> 24;
   $18 = $2;
   $19 = $18 << 24 >> 24;
   $20 = ($17|0)==($19|0);
   if ($20) {
    label = 5;
    break;
   }
  }
  $25 = $i;
  $26 = (($25) + 1)|0;
  $i = $26;
 }
 if ((label|0) == 5) {
  $21 = $i;
  $22 = (8 + (($21*12)|0)|0);
  $23 = ((($22)) + 8|0);
  $24 = HEAP32[$23>>2]|0;
  $0 = $24;
  $27 = $0;
  STACKTOP = sp;return ($27|0);
 }
 else if ((label|0) == 7) {
  $0 = 0;
  $27 = $0;
  STACKTOP = sp;return ($27|0);
 }
 return (0)|0;
}
function _init_utf8($enc,$data_) {
 $enc = $enc|0;
 $data_ = $data_|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $data = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $enc;
 $1 = $data_;
 $2 = $1;
 $data = $2;
 $3 = $data;
 HEAP32[$3>>2] = 0;
 $4 = $data;
 $5 = ((($4)) + 4|0);
 HEAP32[$5>>2] = 0;
 STACKTOP = sp;return;
}
function _decode_utf8($enc,$data_,$cp,$cpi,$cplen,$bytes,$pos,$bytelen) {
 $enc = $enc|0;
 $data_ = $data_|0;
 $cp = $cp|0;
 $cpi = $cpi|0;
 $cplen = $cplen|0;
 $bytes = $bytes|0;
 $pos = $pos|0;
 $bytelen = $bytelen|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0;
 var $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0;
 var $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $c = 0, $data = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $enc;
 $1 = $data_;
 $2 = $cp;
 $3 = $cpi;
 $4 = $cplen;
 $5 = $bytes;
 $6 = $pos;
 $7 = $bytelen;
 $8 = $1;
 $data = $8;
 L1: while(1) {
  $9 = $6;
  $10 = HEAP32[$9>>2]|0;
  $11 = $7;
  $12 = ($10>>>0)<($11>>>0);
  if (!($12)) {
   label = 60;
   break;
  }
  $13 = $3;
  $14 = HEAP32[$13>>2]|0;
  $15 = $4;
  $16 = ($14|0)<($15|0);
  if (!($16)) {
   label = 60;
   break;
  }
  $17 = $6;
  $18 = HEAP32[$17>>2]|0;
  $19 = $5;
  $20 = (($19) + ($18)|0);
  $21 = HEAP8[$20>>0]|0;
  $c = $21;
  $22 = $c;
  $23 = $22&255;
  $24 = ($23|0)<(32);
  if ($24) {
   label = 60;
   break;
  }
  $25 = $c;
  $26 = $25&255;
  $27 = ($26|0)>=(32);
  if ($27) {
   $28 = $c;
   $29 = $28&255;
   $30 = ($29|0)<(127);
   if ($30) {
    $31 = $data;
    $32 = HEAP32[$31>>2]|0;
    $33 = ($32|0)!=(0);
    if ($33) {
     $34 = $3;
     $35 = HEAP32[$34>>2]|0;
     $36 = (($35) + 1)|0;
     HEAP32[$34>>2] = $36;
     $37 = $2;
     $38 = (($37) + ($35<<2)|0);
     HEAP32[$38>>2] = 65533;
    }
    $39 = $c;
    $40 = $39&255;
    $41 = $3;
    $42 = HEAP32[$41>>2]|0;
    $43 = (($42) + 1)|0;
    HEAP32[$41>>2] = $43;
    $44 = $2;
    $45 = (($44) + ($42<<2)|0);
    HEAP32[$45>>2] = $40;
    $46 = $data;
    HEAP32[$46>>2] = 0;
   } else {
    label = 10;
   }
  } else {
   label = 10;
  }
  do {
   if ((label|0) == 10) {
    label = 0;
    $47 = $c;
    $48 = $47&255;
    $49 = ($48|0)==(127);
    if ($49) {
     label = 60;
     break L1;
    }
    $50 = $c;
    $51 = $50&255;
    $52 = ($51|0)>=(128);
    if ($52) {
     $53 = $c;
     $54 = $53&255;
     $55 = ($54|0)<(192);
     if ($55) {
      $56 = $data;
      $57 = HEAP32[$56>>2]|0;
      $58 = ($57|0)!=(0);
      if (!($58)) {
       $59 = $3;
       $60 = HEAP32[$59>>2]|0;
       $61 = (($60) + 1)|0;
       HEAP32[$59>>2] = $61;
       $62 = $2;
       $63 = (($62) + ($60<<2)|0);
       HEAP32[$63>>2] = 65533;
       break;
      }
      $64 = $data;
      $65 = ((($64)) + 8|0);
      $66 = HEAP32[$65>>2]|0;
      $67 = $66 << 6;
      HEAP32[$65>>2] = $67;
      $68 = $c;
      $69 = $68&255;
      $70 = $69 & 63;
      $71 = $data;
      $72 = ((($71)) + 8|0);
      $73 = HEAP32[$72>>2]|0;
      $74 = $73 | $70;
      HEAP32[$72>>2] = $74;
      $75 = $data;
      $76 = HEAP32[$75>>2]|0;
      $77 = (($76) + -1)|0;
      HEAP32[$75>>2] = $77;
      $78 = $data;
      $79 = HEAP32[$78>>2]|0;
      $80 = ($79|0)!=(0);
      if ($80) {
       break;
      }
      $81 = $data;
      $82 = ((($81)) + 4|0);
      $83 = HEAP32[$82>>2]|0;
      switch ($83|0) {
      case 2:  {
       $84 = $data;
       $85 = ((($84)) + 8|0);
       $86 = HEAP32[$85>>2]|0;
       $87 = ($86|0)<(128);
       if ($87) {
        $88 = $data;
        $89 = ((($88)) + 8|0);
        HEAP32[$89>>2] = 65533;
       }
       break;
      }
      case 3:  {
       $90 = $data;
       $91 = ((($90)) + 8|0);
       $92 = HEAP32[$91>>2]|0;
       $93 = ($92|0)<(2048);
       if ($93) {
        $94 = $data;
        $95 = ((($94)) + 8|0);
        HEAP32[$95>>2] = 65533;
       }
       break;
      }
      case 4:  {
       $96 = $data;
       $97 = ((($96)) + 8|0);
       $98 = HEAP32[$97>>2]|0;
       $99 = ($98|0)<(65536);
       if ($99) {
        $100 = $data;
        $101 = ((($100)) + 8|0);
        HEAP32[$101>>2] = 65533;
       }
       break;
      }
      case 5:  {
       $102 = $data;
       $103 = ((($102)) + 8|0);
       $104 = HEAP32[$103>>2]|0;
       $105 = ($104|0)<(2097152);
       if ($105) {
        $106 = $data;
        $107 = ((($106)) + 8|0);
        HEAP32[$107>>2] = 65533;
       }
       break;
      }
      case 6:  {
       $108 = $data;
       $109 = ((($108)) + 8|0);
       $110 = HEAP32[$109>>2]|0;
       $111 = ($110|0)<(67108864);
       if ($111) {
        $112 = $data;
        $113 = ((($112)) + 8|0);
        HEAP32[$113>>2] = 65533;
       }
       break;
      }
      default: {
      }
      }
      $114 = $data;
      $115 = ((($114)) + 8|0);
      $116 = HEAP32[$115>>2]|0;
      $117 = ($116|0)>=(55296);
      if ($117) {
       $118 = $data;
       $119 = ((($118)) + 8|0);
       $120 = HEAP32[$119>>2]|0;
       $121 = ($120|0)<=(57343);
       if ($121) {
        label = 31;
       } else {
        label = 29;
       }
      } else {
       label = 29;
      }
      if ((label|0) == 29) {
       label = 0;
       $122 = $data;
       $123 = ((($122)) + 8|0);
       $124 = HEAP32[$123>>2]|0;
       $125 = ($124|0)==(65534);
       if ($125) {
        label = 31;
       } else {
        $126 = $data;
        $127 = ((($126)) + 8|0);
        $128 = HEAP32[$127>>2]|0;
        $129 = ($128|0)==(65535);
        if ($129) {
         label = 31;
        }
       }
      }
      if ((label|0) == 31) {
       label = 0;
       $130 = $data;
       $131 = ((($130)) + 8|0);
       HEAP32[$131>>2] = 65533;
      }
      $132 = $data;
      $133 = ((($132)) + 8|0);
      $134 = HEAP32[$133>>2]|0;
      $135 = $3;
      $136 = HEAP32[$135>>2]|0;
      $137 = (($136) + 1)|0;
      HEAP32[$135>>2] = $137;
      $138 = $2;
      $139 = (($138) + ($136<<2)|0);
      HEAP32[$139>>2] = $134;
      break;
     }
    }
    $140 = $c;
    $141 = $140&255;
    $142 = ($141|0)>=(192);
    if ($142) {
     $143 = $c;
     $144 = $143&255;
     $145 = ($144|0)<(224);
     if ($145) {
      $146 = $data;
      $147 = HEAP32[$146>>2]|0;
      $148 = ($147|0)!=(0);
      if ($148) {
       $149 = $3;
       $150 = HEAP32[$149>>2]|0;
       $151 = (($150) + 1)|0;
       HEAP32[$149>>2] = $151;
       $152 = $2;
       $153 = (($152) + ($150<<2)|0);
       HEAP32[$153>>2] = 65533;
      }
      $154 = $c;
      $155 = $154&255;
      $156 = $155 & 31;
      $157 = $data;
      $158 = ((($157)) + 8|0);
      HEAP32[$158>>2] = $156;
      $159 = $data;
      $160 = ((($159)) + 4|0);
      HEAP32[$160>>2] = 2;
      $161 = $data;
      HEAP32[$161>>2] = 1;
      break;
     }
    }
    $162 = $c;
    $163 = $162&255;
    $164 = ($163|0)>=(224);
    if ($164) {
     $165 = $c;
     $166 = $165&255;
     $167 = ($166|0)<(240);
     if ($167) {
      $168 = $data;
      $169 = HEAP32[$168>>2]|0;
      $170 = ($169|0)!=(0);
      if ($170) {
       $171 = $3;
       $172 = HEAP32[$171>>2]|0;
       $173 = (($172) + 1)|0;
       HEAP32[$171>>2] = $173;
       $174 = $2;
       $175 = (($174) + ($172<<2)|0);
       HEAP32[$175>>2] = 65533;
      }
      $176 = $c;
      $177 = $176&255;
      $178 = $177 & 15;
      $179 = $data;
      $180 = ((($179)) + 8|0);
      HEAP32[$180>>2] = $178;
      $181 = $data;
      $182 = ((($181)) + 4|0);
      HEAP32[$182>>2] = 3;
      $183 = $data;
      HEAP32[$183>>2] = 2;
      break;
     }
    }
    $184 = $c;
    $185 = $184&255;
    $186 = ($185|0)>=(240);
    if ($186) {
     $187 = $c;
     $188 = $187&255;
     $189 = ($188|0)<(248);
     if ($189) {
      $190 = $data;
      $191 = HEAP32[$190>>2]|0;
      $192 = ($191|0)!=(0);
      if ($192) {
       $193 = $3;
       $194 = HEAP32[$193>>2]|0;
       $195 = (($194) + 1)|0;
       HEAP32[$193>>2] = $195;
       $196 = $2;
       $197 = (($196) + ($194<<2)|0);
       HEAP32[$197>>2] = 65533;
      }
      $198 = $c;
      $199 = $198&255;
      $200 = $199 & 7;
      $201 = $data;
      $202 = ((($201)) + 8|0);
      HEAP32[$202>>2] = $200;
      $203 = $data;
      $204 = ((($203)) + 4|0);
      HEAP32[$204>>2] = 4;
      $205 = $data;
      HEAP32[$205>>2] = 3;
      break;
     }
    }
    $206 = $c;
    $207 = $206&255;
    $208 = ($207|0)>=(248);
    if ($208) {
     $209 = $c;
     $210 = $209&255;
     $211 = ($210|0)<(252);
     if ($211) {
      $212 = $data;
      $213 = HEAP32[$212>>2]|0;
      $214 = ($213|0)!=(0);
      if ($214) {
       $215 = $3;
       $216 = HEAP32[$215>>2]|0;
       $217 = (($216) + 1)|0;
       HEAP32[$215>>2] = $217;
       $218 = $2;
       $219 = (($218) + ($216<<2)|0);
       HEAP32[$219>>2] = 65533;
      }
      $220 = $c;
      $221 = $220&255;
      $222 = $221 & 3;
      $223 = $data;
      $224 = ((($223)) + 8|0);
      HEAP32[$224>>2] = $222;
      $225 = $data;
      $226 = ((($225)) + 4|0);
      HEAP32[$226>>2] = 5;
      $227 = $data;
      HEAP32[$227>>2] = 4;
      break;
     }
    }
    $228 = $c;
    $229 = $228&255;
    $230 = ($229|0)>=(252);
    if ($230) {
     $231 = $c;
     $232 = $231&255;
     $233 = ($232|0)<(254);
     if ($233) {
      $234 = $data;
      $235 = HEAP32[$234>>2]|0;
      $236 = ($235|0)!=(0);
      if ($236) {
       $237 = $3;
       $238 = HEAP32[$237>>2]|0;
       $239 = (($238) + 1)|0;
       HEAP32[$237>>2] = $239;
       $240 = $2;
       $241 = (($240) + ($238<<2)|0);
       HEAP32[$241>>2] = 65533;
      }
      $242 = $c;
      $243 = $242&255;
      $244 = $243 & 1;
      $245 = $data;
      $246 = ((($245)) + 8|0);
      HEAP32[$246>>2] = $244;
      $247 = $data;
      $248 = ((($247)) + 4|0);
      HEAP32[$248>>2] = 6;
      $249 = $data;
      HEAP32[$249>>2] = 5;
      break;
     }
    }
    $250 = $3;
    $251 = HEAP32[$250>>2]|0;
    $252 = (($251) + 1)|0;
    HEAP32[$250>>2] = $252;
    $253 = $2;
    $254 = (($253) + ($251<<2)|0);
    HEAP32[$254>>2] = 65533;
   }
  } while(0);
  $255 = $6;
  $256 = HEAP32[$255>>2]|0;
  $257 = (($256) + 1)|0;
  HEAP32[$255>>2] = $257;
 }
 if ((label|0) == 60) {
  STACKTOP = sp;return;
 }
}
function _decode_table($enc,$data,$cp,$cpi,$cplen,$bytes,$pos,$bytelen) {
 $enc = $enc|0;
 $data = $data|0;
 $cp = $cp|0;
 $cpi = $cpi|0;
 $cplen = $cplen|0;
 $bytes = $bytes|0;
 $pos = $pos|0;
 $bytelen = $bytelen|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $7 = 0, $8 = 0, $9 = 0, $c = 0, $is_gr = 0, $table = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $enc;
 $1 = $data;
 $2 = $cp;
 $3 = $cpi;
 $4 = $cplen;
 $5 = $bytes;
 $6 = $pos;
 $7 = $bytelen;
 $8 = $0;
 $table = $8;
 $9 = $6;
 $10 = HEAP32[$9>>2]|0;
 $11 = $5;
 $12 = (($11) + ($10)|0);
 $13 = HEAP8[$12>>0]|0;
 $14 = $13 << 24 >> 24;
 $15 = $14 & 128;
 $is_gr = $15;
 while(1) {
  $16 = $6;
  $17 = HEAP32[$16>>2]|0;
  $18 = $7;
  $19 = ($17>>>0)<($18>>>0);
  if (!($19)) {
   label = 11;
   break;
  }
  $20 = $3;
  $21 = HEAP32[$20>>2]|0;
  $22 = $4;
  $23 = ($21|0)<($22|0);
  if (!($23)) {
   label = 11;
   break;
  }
  $24 = $6;
  $25 = HEAP32[$24>>2]|0;
  $26 = $5;
  $27 = (($26) + ($25)|0);
  $28 = HEAP8[$27>>0]|0;
  $29 = $28 << 24 >> 24;
  $30 = $is_gr;
  $31 = $29 ^ $30;
  $32 = $31&255;
  $c = $32;
  $33 = $c;
  $34 = $33&255;
  $35 = ($34|0)<(32);
  if ($35) {
   label = 11;
   break;
  }
  $36 = $c;
  $37 = $36&255;
  $38 = ($37|0)==(127);
  if ($38) {
   label = 11;
   break;
  }
  $39 = $c;
  $40 = $39&255;
  $41 = ($40|0)>=(128);
  if ($41) {
   label = 11;
   break;
  }
  $42 = $c;
  $43 = $42&255;
  $44 = $table;
  $45 = ((($44)) + 8|0);
  $46 = (($45) + ($43<<2)|0);
  $47 = HEAP32[$46>>2]|0;
  $48 = ($47|0)!=(0);
  $49 = $c;
  $50 = $49&255;
  if ($48) {
   $51 = $table;
   $52 = ((($51)) + 8|0);
   $53 = (($52) + ($50<<2)|0);
   $54 = HEAP32[$53>>2]|0;
   $55 = $3;
   $56 = HEAP32[$55>>2]|0;
   $57 = (($56) + 1)|0;
   HEAP32[$55>>2] = $57;
   $58 = $2;
   $59 = (($58) + ($56<<2)|0);
   HEAP32[$59>>2] = $54;
  } else {
   $60 = $3;
   $61 = HEAP32[$60>>2]|0;
   $62 = (($61) + 1)|0;
   HEAP32[$60>>2] = $62;
   $63 = $2;
   $64 = (($63) + ($61<<2)|0);
   HEAP32[$64>>2] = $50;
  }
  $65 = $6;
  $66 = HEAP32[$65>>2]|0;
  $67 = (($66) + 1)|0;
  HEAP32[$65>>2] = $67;
 }
 if ((label|0) == 11) {
  STACKTOP = sp;return;
 }
}
function _decode_usascii($enc,$data,$cp,$cpi,$cplen,$bytes,$pos,$bytelen) {
 $enc = $enc|0;
 $data = $data|0;
 $cp = $cp|0;
 $cpi = $cpi|0;
 $cplen = $cplen|0;
 $bytes = $bytes|0;
 $pos = $pos|0;
 $bytelen = $bytelen|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $c = 0, $is_gr = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $enc;
 $1 = $data;
 $2 = $cp;
 $3 = $cpi;
 $4 = $cplen;
 $5 = $bytes;
 $6 = $pos;
 $7 = $bytelen;
 $8 = $6;
 $9 = HEAP32[$8>>2]|0;
 $10 = $5;
 $11 = (($10) + ($9)|0);
 $12 = HEAP8[$11>>0]|0;
 $13 = $12 << 24 >> 24;
 $14 = $13 & 128;
 $is_gr = $14;
 while(1) {
  $15 = $6;
  $16 = HEAP32[$15>>2]|0;
  $17 = $7;
  $18 = ($16>>>0)<($17>>>0);
  if (!($18)) {
   label = 8;
   break;
  }
  $19 = $3;
  $20 = HEAP32[$19>>2]|0;
  $21 = $4;
  $22 = ($20|0)<($21|0);
  if (!($22)) {
   label = 8;
   break;
  }
  $23 = $6;
  $24 = HEAP32[$23>>2]|0;
  $25 = $5;
  $26 = (($25) + ($24)|0);
  $27 = HEAP8[$26>>0]|0;
  $28 = $27 << 24 >> 24;
  $29 = $is_gr;
  $30 = $28 ^ $29;
  $31 = $30&255;
  $c = $31;
  $32 = $c;
  $33 = $32&255;
  $34 = ($33|0)<(32);
  if ($34) {
   label = 8;
   break;
  }
  $35 = $c;
  $36 = $35&255;
  $37 = ($36|0)==(127);
  if ($37) {
   label = 8;
   break;
  }
  $38 = $c;
  $39 = $38&255;
  $40 = ($39|0)>=(128);
  if ($40) {
   label = 8;
   break;
  }
  $41 = $c;
  $42 = $41&255;
  $43 = $3;
  $44 = HEAP32[$43>>2]|0;
  $45 = (($44) + 1)|0;
  HEAP32[$43>>2] = $45;
  $46 = $2;
  $47 = (($46) + ($44<<2)|0);
  HEAP32[$47>>2] = $42;
  $48 = $6;
  $49 = HEAP32[$48>>2]|0;
  $50 = (($49) + 1)|0;
  HEAP32[$48>>2] = $50;
 }
 if ((label|0) == 8) {
  STACKTOP = sp;return;
 }
}
function _vterm_keyboard_unichar($vt,$c,$mod) {
 $vt = $vt|0;
 $c = $c|0;
 $mod = $mod|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $needs_CSIu = 0, $seqlen = 0, $str = 0, $vararg_buffer = 0, $vararg_buffer2 = 0, $vararg_ptr1 = 0, $vararg_ptr5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer2 = sp + 8|0;
 $vararg_buffer = sp;
 $str = sp + 36|0;
 $0 = $vt;
 $1 = $c;
 $2 = $mod;
 $3 = $1;
 $4 = ($3|0)!=(32);
 if ($4) {
  $5 = $2;
  $6 = $5 & -2;
  $2 = $6;
 }
 $7 = $2;
 $8 = ($7|0)==(0);
 $9 = $1;
 if ($8) {
  $10 = (_fill_utf8($9,$str)|0);
  $seqlen = $10;
  $11 = $0;
  $12 = $seqlen;
  _vterm_push_output_bytes($11,$str,$12);
  STACKTOP = sp;return;
 }
 switch ($9|0) {
 case 91: case 109: case 106: case 105:  {
  $needs_CSIu = 1;
  break;
 }
 case 95: case 94: case 93: case 92:  {
  $needs_CSIu = 0;
  break;
 }
 case 32:  {
  $13 = $2;
  $14 = $13 & 1;
  $15 = ($14|0)!=(0);
  $16 = $15 ^ 1;
  $17 = $16 ^ 1;
  $18 = $17&1;
  $needs_CSIu = $18;
  break;
 }
 default: {
  $19 = $1;
  $20 = ($19>>>0)<(97);
  $21 = $1;
  $22 = ($21>>>0)>(122);
  $23 = $20 ? 1 : $22;
  $24 = $23&1;
  $needs_CSIu = $24;
 }
 }
 $25 = $needs_CSIu;
 $26 = ($25|0)!=(0);
 if ($26) {
  $27 = $2;
  $28 = $27 & -3;
  $29 = ($28|0)!=(0);
  if ($29) {
   $30 = $0;
   $31 = $1;
   $32 = $2;
   $33 = (($32) + 1)|0;
   HEAP32[$vararg_buffer>>2] = $31;
   $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
   HEAP32[$vararg_ptr1>>2] = $33;
   _vterm_push_output_sprintf_ctrl($30,-101,3792,$vararg_buffer);
   STACKTOP = sp;return;
  }
 }
 $34 = $2;
 $35 = $34 & 4;
 $36 = ($35|0)!=(0);
 if ($36) {
  $37 = $1;
  $38 = $37 & 31;
  $1 = $38;
 }
 $39 = $0;
 $40 = $2;
 $41 = $40 & 2;
 $42 = ($41|0)!=(0);
 $43 = $42 ? 3799 : 5238;
 $44 = $1;
 HEAP32[$vararg_buffer2>>2] = $43;
 $vararg_ptr5 = ((($vararg_buffer2)) + 4|0);
 HEAP32[$vararg_ptr5>>2] = $44;
 _vterm_push_output_sprintf($39,3801,$vararg_buffer2);
 STACKTOP = sp;return;
}
function _vterm_keyboard_key($vt,$key,$mod) {
 $vt = $vt|0;
 $key = $key|0;
 $mod = $mod|0;
 var $$old = 0, $$old2 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0;
 var $114 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0;
 var $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0;
 var $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0;
 var $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $k = 0, $or$cond = 0, $or$cond3 = 0;
 var $vararg_buffer = 0, $vararg_buffer12 = 0, $vararg_buffer15 = 0, $vararg_buffer18 = 0, $vararg_buffer21 = 0, $vararg_buffer25 = 0, $vararg_buffer29 = 0, $vararg_buffer4 = 0, $vararg_buffer6 = 0, $vararg_buffer8 = 0, $vararg_ptr11 = 0, $vararg_ptr24 = 0, $vararg_ptr28 = 0, $vararg_ptr32 = 0, $vararg_ptr33 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer29 = sp + 72|0;
 $vararg_buffer25 = sp + 64|0;
 $vararg_buffer21 = sp + 56|0;
 $vararg_buffer18 = sp + 48|0;
 $vararg_buffer15 = sp + 40|0;
 $vararg_buffer12 = sp + 32|0;
 $vararg_buffer8 = sp + 24|0;
 $vararg_buffer6 = sp + 16|0;
 $vararg_buffer4 = sp + 8|0;
 $vararg_buffer = sp;
 $k = sp + 84|0;
 $0 = $vt;
 $1 = $key;
 $2 = $mod;
 $3 = $1;
 $4 = ($3|0)==(0);
 if ($4) {
  STACKTOP = sp;return;
 }
 $5 = $1;
 $6 = ($5>>>0)<(256);
 $7 = $1;
 do {
  if ($6) {
   $8 = ($7>>>0)>=(15);
   if ($8) {
    STACKTOP = sp;return;
   } else {
    $9 = $1;
    $10 = (1124 + (($9*12)|0)|0);
    ;HEAP32[$k>>2]=HEAP32[$10>>2]|0;HEAP32[$k+4>>2]=HEAP32[$10+4>>2]|0;HEAP32[$k+8>>2]=HEAP32[$10+8>>2]|0;
    break;
   }
  } else {
   $11 = ($7>>>0)>=(256);
   $12 = $1;
   $13 = ($12>>>0)<=(511);
   $or$cond = $11 & $13;
   $14 = $1;
   if ($or$cond) {
    $15 = (($14) - 256)|0;
    $16 = ($15>>>0)>=(13);
    if ($16) {
     STACKTOP = sp;return;
    } else {
     $17 = $1;
     $18 = (($17) - 256)|0;
     $19 = (1304 + (($18*12)|0)|0);
     ;HEAP32[$k>>2]=HEAP32[$19>>2]|0;HEAP32[$k+4>>2]=HEAP32[$19+4>>2]|0;HEAP32[$k+8>>2]=HEAP32[$19+8>>2]|0;
     break;
    }
   }
   $20 = ($14>>>0)>=(512);
   if ($20) {
    $21 = $1;
    $22 = (($21) - 512)|0;
    $23 = ($22>>>0)>=(18);
    if ($23) {
     STACKTOP = sp;return;
    } else {
     $24 = $1;
     $25 = (($24) - 512)|0;
     $26 = (1460 + (($25*12)|0)|0);
     ;HEAP32[$k>>2]=HEAP32[$26>>2]|0;HEAP32[$k+4>>2]=HEAP32[$26+4>>2]|0;HEAP32[$k+8>>2]=HEAP32[$26+8>>2]|0;
     break;
    }
   }
  }
 } while(0);
 $27 = HEAP32[$k>>2]|0;
 switch ($27|0) {
 case 8:  {
  $102 = $0;
  $103 = ((($102)) + 56|0);
  $104 = HEAP32[$103>>2]|0;
  $105 = ((($104)) + 104|0);
  $106 = HEAP16[$105>>1]|0;
  $107 = ($106 << 15)&65535;
  $108 = ($107<<16>>16) >> 15;
  $109 = $108 << 16 >> 16;
  $110 = ($109|0)!=(0);
  if ($110) {
   $111 = ((($k)) + 8|0);
   $112 = HEAP32[$111>>2]|0;
   $113 = $112&255;
   $114 = ((($k)) + 4|0);
   HEAP8[$114>>0] = $113;
   label = 21;
  } else {
   label = 18;
  }
  break;
 }
 case 2:  {
  $28 = $2;
  $29 = ($28|0)==(1);
  if ($29) {
   $30 = $0;
   _vterm_push_output_sprintf_ctrl($30,-101,3806,$vararg_buffer);
   STACKTOP = sp;return;
  }
  $31 = $2;
  $32 = $31 & 1;
  $33 = ($32|0)!=(0);
  if ($33) {
   $34 = $0;
   $35 = $2;
   $36 = (($35) + 1)|0;
   HEAP32[$vararg_buffer4>>2] = $36;
   _vterm_push_output_sprintf_ctrl($34,-101,3808,$vararg_buffer4);
   STACKTOP = sp;return;
  } else {
   label = 18;
  }
  break;
 }
 case 3:  {
  $37 = $0;
  $38 = ((($37)) + 56|0);
  $39 = HEAP32[$38>>2]|0;
  $40 = ((($39)) + 104|0);
  $41 = HEAP16[$40>>1]|0;
  $42 = ($41 << 11)&65535;
  $43 = ($42<<16>>16) >> 15;
  $44 = $43 << 16 >> 16;
  $45 = ($44|0)!=(0);
  if ($45) {
   $46 = $0;
   _vterm_push_output_sprintf($46,3814,$vararg_buffer6);
   STACKTOP = sp;return;
  } else {
   label = 18;
  }
  break;
 }
 case 1:  {
  label = 18;
  break;
 }
 case 4:  {
  label = 21;
  break;
 }
 case 5:  {
  break;
 }
 case 7:  {
  $78 = $2;
  $79 = ($78|0)==(0);
  $80 = $0;
  $81 = ((($k)) + 8|0);
  $82 = HEAP32[$81>>2]|0;
  if ($79) {
   $83 = ((($k)) + 4|0);
   $84 = HEAP8[$83>>0]|0;
   $85 = $84 << 24 >> 24;
   HEAP32[$vararg_buffer25>>2] = $82;
   $vararg_ptr28 = ((($vararg_buffer25)) + 4|0);
   HEAP32[$vararg_ptr28>>2] = $85;
   _vterm_push_output_sprintf_ctrl($80,-101,3824,$vararg_buffer25);
   STACKTOP = sp;return;
  } else {
   $86 = $2;
   $87 = (($86) + 1)|0;
   $88 = ((($k)) + 4|0);
   $89 = HEAP8[$88>>0]|0;
   $90 = $89 << 24 >> 24;
   HEAP32[$vararg_buffer29>>2] = $82;
   $vararg_ptr32 = ((($vararg_buffer29)) + 4|0);
   HEAP32[$vararg_ptr32>>2] = $87;
   $vararg_ptr33 = ((($vararg_buffer29)) + 8|0);
   HEAP32[$vararg_ptr33>>2] = $90;
   _vterm_push_output_sprintf_ctrl($80,-101,3829,$vararg_buffer29);
   STACKTOP = sp;return;
  }
  break;
 }
 case 6:  {
  $91 = $0;
  $92 = ((($91)) + 56|0);
  $93 = HEAP32[$92>>2]|0;
  $94 = ((($93)) + 104|0);
  $95 = HEAP16[$94>>1]|0;
  $96 = ($95 << 14)&65535;
  $97 = ($96<<16>>16) >> 15;
  $98 = $97 << 16 >> 16;
  $99 = ($98|0)!=(0);
  $100 = $2;
  $101 = ($100|0)==(0);
  $or$cond3 = $99 & $101;
  if ($or$cond3) {
   label = 22;
  }
  break;
 }
 default: {
  STACKTOP = sp;return;
 }
 }
 if ((label|0) == 18) {
  $47 = $2;
  $48 = $47 & 5;
  $49 = ($48|0)!=(0);
  $50 = $0;
  if ($49) {
   $51 = ((($k)) + 4|0);
   $52 = HEAP8[$51>>0]|0;
   $53 = $52 << 24 >> 24;
   $54 = $2;
   $55 = (($54) + 1)|0;
   HEAP32[$vararg_buffer8>>2] = $53;
   $vararg_ptr11 = ((($vararg_buffer8)) + 4|0);
   HEAP32[$vararg_ptr11>>2] = $55;
   _vterm_push_output_sprintf_ctrl($50,-101,3792,$vararg_buffer8);
   STACKTOP = sp;return;
  } else {
   $56 = $2;
   $57 = $56 & 2;
   $58 = ($57|0)!=(0);
   $59 = $58 ? 5231 : 5235;
   $60 = ((($k)) + 4|0);
   $61 = HEAP8[$60>>0]|0;
   $62 = $61 << 24 >> 24;
   HEAP32[$vararg_buffer12>>2] = $62;
   _vterm_push_output_sprintf($50,$59,$vararg_buffer12);
   STACKTOP = sp;return;
  }
 }
 else if ((label|0) == 21) {
  $$old = $2;
  $$old2 = ($$old|0)==(0);
  if ($$old2) {
   label = 22;
  }
 }
 if ((label|0) == 22) {
  $63 = $0;
  $64 = ((($k)) + 4|0);
  $65 = HEAP8[$64>>0]|0;
  $66 = $65 << 24 >> 24;
  HEAP32[$vararg_buffer15>>2] = $66;
  _vterm_push_output_sprintf_ctrl($63,-113,5235,$vararg_buffer15);
  STACKTOP = sp;return;
 }
 $67 = $2;
 $68 = ($67|0)==(0);
 $69 = $0;
 if ($68) {
  $70 = ((($k)) + 4|0);
  $71 = HEAP8[$70>>0]|0;
  $72 = $71 << 24 >> 24;
  HEAP32[$vararg_buffer18>>2] = $72;
  _vterm_push_output_sprintf_ctrl($69,-101,5235,$vararg_buffer18);
  STACKTOP = sp;return;
 } else {
  $73 = $2;
  $74 = (($73) + 1)|0;
  $75 = ((($k)) + 4|0);
  $76 = HEAP8[$75>>0]|0;
  $77 = $76 << 24 >> 24;
  HEAP32[$vararg_buffer21>>2] = $74;
  $vararg_ptr24 = ((($vararg_buffer21)) + 4|0);
  HEAP32[$vararg_ptr24>>2] = $77;
  _vterm_push_output_sprintf_ctrl($69,-101,3817,$vararg_buffer21);
  STACKTOP = sp;return;
 }
}
function _vterm_keyboard_start_paste($vt) {
 $vt = $vt|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $0 = $vt;
 $1 = $0;
 $2 = ((($1)) + 56|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ((($3)) + 104|0);
 $5 = HEAP16[$4>>1]|0;
 $6 = ($5 << 2)&65535;
 $7 = ($6<<16>>16) >> 15;
 $8 = $7 << 16 >> 16;
 $9 = ($8|0)!=(0);
 if (!($9)) {
  STACKTOP = sp;return;
 }
 $10 = $0;
 _vterm_push_output_sprintf_ctrl($10,-101,3837,$vararg_buffer);
 STACKTOP = sp;return;
}
function _vterm_keyboard_end_paste($vt) {
 $vt = $vt|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $0 = $vt;
 $1 = $0;
 $2 = ((($1)) + 56|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ((($3)) + 104|0);
 $5 = HEAP16[$4>>1]|0;
 $6 = ($5 << 2)&65535;
 $7 = ($6<<16>>16) >> 15;
 $8 = $7 << 16 >> 16;
 $9 = ($8|0)!=(0);
 if (!($9)) {
  STACKTOP = sp;return;
 }
 $10 = $0;
 _vterm_push_output_sprintf_ctrl($10,-101,3842,$vararg_buffer);
 STACKTOP = sp;return;
}
function _fill_utf8($codepoint,$str) {
 $codepoint = $codepoint|0;
 $str = $str|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $b = 0, $nbytes = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $codepoint;
 $1 = $str;
 $2 = $0;
 $3 = (_utf8_seqlen($2)|0);
 $nbytes = $3;
 $4 = $nbytes;
 $b = $4;
 while(1) {
  $5 = $b;
  $6 = ($5|0)>(1);
  if (!($6)) {
   break;
  }
  $7 = $b;
  $8 = (($7) + -1)|0;
  $b = $8;
  $9 = $0;
  $10 = $9 & 63;
  $11 = 128 | $10;
  $12 = $11&255;
  $13 = $b;
  $14 = $1;
  $15 = (($14) + ($13)|0);
  HEAP8[$15>>0] = $12;
  $16 = $0;
  $17 = $16 >> 6;
  $0 = $17;
 }
 $18 = $nbytes;
 switch ($18|0) {
 case 1:  {
  $19 = $0;
  $20 = $19 & 127;
  $21 = $20&255;
  $22 = $1;
  HEAP8[$22>>0] = $21;
  break;
 }
 case 2:  {
  $23 = $0;
  $24 = $23 & 31;
  $25 = 192 | $24;
  $26 = $25&255;
  $27 = $1;
  HEAP8[$27>>0] = $26;
  break;
 }
 case 3:  {
  $28 = $0;
  $29 = $28 & 15;
  $30 = 224 | $29;
  $31 = $30&255;
  $32 = $1;
  HEAP8[$32>>0] = $31;
  break;
 }
 case 4:  {
  $33 = $0;
  $34 = $33 & 7;
  $35 = 240 | $34;
  $36 = $35&255;
  $37 = $1;
  HEAP8[$37>>0] = $36;
  break;
 }
 case 5:  {
  $38 = $0;
  $39 = $38 & 3;
  $40 = 248 | $39;
  $41 = $40&255;
  $42 = $1;
  HEAP8[$42>>0] = $41;
  break;
 }
 case 6:  {
  $43 = $0;
  $44 = $43 & 1;
  $45 = 252 | $44;
  $46 = $45&255;
  $47 = $1;
  HEAP8[$47>>0] = $46;
  break;
 }
 default: {
 }
 }
 $48 = $nbytes;
 STACKTOP = sp;return ($48|0);
}
function _utf8_seqlen($codepoint) {
 $codepoint = $codepoint|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $codepoint;
 $2 = $1;
 $3 = ($2|0)<(128);
 do {
  if ($3) {
   $0 = 1;
  } else {
   $4 = $1;
   $5 = ($4|0)<(2048);
   if ($5) {
    $0 = 2;
    break;
   }
   $6 = $1;
   $7 = ($6|0)<(65536);
   if ($7) {
    $0 = 3;
    break;
   }
   $8 = $1;
   $9 = ($8|0)<(2097152);
   if ($9) {
    $0 = 4;
    break;
   }
   $10 = $1;
   $11 = ($10|0)<(67108864);
   if ($11) {
    $0 = 5;
    break;
   } else {
    $0 = 6;
    break;
   }
  }
 } while(0);
 $12 = $0;
 STACKTOP = sp;return ($12|0);
}
function _vterm_mouse_move($vt,$row,$col,$mod) {
 $vt = $vt|0;
 $row = $row|0;
 $col = $col|0;
 $mod = $mod|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $7 = 0, $8 = 0;
 var $9 = 0, $button = 0, $state = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $row;
 $2 = $col;
 $3 = $mod;
 $4 = $0;
 $5 = ((($4)) + 56|0);
 $6 = HEAP32[$5>>2]|0;
 $state = $6;
 $7 = $2;
 $8 = $state;
 $9 = ((($8)) + 64|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = ($7|0)==($10|0);
 if ($11) {
  $12 = $1;
  $13 = $state;
  $14 = ((($13)) + 68|0);
  $15 = HEAP32[$14>>2]|0;
  $16 = ($12|0)==($15|0);
  if ($16) {
   STACKTOP = sp;return;
  }
 }
 $17 = $2;
 $18 = $state;
 $19 = ((($18)) + 64|0);
 HEAP32[$19>>2] = $17;
 $20 = $1;
 $21 = $state;
 $22 = ((($21)) + 68|0);
 HEAP32[$22>>2] = $20;
 $23 = $state;
 $24 = ((($23)) + 76|0);
 $25 = HEAP32[$24>>2]|0;
 $26 = $25 & 2;
 $27 = ($26|0)!=(0);
 if ($27) {
  $28 = $state;
  $29 = ((($28)) + 72|0);
  $30 = HEAP32[$29>>2]|0;
  $31 = ($30|0)!=(0);
  if (!($31)) {
   label = 5;
  }
 } else {
  label = 5;
 }
 if ((label|0) == 5) {
  $32 = $state;
  $33 = ((($32)) + 76|0);
  $34 = HEAP32[$33>>2]|0;
  $35 = $34 & 4;
  $36 = ($35|0)!=(0);
  if (!($36)) {
   STACKTOP = sp;return;
  }
 }
 $37 = $state;
 $38 = ((($37)) + 72|0);
 $39 = HEAP32[$38>>2]|0;
 $40 = $39 & 1;
 $41 = ($40|0)!=(0);
 if ($41) {
  $53 = 1;
 } else {
  $42 = $state;
  $43 = ((($42)) + 72|0);
  $44 = HEAP32[$43>>2]|0;
  $45 = $44 & 2;
  $46 = ($45|0)!=(0);
  if ($46) {
   $53 = 2;
  } else {
   $47 = $state;
   $48 = ((($47)) + 72|0);
   $49 = HEAP32[$48>>2]|0;
   $50 = $49 & 4;
   $51 = ($50|0)!=(0);
   $52 = $51 ? 3 : 4;
   $53 = $52;
  }
 }
 $button = $53;
 $54 = $state;
 $55 = $button;
 $56 = (($55) - 1)|0;
 $57 = (($56) + 32)|0;
 $58 = $3;
 $59 = $2;
 $60 = $1;
 _output_mouse($54,$57,1,$58,$59,$60);
 STACKTOP = sp;return;
}
function _vterm_mouse_button($vt,$button,$pressed,$mod) {
 $vt = $vt|0;
 $button = $button|0;
 $pressed = $pressed|0;
 $mod = $mod|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $7 = 0, $8 = 0, $9 = 0, $old_buttons = 0, $or$cond = 0, $or$cond3 = 0, $state = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $button;
 $4 = $pressed&1;
 $2 = $4;
 $3 = $mod;
 $5 = $0;
 $6 = ((($5)) + 56|0);
 $7 = HEAP32[$6>>2]|0;
 $state = $7;
 $8 = $state;
 $9 = ((($8)) + 72|0);
 $10 = HEAP32[$9>>2]|0;
 $old_buttons = $10;
 $11 = $1;
 $12 = ($11|0)>(0);
 $13 = $1;
 $14 = ($13|0)<=(3);
 $or$cond = $12 & $14;
 do {
  if ($or$cond) {
   $15 = $2;
   $16 = $15&1;
   $17 = $1;
   $18 = (($17) - 1)|0;
   $19 = 1 << $18;
   if ($16) {
    $20 = $state;
    $21 = ((($20)) + 72|0);
    $22 = HEAP32[$21>>2]|0;
    $23 = $22 | $19;
    HEAP32[$21>>2] = $23;
    break;
   } else {
    $24 = $19 ^ -1;
    $25 = $state;
    $26 = ((($25)) + 72|0);
    $27 = HEAP32[$26>>2]|0;
    $28 = $27 & $24;
    HEAP32[$26>>2] = $28;
    break;
   }
  }
 } while(0);
 $29 = $state;
 $30 = ((($29)) + 72|0);
 $31 = HEAP32[$30>>2]|0;
 $32 = $old_buttons;
 $33 = ($31|0)==($32|0);
 $34 = $1;
 $35 = ($34|0)<(4);
 $or$cond3 = $33 & $35;
 if ($or$cond3) {
  STACKTOP = sp;return;
 }
 $36 = $1;
 $37 = ($36|0)<(4);
 if ($37) {
  $38 = $state;
  $39 = $1;
  $40 = (($39) - 1)|0;
  $41 = $2;
  $42 = $41&1;
  $43 = $42&1;
  $44 = $3;
  $45 = $state;
  $46 = ((($45)) + 64|0);
  $47 = HEAP32[$46>>2]|0;
  $48 = $state;
  $49 = ((($48)) + 68|0);
  $50 = HEAP32[$49>>2]|0;
  _output_mouse($38,$40,$43,$44,$47,$50);
  STACKTOP = sp;return;
 }
 $51 = $1;
 $52 = ($51|0)<(6);
 if (!($52)) {
  STACKTOP = sp;return;
 }
 $53 = $state;
 $54 = $1;
 $55 = (($54) - 4)|0;
 $56 = (($55) + 64)|0;
 $57 = $2;
 $58 = $57&1;
 $59 = $58&1;
 $60 = $3;
 $61 = $state;
 $62 = ((($61)) + 64|0);
 $63 = HEAP32[$62>>2]|0;
 $64 = $state;
 $65 = ((($64)) + 68|0);
 $66 = HEAP32[$65>>2]|0;
 _output_mouse($53,$56,$59,$60,$63,$66);
 STACKTOP = sp;return;
}
function _output_mouse($state,$code,$pressed,$modifiers,$col,$row) {
 $state = $state|0;
 $code = $code|0;
 $pressed = $pressed|0;
 $modifiers = $modifiers|0;
 $col = $col|0;
 $row = $row|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $9 = 0, $len = 0, $utf8 = 0, $vararg_buffer = 0, $vararg_buffer12 = 0, $vararg_buffer3 = 0, $vararg_buffer6 = 0, $vararg_ptr1 = 0, $vararg_ptr10 = 0, $vararg_ptr11 = 0, $vararg_ptr15 = 0, $vararg_ptr16 = 0, $vararg_ptr2 = 0, $vararg_ptr9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer12 = sp + 40|0;
 $vararg_buffer6 = sp + 24|0;
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer = sp;
 $utf8 = sp + 80|0;
 $0 = $state;
 $1 = $code;
 $2 = $pressed;
 $3 = $modifiers;
 $4 = $col;
 $5 = $row;
 $6 = $3;
 $7 = $6 << 2;
 $3 = $7;
 $8 = $0;
 $9 = ((($8)) + 80|0);
 $10 = HEAP32[$9>>2]|0;
 switch ($10|0) {
 case 0:  {
  $11 = $4;
  $12 = (($11) + 33)|0;
  $13 = ($12|0)>(255);
  if ($13) {
   $4 = 222;
  }
  $14 = $5;
  $15 = (($14) + 33)|0;
  $16 = ($15|0)>(255);
  if ($16) {
   $5 = 222;
  }
  $17 = $2;
  $18 = ($17|0)!=(0);
  if (!($18)) {
   $1 = 3;
  }
  $19 = $0;
  $20 = HEAP32[$19>>2]|0;
  $21 = $1;
  $22 = $3;
  $23 = $21 | $22;
  $24 = (($23) + 32)|0;
  $25 = $4;
  $26 = (($25) + 33)|0;
  $27 = $5;
  $28 = (($27) + 33)|0;
  HEAP32[$vararg_buffer>>2] = $24;
  $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
  HEAP32[$vararg_ptr1>>2] = $26;
  $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
  HEAP32[$vararg_ptr2>>2] = $28;
  _vterm_push_output_sprintf_ctrl($20,-101,3847,$vararg_buffer);
  STACKTOP = sp;return;
  break;
 }
 case 1:  {
  $len = 0;
  $29 = $2;
  $30 = ($29|0)!=(0);
  if (!($30)) {
   $1 = 3;
  }
  $31 = $1;
  $32 = $3;
  $33 = $31 | $32;
  $34 = (($33) + 32)|0;
  $35 = $len;
  $36 = (($utf8) + ($35)|0);
  $37 = (_fill_utf81($34,$36)|0);
  $38 = $len;
  $39 = (($38) + ($37))|0;
  $len = $39;
  $40 = $4;
  $41 = (($40) + 33)|0;
  $42 = $len;
  $43 = (($utf8) + ($42)|0);
  $44 = (_fill_utf81($41,$43)|0);
  $45 = $len;
  $46 = (($45) + ($44))|0;
  $len = $46;
  $47 = $5;
  $48 = (($47) + 33)|0;
  $49 = $len;
  $50 = (($utf8) + ($49)|0);
  $51 = (_fill_utf81($48,$50)|0);
  $52 = $len;
  $53 = (($52) + ($51))|0;
  $len = $53;
  $54 = $len;
  $55 = (($utf8) + ($54)|0);
  HEAP8[$55>>0] = 0;
  $56 = $0;
  $57 = HEAP32[$56>>2]|0;
  HEAP32[$vararg_buffer3>>2] = $utf8;
  _vterm_push_output_sprintf_ctrl($57,-101,3855,$vararg_buffer3);
  STACKTOP = sp;return;
  break;
 }
 case 2:  {
  $58 = $0;
  $59 = HEAP32[$58>>2]|0;
  $60 = $1;
  $61 = $3;
  $62 = $60 | $61;
  $63 = $4;
  $64 = (($63) + 1)|0;
  $65 = $5;
  $66 = (($65) + 1)|0;
  $67 = $2;
  $68 = ($67|0)!=(0);
  $69 = $68 ? 77 : 109;
  HEAP32[$vararg_buffer6>>2] = $62;
  $vararg_ptr9 = ((($vararg_buffer6)) + 4|0);
  HEAP32[$vararg_ptr9>>2] = $64;
  $vararg_ptr10 = ((($vararg_buffer6)) + 8|0);
  HEAP32[$vararg_ptr10>>2] = $66;
  $vararg_ptr11 = ((($vararg_buffer6)) + 12|0);
  HEAP32[$vararg_ptr11>>2] = $69;
  _vterm_push_output_sprintf_ctrl($59,-101,3859,$vararg_buffer6);
  STACKTOP = sp;return;
  break;
 }
 case 3:  {
  $70 = $2;
  $71 = ($70|0)!=(0);
  if (!($71)) {
   $1 = 3;
  }
  $72 = $0;
  $73 = HEAP32[$72>>2]|0;
  $74 = $1;
  $75 = $3;
  $76 = $74 | $75;
  $77 = $4;
  $78 = (($77) + 1)|0;
  $79 = $5;
  $80 = (($79) + 1)|0;
  HEAP32[$vararg_buffer12>>2] = $76;
  $vararg_ptr15 = ((($vararg_buffer12)) + 4|0);
  HEAP32[$vararg_ptr15>>2] = $78;
  $vararg_ptr16 = ((($vararg_buffer12)) + 8|0);
  HEAP32[$vararg_ptr16>>2] = $80;
  _vterm_push_output_sprintf_ctrl($73,-101,3871,$vararg_buffer12);
  STACKTOP = sp;return;
  break;
 }
 default: {
  STACKTOP = sp;return;
 }
 }
}
function _fill_utf81($codepoint,$str) {
 $codepoint = $codepoint|0;
 $str = $str|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $b = 0, $nbytes = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $codepoint;
 $1 = $str;
 $2 = $0;
 $3 = (_utf8_seqlen2($2)|0);
 $nbytes = $3;
 $4 = $nbytes;
 $b = $4;
 while(1) {
  $5 = $b;
  $6 = ($5|0)>(1);
  if (!($6)) {
   break;
  }
  $7 = $b;
  $8 = (($7) + -1)|0;
  $b = $8;
  $9 = $0;
  $10 = $9 & 63;
  $11 = 128 | $10;
  $12 = $11&255;
  $13 = $b;
  $14 = $1;
  $15 = (($14) + ($13)|0);
  HEAP8[$15>>0] = $12;
  $16 = $0;
  $17 = $16 >> 6;
  $0 = $17;
 }
 $18 = $nbytes;
 switch ($18|0) {
 case 1:  {
  $19 = $0;
  $20 = $19 & 127;
  $21 = $20&255;
  $22 = $1;
  HEAP8[$22>>0] = $21;
  break;
 }
 case 2:  {
  $23 = $0;
  $24 = $23 & 31;
  $25 = 192 | $24;
  $26 = $25&255;
  $27 = $1;
  HEAP8[$27>>0] = $26;
  break;
 }
 case 3:  {
  $28 = $0;
  $29 = $28 & 15;
  $30 = 224 | $29;
  $31 = $30&255;
  $32 = $1;
  HEAP8[$32>>0] = $31;
  break;
 }
 case 4:  {
  $33 = $0;
  $34 = $33 & 7;
  $35 = 240 | $34;
  $36 = $35&255;
  $37 = $1;
  HEAP8[$37>>0] = $36;
  break;
 }
 case 5:  {
  $38 = $0;
  $39 = $38 & 3;
  $40 = 248 | $39;
  $41 = $40&255;
  $42 = $1;
  HEAP8[$42>>0] = $41;
  break;
 }
 case 6:  {
  $43 = $0;
  $44 = $43 & 1;
  $45 = 252 | $44;
  $46 = $45&255;
  $47 = $1;
  HEAP8[$47>>0] = $46;
  break;
 }
 default: {
 }
 }
 $48 = $nbytes;
 STACKTOP = sp;return ($48|0);
}
function _utf8_seqlen2($codepoint) {
 $codepoint = $codepoint|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $codepoint;
 $2 = $1;
 $3 = ($2|0)<(128);
 do {
  if ($3) {
   $0 = 1;
  } else {
   $4 = $1;
   $5 = ($4|0)<(2048);
   if ($5) {
    $0 = 2;
    break;
   }
   $6 = $1;
   $7 = ($6|0)<(65536);
   if ($7) {
    $0 = 3;
    break;
   }
   $8 = $1;
   $9 = ($8|0)<(2097152);
   if ($9) {
    $0 = 4;
    break;
   }
   $10 = $1;
   $11 = ($10|0)<(67108864);
   if ($11) {
    $0 = 5;
    break;
   } else {
    $0 = 6;
    break;
   }
  }
 } while(0);
 $12 = $0;
 STACKTOP = sp;return ($12|0);
}
function _vterm_input_write($vt,$bytes,$len) {
 $vt = $vt|0;
 $bytes = $bytes|0;
 $len = $len|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0;
 var $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0;
 var $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0;
 var $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0;
 var $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $c = 0, $pos = 0, $remaining = 0, $string_start = 0, $text_eaten = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $0 = $vt;
 $1 = $bytes;
 $2 = $len;
 $pos = 0;
 $3 = $0;
 $4 = ((($3)) + 20|0);
 $5 = HEAP32[$4>>2]|0;
 switch ($5|0) {
 case 0:  {
  $string_start = 0;
  break;
 }
 case 3: case 2: case 1: case 6: case 5: case 4:  {
  $6 = $1;
  $string_start = $6;
  break;
 }
 default: {
 }
 }
 L4: while(1) {
  $7 = $pos;
  $8 = $2;
  $9 = ($7>>>0)<($8>>>0);
  if (!($9)) {
   break;
  }
  $10 = $pos;
  $11 = $1;
  $12 = (($11) + ($10)|0);
  $13 = HEAP8[$12>>0]|0;
  $c = $13;
  $14 = $c;
  $15 = $14&255;
  $16 = ($15|0)==(0);
  L7: do {
   if ($16) {
    label = 7;
   } else {
    $17 = $c;
    $18 = $17&255;
    $19 = ($18|0)==(127);
    if ($19) {
     label = 7;
    } else {
     $37 = $c;
     $38 = $37&255;
     $39 = ($38|0)==(24);
     if (!($39)) {
      $40 = $c;
      $41 = $40&255;
      $42 = ($41|0)==(26);
      if (!($42)) {
       $45 = $c;
       $46 = $45&255;
       $47 = ($46|0)==(27);
       if ($47) {
        $48 = $0;
        $49 = ((($48)) + 20|0);
        $50 = HEAP32[$49>>2]|0;
        $51 = ($50|0)==(2);
        $52 = $0;
        $53 = ((($52)) + 20|0);
        if ($51) {
         HEAP32[$53>>2] = 5;
         break;
        }
        $54 = HEAP32[$53>>2]|0;
        $55 = ($54|0)==(3);
        $56 = $0;
        $57 = ((($56)) + 20|0);
        if ($55) {
         HEAP32[$57>>2] = 6;
         break;
        } else {
         HEAP32[$57>>2] = 4;
         $58 = $1;
         $59 = $pos;
         $60 = (($58) + ($59)|0);
         $61 = ((($60)) + 1|0);
         $string_start = $61;
         break;
        }
       }
       $62 = $c;
       $63 = $62&255;
       $64 = ($63|0)==(7);
       if ($64) {
        $65 = $0;
        $66 = ((($65)) + 20|0);
        $67 = HEAP32[$66>>2]|0;
        $68 = ($67|0)==(2);
        if (!($68)) {
         $69 = $0;
         $70 = ((($69)) + 20|0);
         $71 = HEAP32[$70>>2]|0;
         $72 = ($71|0)==(3);
         if (!($72)) {
          label = 21;
         }
        }
       } else {
        label = 21;
       }
       if ((label|0) == 21) {
        label = 0;
        $73 = $c;
        $74 = $73&255;
        $75 = ($74|0)<(32);
        if ($75) {
         $76 = $0;
         $77 = ((($76)) + 20|0);
         $78 = HEAP32[$77>>2]|0;
         $79 = ($78|0)!=(0);
         if ($79) {
          $80 = $0;
          $81 = $string_start;
          $82 = $1;
          $83 = $pos;
          $84 = (($82) + ($83)|0);
          $85 = $string_start;
          $86 = $84;
          $87 = $85;
          $88 = (($86) - ($87))|0;
          _append_strbuffer($80,$81,$88);
         }
         $89 = $0;
         $90 = $c;
         _do_control($89,$90);
         $91 = $0;
         $92 = ((($91)) + 20|0);
         $93 = HEAP32[$92>>2]|0;
         $94 = ($93|0)!=(0);
         if (!($94)) {
          break;
         }
         $95 = $1;
         $96 = $pos;
         $97 = (($95) + ($96)|0);
         $98 = ((($97)) + 1|0);
         $string_start = $98;
         break;
        }
       }
       $99 = $0;
       $100 = ((($99)) + 20|0);
       $101 = HEAP32[$100>>2]|0;
       L33: do {
        switch ($101|0) {
        case 6: case 5:  {
         $102 = $c;
         $103 = $102&255;
         $104 = ($103|0)==(92);
         $105 = $0;
         $106 = ((($105)) + 20|0);
         if (!($104)) {
          HEAP32[$106>>2] = 4;
          $124 = $1;
          $125 = $pos;
          $126 = (($124) + ($125)|0);
          $string_start = $126;
          break L33;
         }
         $107 = HEAP32[$106>>2]|0;
         switch ($107|0) {
         case 5:  {
          $108 = $0;
          $109 = ((($108)) + 20|0);
          HEAP32[$109>>2] = 2;
          break;
         }
         case 6:  {
          $110 = $0;
          $111 = ((($110)) + 20|0);
          HEAP32[$111>>2] = 3;
          break;
         }
         default: {
         }
         }
         $112 = $0;
         $113 = $string_start;
         $114 = $1;
         $115 = $pos;
         $116 = (($114) + ($115)|0);
         $117 = $string_start;
         $118 = $116;
         $119 = $117;
         $120 = (($118) - ($119))|0;
         $121 = (($120) - 1)|0;
         (_do_string($112,$113,$121)|0);
         $122 = $0;
         $123 = ((($122)) + 20|0);
         HEAP32[$123>>2] = 0;
         $string_start = 0;
         break L7;
         break;
        }
        case 4:  {
         break;
        }
        case 1:  {
         $174 = $c;
         $175 = $174&255;
         $176 = ($175|0)>=(64);
         if (!($176)) {
          break L7;
         }
         $177 = $c;
         $178 = $177&255;
         $179 = ($178|0)<=(127);
         if (!($179)) {
          break L7;
         }
         $180 = $0;
         $181 = $string_start;
         $182 = $1;
         $183 = $pos;
         $184 = (($182) + ($183)|0);
         $185 = $string_start;
         $186 = $184;
         $187 = $185;
         $188 = (($186) - ($187))|0;
         $189 = (($188) + 1)|0;
         (_do_string($180,$181,$189)|0);
         $190 = $0;
         $191 = ((($190)) + 20|0);
         HEAP32[$191>>2] = 0;
         $string_start = 0;
         break L7;
         break;
        }
        case 3: case 2:  {
         $192 = $c;
         $193 = $192&255;
         $194 = ($193|0)==(7);
         if (!($194)) {
          $195 = $c;
          $196 = $195&255;
          $197 = ($196|0)==(156);
          if (!($197)) {
           break L7;
          }
          $198 = $0;
          $199 = ((($198)) + 16|0);
          $200 = HEAP8[$199>>0]|0;
          $201 = ($200 << 7)&255;
          $202 = ($201<<24>>24) >> 7;
          $203 = $202 << 24 >> 24;
          $204 = ($203|0)!=(0);
          if ($204) {
           break L7;
          }
         }
         $205 = $0;
         $206 = $string_start;
         $207 = $1;
         $208 = $pos;
         $209 = (($207) + ($208)|0);
         $210 = $string_start;
         $211 = $209;
         $212 = $210;
         $213 = (($211) - ($212))|0;
         (_do_string($205,$206,$213)|0);
         $214 = $0;
         $215 = ((($214)) + 20|0);
         HEAP32[$215>>2] = 0;
         $string_start = 0;
         break L7;
         break;
        }
        case 0:  {
         $216 = $c;
         $217 = $216&255;
         $218 = ($217|0)>=(128);
         if ($218) {
          $219 = $c;
          $220 = $219&255;
          $221 = ($220|0)<(160);
          if ($221) {
           $222 = $0;
           $223 = ((($222)) + 16|0);
           $224 = HEAP8[$223>>0]|0;
           $225 = ($224 << 7)&255;
           $226 = ($225<<24>>24) >> 7;
           $227 = $226 << 24 >> 24;
           $228 = ($227|0)!=(0);
           if (!($228)) {
            $229 = $c;
            $230 = $229&255;
            switch ($230|0) {
            case 144:  {
             $231 = $0;
             $232 = ((($231)) + 20|0);
             HEAP32[$232>>2] = 3;
             $233 = $1;
             $234 = $pos;
             $235 = (($233) + ($234)|0);
             $236 = ((($235)) + 1|0);
             $string_start = $236;
             break L7;
             break;
            }
            case 155:  {
             $237 = $0;
             $238 = ((($237)) + 20|0);
             HEAP32[$238>>2] = 1;
             $239 = $1;
             $240 = $pos;
             $241 = (($239) + ($240)|0);
             $242 = ((($241)) + 1|0);
             $string_start = $242;
             break L7;
             break;
            }
            case 157:  {
             $243 = $0;
             $244 = ((($243)) + 20|0);
             HEAP32[$244>>2] = 2;
             $245 = $1;
             $246 = $pos;
             $247 = (($245) + ($246)|0);
             $248 = ((($247)) + 1|0);
             $string_start = $248;
             break L7;
             break;
            }
            default: {
             $249 = $0;
             $250 = $c;
             _do_control($249,$250);
             break L7;
            }
            }
           }
          }
         }
         $251 = $0;
         $252 = $1;
         $253 = $pos;
         $254 = (($252) + ($253)|0);
         $255 = $2;
         $256 = $pos;
         $257 = (($255) - ($256))|0;
         $258 = (_do_string($251,$254,$257)|0);
         $text_eaten = $258;
         $259 = $text_eaten;
         $260 = ($259|0)==(0);
         if ($260) {
          label = 59;
          break L4;
         }
         $264 = $text_eaten;
         $265 = (($264) - 1)|0;
         $266 = $pos;
         $267 = (($266) + ($265))|0;
         $pos = $267;
         break L7;
         break;
        }
        default: {
         break L7;
        }
        }
       } while(0);
       $127 = $c;
       $128 = $127&255;
       switch ($128|0) {
       case 80:  {
        $129 = $0;
        $130 = ((($129)) + 20|0);
        HEAP32[$130>>2] = 3;
        $131 = $1;
        $132 = $pos;
        $133 = (($131) + ($132)|0);
        $134 = ((($133)) + 1|0);
        $string_start = $134;
        break L7;
        break;
       }
       case 91:  {
        $135 = $0;
        $136 = ((($135)) + 20|0);
        HEAP32[$136>>2] = 1;
        $137 = $1;
        $138 = $pos;
        $139 = (($137) + ($138)|0);
        $140 = ((($139)) + 1|0);
        $string_start = $140;
        break L7;
        break;
       }
       case 93:  {
        $141 = $0;
        $142 = ((($141)) + 20|0);
        HEAP32[$142>>2] = 2;
        $143 = $1;
        $144 = $pos;
        $145 = (($143) + ($144)|0);
        $146 = ((($145)) + 1|0);
        $string_start = $146;
        break L7;
        break;
       }
       default: {
        $147 = $c;
        $148 = $147&255;
        $149 = ($148|0)>=(48);
        if ($149) {
         $150 = $c;
         $151 = $150&255;
         $152 = ($151|0)<(127);
         if ($152) {
          $153 = $0;
          $154 = $string_start;
          $155 = $1;
          $156 = $pos;
          $157 = (($155) + ($156)|0);
          $158 = $string_start;
          $159 = $157;
          $160 = $158;
          $161 = (($159) - ($160))|0;
          $162 = (($161) + 1)|0;
          (_do_string($153,$154,$162)|0);
          $163 = $0;
          $164 = ((($163)) + 20|0);
          HEAP32[$164>>2] = 0;
          $string_start = 0;
          break L7;
         }
        }
        $165 = $c;
        $166 = $165&255;
        $167 = ($166|0)>=(32);
        if ($167) {
         $168 = $c;
         $169 = $168&255;
         $170 = ($169|0)<(48);
         if ($170) {
          break L7;
         }
        }
        $171 = HEAP32[3064>>2]|0;
        $172 = $c;
        $173 = $172&255;
        HEAP32[$vararg_buffer>>2] = $173;
        (_fprintf($171,3881,$vararg_buffer)|0);
        break L7;
       }
       }
      }
     }
     $43 = $0;
     $44 = ((($43)) + 20|0);
     HEAP32[$44>>2] = 0;
     $string_start = 0;
    }
   }
  } while(0);
  if ((label|0) == 7) {
   label = 0;
   $20 = $0;
   $21 = ((($20)) + 20|0);
   $22 = HEAP32[$21>>2]|0;
   $23 = ($22|0)!=(0);
   if ($23) {
    $24 = $0;
    $25 = $string_start;
    $26 = $1;
    $27 = $pos;
    $28 = (($26) + ($27)|0);
    $29 = $string_start;
    $30 = $28;
    $31 = $29;
    $32 = (($30) - ($31))|0;
    _append_strbuffer($24,$25,$32);
    $33 = $1;
    $34 = $pos;
    $35 = (($33) + ($34)|0);
    $36 = ((($35)) + 1|0);
    $string_start = $36;
   }
  }
  $268 = $pos;
  $269 = (($268) + 1)|0;
  $pos = $269;
 }
 if ((label|0) == 59) {
  $261 = $1;
  $262 = $pos;
  $263 = (($261) + ($262)|0);
  $string_start = $263;
 }
 $270 = $string_start;
 $271 = ($270|0)!=(0|0);
 if (!($271)) {
  $287 = $2;
  STACKTOP = sp;return ($287|0);
 }
 $272 = $string_start;
 $273 = $2;
 $274 = $1;
 $275 = (($274) + ($273)|0);
 $276 = ($272>>>0)<($275>>>0);
 if (!($276)) {
  $287 = $2;
  STACKTOP = sp;return ($287|0);
 }
 $277 = $2;
 $278 = $string_start;
 $279 = $1;
 $280 = $278;
 $281 = $279;
 $282 = (($280) - ($281))|0;
 $283 = (($277) - ($282))|0;
 $remaining = $283;
 $284 = $0;
 $285 = $string_start;
 $286 = $remaining;
 _append_strbuffer($284,$285,$286);
 $287 = $2;
 STACKTOP = sp;return ($287|0);
}
function _append_strbuffer($vt,$str,$len) {
 $vt = $vt|0;
 $str = $str|0;
 $len = $len|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $0 = $vt;
 $1 = $str;
 $2 = $len;
 $3 = $2;
 $4 = $0;
 $5 = ((($4)) + 36|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = $0;
 $8 = ((($7)) + 40|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = (($6) - ($9))|0;
 $11 = ($3>>>0)>($10>>>0);
 if ($11) {
  $12 = $0;
  $13 = ((($12)) + 36|0);
  $14 = HEAP32[$13>>2]|0;
  $15 = $0;
  $16 = ((($15)) + 40|0);
  $17 = HEAP32[$16>>2]|0;
  $18 = (($14) - ($17))|0;
  $2 = $18;
  $19 = HEAP32[3064>>2]|0;
  $20 = $2;
  HEAP32[$vararg_buffer>>2] = $20;
  (_fprintf($19,4286,$vararg_buffer)|0);
 }
 $21 = $2;
 $22 = ($21>>>0)>(0);
 if (!($22)) {
  STACKTOP = sp;return;
 }
 $23 = $0;
 $24 = ((($23)) + 32|0);
 $25 = HEAP32[$24>>2]|0;
 $26 = $0;
 $27 = ((($26)) + 40|0);
 $28 = HEAP32[$27>>2]|0;
 $29 = (($25) + ($28)|0);
 $30 = $1;
 $31 = $2;
 (_strncpy($29,$30,$31)|0);
 $32 = $2;
 $33 = $0;
 $34 = ((($33)) + 40|0);
 $35 = HEAP32[$34>>2]|0;
 $36 = (($35) + ($32))|0;
 HEAP32[$34>>2] = $36;
 STACKTOP = sp;return;
}
function _do_control($vt,$control) {
 $vt = $vt|0;
 $control = $control|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $3 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $0 = $vt;
 $1 = $control;
 $2 = $0;
 $3 = ((($2)) + 24|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($4|0)!=(0|0);
 if ($5) {
  $6 = $0;
  $7 = ((($6)) + 24|0);
  $8 = HEAP32[$7>>2]|0;
  $9 = ((($8)) + 4|0);
  $10 = HEAP32[$9>>2]|0;
  $11 = ($10|0)!=(0|0);
  if ($11) {
   $12 = $0;
   $13 = ((($12)) + 24|0);
   $14 = HEAP32[$13>>2]|0;
   $15 = ((($14)) + 4|0);
   $16 = HEAP32[$15>>2]|0;
   $17 = $1;
   $18 = $0;
   $19 = ((($18)) + 28|0);
   $20 = HEAP32[$19>>2]|0;
   $21 = (FUNCTION_TABLE_iii[$16 & 31]($17,$20)|0);
   $22 = ($21|0)!=(0);
   if ($22) {
    STACKTOP = sp;return;
   }
  }
 }
 $23 = HEAP32[3064>>2]|0;
 $24 = $1;
 $25 = $24&255;
 HEAP32[$vararg_buffer>>2] = $25;
 (_fprintf($23,4250,$vararg_buffer)|0);
 STACKTOP = sp;return;
}
function _do_string($vt,$str_frag,$len) {
 $vt = $vt|0;
 $str_frag = $str_frag|0;
 $len = $len|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0;
 var $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0;
 var $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0;
 var $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0;
 var $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $eaten = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer10 = 0, $vararg_buffer14 = 0, $vararg_buffer3 = 0;
 var $vararg_buffer6 = 0, $vararg_ptr13 = 0, $vararg_ptr9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer14 = sp + 40|0;
 $vararg_buffer10 = sp + 32|0;
 $vararg_buffer6 = sp + 24|0;
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer1 = sp + 8|0;
 $vararg_buffer = sp;
 $1 = $vt;
 $2 = $str_frag;
 $3 = $len;
 $4 = $1;
 $5 = ((($4)) + 40|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)!=(0);
 $8 = $2;
 $9 = ($8|0)!=(0|0);
 if ($7) {
  if ($9) {
   $10 = $1;
   $11 = $2;
   $12 = $3;
   _append_strbuffer($10,$11,$12);
  }
  $13 = $1;
  $14 = ((($13)) + 32|0);
  $15 = HEAP32[$14>>2]|0;
  $2 = $15;
  $16 = $1;
  $17 = ((($16)) + 40|0);
  $18 = HEAP32[$17>>2]|0;
  $3 = $18;
 } else {
  if (!($9)) {
   $19 = HEAP32[3064>>2]|0;
   (_fprintf($19,3994,$vararg_buffer)|0);
   $3 = 0;
  }
 }
 $20 = $1;
 $21 = ((($20)) + 40|0);
 HEAP32[$21>>2] = 0;
 $22 = $1;
 $23 = ((($22)) + 20|0);
 $24 = HEAP32[$23>>2]|0;
 switch ($24|0) {
 case 0:  {
  $25 = $1;
  $26 = ((($25)) + 24|0);
  $27 = HEAP32[$26>>2]|0;
  $28 = ($27|0)!=(0|0);
  if ($28) {
   $29 = $1;
   $30 = ((($29)) + 24|0);
   $31 = HEAP32[$30>>2]|0;
   $32 = HEAP32[$31>>2]|0;
   $33 = ($32|0)!=(0|0);
   if ($33) {
    $34 = $1;
    $35 = ((($34)) + 24|0);
    $36 = HEAP32[$35>>2]|0;
    $37 = HEAP32[$36>>2]|0;
    $38 = $2;
    $39 = $3;
    $40 = $1;
    $41 = ((($40)) + 28|0);
    $42 = HEAP32[$41>>2]|0;
    $43 = (FUNCTION_TABLE_iiii[$37 & 31]($38,$39,$42)|0);
    $eaten = $43;
    $44 = ($43|0)!=(0);
    if ($44) {
     $45 = $eaten;
     $0 = $45;
     $153 = $0;
     STACKTOP = sp;return ($153|0);
    }
   }
  }
  $46 = HEAP32[3064>>2]|0;
  $47 = $3;
  HEAP32[$vararg_buffer1>>2] = $47;
  (_fprintf($46,4051,$vararg_buffer1)|0);
  $0 = 0;
  $153 = $0;
  STACKTOP = sp;return ($153|0);
  break;
 }
 case 4:  {
  $48 = $3;
  $49 = ($48|0)==(1);
  if ($49) {
   $50 = $2;
   $51 = HEAP8[$50>>0]|0;
   $52 = $51 << 24 >> 24;
   $53 = ($52|0)>=(64);
   if ($53) {
    $54 = $2;
    $55 = HEAP8[$54>>0]|0;
    $56 = $55 << 24 >> 24;
    $57 = ($56|0)<(96);
    if ($57) {
     $58 = $1;
     $59 = $2;
     $60 = HEAP8[$59>>0]|0;
     $61 = $60 << 24 >> 24;
     $62 = (($61) + 64)|0;
     $63 = $62&255;
     _do_control($58,$63);
     $0 = 0;
     $153 = $0;
     STACKTOP = sp;return ($153|0);
    }
   }
  }
  $64 = $1;
  $65 = ((($64)) + 24|0);
  $66 = HEAP32[$65>>2]|0;
  $67 = ($66|0)!=(0|0);
  if ($67) {
   $68 = $1;
   $69 = ((($68)) + 24|0);
   $70 = HEAP32[$69>>2]|0;
   $71 = ((($70)) + 8|0);
   $72 = HEAP32[$71>>2]|0;
   $73 = ($72|0)!=(0|0);
   if ($73) {
    $74 = $1;
    $75 = ((($74)) + 24|0);
    $76 = HEAP32[$75>>2]|0;
    $77 = ((($76)) + 8|0);
    $78 = HEAP32[$77>>2]|0;
    $79 = $2;
    $80 = $3;
    $81 = $1;
    $82 = ((($81)) + 28|0);
    $83 = HEAP32[$82>>2]|0;
    $84 = (FUNCTION_TABLE_iiii[$78 & 31]($79,$80,$83)|0);
    $85 = ($84|0)!=(0);
    if ($85) {
     $0 = 0;
     $153 = $0;
     STACKTOP = sp;return ($153|0);
    }
   }
  }
  $86 = HEAP32[3064>>2]|0;
  $87 = $3;
  $88 = (($87) - 1)|0;
  $89 = $2;
  $90 = (($89) + ($88)|0);
  $91 = HEAP8[$90>>0]|0;
  $92 = $91 << 24 >> 24;
  HEAP32[$vararg_buffer3>>2] = $92;
  (_fprintf($86,4089,$vararg_buffer3)|0);
  $0 = 0;
  $153 = $0;
  STACKTOP = sp;return ($153|0);
  break;
 }
 case 1:  {
  $93 = $1;
  $94 = $2;
  $95 = $3;
  $96 = (($95) - 1)|0;
  $97 = $3;
  $98 = (($97) - 1)|0;
  $99 = $2;
  $100 = (($99) + ($98)|0);
  $101 = HEAP8[$100>>0]|0;
  _do_string_csi($93,$94,$96,$101);
  $0 = 0;
  $153 = $0;
  STACKTOP = sp;return ($153|0);
  break;
 }
 case 2:  {
  $102 = $1;
  $103 = ((($102)) + 24|0);
  $104 = HEAP32[$103>>2]|0;
  $105 = ($104|0)!=(0|0);
  if ($105) {
   $106 = $1;
   $107 = ((($106)) + 24|0);
   $108 = HEAP32[$107>>2]|0;
   $109 = ((($108)) + 16|0);
   $110 = HEAP32[$109>>2]|0;
   $111 = ($110|0)!=(0|0);
   if ($111) {
    $112 = $1;
    $113 = ((($112)) + 24|0);
    $114 = HEAP32[$113>>2]|0;
    $115 = ((($114)) + 16|0);
    $116 = HEAP32[$115>>2]|0;
    $117 = $2;
    $118 = $3;
    $119 = $1;
    $120 = ((($119)) + 28|0);
    $121 = HEAP32[$120>>2]|0;
    $122 = (FUNCTION_TABLE_iiii[$116 & 31]($117,$118,$121)|0);
    $123 = ($122|0)!=(0);
    if ($123) {
     $0 = 0;
     $153 = $0;
     STACKTOP = sp;return ($153|0);
    }
   }
  }
  $124 = HEAP32[3064>>2]|0;
  $125 = $3;
  $126 = $2;
  HEAP32[$vararg_buffer6>>2] = $125;
  $vararg_ptr9 = ((($vararg_buffer6)) + 4|0);
  HEAP32[$vararg_ptr9>>2] = $126;
  (_fprintf($124,4128,$vararg_buffer6)|0);
  $0 = 0;
  $153 = $0;
  STACKTOP = sp;return ($153|0);
  break;
 }
 case 3:  {
  $127 = $1;
  $128 = ((($127)) + 24|0);
  $129 = HEAP32[$128>>2]|0;
  $130 = ($129|0)!=(0|0);
  if ($130) {
   $131 = $1;
   $132 = ((($131)) + 24|0);
   $133 = HEAP32[$132>>2]|0;
   $134 = ((($133)) + 20|0);
   $135 = HEAP32[$134>>2]|0;
   $136 = ($135|0)!=(0|0);
   if ($136) {
    $137 = $1;
    $138 = ((($137)) + 24|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = ((($139)) + 20|0);
    $141 = HEAP32[$140>>2]|0;
    $142 = $2;
    $143 = $3;
    $144 = $1;
    $145 = ((($144)) + 28|0);
    $146 = HEAP32[$145>>2]|0;
    $147 = (FUNCTION_TABLE_iiii[$141 & 31]($142,$143,$146)|0);
    $148 = ($147|0)!=(0);
    if ($148) {
     $0 = 0;
     $153 = $0;
     STACKTOP = sp;return ($153|0);
    }
   }
  }
  $149 = HEAP32[3064>>2]|0;
  $150 = $3;
  $151 = $2;
  HEAP32[$vararg_buffer10>>2] = $150;
  $vararg_ptr13 = ((($vararg_buffer10)) + 4|0);
  HEAP32[$vararg_ptr13>>2] = $151;
  (_fprintf($149,4158,$vararg_buffer10)|0);
  $0 = 0;
  $153 = $0;
  STACKTOP = sp;return ($153|0);
  break;
 }
 case 6: case 5:  {
  $152 = HEAP32[3064>>2]|0;
  (_fprintf($152,4188,$vararg_buffer14)|0);
  $0 = 0;
  $153 = $0;
  STACKTOP = sp;return ($153|0);
  break;
 }
 default: {
  $0 = 0;
  $153 = $0;
  STACKTOP = sp;return ($153|0);
 }
 }
 return (0)|0;
}
function _do_string_csi($vt,$args,$arglen,$command) {
 $vt = $vt|0;
 $args = $args|0;
 $arglen = $arglen|0;
 $command = $command|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0;
 var $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0;
 var $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0;
 var $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0;
 var $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0;
 var $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $argcount = 0, $argi = 0, $csi_args = 0, $i = 0, $intermed = 0, $intermedlen = 0, $leader = 0, $leaderlen = 0, $vararg_buffer = 0, $vararg_buffer2 = 0, $vararg_ptr1 = 0, $vararg_ptr5 = 0, $vararg_ptr6 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 160|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer2 = sp + 8|0;
 $vararg_buffer = sp;
 $leader = sp + 136|0;
 $csi_args = sp + 32|0;
 $intermed = sp + 120|0;
 $0 = $vt;
 $1 = $args;
 $2 = $arglen;
 $3 = $command;
 $i = 0;
 $leaderlen = 0;
 while(1) {
  $4 = $i;
  $5 = $2;
  $6 = ($4>>>0)<($5>>>0);
  if (!($6)) {
   break;
  }
  $7 = $i;
  $8 = $1;
  $9 = (($8) + ($7)|0);
  $10 = HEAP8[$9>>0]|0;
  $11 = $10 << 24 >> 24;
  $12 = ($11|0)<(60);
  if ($12) {
   break;
  }
  $13 = $i;
  $14 = $1;
  $15 = (($14) + ($13)|0);
  $16 = HEAP8[$15>>0]|0;
  $17 = $16 << 24 >> 24;
  $18 = ($17|0)>(63);
  if ($18) {
   break;
  }
  $19 = $leaderlen;
  $20 = ($19|0)<(15);
  if ($20) {
   $21 = $i;
   $22 = $1;
   $23 = (($22) + ($21)|0);
   $24 = HEAP8[$23>>0]|0;
   $25 = $leaderlen;
   $26 = (($25) + 1)|0;
   $leaderlen = $26;
   $27 = (($leader) + ($25)|0);
   HEAP8[$27>>0] = $24;
  }
  $28 = $i;
  $29 = (($28) + 1)|0;
  $i = $29;
 }
 $30 = $leaderlen;
 $31 = (($leader) + ($30)|0);
 HEAP8[$31>>0] = 0;
 $argcount = 1;
 while(1) {
  $32 = $i;
  $33 = $2;
  $34 = ($32>>>0)<($33>>>0);
  if (!($34)) {
   break;
  }
  $35 = $i;
  $36 = $1;
  $37 = (($36) + ($35)|0);
  $38 = HEAP8[$37>>0]|0;
  $39 = $38 << 24 >> 24;
  $40 = ($39|0)==(59);
  if ($40) {
   label = 12;
  } else {
   $41 = $i;
   $42 = $1;
   $43 = (($42) + ($41)|0);
   $44 = HEAP8[$43>>0]|0;
   $45 = $44 << 24 >> 24;
   $46 = ($45|0)==(58);
   if ($46) {
    label = 12;
   }
  }
  if ((label|0) == 12) {
   label = 0;
   $47 = $argcount;
   $48 = (($47) + 1)|0;
   $argcount = $48;
  }
  $49 = $i;
  $50 = (($49) + 1)|0;
  $i = $50;
 }
 $51 = $argcount;
 $52 = ($51|0)>(16);
 if ($52) {
  $argcount = 16;
 }
 $argi = 0;
 while(1) {
  $53 = $argi;
  $54 = $argcount;
  $55 = ($53|0)<($54|0);
  if (!($55)) {
   break;
  }
  $56 = $argi;
  $57 = (($csi_args) + ($56<<2)|0);
  HEAP32[$57>>2] = 2147483647;
  $58 = $argi;
  $59 = (($58) + 1)|0;
  $argi = $59;
 }
 $argi = 0;
 $60 = $leaderlen;
 $i = $60;
 L26: while(1) {
  $61 = $i;
  $62 = $2;
  $63 = ($61>>>0)<($62>>>0);
  if (!($63)) {
   break;
  }
  $64 = $argi;
  $65 = $argcount;
  $66 = ($64|0)<($65|0);
  if (!($66)) {
   break;
  }
  $67 = $i;
  $68 = $1;
  $69 = (($68) + ($67)|0);
  $70 = HEAP8[$69>>0]|0;
  $71 = $70 << 24 >> 24;
  switch ($71|0) {
  case 57: case 56: case 55: case 54: case 53: case 52: case 51: case 50: case 49: case 48:  {
   $72 = $argi;
   $73 = (($csi_args) + ($72<<2)|0);
   $74 = HEAP32[$73>>2]|0;
   $75 = ($74|0)==(2147483647);
   if ($75) {
    $76 = $argi;
    $77 = (($csi_args) + ($76<<2)|0);
    HEAP32[$77>>2] = 0;
   }
   $78 = $argi;
   $79 = (($csi_args) + ($78<<2)|0);
   $80 = HEAP32[$79>>2]|0;
   $81 = ($80*10)|0;
   HEAP32[$79>>2] = $81;
   $82 = $i;
   $83 = $1;
   $84 = (($83) + ($82)|0);
   $85 = HEAP8[$84>>0]|0;
   $86 = $85 << 24 >> 24;
   $87 = (($86) - 48)|0;
   $88 = $argi;
   $89 = (($csi_args) + ($88<<2)|0);
   $90 = HEAP32[$89>>2]|0;
   $91 = (($90) + ($87))|0;
   HEAP32[$89>>2] = $91;
   break;
  }
  case 58:  {
   $92 = $argi;
   $93 = (($csi_args) + ($92<<2)|0);
   $94 = HEAP32[$93>>2]|0;
   $95 = $94 | -2147483648;
   HEAP32[$93>>2] = $95;
   label = 27;
   break;
  }
  case 59:  {
   label = 27;
   break;
  }
  default: {
   break L26;
  }
  }
  if ((label|0) == 27) {
   label = 0;
   $96 = $argi;
   $97 = (($96) + 1)|0;
   $argi = $97;
  }
  $98 = $i;
  $99 = (($98) + 1)|0;
  $i = $99;
 }
 $intermedlen = 0;
 while(1) {
  $100 = $i;
  $101 = $2;
  $102 = ($100>>>0)<($101>>>0);
  if (!($102)) {
   break;
  }
  $103 = $i;
  $104 = $1;
  $105 = (($104) + ($103)|0);
  $106 = HEAP8[$105>>0]|0;
  $107 = $106 << 24 >> 24;
  $108 = $107 & 240;
  $109 = ($108|0)!=(32);
  if ($109) {
   break;
  }
  $110 = $intermedlen;
  $111 = ($110|0)<(15);
  if ($111) {
   $112 = $i;
   $113 = $1;
   $114 = (($113) + ($112)|0);
   $115 = HEAP8[$114>>0]|0;
   $116 = $intermedlen;
   $117 = (($116) + 1)|0;
   $intermedlen = $117;
   $118 = (($intermed) + ($116)|0);
   HEAP8[$118>>0] = $115;
  }
  $119 = $i;
  $120 = (($119) + 1)|0;
  $i = $120;
 }
 $121 = $intermedlen;
 $122 = (($intermed) + ($121)|0);
 HEAP8[$122>>0] = 0;
 $123 = $i;
 $124 = $2;
 $125 = ($123>>>0)<($124>>>0);
 if ($125) {
  $126 = HEAP32[3064>>2]|0;
  $127 = $2;
  $128 = $i;
  $129 = (($127) - ($128))|0;
  $130 = $1;
  $131 = $i;
  $132 = (($130) + ($131)|0);
  HEAP32[$vararg_buffer>>2] = $129;
  $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
  HEAP32[$vararg_ptr1>>2] = $132;
  (_fprintf($126,3918,$vararg_buffer)|0);
 }
 $133 = $0;
 $134 = ((($133)) + 24|0);
 $135 = HEAP32[$134>>2]|0;
 $136 = ($135|0)!=(0|0);
 if ($136) {
  $137 = $0;
  $138 = ((($137)) + 24|0);
  $139 = HEAP32[$138>>2]|0;
  $140 = ((($139)) + 12|0);
  $141 = HEAP32[$140>>2]|0;
  $142 = ($141|0)!=(0|0);
  if ($142) {
   $143 = $0;
   $144 = ((($143)) + 24|0);
   $145 = HEAP32[$144>>2]|0;
   $146 = ((($145)) + 12|0);
   $147 = HEAP32[$146>>2]|0;
   $148 = $leaderlen;
   $149 = ($148|0)!=(0);
   $150 = $149 ? $leader : 0;
   $151 = $argcount;
   $152 = $intermedlen;
   $153 = ($152|0)!=(0);
   $154 = $153 ? $intermed : 0;
   $155 = $3;
   $156 = $0;
   $157 = ((($156)) + 28|0);
   $158 = HEAP32[$157>>2]|0;
   $159 = (FUNCTION_TABLE_iiiiiii[$147 & 31]($150,$csi_args,$151,$154,$155,$158)|0);
   $160 = ($159|0)!=(0);
   if ($160) {
    STACKTOP = sp;return;
   }
  }
 }
 $161 = HEAP32[3064>>2]|0;
 $162 = $2;
 $163 = $1;
 $164 = $3;
 $165 = $164 << 24 >> 24;
 HEAP32[$vararg_buffer2>>2] = $162;
 $vararg_ptr5 = ((($vararg_buffer2)) + 4|0);
 HEAP32[$vararg_ptr5>>2] = $163;
 $vararg_ptr6 = ((($vararg_buffer2)) + 8|0);
 HEAP32[$vararg_ptr6>>2] = $165;
 (_fprintf($161,3961,$vararg_buffer2)|0);
 STACKTOP = sp;return;
}
function _vterm_state_newpen($state) {
 $state = $state|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $col = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $0;
 $2 = ((($1)) + 228|0);
 $3 = ((($2)) + 2|0);
 HEAP8[$3>>0] = -16;
 $4 = $0;
 $5 = ((($4)) + 228|0);
 $6 = ((($5)) + 1|0);
 HEAP8[$6>>0] = -16;
 $7 = $0;
 $8 = ((($7)) + 228|0);
 HEAP8[$8>>0] = -16;
 $9 = $0;
 $10 = ((($9)) + 231|0);
 $11 = ((($10)) + 2|0);
 HEAP8[$11>>0] = 0;
 $12 = $0;
 $13 = ((($12)) + 231|0);
 $14 = ((($13)) + 1|0);
 HEAP8[$14>>0] = 0;
 $15 = $0;
 $16 = ((($15)) + 231|0);
 HEAP8[$16>>0] = 0;
 $col = 0;
 while(1) {
  $17 = $col;
  $18 = ($17|0)<(16);
  if (!($18)) {
   break;
  }
  $19 = $col;
  $20 = $0;
  $21 = ((($20)) + 234|0);
  $22 = (($21) + (($19*3)|0)|0);
  $23 = $col;
  $24 = (4330 + (($23*3)|0)|0);
  ;HEAP8[$22>>0]=HEAP8[$24>>0]|0;HEAP8[$22+1>>0]=HEAP8[$24+1>>0]|0;HEAP8[$22+2>>0]=HEAP8[$24+2>>0]|0;
  $25 = $col;
  $26 = (($25) + 1)|0;
  $col = $26;
 }
 STACKTOP = sp;return;
}
function _vterm_state_resetpen($state) {
 $state = $state|0;
 var $$byval_copy = 0, $$byval_copy1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0;
 var $61 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy1 = sp + 7|0;
 $$byval_copy = sp + 4|0;
 $0 = $state;
 $1 = $0;
 $2 = ((($1)) + 220|0);
 $3 = ((($2)) + 6|0);
 $4 = HEAP16[$3>>1]|0;
 $5 = $4 & -2;
 HEAP16[$3>>1] = $5;
 $6 = $0;
 _setpenattr_bool($6,1,0);
 $7 = $0;
 $8 = ((($7)) + 220|0);
 $9 = ((($8)) + 6|0);
 $10 = HEAP16[$9>>1]|0;
 $11 = $10 & -7;
 HEAP16[$9>>1] = $11;
 $12 = $0;
 _setpenattr_int($12,2,0);
 $13 = $0;
 $14 = ((($13)) + 220|0);
 $15 = ((($14)) + 6|0);
 $16 = HEAP16[$15>>1]|0;
 $17 = $16 & -9;
 HEAP16[$15>>1] = $17;
 $18 = $0;
 _setpenattr_bool($18,3,0);
 $19 = $0;
 $20 = ((($19)) + 220|0);
 $21 = ((($20)) + 6|0);
 $22 = HEAP16[$21>>1]|0;
 $23 = $22 & -17;
 HEAP16[$21>>1] = $23;
 $24 = $0;
 _setpenattr_bool($24,4,0);
 $25 = $0;
 $26 = ((($25)) + 220|0);
 $27 = ((($26)) + 6|0);
 $28 = HEAP16[$27>>1]|0;
 $29 = $28 & -33;
 HEAP16[$27>>1] = $29;
 $30 = $0;
 _setpenattr_bool($30,5,0);
 $31 = $0;
 $32 = ((($31)) + 220|0);
 $33 = ((($32)) + 6|0);
 $34 = HEAP16[$33>>1]|0;
 $35 = $34 & -65;
 HEAP16[$33>>1] = $35;
 $36 = $0;
 _setpenattr_bool($36,6,0);
 $37 = $0;
 $38 = ((($37)) + 220|0);
 $39 = ((($38)) + 6|0);
 $40 = HEAP16[$39>>1]|0;
 $41 = $40 & -1921;
 HEAP16[$39>>1] = $41;
 $42 = $0;
 _setpenattr_int($42,7,0);
 $43 = $0;
 $44 = ((($43)) + 284|0);
 HEAP32[$44>>2] = -1;
 $45 = $0;
 $46 = ((($45)) + 288|0);
 HEAP32[$46>>2] = -1;
 $47 = $0;
 $48 = ((($47)) + 220|0);
 $49 = $0;
 $50 = ((($49)) + 228|0);
 ;HEAP8[$48>>0]=HEAP8[$50>>0]|0;HEAP8[$48+1>>0]=HEAP8[$50+1>>0]|0;HEAP8[$48+2>>0]=HEAP8[$50+2>>0]|0;
 $51 = $0;
 $52 = $0;
 $53 = ((($52)) + 228|0);
 ;HEAP8[$$byval_copy>>0]=HEAP8[$53>>0]|0;HEAP8[$$byval_copy+1>>0]=HEAP8[$53+1>>0]|0;HEAP8[$$byval_copy+2>>0]=HEAP8[$53+2>>0]|0;
 _setpenattr_col($51,8,$$byval_copy);
 $54 = $0;
 $55 = ((($54)) + 220|0);
 $56 = ((($55)) + 3|0);
 $57 = $0;
 $58 = ((($57)) + 231|0);
 ;HEAP8[$56>>0]=HEAP8[$58>>0]|0;HEAP8[$56+1>>0]=HEAP8[$58+1>>0]|0;HEAP8[$56+2>>0]=HEAP8[$58+2>>0]|0;
 $59 = $0;
 $60 = $0;
 $61 = ((($60)) + 231|0);
 ;HEAP8[$$byval_copy1>>0]=HEAP8[$61>>0]|0;HEAP8[$$byval_copy1+1>>0]=HEAP8[$61+1>>0]|0;HEAP8[$$byval_copy1+2>>0]=HEAP8[$61+2>>0]|0;
 _setpenattr_col($59,9,$$byval_copy1);
 STACKTOP = sp;return;
}
function _vterm_state_savepen($state,$save) {
 $state = $state|0;
 $save = $save|0;
 var $$byval_copy = 0, $$byval_copy1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0;
 var $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy1 = sp + 11|0;
 $$byval_copy = sp + 8|0;
 $0 = $state;
 $1 = $save;
 $2 = $1;
 $3 = ($2|0)!=(0);
 $4 = $0;
 if ($3) {
  $5 = ((($4)) + 300|0);
  $6 = ((($5)) + 8|0);
  $7 = $0;
  $8 = ((($7)) + 220|0);
  ;HEAP32[$6>>2]=HEAP32[$8>>2]|0;HEAP32[$6+4>>2]=HEAP32[$8+4>>2]|0;
  STACKTOP = sp;return;
 } else {
  $9 = ((($4)) + 220|0);
  $10 = $0;
  $11 = ((($10)) + 300|0);
  $12 = ((($11)) + 8|0);
  ;HEAP32[$9>>2]=HEAP32[$12>>2]|0;HEAP32[$9+4>>2]=HEAP32[$12+4>>2]|0;
  $13 = $0;
  $14 = $0;
  $15 = ((($14)) + 220|0);
  $16 = ((($15)) + 6|0);
  $17 = HEAP16[$16>>1]|0;
  $18 = $17 & 1;
  $19 = $18&65535;
  _setpenattr_bool($13,1,$19);
  $20 = $0;
  $21 = $0;
  $22 = ((($21)) + 220|0);
  $23 = ((($22)) + 6|0);
  $24 = HEAP16[$23>>1]|0;
  $25 = ($24&65535) >>> 1;
  $26 = $25 & 3;
  $27 = $26&65535;
  _setpenattr_int($20,2,$27);
  $28 = $0;
  $29 = $0;
  $30 = ((($29)) + 220|0);
  $31 = ((($30)) + 6|0);
  $32 = HEAP16[$31>>1]|0;
  $33 = ($32&65535) >>> 3;
  $34 = $33 & 1;
  $35 = $34&65535;
  _setpenattr_bool($28,3,$35);
  $36 = $0;
  $37 = $0;
  $38 = ((($37)) + 220|0);
  $39 = ((($38)) + 6|0);
  $40 = HEAP16[$39>>1]|0;
  $41 = ($40&65535) >>> 4;
  $42 = $41 & 1;
  $43 = $42&65535;
  _setpenattr_bool($36,4,$43);
  $44 = $0;
  $45 = $0;
  $46 = ((($45)) + 220|0);
  $47 = ((($46)) + 6|0);
  $48 = HEAP16[$47>>1]|0;
  $49 = ($48&65535) >>> 5;
  $50 = $49 & 1;
  $51 = $50&65535;
  _setpenattr_bool($44,5,$51);
  $52 = $0;
  $53 = $0;
  $54 = ((($53)) + 220|0);
  $55 = ((($54)) + 6|0);
  $56 = HEAP16[$55>>1]|0;
  $57 = ($56&65535) >>> 6;
  $58 = $57 & 1;
  $59 = $58&65535;
  _setpenattr_bool($52,6,$59);
  $60 = $0;
  $61 = $0;
  $62 = ((($61)) + 220|0);
  $63 = ((($62)) + 6|0);
  $64 = HEAP16[$63>>1]|0;
  $65 = ($64&65535) >>> 7;
  $66 = $65 & 15;
  $67 = $66&65535;
  _setpenattr_int($60,7,$67);
  $68 = $0;
  $69 = $0;
  $70 = ((($69)) + 220|0);
  ;HEAP8[$$byval_copy>>0]=HEAP8[$70>>0]|0;HEAP8[$$byval_copy+1>>0]=HEAP8[$70+1>>0]|0;HEAP8[$$byval_copy+2>>0]=HEAP8[$70+2>>0]|0;
  _setpenattr_col($68,8,$$byval_copy);
  $71 = $0;
  $72 = $0;
  $73 = ((($72)) + 220|0);
  $74 = ((($73)) + 3|0);
  ;HEAP8[$$byval_copy1>>0]=HEAP8[$74>>0]|0;HEAP8[$$byval_copy1+1>>0]=HEAP8[$74+1>>0]|0;HEAP8[$$byval_copy1+2>>0]=HEAP8[$74+2>>0]|0;
  _setpenattr_col($71,9,$$byval_copy1);
  STACKTOP = sp;return;
 }
}
function _vterm_state_get_default_colors($state,$default_fg,$default_bg) {
 $state = $state|0;
 $default_fg = $default_fg|0;
 $default_bg = $default_bg|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $default_fg;
 $2 = $default_bg;
 $3 = $1;
 $4 = $0;
 $5 = ((($4)) + 228|0);
 ;HEAP8[$3>>0]=HEAP8[$5>>0]|0;HEAP8[$3+1>>0]=HEAP8[$5+1>>0]|0;HEAP8[$3+2>>0]=HEAP8[$5+2>>0]|0;
 $6 = $2;
 $7 = $0;
 $8 = ((($7)) + 231|0);
 ;HEAP8[$6>>0]=HEAP8[$8>>0]|0;HEAP8[$6+1>>0]=HEAP8[$8+1>>0]|0;HEAP8[$6+2>>0]=HEAP8[$8+2>>0]|0;
 STACKTOP = sp;return;
}
function _vterm_state_get_palette_color($state,$index,$col) {
 $state = $state|0;
 $index = $index|0;
 $col = $col|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $index;
 $2 = $col;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 (_lookup_colour_palette($3,$4,$5)|0);
 STACKTOP = sp;return;
}
function _vterm_state_set_default_colors($state,$default_fg,$default_bg) {
 $state = $state|0;
 $default_fg = $default_fg|0;
 $default_bg = $default_bg|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $default_fg;
 $2 = $default_bg;
 $3 = $0;
 $4 = ((($3)) + 228|0);
 $5 = $1;
 ;HEAP8[$4>>0]=HEAP8[$5>>0]|0;HEAP8[$4+1>>0]=HEAP8[$5+1>>0]|0;HEAP8[$4+2>>0]=HEAP8[$5+2>>0]|0;
 $6 = $0;
 $7 = ((($6)) + 231|0);
 $8 = $2;
 ;HEAP8[$7>>0]=HEAP8[$8>>0]|0;HEAP8[$7+1>>0]=HEAP8[$8+1>>0]|0;HEAP8[$7+2>>0]=HEAP8[$8+2>>0]|0;
 STACKTOP = sp;return;
}
function _vterm_state_set_palette_color($state,$index,$col) {
 $state = $state|0;
 $index = $index|0;
 $col = $col|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $index;
 $2 = $col;
 $3 = $1;
 $4 = ($3|0)>=(0);
 $5 = $1;
 $6 = ($5|0)<(16);
 $or$cond = $4 & $6;
 if (!($or$cond)) {
  STACKTOP = sp;return;
 }
 $7 = $1;
 $8 = $0;
 $9 = ((($8)) + 234|0);
 $10 = (($9) + (($7*3)|0)|0);
 $11 = $2;
 ;HEAP8[$10>>0]=HEAP8[$11>>0]|0;HEAP8[$10+1>>0]=HEAP8[$11+1>>0]|0;HEAP8[$10+2>>0]=HEAP8[$11+2>>0]|0;
 STACKTOP = sp;return;
}
function _vterm_state_set_bold_highbright($state,$bold_is_highbright) {
 $state = $state|0;
 $bold_is_highbright = $bold_is_highbright|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $bold_is_highbright;
 $2 = $1;
 $3 = $0;
 $4 = ((($3)) + 292|0);
 HEAP32[$4>>2] = $2;
 STACKTOP = sp;return;
}
function _vterm_state_setpen($state,$args,$argcount) {
 $state = $state|0;
 $args = $args|0;
 $argcount = $argcount|0;
 var $$byval_copy = 0, $$byval_copy1 = 0, $$byval_copy2 = 0, $$byval_copy3 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0;
 var $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0;
 var $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0;
 var $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0;
 var $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0;
 var $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0;
 var $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0;
 var $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0;
 var $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0;
 var $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0;
 var $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0;
 var $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0;
 var $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0;
 var $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0;
 var $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0;
 var $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $arg = 0, $argi = 0, $done = 0, $switch$split102D = 0, $switch$split12D = 0, $switch$split132D = 0, $switch$split2D = 0, $switch$split42D = 0, $switch$split72D = 0, $value = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy3 = sp + 41|0;
 $$byval_copy2 = sp + 38|0;
 $$byval_copy1 = sp + 35|0;
 $$byval_copy = sp + 32|0;
 $vararg_buffer = sp;
 $0 = $state;
 $1 = $args;
 $2 = $argcount;
 $argi = 0;
 L1: while(1) {
  $3 = $argi;
  $4 = $2;
  $5 = ($3|0)<($4|0);
  if (!($5)) {
   label = 39;
   break;
  }
  $done = 1;
  $6 = $argi;
  $7 = $1;
  $8 = (($7) + ($6<<2)|0);
  $9 = HEAP32[$8>>2]|0;
  $10 = $9 & 2147483647;
  $arg = $10;
  $switch$split2D = ($10|0)<(36);
  L4: do {
   if ($switch$split2D) {
    do {
     switch ($10|0) {
     case 0:  {
      label = 4;
      break L4;
      break;
     }
     case 35: case 34: case 33: case 32: case 31: case 30:  {
      label = 22;
      break L4;
      break;
     }
     case 1:  {
      $12 = $0;
      $13 = ((($12)) + 220|0);
      $14 = ((($13)) + 6|0);
      $15 = HEAP16[$14>>1]|0;
      $16 = $15 & -2;
      $17 = $16 | 1;
      HEAP16[$14>>1] = $17;
      $18 = $0;
      _setpenattr_bool($18,1,1);
      $19 = $0;
      $20 = ((($19)) + 284|0);
      $21 = HEAP32[$20>>2]|0;
      $22 = ($21|0)>(-1);
      if (!($22)) {
       break L4;
      }
      $23 = $0;
      $24 = ((($23)) + 284|0);
      $25 = HEAP32[$24>>2]|0;
      $26 = ($25|0)<(8);
      if (!($26)) {
       break L4;
      }
      $27 = $0;
      $28 = ((($27)) + 292|0);
      $29 = HEAP32[$28>>2]|0;
      $30 = ($29|0)!=(0);
      if (!($30)) {
       break L4;
      }
      $31 = $0;
      $32 = $0;
      $33 = ((($32)) + 284|0);
      $34 = HEAP32[$33>>2]|0;
      $35 = $0;
      $36 = ((($35)) + 220|0);
      $37 = ((($36)) + 6|0);
      $38 = HEAP16[$37>>1]|0;
      $39 = $38 & 1;
      $40 = $39&65535;
      $41 = ($40|0)!=(0);
      $42 = $41 ? 8 : 0;
      $43 = (($34) + ($42))|0;
      _set_pen_col_ansi($31,8,$43);
      break L4;
      break;
     }
     case 3:  {
      $44 = $0;
      $45 = ((($44)) + 220|0);
      $46 = ((($45)) + 6|0);
      $47 = HEAP16[$46>>1]|0;
      $48 = $47 & -9;
      $49 = $48 | 8;
      HEAP16[$46>>1] = $49;
      $50 = $0;
      _setpenattr_bool($50,3,1);
      break L4;
      break;
     }
     case 4:  {
      $51 = $0;
      $52 = ((($51)) + 220|0);
      $53 = ((($52)) + 6|0);
      $54 = HEAP16[$53>>1]|0;
      $55 = $54 & -7;
      $56 = $55 | 2;
      HEAP16[$53>>1] = $56;
      $57 = $0;
      _setpenattr_int($57,2,1);
      break L4;
      break;
     }
     case 5:  {
      $58 = $0;
      $59 = ((($58)) + 220|0);
      $60 = ((($59)) + 6|0);
      $61 = HEAP16[$60>>1]|0;
      $62 = $61 & -17;
      $63 = $62 | 16;
      HEAP16[$60>>1] = $63;
      $64 = $0;
      _setpenattr_bool($64,4,1);
      break L4;
      break;
     }
     case 7:  {
      $65 = $0;
      $66 = ((($65)) + 220|0);
      $67 = ((($66)) + 6|0);
      $68 = HEAP16[$67>>1]|0;
      $69 = $68 & -33;
      $70 = $69 | 32;
      HEAP16[$67>>1] = $70;
      $71 = $0;
      _setpenattr_bool($71,5,1);
      break L4;
      break;
     }
     case 9:  {
      $72 = $0;
      $73 = ((($72)) + 220|0);
      $74 = ((($73)) + 6|0);
      $75 = HEAP16[$74>>1]|0;
      $76 = $75 & -65;
      $77 = $76 | 64;
      HEAP16[$74>>1] = $77;
      $78 = $0;
      _setpenattr_bool($78,6,1);
      break L4;
      break;
     }
     case 19: case 18: case 17: case 16: case 15: case 14: case 13: case 12: case 11: case 10:  {
      $79 = $argi;
      $80 = $1;
      $81 = (($80) + ($79<<2)|0);
      $82 = HEAP32[$81>>2]|0;
      $83 = $82 & 2147483647;
      $84 = (($83) - 10)|0;
      $85 = $0;
      $86 = ((($85)) + 220|0);
      $87 = ((($86)) + 6|0);
      $88 = $84&65535;
      $89 = HEAP16[$87>>1]|0;
      $90 = $88 & 15;
      $91 = ($90 << 7)&65535;
      $92 = $89 & -1921;
      $93 = $92 | $91;
      HEAP16[$87>>1] = $93;
      $94 = $0;
      $95 = $0;
      $96 = ((($95)) + 220|0);
      $97 = ((($96)) + 6|0);
      $98 = HEAP16[$97>>1]|0;
      $99 = ($98&65535) >>> 7;
      $100 = $99 & 15;
      $101 = $100&65535;
      _setpenattr_int($94,7,$101);
      break L4;
      break;
     }
     case 21:  {
      $102 = $0;
      $103 = ((($102)) + 220|0);
      $104 = ((($103)) + 6|0);
      $105 = HEAP16[$104>>1]|0;
      $106 = $105 & -7;
      $107 = $106 | 4;
      HEAP16[$104>>1] = $107;
      $108 = $0;
      _setpenattr_int($108,2,2);
      break L4;
      break;
     }
     case 22:  {
      $109 = $0;
      $110 = ((($109)) + 220|0);
      $111 = ((($110)) + 6|0);
      $112 = HEAP16[$111>>1]|0;
      $113 = $112 & -2;
      HEAP16[$111>>1] = $113;
      $114 = $0;
      _setpenattr_bool($114,1,0);
      break L4;
      break;
     }
     case 23:  {
      $115 = $0;
      $116 = ((($115)) + 220|0);
      $117 = ((($116)) + 6|0);
      $118 = HEAP16[$117>>1]|0;
      $119 = $118 & -9;
      HEAP16[$117>>1] = $119;
      $120 = $0;
      _setpenattr_bool($120,3,0);
      break L4;
      break;
     }
     case 24:  {
      $121 = $0;
      $122 = ((($121)) + 220|0);
      $123 = ((($122)) + 6|0);
      $124 = HEAP16[$123>>1]|0;
      $125 = $124 & -7;
      HEAP16[$123>>1] = $125;
      $126 = $0;
      _setpenattr_int($126,2,0);
      break L4;
      break;
     }
     case 25:  {
      $127 = $0;
      $128 = ((($127)) + 220|0);
      $129 = ((($128)) + 6|0);
      $130 = HEAP16[$129>>1]|0;
      $131 = $130 & -17;
      HEAP16[$129>>1] = $131;
      $132 = $0;
      _setpenattr_bool($132,4,0);
      break L4;
      break;
     }
     case 27:  {
      $133 = $0;
      $134 = ((($133)) + 220|0);
      $135 = ((($134)) + 6|0);
      $136 = HEAP16[$135>>1]|0;
      $137 = $136 & -33;
      HEAP16[$135>>1] = $137;
      $138 = $0;
      _setpenattr_bool($138,5,0);
      break L4;
      break;
     }
     case 29:  {
      $139 = $0;
      $140 = ((($139)) + 220|0);
      $141 = ((($140)) + 6|0);
      $142 = HEAP16[$141>>1]|0;
      $143 = $142 & -65;
      HEAP16[$141>>1] = $143;
      $144 = $0;
      _setpenattr_bool($144,6,0);
      break L4;
      break;
     }
     default: {
      label = 35;
      break L4;
     }
     }
    } while(0);
   } else {
    $switch$split12D = ($10|0)<(91);
    L25: do {
     if ($switch$split12D) {
      switch ($10|0) {
      case 37: case 36:  {
       label = 22;
       break L4;
       break;
      }
      case 90:  {
       break L25;
       break;
      }
      case 38:  {
       $169 = $0;
       $170 = ((($169)) + 284|0);
       HEAP32[$170>>2] = -1;
       $171 = $2;
       $172 = $argi;
       $173 = (($171) - ($172))|0;
       $174 = ($173|0)<(1);
       if ($174) {
        label = 39;
        break L1;
       }
       $175 = $0;
       $176 = $argi;
       $177 = (($176) + 1)|0;
       $178 = $1;
       $179 = (($178) + ($177<<2)|0);
       $180 = HEAP32[$179>>2]|0;
       $181 = $180 & 2147483647;
       $182 = $1;
       $183 = $argi;
       $184 = (($182) + ($183<<2)|0);
       $185 = ((($184)) + 8|0);
       $186 = $2;
       $187 = $argi;
       $188 = (($186) - ($187))|0;
       $189 = (($188) - 2)|0;
       $190 = $0;
       $191 = ((($190)) + 220|0);
       $192 = $0;
       $193 = ((($192)) + 284|0);
       $194 = (_lookup_colour($175,$181,$185,$189,$191,$193)|0);
       $195 = (1 + ($194))|0;
       $196 = $argi;
       $197 = (($196) + ($195))|0;
       $argi = $197;
       $198 = $0;
       $199 = $0;
       $200 = ((($199)) + 220|0);
       ;HEAP8[$$byval_copy>>0]=HEAP8[$200>>0]|0;HEAP8[$$byval_copy+1>>0]=HEAP8[$200+1>>0]|0;HEAP8[$$byval_copy+2>>0]=HEAP8[$200+2>>0]|0;
       _setpenattr_col($198,8,$$byval_copy);
       break L4;
       break;
      }
      case 39:  {
       $201 = $0;
       $202 = ((($201)) + 284|0);
       HEAP32[$202>>2] = -1;
       $203 = $0;
       $204 = ((($203)) + 220|0);
       $205 = $0;
       $206 = ((($205)) + 228|0);
       ;HEAP8[$204>>0]=HEAP8[$206>>0]|0;HEAP8[$204+1>>0]=HEAP8[$206+1>>0]|0;HEAP8[$204+2>>0]=HEAP8[$206+2>>0]|0;
       $207 = $0;
       $208 = $0;
       $209 = ((($208)) + 220|0);
       ;HEAP8[$$byval_copy1>>0]=HEAP8[$209>>0]|0;HEAP8[$$byval_copy1+1>>0]=HEAP8[$209+1>>0]|0;HEAP8[$$byval_copy1+2>>0]=HEAP8[$209+2>>0]|0;
       _setpenattr_col($207,8,$$byval_copy1);
       break L4;
       break;
      }
      case 47: case 46: case 45: case 44: case 43: case 42: case 41: case 40:  {
       $210 = $argi;
       $211 = $1;
       $212 = (($211) + ($210<<2)|0);
       $213 = HEAP32[$212>>2]|0;
       $214 = $213 & 2147483647;
       $215 = (($214) - 40)|0;
       $value = $215;
       $216 = $value;
       $217 = $0;
       $218 = ((($217)) + 288|0);
       HEAP32[$218>>2] = $216;
       $219 = $0;
       $220 = $value;
       _set_pen_col_ansi($219,9,$220);
       break L4;
       break;
      }
      case 48:  {
       $221 = $0;
       $222 = ((($221)) + 288|0);
       HEAP32[$222>>2] = -1;
       $223 = $2;
       $224 = $argi;
       $225 = (($223) - ($224))|0;
       $226 = ($225|0)<(1);
       if ($226) {
        label = 39;
        break L1;
       }
       $227 = $0;
       $228 = $argi;
       $229 = (($228) + 1)|0;
       $230 = $1;
       $231 = (($230) + ($229<<2)|0);
       $232 = HEAP32[$231>>2]|0;
       $233 = $232 & 2147483647;
       $234 = $1;
       $235 = $argi;
       $236 = (($234) + ($235<<2)|0);
       $237 = ((($236)) + 8|0);
       $238 = $2;
       $239 = $argi;
       $240 = (($238) - ($239))|0;
       $241 = (($240) - 2)|0;
       $242 = $0;
       $243 = ((($242)) + 220|0);
       $244 = ((($243)) + 3|0);
       $245 = $0;
       $246 = ((($245)) + 288|0);
       $247 = (_lookup_colour($227,$233,$237,$241,$244,$246)|0);
       $248 = (1 + ($247))|0;
       $249 = $argi;
       $250 = (($249) + ($248))|0;
       $argi = $250;
       $251 = $0;
       $252 = $0;
       $253 = ((($252)) + 220|0);
       $254 = ((($253)) + 3|0);
       ;HEAP8[$$byval_copy2>>0]=HEAP8[$254>>0]|0;HEAP8[$$byval_copy2+1>>0]=HEAP8[$254+1>>0]|0;HEAP8[$$byval_copy2+2>>0]=HEAP8[$254+2>>0]|0;
       _setpenattr_col($251,9,$$byval_copy2);
       break L4;
       break;
      }
      case 49:  {
       $255 = $0;
       $256 = ((($255)) + 288|0);
       HEAP32[$256>>2] = -1;
       $257 = $0;
       $258 = ((($257)) + 220|0);
       $259 = ((($258)) + 3|0);
       $260 = $0;
       $261 = ((($260)) + 231|0);
       ;HEAP8[$259>>0]=HEAP8[$261>>0]|0;HEAP8[$259+1>>0]=HEAP8[$261+1>>0]|0;HEAP8[$259+2>>0]=HEAP8[$261+2>>0]|0;
       $262 = $0;
       $263 = $0;
       $264 = ((($263)) + 220|0);
       $265 = ((($264)) + 3|0);
       ;HEAP8[$$byval_copy3>>0]=HEAP8[$265>>0]|0;HEAP8[$$byval_copy3+1>>0]=HEAP8[$265+1>>0]|0;HEAP8[$$byval_copy3+2>>0]=HEAP8[$265+2>>0]|0;
       _setpenattr_col($262,9,$$byval_copy3);
       break L4;
       break;
      }
      default: {
       label = 35;
       break L4;
      }
      }
     } else {
      $switch$split42D = ($10|0)<(101);
      L36: do {
       if ($switch$split42D) {
        switch ($10|0) {
        case 97: case 96: case 95: case 94: case 93: case 92: case 91:  {
         break L25;
         break;
        }
        case 100:  {
         break;
        }
        default: {
         label = 35;
         break L4;
        }
        }
       } else {
        $switch$split72D = ($10|0)<(105);
        if ($switch$split72D) {
         switch ($10|0) {
         case 104: case 103: case 102: case 101:  {
          break L36;
          break;
         }
         default: {
          label = 35;
          break L4;
         }
         }
        }
        $switch$split102D = ($10|0)<(107);
        if ($switch$split102D) {
         switch ($10|0) {
         case 106: case 105:  {
          break L36;
          break;
         }
         default: {
          label = 35;
          break L4;
         }
         }
        }
        $switch$split132D = ($10|0)<(2147483647);
        if ($switch$split132D) {
         switch ($10|0) {
         case 107:  {
          break L36;
          break;
         }
         default: {
          label = 35;
          break L4;
         }
         }
        } else {
         switch ($10|0) {
         case 2147483647:  {
          label = 4;
          break L4;
          break;
         }
         default: {
          label = 35;
          break L4;
         }
         }
        }
       }
      } while(0);
      $278 = $argi;
      $279 = $1;
      $280 = (($279) + ($278<<2)|0);
      $281 = HEAP32[$280>>2]|0;
      $282 = $281 & 2147483647;
      $283 = (($282) - 100)|0;
      $284 = (($283) + 8)|0;
      $value = $284;
      $285 = $value;
      $286 = $0;
      $287 = ((($286)) + 288|0);
      HEAP32[$287>>2] = $285;
      $288 = $0;
      $289 = $value;
      _set_pen_col_ansi($288,9,$289);
      break L4;
     }
    } while(0);
    $266 = $argi;
    $267 = $1;
    $268 = (($267) + ($266<<2)|0);
    $269 = HEAP32[$268>>2]|0;
    $270 = $269 & 2147483647;
    $271 = (($270) - 90)|0;
    $272 = (($271) + 8)|0;
    $value = $272;
    $273 = $value;
    $274 = $0;
    $275 = ((($274)) + 284|0);
    HEAP32[$275>>2] = $273;
    $276 = $0;
    $277 = $value;
    _set_pen_col_ansi($276,8,$277);
   }
  } while(0);
  if ((label|0) == 4) {
   label = 0;
   $11 = $0;
   _vterm_state_resetpen($11);
  }
  else if ((label|0) == 22) {
   label = 0;
   $145 = $argi;
   $146 = $1;
   $147 = (($146) + ($145<<2)|0);
   $148 = HEAP32[$147>>2]|0;
   $149 = $148 & 2147483647;
   $150 = (($149) - 30)|0;
   $value = $150;
   $151 = $value;
   $152 = $0;
   $153 = ((($152)) + 284|0);
   HEAP32[$153>>2] = $151;
   $154 = $0;
   $155 = ((($154)) + 220|0);
   $156 = ((($155)) + 6|0);
   $157 = HEAP16[$156>>1]|0;
   $158 = $157 & 1;
   $159 = $158&65535;
   $160 = ($159|0)!=(0);
   if ($160) {
    $161 = $0;
    $162 = ((($161)) + 292|0);
    $163 = HEAP32[$162>>2]|0;
    $164 = ($163|0)!=(0);
    if ($164) {
     $165 = $value;
     $166 = (($165) + 8)|0;
     $value = $166;
    }
   }
   $167 = $0;
   $168 = $value;
   _set_pen_col_ansi($167,8,$168);
  }
  else if ((label|0) == 35) {
   label = 0;
   $done = 0;
  }
  $290 = $done;
  $291 = ($290|0)!=(0);
  if (!($291)) {
   $292 = HEAP32[3064>>2]|0;
   $293 = $arg;
   HEAP32[$vararg_buffer>>2] = $293;
   (_fprintf($292,4378,$vararg_buffer)|0);
  }
  while(1) {
   $294 = $argi;
   $295 = (($294) + 1)|0;
   $argi = $295;
   $296 = $1;
   $297 = (($296) + ($294<<2)|0);
   $298 = HEAP32[$297>>2]|0;
   $299 = $298 & -2147483648;
   $300 = ($299|0)!=(0);
   if (!($300)) {
    continue L1;
   }
  }
 }
 if ((label|0) == 39) {
  STACKTOP = sp;return;
 }
}
function _vterm_state_getpen($state,$args,$argcount) {
 $state = $state|0;
 $args = $args|0;
 $argcount = $argcount|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0;
 var $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0;
 var $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $argi = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $args;
 $2 = $argcount;
 $argi = 0;
 $3 = $0;
 $4 = ((($3)) + 220|0);
 $5 = ((($4)) + 6|0);
 $6 = HEAP16[$5>>1]|0;
 $7 = $6 & 1;
 $8 = $7&65535;
 $9 = ($8|0)!=(0);
 if ($9) {
  $10 = $argi;
  $11 = (($10) + 1)|0;
  $argi = $11;
  $12 = $1;
  $13 = (($12) + ($10<<2)|0);
  HEAP32[$13>>2] = 1;
 }
 $14 = $0;
 $15 = ((($14)) + 220|0);
 $16 = ((($15)) + 6|0);
 $17 = HEAP16[$16>>1]|0;
 $18 = ($17&65535) >>> 3;
 $19 = $18 & 1;
 $20 = $19&65535;
 $21 = ($20|0)!=(0);
 if ($21) {
  $22 = $argi;
  $23 = (($22) + 1)|0;
  $argi = $23;
  $24 = $1;
  $25 = (($24) + ($22<<2)|0);
  HEAP32[$25>>2] = 3;
 }
 $26 = $0;
 $27 = ((($26)) + 220|0);
 $28 = ((($27)) + 6|0);
 $29 = HEAP16[$28>>1]|0;
 $30 = ($29&65535) >>> 1;
 $31 = $30 & 3;
 $32 = $31&65535;
 $33 = ($32|0)==(1);
 if ($33) {
  $34 = $argi;
  $35 = (($34) + 1)|0;
  $argi = $35;
  $36 = $1;
  $37 = (($36) + ($34<<2)|0);
  HEAP32[$37>>2] = 4;
 }
 $38 = $0;
 $39 = ((($38)) + 220|0);
 $40 = ((($39)) + 6|0);
 $41 = HEAP16[$40>>1]|0;
 $42 = ($41&65535) >>> 4;
 $43 = $42 & 1;
 $44 = $43&65535;
 $45 = ($44|0)!=(0);
 if ($45) {
  $46 = $argi;
  $47 = (($46) + 1)|0;
  $argi = $47;
  $48 = $1;
  $49 = (($48) + ($46<<2)|0);
  HEAP32[$49>>2] = 5;
 }
 $50 = $0;
 $51 = ((($50)) + 220|0);
 $52 = ((($51)) + 6|0);
 $53 = HEAP16[$52>>1]|0;
 $54 = ($53&65535) >>> 5;
 $55 = $54 & 1;
 $56 = $55&65535;
 $57 = ($56|0)!=(0);
 if ($57) {
  $58 = $argi;
  $59 = (($58) + 1)|0;
  $argi = $59;
  $60 = $1;
  $61 = (($60) + ($58<<2)|0);
  HEAP32[$61>>2] = 7;
 }
 $62 = $0;
 $63 = ((($62)) + 220|0);
 $64 = ((($63)) + 6|0);
 $65 = HEAP16[$64>>1]|0;
 $66 = ($65&65535) >>> 6;
 $67 = $66 & 1;
 $68 = $67&65535;
 $69 = ($68|0)!=(0);
 if ($69) {
  $70 = $argi;
  $71 = (($70) + 1)|0;
  $argi = $71;
  $72 = $1;
  $73 = (($72) + ($70<<2)|0);
  HEAP32[$73>>2] = 9;
 }
 $74 = $0;
 $75 = ((($74)) + 220|0);
 $76 = ((($75)) + 6|0);
 $77 = HEAP16[$76>>1]|0;
 $78 = ($77&65535) >>> 7;
 $79 = $78 & 15;
 $80 = $79&65535;
 $81 = ($80|0)!=(0);
 if ($81) {
  $82 = $0;
  $83 = ((($82)) + 220|0);
  $84 = ((($83)) + 6|0);
  $85 = HEAP16[$84>>1]|0;
  $86 = ($85&65535) >>> 7;
  $87 = $86 & 15;
  $88 = $87&65535;
  $89 = (10 + ($88))|0;
  $90 = $argi;
  $91 = (($90) + 1)|0;
  $argi = $91;
  $92 = $1;
  $93 = (($92) + ($90<<2)|0);
  HEAP32[$93>>2] = $89;
 }
 $94 = $0;
 $95 = ((($94)) + 220|0);
 $96 = ((($95)) + 6|0);
 $97 = HEAP16[$96>>1]|0;
 $98 = ($97&65535) >>> 1;
 $99 = $98 & 3;
 $100 = $99&65535;
 $101 = ($100|0)==(2);
 if ($101) {
  $102 = $argi;
  $103 = (($102) + 1)|0;
  $argi = $103;
  $104 = $1;
  $105 = (($104) + ($102<<2)|0);
  HEAP32[$105>>2] = 21;
 }
 $106 = $0;
 $107 = ((($106)) + 284|0);
 $108 = HEAP32[$107>>2]|0;
 $109 = ($108|0)>=(0);
 if ($109) {
  $110 = $0;
  $111 = ((($110)) + 284|0);
  $112 = HEAP32[$111>>2]|0;
  $113 = ($112|0)<(8);
  if ($113) {
   $114 = $0;
   $115 = ((($114)) + 284|0);
   $116 = HEAP32[$115>>2]|0;
   $117 = (30 + ($116))|0;
   $118 = $argi;
   $119 = (($118) + 1)|0;
   $argi = $119;
   $120 = $1;
   $121 = (($120) + ($118<<2)|0);
   HEAP32[$121>>2] = $117;
  } else {
   label = 20;
  }
 } else {
  label = 20;
 }
 do {
  if ((label|0) == 20) {
   $122 = $0;
   $123 = ((($122)) + 284|0);
   $124 = HEAP32[$123>>2]|0;
   $125 = ($124|0)>=(8);
   if ($125) {
    $126 = $0;
    $127 = ((($126)) + 284|0);
    $128 = HEAP32[$127>>2]|0;
    $129 = ($128|0)<(16);
    if ($129) {
     $130 = $0;
     $131 = ((($130)) + 284|0);
     $132 = HEAP32[$131>>2]|0;
     $133 = (90 + ($132))|0;
     $134 = (($133) - 8)|0;
     $135 = $argi;
     $136 = (($135) + 1)|0;
     $argi = $136;
     $137 = $1;
     $138 = (($137) + ($135<<2)|0);
     HEAP32[$138>>2] = $134;
     break;
    }
   }
   $139 = $0;
   $140 = ((($139)) + 284|0);
   $141 = HEAP32[$140>>2]|0;
   $142 = ($141|0)>=(16);
   if ($142) {
    $143 = $0;
    $144 = ((($143)) + 284|0);
    $145 = HEAP32[$144>>2]|0;
    $146 = ($145|0)<(256);
    if ($146) {
     $147 = $argi;
     $148 = (($147) + 1)|0;
     $argi = $148;
     $149 = $1;
     $150 = (($149) + ($147<<2)|0);
     HEAP32[$150>>2] = -2147483610;
     $151 = $argi;
     $152 = (($151) + 1)|0;
     $argi = $152;
     $153 = $1;
     $154 = (($153) + ($151<<2)|0);
     HEAP32[$154>>2] = -2147483643;
     $155 = $0;
     $156 = ((($155)) + 284|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = $argi;
     $159 = (($158) + 1)|0;
     $argi = $159;
     $160 = $1;
     $161 = (($160) + ($158<<2)|0);
     HEAP32[$161>>2] = $157;
    }
   }
  }
 } while(0);
 $162 = $0;
 $163 = ((($162)) + 288|0);
 $164 = HEAP32[$163>>2]|0;
 $165 = ($164|0)>=(0);
 if ($165) {
  $166 = $0;
  $167 = ((($166)) + 288|0);
  $168 = HEAP32[$167>>2]|0;
  $169 = ($168|0)<(8);
  if ($169) {
   $170 = $0;
   $171 = ((($170)) + 288|0);
   $172 = HEAP32[$171>>2]|0;
   $173 = (40 + ($172))|0;
   $174 = $argi;
   $175 = (($174) + 1)|0;
   $argi = $175;
   $176 = $1;
   $177 = (($176) + ($174<<2)|0);
   HEAP32[$177>>2] = $173;
   $218 = $argi;
   STACKTOP = sp;return ($218|0);
  }
 }
 $178 = $0;
 $179 = ((($178)) + 288|0);
 $180 = HEAP32[$179>>2]|0;
 $181 = ($180|0)>=(8);
 if ($181) {
  $182 = $0;
  $183 = ((($182)) + 288|0);
  $184 = HEAP32[$183>>2]|0;
  $185 = ($184|0)<(16);
  if ($185) {
   $186 = $0;
   $187 = ((($186)) + 288|0);
   $188 = HEAP32[$187>>2]|0;
   $189 = (100 + ($188))|0;
   $190 = (($189) - 8)|0;
   $191 = $argi;
   $192 = (($191) + 1)|0;
   $argi = $192;
   $193 = $1;
   $194 = (($193) + ($191<<2)|0);
   HEAP32[$194>>2] = $190;
   $218 = $argi;
   STACKTOP = sp;return ($218|0);
  }
 }
 $195 = $0;
 $196 = ((($195)) + 288|0);
 $197 = HEAP32[$196>>2]|0;
 $198 = ($197|0)>=(16);
 if (!($198)) {
  $218 = $argi;
  STACKTOP = sp;return ($218|0);
 }
 $199 = $0;
 $200 = ((($199)) + 288|0);
 $201 = HEAP32[$200>>2]|0;
 $202 = ($201|0)<(256);
 if (!($202)) {
  $218 = $argi;
  STACKTOP = sp;return ($218|0);
 }
 $203 = $argi;
 $204 = (($203) + 1)|0;
 $argi = $204;
 $205 = $1;
 $206 = (($205) + ($203<<2)|0);
 HEAP32[$206>>2] = -2147483600;
 $207 = $argi;
 $208 = (($207) + 1)|0;
 $argi = $208;
 $209 = $1;
 $210 = (($209) + ($207<<2)|0);
 HEAP32[$210>>2] = -2147483643;
 $211 = $0;
 $212 = ((($211)) + 288|0);
 $213 = HEAP32[$212>>2]|0;
 $214 = $argi;
 $215 = (($214) + 1)|0;
 $argi = $215;
 $216 = $1;
 $217 = (($216) + ($214<<2)|0);
 HEAP32[$217>>2] = $213;
 $218 = $argi;
 STACKTOP = sp;return ($218|0);
}
function _vterm_state_get_penattr($state,$attr,$val) {
 $state = $state|0;
 $attr = $attr|0;
 $val = $val|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $state;
 $2 = $attr;
 $3 = $val;
 $4 = $2;
 do {
  switch ($4|0) {
  case 1:  {
   $5 = $1;
   $6 = ((($5)) + 220|0);
   $7 = ((($6)) + 6|0);
   $8 = HEAP16[$7>>1]|0;
   $9 = $8 & 1;
   $10 = $9&65535;
   $11 = $3;
   HEAP32[$11>>2] = $10;
   $0 = 1;
   break;
  }
  case 2:  {
   $12 = $1;
   $13 = ((($12)) + 220|0);
   $14 = ((($13)) + 6|0);
   $15 = HEAP16[$14>>1]|0;
   $16 = ($15&65535) >>> 1;
   $17 = $16 & 3;
   $18 = $17&65535;
   $19 = $3;
   HEAP32[$19>>2] = $18;
   $0 = 1;
   break;
  }
  case 3:  {
   $20 = $1;
   $21 = ((($20)) + 220|0);
   $22 = ((($21)) + 6|0);
   $23 = HEAP16[$22>>1]|0;
   $24 = ($23&65535) >>> 3;
   $25 = $24 & 1;
   $26 = $25&65535;
   $27 = $3;
   HEAP32[$27>>2] = $26;
   $0 = 1;
   break;
  }
  case 4:  {
   $28 = $1;
   $29 = ((($28)) + 220|0);
   $30 = ((($29)) + 6|0);
   $31 = HEAP16[$30>>1]|0;
   $32 = ($31&65535) >>> 4;
   $33 = $32 & 1;
   $34 = $33&65535;
   $35 = $3;
   HEAP32[$35>>2] = $34;
   $0 = 1;
   break;
  }
  case 5:  {
   $36 = $1;
   $37 = ((($36)) + 220|0);
   $38 = ((($37)) + 6|0);
   $39 = HEAP16[$38>>1]|0;
   $40 = ($39&65535) >>> 5;
   $41 = $40 & 1;
   $42 = $41&65535;
   $43 = $3;
   HEAP32[$43>>2] = $42;
   $0 = 1;
   break;
  }
  case 6:  {
   $44 = $1;
   $45 = ((($44)) + 220|0);
   $46 = ((($45)) + 6|0);
   $47 = HEAP16[$46>>1]|0;
   $48 = ($47&65535) >>> 6;
   $49 = $48 & 1;
   $50 = $49&65535;
   $51 = $3;
   HEAP32[$51>>2] = $50;
   $0 = 1;
   break;
  }
  case 7:  {
   $52 = $1;
   $53 = ((($52)) + 220|0);
   $54 = ((($53)) + 6|0);
   $55 = HEAP16[$54>>1]|0;
   $56 = ($55&65535) >>> 7;
   $57 = $56 & 15;
   $58 = $57&65535;
   $59 = $3;
   HEAP32[$59>>2] = $58;
   $0 = 1;
   break;
  }
  case 8:  {
   $60 = $3;
   $61 = $1;
   $62 = ((($61)) + 220|0);
   ;HEAP8[$60>>0]=HEAP8[$62>>0]|0;HEAP8[$60+1>>0]=HEAP8[$62+1>>0]|0;HEAP8[$60+2>>0]=HEAP8[$62+2>>0]|0;
   $0 = 1;
   break;
  }
  case 9:  {
   $63 = $3;
   $64 = $1;
   $65 = ((($64)) + 220|0);
   $66 = ((($65)) + 3|0);
   ;HEAP8[$63>>0]=HEAP8[$66>>0]|0;HEAP8[$63+1>>0]=HEAP8[$66+1>>0]|0;HEAP8[$63+2>>0]=HEAP8[$66+2>>0]|0;
   $0 = 1;
   break;
  }
  default: {
   $0 = 0;
  }
  }
 } while(0);
 $67 = $0;
 STACKTOP = sp;return ($67|0);
}
function _setpenattr_bool($state,$attr,$boolean) {
 $state = $state|0;
 $attr = $attr|0;
 $boolean = $boolean|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $val = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $val = sp;
 $0 = $state;
 $1 = $attr;
 $2 = $boolean;
 $3 = $2;
 HEAP32[$val>>2] = $3;
 $4 = $0;
 $5 = $1;
 _setpenattr($4,$5,1,$val);
 STACKTOP = sp;return;
}
function _setpenattr_int($state,$attr,$number) {
 $state = $state|0;
 $attr = $attr|0;
 $number = $number|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $val = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $val = sp;
 $0 = $state;
 $1 = $attr;
 $2 = $number;
 $3 = $2;
 HEAP32[$val>>2] = $3;
 $4 = $0;
 $5 = $1;
 _setpenattr($4,$5,2,$val);
 STACKTOP = sp;return;
}
function _setpenattr_col($state,$attr,$color) {
 $state = $state|0;
 $attr = $attr|0;
 $color = $color|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $val = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $val = sp;
 $0 = $state;
 $1 = $attr;
 ;HEAP8[$val>>0]=HEAP8[$color>>0]|0;HEAP8[$val+1>>0]=HEAP8[$color+1>>0]|0;HEAP8[$val+2>>0]=HEAP8[$color+2>>0]|0;
 $2 = $0;
 $3 = $1;
 _setpenattr($2,$3,4,$val);
 STACKTOP = sp;return;
}
function _lookup_colour_palette($state,$index,$col) {
 $state = $state|0;
 $index = $index|0;
 $col = $col|0;
 var $$expand_i1_val = 0, $$expand_i1_val11 = 0, $$expand_i1_val7 = 0, $$expand_i1_val9 = 0, $$pre_trunc = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0;
 var $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0;
 var $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond3 = 0, $or$cond5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = sp + 12|0;
 $1 = $state;
 $2 = $index;
 $3 = $col;
 $4 = $2;
 $5 = ($4|0)>=(0);
 $6 = $2;
 $7 = ($6|0)<(16);
 $or$cond = $5 & $7;
 if ($or$cond) {
  $8 = $1;
  $9 = $2;
  $10 = $3;
  $11 = (_lookup_colour_ansi($8,$9,$10)|0);
  $$expand_i1_val = $11&1;
  HEAP8[$0>>0] = $$expand_i1_val;
  $$pre_trunc = HEAP8[$0>>0]|0;
  $63 = $$pre_trunc&1;
  STACKTOP = sp;return ($63|0);
 }
 $12 = $2;
 $13 = ($12|0)>=(16);
 $14 = $2;
 $15 = ($14|0)<(232);
 $or$cond3 = $13 & $15;
 $16 = $2;
 if ($or$cond3) {
  $17 = (($16) - 16)|0;
  $2 = $17;
  $18 = $2;
  $19 = (($18|0) % 6)&-1;
  $20 = (1676 + ($19<<2)|0);
  $21 = HEAP32[$20>>2]|0;
  $22 = $21&255;
  $23 = $3;
  $24 = ((($23)) + 2|0);
  HEAP8[$24>>0] = $22;
  $25 = $2;
  $26 = (($25|0) / 6)&-1;
  $27 = (($26|0) % 6)&-1;
  $28 = (1676 + ($27<<2)|0);
  $29 = HEAP32[$28>>2]|0;
  $30 = $29&255;
  $31 = $3;
  $32 = ((($31)) + 1|0);
  HEAP8[$32>>0] = $30;
  $33 = $2;
  $34 = (($33|0) / 6)&-1;
  $35 = (($34|0) / 6)&-1;
  $36 = (($35|0) % 6)&-1;
  $37 = (1676 + ($36<<2)|0);
  $38 = HEAP32[$37>>2]|0;
  $39 = $38&255;
  $40 = $3;
  HEAP8[$40>>0] = $39;
  $$expand_i1_val7 = 1;
  HEAP8[$0>>0] = $$expand_i1_val7;
  $$pre_trunc = HEAP8[$0>>0]|0;
  $63 = $$pre_trunc&1;
  STACKTOP = sp;return ($63|0);
 }
 $41 = ($16|0)>=(232);
 $42 = $2;
 $43 = ($42|0)<(256);
 $or$cond5 = $41 & $43;
 if ($or$cond5) {
  $44 = $2;
  $45 = (($44) - 232)|0;
  $2 = $45;
  $46 = $2;
  $47 = (1700 + ($46<<2)|0);
  $48 = HEAP32[$47>>2]|0;
  $49 = $48&255;
  $50 = $3;
  $51 = ((($50)) + 2|0);
  HEAP8[$51>>0] = $49;
  $52 = $2;
  $53 = (1700 + ($52<<2)|0);
  $54 = HEAP32[$53>>2]|0;
  $55 = $54&255;
  $56 = $3;
  $57 = ((($56)) + 1|0);
  HEAP8[$57>>0] = $55;
  $58 = $2;
  $59 = (1700 + ($58<<2)|0);
  $60 = HEAP32[$59>>2]|0;
  $61 = $60&255;
  $62 = $3;
  HEAP8[$62>>0] = $61;
  $$expand_i1_val9 = 1;
  HEAP8[$0>>0] = $$expand_i1_val9;
  $$pre_trunc = HEAP8[$0>>0]|0;
  $63 = $$pre_trunc&1;
  STACKTOP = sp;return ($63|0);
 } else {
  $$expand_i1_val11 = 0;
  HEAP8[$0>>0] = $$expand_i1_val11;
  $$pre_trunc = HEAP8[$0>>0]|0;
  $63 = $$pre_trunc&1;
  STACKTOP = sp;return ($63|0);
 }
 return (0)|0;
}
function _set_pen_col_ansi($state,$attr,$col) {
 $state = $state|0;
 $attr = $attr|0;
 $col = $col|0;
 var $$byval_copy = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $colp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy = sp + 16|0;
 $0 = $state;
 $1 = $attr;
 $2 = $col;
 $3 = $1;
 $4 = ($3|0)==(9);
 $5 = $0;
 $6 = ((($5)) + 220|0);
 $7 = ((($6)) + 3|0);
 $8 = $4 ? $7 : $6;
 $colp = $8;
 $9 = $0;
 $10 = $2;
 $11 = $colp;
 (_lookup_colour_ansi($9,$10,$11)|0);
 $12 = $0;
 $13 = $1;
 $14 = $colp;
 ;HEAP8[$$byval_copy>>0]=HEAP8[$14>>0]|0;HEAP8[$$byval_copy+1>>0]=HEAP8[$14+1>>0]|0;HEAP8[$$byval_copy+2>>0]=HEAP8[$14+2>>0]|0;
 _setpenattr_col($12,$13,$$byval_copy);
 STACKTOP = sp;return;
}
function _lookup_colour($state,$palette,$args,$argcount,$col,$index) {
 $state = $state|0;
 $palette = $palette|0;
 $args = $args|0;
 $argcount = $argcount|0;
 $col = $col|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $1 = $state;
 $2 = $palette;
 $3 = $args;
 $4 = $argcount;
 $5 = $col;
 $6 = $index;
 $7 = $2;
 switch ($7|0) {
 case 2:  {
  $8 = $4;
  $9 = ($8|0)<(3);
  if ($9) {
   $10 = $4;
   $0 = $10;
   $58 = $0;
   STACKTOP = sp;return ($58|0);
  } else {
   $11 = $3;
   $12 = HEAP32[$11>>2]|0;
   $13 = $12 & 2147483647;
   $14 = $13&255;
   $15 = $5;
   HEAP8[$15>>0] = $14;
   $16 = $3;
   $17 = ((($16)) + 4|0);
   $18 = HEAP32[$17>>2]|0;
   $19 = $18 & 2147483647;
   $20 = $19&255;
   $21 = $5;
   $22 = ((($21)) + 1|0);
   HEAP8[$22>>0] = $20;
   $23 = $3;
   $24 = ((($23)) + 8|0);
   $25 = HEAP32[$24>>2]|0;
   $26 = $25 & 2147483647;
   $27 = $26&255;
   $28 = $5;
   $29 = ((($28)) + 2|0);
   HEAP8[$29>>0] = $27;
   $0 = 3;
   $58 = $0;
   STACKTOP = sp;return ($58|0);
  }
  break;
 }
 case 5:  {
  $30 = $6;
  $31 = ($30|0)!=(0|0);
  if ($31) {
   $32 = $3;
   $33 = HEAP32[$32>>2]|0;
   $34 = $33 & 2147483647;
   $35 = ($34|0)==(2147483647);
   if ($35) {
    $40 = -1;
   } else {
    $36 = $3;
    $37 = HEAP32[$36>>2]|0;
    $38 = $37 & 2147483647;
    $40 = $38;
   }
   $39 = $6;
   HEAP32[$39>>2] = $40;
  }
  $41 = $1;
  $42 = $4;
  $43 = ($42|0)!=(0);
  if ($43) {
   $44 = $3;
   $45 = HEAP32[$44>>2]|0;
   $46 = $45 & 2147483647;
   $47 = ($46|0)==(2147483647);
   if ($47) {
    $52 = -1;
   } else {
    $48 = $3;
    $49 = HEAP32[$48>>2]|0;
    $50 = $49 & 2147483647;
    $52 = $50;
   }
  } else {
   $52 = -1;
  }
  $51 = $5;
  (_lookup_colour_palette($41,$52,$51)|0);
  $53 = $4;
  $54 = ($53|0)!=(0);
  $55 = $54 ? 1 : 0;
  $0 = $55;
  $58 = $0;
  STACKTOP = sp;return ($58|0);
  break;
 }
 default: {
  $56 = HEAP32[3064>>2]|0;
  $57 = $2;
  HEAP32[$vararg_buffer>>2] = $57;
  (_fprintf($56,4462,$vararg_buffer)|0);
  $0 = 0;
  $58 = $0;
  STACKTOP = sp;return ($58|0);
 }
 }
 return (0)|0;
}
function _setpenattr($state,$attr,$type,$val) {
 $state = $state|0;
 $attr = $attr|0;
 $type = $type|0;
 $val = $val|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $0 = $state;
 $1 = $attr;
 $2 = $type;
 $3 = $val;
 $4 = $2;
 $5 = $1;
 $6 = (_vterm_get_attr_type($5)|0);
 $7 = ($4|0)!=($6|0);
 if ($7) {
  $8 = HEAP32[3064>>2]|0;
  $9 = $1;
  $10 = $1;
  $11 = (_vterm_get_attr_type($10)|0);
  $12 = $2;
  HEAP32[$vararg_buffer>>2] = $9;
  $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
  HEAP32[$vararg_ptr1>>2] = $11;
  $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
  HEAP32[$vararg_ptr2>>2] = $12;
  (_fprintf($8,4411,$vararg_buffer)|0);
  STACKTOP = sp;return;
 }
 $13 = $0;
 $14 = ((($13)) + 4|0);
 $15 = HEAP32[$14>>2]|0;
 $16 = ($15|0)!=(0|0);
 if (!($16)) {
  STACKTOP = sp;return;
 }
 $17 = $0;
 $18 = ((($17)) + 4|0);
 $19 = HEAP32[$18>>2]|0;
 $20 = ((($19)) + 24|0);
 $21 = HEAP32[$20>>2]|0;
 $22 = ($21|0)!=(0|0);
 if (!($22)) {
  STACKTOP = sp;return;
 }
 $23 = $0;
 $24 = ((($23)) + 4|0);
 $25 = HEAP32[$24>>2]|0;
 $26 = ((($25)) + 24|0);
 $27 = HEAP32[$26>>2]|0;
 $28 = $1;
 $29 = $3;
 $30 = $0;
 $31 = ((($30)) + 8|0);
 $32 = HEAP32[$31>>2]|0;
 (FUNCTION_TABLE_iiii[$27 & 31]($28,$29,$32)|0);
 STACKTOP = sp;return;
}
function _lookup_colour_ansi($state,$index,$col) {
 $state = $state|0;
 $index = $index|0;
 $col = $col|0;
 var $$expand_i1_val = 0, $$expand_i1_val3 = 0, $$pre_trunc = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = sp + 12|0;
 $1 = $state;
 $2 = $index;
 $3 = $col;
 $4 = $2;
 $5 = ($4|0)>=(0);
 $6 = $2;
 $7 = ($6|0)<(16);
 $or$cond = $5 & $7;
 if ($or$cond) {
  $8 = $3;
  $9 = $2;
  $10 = $1;
  $11 = ((($10)) + 234|0);
  $12 = (($11) + (($9*3)|0)|0);
  ;HEAP8[$8>>0]=HEAP8[$12>>0]|0;HEAP8[$8+1>>0]=HEAP8[$12+1>>0]|0;HEAP8[$8+2>>0]=HEAP8[$12+2>>0]|0;
  $$expand_i1_val = 1;
  HEAP8[$0>>0] = $$expand_i1_val;
  $$pre_trunc = HEAP8[$0>>0]|0;
  $13 = $$pre_trunc&1;
  STACKTOP = sp;return ($13|0);
 } else {
  $$expand_i1_val3 = 0;
  HEAP8[$0>>0] = $$expand_i1_val3;
  $$pre_trunc = HEAP8[$0>>0]|0;
  $13 = $$pre_trunc&1;
  STACKTOP = sp;return ($13|0);
 }
 return (0)|0;
}
function _vterm_screen_free($screen) {
 $screen = $screen|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $3 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $screen;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = $0;
 $4 = ((($3)) + 72|0);
 $5 = HEAP32[$4>>2]|0;
 _vterm_allocator_free($2,$5);
 $6 = $0;
 $7 = ((($6)) + 72|0);
 $8 = ((($7)) + 4|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($9|0)!=(0|0);
 if ($10) {
  $11 = $0;
  $12 = HEAP32[$11>>2]|0;
  $13 = $0;
  $14 = ((($13)) + 72|0);
  $15 = ((($14)) + 4|0);
  $16 = HEAP32[$15>>2]|0;
  _vterm_allocator_free($12,$16);
 }
 $17 = $0;
 $18 = HEAP32[$17>>2]|0;
 $19 = $0;
 $20 = ((($19)) + 84|0);
 $21 = HEAP32[$20>>2]|0;
 _vterm_allocator_free($18,$21);
 $22 = $0;
 $23 = HEAP32[$22>>2]|0;
 $24 = $0;
 _vterm_allocator_free($23,$24);
 STACKTOP = sp;return;
}
function _vterm_screen_reset($screen,$hard) {
 $screen = $screen|0;
 $hard = $hard|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $screen;
 $1 = $hard;
 $2 = $0;
 $3 = ((($2)) + 20|0);
 HEAP32[$3>>2] = -1;
 $4 = $0;
 $5 = ((($4)) + 36|0);
 HEAP32[$5>>2] = -1;
 $6 = $0;
 $7 = ((($6)) + 4|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = $1;
 _vterm_state_reset($8,$9);
 $10 = $0;
 _vterm_screen_flush_damage($10);
 STACKTOP = sp;return;
}
function _vterm_screen_flush_damage($screen) {
 $screen = $screen|0;
 var $$byval_copy = 0, $$byval_copy1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy1 = sp + 24|0;
 $$byval_copy = sp + 8|0;
 $0 = $screen;
 $1 = $0;
 $2 = ((($1)) + 36|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3|0)!=(-1);
 if ($4) {
  $5 = $0;
  $6 = ((($5)) + 36|0);
  $7 = $0;
  $8 = ((($7)) + 52|0);
  $9 = HEAP32[$8>>2]|0;
  $10 = $0;
  $11 = ((($10)) + 56|0);
  $12 = HEAP32[$11>>2]|0;
  $13 = $0;
  ;HEAP32[$$byval_copy>>2]=HEAP32[$6>>2]|0;HEAP32[$$byval_copy+4>>2]=HEAP32[$6+4>>2]|0;HEAP32[$$byval_copy+8>>2]=HEAP32[$6+8>>2]|0;HEAP32[$$byval_copy+12>>2]=HEAP32[$6+12>>2]|0;
  _vterm_scroll_rect($$byval_copy,$9,$12,27,28,$13);
  $14 = $0;
  $15 = ((($14)) + 36|0);
  HEAP32[$15>>2] = -1;
 }
 $16 = $0;
 $17 = ((($16)) + 20|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = ($18|0)!=(-1);
 if (!($19)) {
  STACKTOP = sp;return;
 }
 $20 = $0;
 $21 = ((($20)) + 8|0);
 $22 = HEAP32[$21>>2]|0;
 $23 = ($22|0)!=(0|0);
 if ($23) {
  $24 = $0;
  $25 = ((($24)) + 8|0);
  $26 = HEAP32[$25>>2]|0;
  $27 = HEAP32[$26>>2]|0;
  $28 = ($27|0)!=(0|0);
  if ($28) {
   $29 = $0;
   $30 = ((($29)) + 8|0);
   $31 = HEAP32[$30>>2]|0;
   $32 = HEAP32[$31>>2]|0;
   $33 = $0;
   $34 = ((($33)) + 20|0);
   $35 = $0;
   $36 = ((($35)) + 12|0);
   $37 = HEAP32[$36>>2]|0;
   ;HEAP32[$$byval_copy1>>2]=HEAP32[$34>>2]|0;HEAP32[$$byval_copy1+4>>2]=HEAP32[$34+4>>2]|0;HEAP32[$$byval_copy1+8>>2]=HEAP32[$34+8>>2]|0;HEAP32[$$byval_copy1+12>>2]=HEAP32[$34+12>>2]|0;
   (FUNCTION_TABLE_iii[$32 & 31]($$byval_copy1,$37)|0);
  }
 }
 $38 = $0;
 $39 = ((($38)) + 20|0);
 HEAP32[$39>>2] = -1;
 STACKTOP = sp;return;
}
function _vterm_screen_get_chars($screen,$chars,$len,$rect) {
 $screen = $screen|0;
 $chars = $chars|0;
 $len = $len|0;
 $rect = $rect|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $rect$byval_copy = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect$byval_copy = sp + 16|0;
 $0 = $screen;
 $1 = $chars;
 $2 = $len;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
 $6 = (__get_chars($3,0,$4,$5,$rect$byval_copy)|0);
 STACKTOP = sp;return ($6|0);
}
function _vterm_screen_get_text($screen,$str,$len,$rect) {
 $screen = $screen|0;
 $str = $str|0;
 $len = $len|0;
 $rect = $rect|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $rect$byval_copy = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect$byval_copy = sp + 16|0;
 $0 = $screen;
 $1 = $str;
 $2 = $len;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
 $6 = (__get_chars($3,1,$4,$5,$rect$byval_copy)|0);
 STACKTOP = sp;return ($6|0);
}
function _vterm_screen_get_cell($screen,$pos,$cell) {
 $screen = $screen|0;
 $pos = $pos|0;
 $cell = $cell|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0;
 var $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0;
 var $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0;
 var $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0;
 var $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $i = 0, $intcell = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $screen;
 $2 = $cell;
 $3 = $1;
 $4 = HEAP32[$pos>>2]|0;
 $5 = ((($pos)) + 4|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = (_getcell($3,$4,$6)|0);
 $intcell = $7;
 $8 = $intcell;
 $9 = ($8|0)!=(0|0);
 if (!($9)) {
  $0 = 0;
  $189 = $0;
  STACKTOP = sp;return ($189|0);
 }
 $i = 0;
 while(1) {
  $10 = $i;
  $11 = $intcell;
  $12 = (($11) + ($10<<2)|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = $i;
  $15 = $2;
  $16 = (($15) + ($14<<2)|0);
  HEAP32[$16>>2] = $13;
  $17 = $i;
  $18 = $intcell;
  $19 = (($18) + ($17<<2)|0);
  $20 = HEAP32[$19>>2]|0;
  $21 = ($20|0)!=(0);
  if (!($21)) {
   break;
  }
  $22 = $i;
  $23 = (($22) + 1)|0;
  $i = $23;
 }
 $24 = $intcell;
 $25 = ((($24)) + 24|0);
 $26 = ((($25)) + 6|0);
 $27 = HEAP16[$26>>1]|0;
 $28 = $27 & 1;
 $29 = $28&65535;
 $30 = $2;
 $31 = ((($30)) + 28|0);
 $32 = $29&65535;
 $33 = HEAP16[$31>>1]|0;
 $34 = $32 & 1;
 $35 = $33 & -2;
 $36 = $35 | $34;
 HEAP16[$31>>1] = $36;
 $37 = $intcell;
 $38 = ((($37)) + 24|0);
 $39 = ((($38)) + 6|0);
 $40 = HEAP16[$39>>1]|0;
 $41 = ($40&65535) >>> 1;
 $42 = $41 & 3;
 $43 = $42&65535;
 $44 = $2;
 $45 = ((($44)) + 28|0);
 $46 = $43&65535;
 $47 = HEAP16[$45>>1]|0;
 $48 = $46 & 3;
 $49 = ($48 << 1)&65535;
 $50 = $47 & -7;
 $51 = $50 | $49;
 HEAP16[$45>>1] = $51;
 $52 = $intcell;
 $53 = ((($52)) + 24|0);
 $54 = ((($53)) + 6|0);
 $55 = HEAP16[$54>>1]|0;
 $56 = ($55&65535) >>> 3;
 $57 = $56 & 1;
 $58 = $57&65535;
 $59 = $2;
 $60 = ((($59)) + 28|0);
 $61 = $58&65535;
 $62 = HEAP16[$60>>1]|0;
 $63 = $61 & 1;
 $64 = ($63 << 3)&65535;
 $65 = $62 & -9;
 $66 = $65 | $64;
 HEAP16[$60>>1] = $66;
 $67 = $intcell;
 $68 = ((($67)) + 24|0);
 $69 = ((($68)) + 6|0);
 $70 = HEAP16[$69>>1]|0;
 $71 = ($70&65535) >>> 4;
 $72 = $71 & 1;
 $73 = $72&65535;
 $74 = $2;
 $75 = ((($74)) + 28|0);
 $76 = $73&65535;
 $77 = HEAP16[$75>>1]|0;
 $78 = $76 & 1;
 $79 = ($78 << 4)&65535;
 $80 = $77 & -17;
 $81 = $80 | $79;
 HEAP16[$75>>1] = $81;
 $82 = $intcell;
 $83 = ((($82)) + 24|0);
 $84 = ((($83)) + 6|0);
 $85 = HEAP16[$84>>1]|0;
 $86 = ($85&65535) >>> 5;
 $87 = $86 & 1;
 $88 = $87&65535;
 $89 = $1;
 $90 = ((($89)) + 68|0);
 $91 = HEAP32[$90>>2]|0;
 $92 = $88 ^ $91;
 $93 = $2;
 $94 = ((($93)) + 28|0);
 $95 = $92&65535;
 $96 = HEAP16[$94>>1]|0;
 $97 = $95 & 1;
 $98 = ($97 << 5)&65535;
 $99 = $96 & -33;
 $100 = $99 | $98;
 HEAP16[$94>>1] = $100;
 $101 = $intcell;
 $102 = ((($101)) + 24|0);
 $103 = ((($102)) + 6|0);
 $104 = HEAP16[$103>>1]|0;
 $105 = ($104&65535) >>> 6;
 $106 = $105 & 1;
 $107 = $106&65535;
 $108 = $2;
 $109 = ((($108)) + 28|0);
 $110 = $107&65535;
 $111 = HEAP16[$109>>1]|0;
 $112 = $110 & 1;
 $113 = ($112 << 6)&65535;
 $114 = $111 & -65;
 $115 = $114 | $113;
 HEAP16[$109>>1] = $115;
 $116 = $intcell;
 $117 = ((($116)) + 24|0);
 $118 = ((($117)) + 6|0);
 $119 = HEAP16[$118>>1]|0;
 $120 = ($119&65535) >>> 7;
 $121 = $120 & 15;
 $122 = $121&65535;
 $123 = $2;
 $124 = ((($123)) + 28|0);
 $125 = $122&65535;
 $126 = HEAP16[$124>>1]|0;
 $127 = $125 & 15;
 $128 = ($127 << 7)&65535;
 $129 = $126 & -1921;
 $130 = $129 | $128;
 HEAP16[$124>>1] = $130;
 $131 = $intcell;
 $132 = ((($131)) + 24|0);
 $133 = ((($132)) + 6|0);
 $134 = HEAP16[$133>>1]|0;
 $135 = ($134&65535) >>> 12;
 $136 = $135 & 1;
 $137 = $136&65535;
 $138 = $2;
 $139 = ((($138)) + 28|0);
 $140 = $137&65535;
 $141 = HEAP16[$139>>1]|0;
 $142 = $140 & 1;
 $143 = ($142 << 11)&65535;
 $144 = $141 & -2049;
 $145 = $144 | $143;
 HEAP16[$139>>1] = $145;
 $146 = $intcell;
 $147 = ((($146)) + 24|0);
 $148 = ((($147)) + 6|0);
 $149 = HEAP16[$148>>1]|0;
 $150 = ($149&65535) >>> 13;
 $151 = $150 & 3;
 $152 = $151&65535;
 $153 = $2;
 $154 = ((($153)) + 28|0);
 $155 = $152&65535;
 $156 = HEAP16[$154>>1]|0;
 $157 = $155 & 3;
 $158 = ($157 << 12)&65535;
 $159 = $156 & -12289;
 $160 = $159 | $158;
 HEAP16[$154>>1] = $160;
 $161 = $2;
 $162 = ((($161)) + 32|0);
 $163 = $intcell;
 $164 = ((($163)) + 24|0);
 ;HEAP8[$162>>0]=HEAP8[$164>>0]|0;HEAP8[$162+1>>0]=HEAP8[$164+1>>0]|0;HEAP8[$162+2>>0]=HEAP8[$164+2>>0]|0;
 $165 = $2;
 $166 = ((($165)) + 35|0);
 $167 = $intcell;
 $168 = ((($167)) + 24|0);
 $169 = ((($168)) + 3|0);
 ;HEAP8[$166>>0]=HEAP8[$169>>0]|0;HEAP8[$166+1>>0]=HEAP8[$169+1>>0]|0;HEAP8[$166+2>>0]=HEAP8[$169+2>>0]|0;
 $170 = ((($pos)) + 4|0);
 $171 = HEAP32[$170>>2]|0;
 $172 = $1;
 $173 = ((($172)) + 64|0);
 $174 = HEAP32[$173>>2]|0;
 $175 = (($174) - 1)|0;
 $176 = ($171|0)<($175|0);
 if ($176) {
  $177 = $1;
  $178 = HEAP32[$pos>>2]|0;
  $179 = ((($pos)) + 4|0);
  $180 = HEAP32[$179>>2]|0;
  $181 = (($180) + 1)|0;
  $182 = (_getcell($177,$178,$181)|0);
  $183 = HEAP32[$182>>2]|0;
  $184 = ($183|0)==(-1);
  if ($184) {
   $185 = $2;
   $186 = ((($185)) + 24|0);
   HEAP8[$186>>0] = 2;
  } else {
   label = 9;
  }
 } else {
  label = 9;
 }
 if ((label|0) == 9) {
  $187 = $2;
  $188 = ((($187)) + 24|0);
  HEAP8[$188>>0] = 1;
 }
 $0 = 1;
 $189 = $0;
 STACKTOP = sp;return ($189|0);
}
function _vterm_screen_is_eol($screen,$pos) {
 $screen = $screen|0;
 $pos = $pos|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $cell = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $screen;
 while(1) {
  $2 = ((($pos)) + 4|0);
  $3 = HEAP32[$2>>2]|0;
  $4 = $1;
  $5 = ((($4)) + 64|0);
  $6 = HEAP32[$5>>2]|0;
  $7 = ($3|0)<($6|0);
  if (!($7)) {
   label = 6;
   break;
  }
  $8 = $1;
  $9 = HEAP32[$pos>>2]|0;
  $10 = ((($pos)) + 4|0);
  $11 = HEAP32[$10>>2]|0;
  $12 = (_getcell($8,$9,$11)|0);
  $cell = $12;
  $13 = $cell;
  $14 = HEAP32[$13>>2]|0;
  $15 = ($14|0)!=(0);
  if ($15) {
   label = 4;
   break;
  }
  $16 = ((($pos)) + 4|0);
  $17 = HEAP32[$16>>2]|0;
  $18 = (($17) + 1)|0;
  HEAP32[$16>>2] = $18;
 }
 if ((label|0) == 4) {
  $0 = 0;
  $19 = $0;
  STACKTOP = sp;return ($19|0);
 }
 else if ((label|0) == 6) {
  $0 = 1;
  $19 = $0;
  STACKTOP = sp;return ($19|0);
 }
 return (0)|0;
}
function _vterm_obtain_screen($vt) {
 $vt = $vt|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $screen = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $vt;
 $2 = $1;
 $3 = ((($2)) + 60|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($4|0)!=(0|0);
 $6 = $1;
 if ($5) {
  $7 = ((($6)) + 60|0);
  $8 = HEAP32[$7>>2]|0;
  $0 = $8;
  $14 = $0;
  STACKTOP = sp;return ($14|0);
 } else {
  $9 = (_screen_new($6)|0);
  $screen = $9;
  $10 = $screen;
  $11 = $1;
  $12 = ((($11)) + 60|0);
  HEAP32[$12>>2] = $10;
  $13 = $screen;
  $0 = $13;
  $14 = $0;
  STACKTOP = sp;return ($14|0);
 }
 return (0)|0;
}
function _vterm_screen_enable_altscreen($screen,$altscreen) {
 $screen = $screen|0;
 $altscreen = $altscreen|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $cols = 0, $or$cond = 0;
 var $rows = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rows = sp + 4|0;
 $cols = sp;
 $0 = $screen;
 $1 = $altscreen;
 $2 = $0;
 $3 = ((($2)) + 72|0);
 $4 = ((($3)) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = ($5|0)==(0|0);
 $7 = $1;
 $8 = ($7|0)!=(0);
 $or$cond = $6 & $8;
 if (!($or$cond)) {
  STACKTOP = sp;return;
 }
 $9 = $0;
 $10 = HEAP32[$9>>2]|0;
 _vterm_get_size($10,$rows,$cols);
 $11 = $0;
 $12 = HEAP32[$rows>>2]|0;
 $13 = HEAP32[$cols>>2]|0;
 $14 = (_realloc_buffer($11,0,$12,$13)|0);
 $15 = $0;
 $16 = ((($15)) + 72|0);
 $17 = ((($16)) + 4|0);
 HEAP32[$17>>2] = $14;
 STACKTOP = sp;return;
}
function _vterm_screen_set_callbacks($screen,$callbacks,$user) {
 $screen = $screen|0;
 $callbacks = $callbacks|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $screen;
 $1 = $callbacks;
 $2 = $user;
 $3 = $1;
 $4 = $0;
 $5 = ((($4)) + 8|0);
 HEAP32[$5>>2] = $3;
 $6 = $2;
 $7 = $0;
 $8 = ((($7)) + 12|0);
 HEAP32[$8>>2] = $6;
 STACKTOP = sp;return;
}
function _vterm_screen_get_cbdata($screen) {
 $screen = $screen|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $screen;
 $1 = $0;
 $2 = ((($1)) + 12|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _vterm_screen_set_unrecognised_fallbacks($screen,$fallbacks,$user) {
 $screen = $screen|0;
 $fallbacks = $fallbacks|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $screen;
 $1 = $fallbacks;
 $2 = $user;
 $3 = $0;
 $4 = ((($3)) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $1;
 $7 = $2;
 _vterm_state_set_unrecognised_fallbacks($5,$6,$7);
 STACKTOP = sp;return;
}
function _vterm_screen_get_unrecognised_fbdata($screen) {
 $screen = $screen|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $screen;
 $1 = $0;
 $2 = ((($1)) + 4|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = (_vterm_state_get_unrecognised_fbdata($3)|0);
 STACKTOP = sp;return ($4|0);
}
function _vterm_screen_set_damage_merge($screen,$size) {
 $screen = $screen|0;
 $size = $size|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $screen;
 $1 = $size;
 $2 = $0;
 _vterm_screen_flush_damage($2);
 $3 = $1;
 $4 = $0;
 $5 = ((($4)) + 16|0);
 HEAP32[$5>>2] = $3;
 STACKTOP = sp;return;
}
function _vterm_screen_get_attrs_extent($screen,$extent,$pos,$attrs) {
 $screen = $screen|0;
 $extent = $extent|0;
 $pos = $pos|0;
 $attrs = $attrs|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $8 = 0, $9 = 0, $col = 0, $target = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $screen;
 $1 = $extent;
 $2 = $attrs;
 $3 = $0;
 $4 = HEAP32[$pos>>2]|0;
 $5 = ((($pos)) + 4|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = (_getcell($3,$4,$6)|0);
 $target = $7;
 $8 = HEAP32[$pos>>2]|0;
 $9 = $1;
 HEAP32[$9>>2] = $8;
 $10 = HEAP32[$pos>>2]|0;
 $11 = (($10) + 1)|0;
 $12 = $1;
 $13 = ((($12)) + 4|0);
 HEAP32[$13>>2] = $11;
 $14 = $1;
 $15 = ((($14)) + 8|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = ($16|0)<(0);
 if ($17) {
  $18 = $1;
  $19 = ((($18)) + 8|0);
  HEAP32[$19>>2] = 0;
 }
 $20 = $1;
 $21 = ((($20)) + 12|0);
 $22 = HEAP32[$21>>2]|0;
 $23 = ($22|0)<(0);
 if ($23) {
  $24 = $0;
  $25 = ((($24)) + 64|0);
  $26 = HEAP32[$25>>2]|0;
  $27 = $1;
  $28 = ((($27)) + 12|0);
  HEAP32[$28>>2] = $26;
 }
 $29 = ((($pos)) + 4|0);
 $30 = HEAP32[$29>>2]|0;
 $31 = (($30) - 1)|0;
 $col = $31;
 while(1) {
  $32 = $col;
  $33 = $1;
  $34 = ((($33)) + 8|0);
  $35 = HEAP32[$34>>2]|0;
  $36 = ($32|0)>=($35|0);
  if (!($36)) {
   break;
  }
  $37 = $2;
  $38 = $target;
  $39 = $0;
  $40 = HEAP32[$pos>>2]|0;
  $41 = $col;
  $42 = (_getcell($39,$40,$41)|0);
  $43 = (_attrs_differ($37,$38,$42)|0);
  $44 = ($43|0)!=(0);
  if ($44) {
   break;
  }
  $45 = $col;
  $46 = (($45) + -1)|0;
  $col = $46;
 }
 $47 = $col;
 $48 = (($47) + 1)|0;
 $49 = $1;
 $50 = ((($49)) + 8|0);
 HEAP32[$50>>2] = $48;
 $51 = ((($pos)) + 4|0);
 $52 = HEAP32[$51>>2]|0;
 $53 = (($52) + 1)|0;
 $col = $53;
 while(1) {
  $54 = $col;
  $55 = $1;
  $56 = ((($55)) + 12|0);
  $57 = HEAP32[$56>>2]|0;
  $58 = ($54|0)<($57|0);
  if (!($58)) {
   label = 13;
   break;
  }
  $59 = $2;
  $60 = $target;
  $61 = $0;
  $62 = HEAP32[$pos>>2]|0;
  $63 = $col;
  $64 = (_getcell($61,$62,$63)|0);
  $65 = (_attrs_differ($59,$60,$64)|0);
  $66 = ($65|0)!=(0);
  if ($66) {
   label = 13;
   break;
  }
  $67 = $col;
  $68 = (($67) + 1)|0;
  $col = $68;
 }
 if ((label|0) == 13) {
  $69 = $col;
  $70 = (($69) - 1)|0;
  $71 = $1;
  $72 = ((($71)) + 12|0);
  HEAP32[$72>>2] = $70;
  STACKTOP = sp;return 1;
 }
 return (0)|0;
}
function _moverect_user($dest,$src,$user) {
 $dest = $dest|0;
 $src = $src|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $dest$byval_copy = 0, $dest$byval_copy1 = 0, $screen = 0, $src$byval_copy = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $dest$byval_copy1 = sp + 48|0;
 $src$byval_copy = sp + 32|0;
 $dest$byval_copy = sp + 16|0;
 $1 = $user;
 $2 = $1;
 $screen = $2;
 $3 = $screen;
 $4 = ((($3)) + 8|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = ($5|0)!=(0|0);
 if ($6) {
  $7 = $screen;
  $8 = ((($7)) + 8|0);
  $9 = HEAP32[$8>>2]|0;
  $10 = ((($9)) + 4|0);
  $11 = HEAP32[$10>>2]|0;
  $12 = ($11|0)!=(0|0);
  if ($12) {
   $13 = $screen;
   $14 = ((($13)) + 16|0);
   $15 = HEAP32[$14>>2]|0;
   $16 = ($15|0)!=(3);
   if ($16) {
    $17 = $screen;
    _vterm_screen_flush_damage($17);
   }
   $18 = $screen;
   $19 = ((($18)) + 8|0);
   $20 = HEAP32[$19>>2]|0;
   $21 = ((($20)) + 4|0);
   $22 = HEAP32[$21>>2]|0;
   $23 = $screen;
   $24 = ((($23)) + 12|0);
   $25 = HEAP32[$24>>2]|0;
   ;HEAP32[$dest$byval_copy>>2]=HEAP32[$dest>>2]|0;HEAP32[$dest$byval_copy+4>>2]=HEAP32[$dest+4>>2]|0;HEAP32[$dest$byval_copy+8>>2]=HEAP32[$dest+8>>2]|0;HEAP32[$dest$byval_copy+12>>2]=HEAP32[$dest+12>>2]|0;
   ;HEAP32[$src$byval_copy>>2]=HEAP32[$src>>2]|0;HEAP32[$src$byval_copy+4>>2]=HEAP32[$src+4>>2]|0;HEAP32[$src$byval_copy+8>>2]=HEAP32[$src+8>>2]|0;HEAP32[$src$byval_copy+12>>2]=HEAP32[$src+12>>2]|0;
   $26 = (FUNCTION_TABLE_iiii[$22 & 31]($dest$byval_copy,$src$byval_copy,$25)|0);
   $27 = ($26|0)!=(0);
   if ($27) {
    $0 = 1;
    $29 = $0;
    STACKTOP = sp;return ($29|0);
   }
  }
 }
 $28 = $screen;
 ;HEAP32[$dest$byval_copy1>>2]=HEAP32[$dest>>2]|0;HEAP32[$dest$byval_copy1+4>>2]=HEAP32[$dest+4>>2]|0;HEAP32[$dest$byval_copy1+8>>2]=HEAP32[$dest+8>>2]|0;HEAP32[$dest$byval_copy1+12>>2]=HEAP32[$dest+12>>2]|0;
 _damagerect($28,$dest$byval_copy1);
 $0 = 1;
 $29 = $0;
 STACKTOP = sp;return ($29|0);
}
function _erase_user($rect,$selective,$user) {
 $rect = $rect|0;
 $selective = $selective|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $rect$byval_copy = 0, $screen = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect$byval_copy = sp + 16|0;
 $0 = $selective;
 $1 = $user;
 $2 = $1;
 $screen = $2;
 $3 = $screen;
 ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
 _damagerect($3,$rect$byval_copy);
 STACKTOP = sp;return 1;
}
function __get_chars($screen,$utf8,$buffer,$len,$rect) {
 $screen = $screen|0;
 $utf8 = $utf8|0;
 $buffer = $buffer|0;
 $len = $len|0;
 $rect = $rect|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0;
 var $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0;
 var $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0;
 var $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0;
 var $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $cell = 0, $col = 0, $i = 0, $outpos = 0, $padding = 0;
 var $row = 0, $thislen = 0, $thislen1 = 0, $thislen2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $screen;
 $1 = $utf8;
 $2 = $buffer;
 $3 = $len;
 $outpos = 0;
 $padding = 0;
 $4 = HEAP32[$rect>>2]|0;
 $row = $4;
 while(1) {
  $5 = $row;
  $6 = ((($rect)) + 4|0);
  $7 = HEAP32[$6>>2]|0;
  $8 = ($5|0)<($7|0);
  if (!($8)) {
   break;
  }
  $9 = ((($rect)) + 8|0);
  $10 = HEAP32[$9>>2]|0;
  $col = $10;
  while(1) {
   $11 = $col;
   $12 = ((($rect)) + 12|0);
   $13 = HEAP32[$12>>2]|0;
   $14 = ($11|0)<($13|0);
   if (!($14)) {
    break;
   }
   $15 = $0;
   $16 = $row;
   $17 = $col;
   $18 = (_getcell($15,$16,$17)|0);
   $cell = $18;
   $19 = $cell;
   $20 = HEAP32[$19>>2]|0;
   $21 = ($20|0)==(0);
   L7: do {
    if ($21) {
     $22 = $padding;
     $23 = (($22) + 1)|0;
     $padding = $23;
    } else {
     $24 = $cell;
     $25 = HEAP32[$24>>2]|0;
     $26 = ($25|0)==(-1);
     if (!($26)) {
      while(1) {
       $27 = $padding;
       $28 = ($27|0)!=(0);
       if (!($28)) {
        break;
       }
       $29 = $1;
       $30 = ($29|0)!=(0);
       do {
        if ($30) {
         $31 = (_utf8_seqlen32(32)|0);
         $thislen = $31;
         $32 = $2;
         $33 = ($32|0)!=(0|0);
         if ($33) {
          $34 = $outpos;
          $35 = $thislen;
          $36 = (($34) + ($35))|0;
          $37 = $3;
          $38 = ($36>>>0)<=($37>>>0);
          if ($38) {
           $39 = $2;
           $40 = $outpos;
           $41 = (($39) + ($40)|0);
           $42 = (_fill_utf833(32,$41)|0);
           $43 = $outpos;
           $44 = (($43) + ($42))|0;
           $outpos = $44;
           break;
          }
         }
         $45 = $thislen;
         $46 = $outpos;
         $47 = (($46) + ($45))|0;
         $outpos = $47;
        } else {
         $48 = $2;
         $49 = ($48|0)!=(0|0);
         if ($49) {
          $50 = $outpos;
          $51 = (($50) + 1)|0;
          $52 = $3;
          $53 = ($51>>>0)<=($52>>>0);
          if ($53) {
           $54 = $outpos;
           $55 = (($54) + 1)|0;
           $outpos = $55;
           $56 = $2;
           $57 = (($56) + ($54<<2)|0);
           HEAP32[$57>>2] = 32;
           break;
          }
         }
         $58 = $outpos;
         $59 = (($58) + 1)|0;
         $outpos = $59;
        }
       } while(0);
       $60 = $padding;
       $61 = (($60) + -1)|0;
       $padding = $61;
      }
      $i = 0;
      while(1) {
       $62 = $i;
       $63 = ($62|0)<(6);
       if (!($63)) {
        break L7;
       }
       $64 = $i;
       $65 = $cell;
       $66 = (($65) + ($64<<2)|0);
       $67 = HEAP32[$66>>2]|0;
       $68 = ($67|0)!=(0);
       if (!($68)) {
        break L7;
       }
       $69 = $1;
       $70 = ($69|0)!=(0);
       do {
        if ($70) {
         $71 = $i;
         $72 = $cell;
         $73 = (($72) + ($71<<2)|0);
         $74 = HEAP32[$73>>2]|0;
         $75 = (_utf8_seqlen32($74)|0);
         $thislen1 = $75;
         $76 = $2;
         $77 = ($76|0)!=(0|0);
         if ($77) {
          $78 = $outpos;
          $79 = $thislen1;
          $80 = (($78) + ($79))|0;
          $81 = $3;
          $82 = ($80>>>0)<=($81>>>0);
          if ($82) {
           $83 = $i;
           $84 = $cell;
           $85 = (($84) + ($83<<2)|0);
           $86 = HEAP32[$85>>2]|0;
           $87 = $2;
           $88 = $outpos;
           $89 = (($87) + ($88)|0);
           $90 = (_fill_utf833($86,$89)|0);
           $91 = $outpos;
           $92 = (($91) + ($90))|0;
           $outpos = $92;
           break;
          }
         }
         $93 = $thislen1;
         $94 = $outpos;
         $95 = (($94) + ($93))|0;
         $outpos = $95;
        } else {
         $96 = $2;
         $97 = ($96|0)!=(0|0);
         if ($97) {
          $98 = $outpos;
          $99 = (($98) + 1)|0;
          $100 = $3;
          $101 = ($99>>>0)<=($100>>>0);
          if ($101) {
           $102 = $i;
           $103 = $cell;
           $104 = (($103) + ($102<<2)|0);
           $105 = HEAP32[$104>>2]|0;
           $106 = $outpos;
           $107 = (($106) + 1)|0;
           $outpos = $107;
           $108 = $2;
           $109 = (($108) + ($106<<2)|0);
           HEAP32[$109>>2] = $105;
           break;
          }
         }
         $110 = $outpos;
         $111 = (($110) + 1)|0;
         $outpos = $111;
        }
       } while(0);
       $112 = $i;
       $113 = (($112) + 1)|0;
       $i = $113;
      }
     }
    }
   } while(0);
   $114 = $col;
   $115 = (($114) + 1)|0;
   $col = $115;
  }
  $116 = $row;
  $117 = ((($rect)) + 4|0);
  $118 = HEAP32[$117>>2]|0;
  $119 = (($118) - 1)|0;
  $120 = ($116|0)<($119|0);
  if ($120) {
   $121 = $1;
   $122 = ($121|0)!=(0);
   do {
    if ($122) {
     $123 = (_utf8_seqlen32(10)|0);
     $thislen2 = $123;
     $124 = $2;
     $125 = ($124|0)!=(0|0);
     if ($125) {
      $126 = $outpos;
      $127 = $thislen2;
      $128 = (($126) + ($127))|0;
      $129 = $3;
      $130 = ($128>>>0)<=($129>>>0);
      if ($130) {
       $131 = $2;
       $132 = $outpos;
       $133 = (($131) + ($132)|0);
       $134 = (_fill_utf833(10,$133)|0);
       $135 = $outpos;
       $136 = (($135) + ($134))|0;
       $outpos = $136;
       break;
      }
     }
     $137 = $thislen2;
     $138 = $outpos;
     $139 = (($138) + ($137))|0;
     $outpos = $139;
    } else {
     $140 = $2;
     $141 = ($140|0)!=(0|0);
     if ($141) {
      $142 = $outpos;
      $143 = (($142) + 1)|0;
      $144 = $3;
      $145 = ($143>>>0)<=($144>>>0);
      if ($145) {
       $146 = $outpos;
       $147 = (($146) + 1)|0;
       $outpos = $147;
       $148 = $2;
       $149 = (($148) + ($146<<2)|0);
       HEAP32[$149>>2] = 10;
       break;
      }
     }
     $150 = $outpos;
     $151 = (($150) + 1)|0;
     $outpos = $151;
    }
   } while(0);
   $padding = 0;
  }
  $152 = $row;
  $153 = (($152) + 1)|0;
  $row = $153;
 }
 $154 = $outpos;
 STACKTOP = sp;return ($154|0);
}
function _getcell($screen,$row,$col) {
 $screen = $screen|0;
 $row = $row|0;
 $col = $col|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $screen;
 $2 = $row;
 $3 = $col;
 $4 = $2;
 $5 = ($4|0)<(0);
 if (!($5)) {
  $6 = $2;
  $7 = $1;
  $8 = ((($7)) + 60|0);
  $9 = HEAP32[$8>>2]|0;
  $10 = ($6|0)>=($9|0);
  if (!($10)) {
   $11 = $3;
   $12 = ($11|0)<(0);
   if (!($12)) {
    $13 = $3;
    $14 = $1;
    $15 = ((($14)) + 64|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = ($13|0)>=($16|0);
    if (!($17)) {
     $18 = $1;
     $19 = ((($18)) + 80|0);
     $20 = HEAP32[$19>>2]|0;
     $21 = $1;
     $22 = ((($21)) + 64|0);
     $23 = HEAP32[$22>>2]|0;
     $24 = $2;
     $25 = Math_imul($23, $24)|0;
     $26 = (($20) + ($25<<5)|0);
     $27 = $3;
     $28 = (($26) + ($27<<5)|0);
     $0 = $28;
     $29 = $0;
     STACKTOP = sp;return ($29|0);
    }
   }
   $0 = 0;
   $29 = $0;
   STACKTOP = sp;return ($29|0);
  }
 }
 $0 = 0;
 $29 = $0;
 STACKTOP = sp;return ($29|0);
}
function _screen_new($vt) {
 $vt = $vt|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $cols = 0, $rows = 0, $screen = 0, $state = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rows = sp + 4|0;
 $cols = sp;
 $1 = $vt;
 $2 = $1;
 $3 = (_vterm_obtain_state($2)|0);
 $state = $3;
 $4 = $state;
 $5 = ($4|0)!=(0|0);
 if ($5) {
  $6 = $1;
  $7 = (_vterm_allocator_malloc($6,96)|0);
  $screen = $7;
  $8 = $1;
  _vterm_get_size($8,$rows,$cols);
  $9 = $1;
  $10 = $screen;
  HEAP32[$10>>2] = $9;
  $11 = $state;
  $12 = $screen;
  $13 = ((($12)) + 4|0);
  HEAP32[$13>>2] = $11;
  $14 = $screen;
  $15 = ((($14)) + 16|0);
  HEAP32[$15>>2] = 0;
  $16 = $screen;
  $17 = ((($16)) + 20|0);
  HEAP32[$17>>2] = -1;
  $18 = $screen;
  $19 = ((($18)) + 36|0);
  HEAP32[$19>>2] = -1;
  $20 = HEAP32[$rows>>2]|0;
  $21 = $screen;
  $22 = ((($21)) + 60|0);
  HEAP32[$22>>2] = $20;
  $23 = HEAP32[$cols>>2]|0;
  $24 = $screen;
  $25 = ((($24)) + 64|0);
  HEAP32[$25>>2] = $23;
  $26 = $screen;
  $27 = ((($26)) + 8|0);
  HEAP32[$27>>2] = 0;
  $28 = $screen;
  $29 = ((($28)) + 12|0);
  HEAP32[$29>>2] = 0;
  $30 = $screen;
  $31 = HEAP32[$rows>>2]|0;
  $32 = HEAP32[$cols>>2]|0;
  $33 = (_realloc_buffer($30,0,$31,$32)|0);
  $34 = $screen;
  $35 = ((($34)) + 72|0);
  HEAP32[$35>>2] = $33;
  $36 = $screen;
  $37 = ((($36)) + 72|0);
  $38 = HEAP32[$37>>2]|0;
  $39 = $screen;
  $40 = ((($39)) + 80|0);
  HEAP32[$40>>2] = $38;
  $41 = $screen;
  $42 = HEAP32[$41>>2]|0;
  $43 = HEAP32[$cols>>2]|0;
  $44 = ($43*40)|0;
  $45 = (_vterm_allocator_malloc($42,$44)|0);
  $46 = $screen;
  $47 = ((($46)) + 84|0);
  HEAP32[$47>>2] = $45;
  $48 = $screen;
  $49 = ((($48)) + 4|0);
  $50 = HEAP32[$49>>2]|0;
  $51 = $screen;
  _vterm_state_set_callbacks($50,1796,$51);
  $52 = $screen;
  $0 = $52;
  $53 = $0;
  STACKTOP = sp;return ($53|0);
 } else {
  $0 = 0;
  $53 = $0;
  STACKTOP = sp;return ($53|0);
 }
 return (0)|0;
}
function _realloc_buffer($screen,$buffer,$new_rows,$new_cols) {
 $screen = $screen|0;
 $buffer = $buffer|0;
 $new_rows = $new_rows|0;
 $new_cols = $new_cols|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $7 = 0, $8 = 0;
 var $9 = 0, $col = 0, $new_buffer = 0, $new_cell = 0, $row = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $screen;
 $1 = $buffer;
 $2 = $new_rows;
 $3 = $new_cols;
 $4 = $0;
 $5 = HEAP32[$4>>2]|0;
 $6 = $2;
 $7 = $6<<5;
 $8 = $3;
 $9 = Math_imul($7, $8)|0;
 $10 = (_vterm_allocator_malloc($5,$9)|0);
 $new_buffer = $10;
 $row = 0;
 while(1) {
  $11 = $row;
  $12 = $2;
  $13 = ($11|0)<($12|0);
  if (!($13)) {
   break;
  }
  $col = 0;
  while(1) {
   $14 = $col;
   $15 = $3;
   $16 = ($14|0)<($15|0);
   if (!($16)) {
    break;
   }
   $17 = $new_buffer;
   $18 = $row;
   $19 = $3;
   $20 = Math_imul($18, $19)|0;
   $21 = (($17) + ($20<<5)|0);
   $22 = $col;
   $23 = (($21) + ($22<<5)|0);
   $new_cell = $23;
   $24 = $1;
   $25 = ($24|0)!=(0|0);
   if ($25) {
    $26 = $row;
    $27 = $0;
    $28 = ((($27)) + 60|0);
    $29 = HEAP32[$28>>2]|0;
    $30 = ($26|0)<($29|0);
    if ($30) {
     $31 = $col;
     $32 = $0;
     $33 = ((($32)) + 64|0);
     $34 = HEAP32[$33>>2]|0;
     $35 = ($31|0)<($34|0);
     if ($35) {
      $36 = $new_cell;
      $37 = $row;
      $38 = $0;
      $39 = ((($38)) + 64|0);
      $40 = HEAP32[$39>>2]|0;
      $41 = Math_imul($37, $40)|0;
      $42 = $col;
      $43 = (($41) + ($42))|0;
      $44 = $1;
      $45 = (($44) + ($43<<5)|0);
      ;HEAP32[$36>>2]=HEAP32[$45>>2]|0;HEAP32[$36+4>>2]=HEAP32[$45+4>>2]|0;HEAP32[$36+8>>2]=HEAP32[$45+8>>2]|0;HEAP32[$36+12>>2]=HEAP32[$45+12>>2]|0;HEAP32[$36+16>>2]=HEAP32[$45+16>>2]|0;HEAP32[$36+20>>2]=HEAP32[$45+20>>2]|0;HEAP32[$36+24>>2]=HEAP32[$45+24>>2]|0;HEAP32[$36+28>>2]=HEAP32[$45+28>>2]|0;
     } else {
      label = 9;
     }
    } else {
     label = 9;
    }
   } else {
    label = 9;
   }
   if ((label|0) == 9) {
    label = 0;
    $46 = $new_cell;
    HEAP32[$46>>2] = 0;
    $47 = $new_cell;
    $48 = ((($47)) + 24|0);
    $49 = $0;
    $50 = ((($49)) + 88|0);
    ;HEAP32[$48>>2]=HEAP32[$50>>2]|0;HEAP32[$48+4>>2]=HEAP32[$50+4>>2]|0;
   }
   $51 = $col;
   $52 = (($51) + 1)|0;
   $col = $52;
  }
  $53 = $row;
  $54 = (($53) + 1)|0;
  $row = $54;
 }
 $55 = $1;
 $56 = ($55|0)!=(0|0);
 if (!($56)) {
  $60 = $new_buffer;
  STACKTOP = sp;return ($60|0);
 }
 $57 = $0;
 $58 = HEAP32[$57>>2]|0;
 $59 = $1;
 _vterm_allocator_free($58,$59);
 $60 = $new_buffer;
 STACKTOP = sp;return ($60|0);
}
function _attrs_differ($attrs,$a,$b) {
 $attrs = $attrs|0;
 $a = $a|0;
 $b = $b|0;
 var $$byval_copy = 0, $$byval_copy1 = 0, $$byval_copy2 = 0, $$byval_copy3 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0;
 var $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0;
 var $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0;
 var $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0;
 var $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0;
 var $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0;
 var $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0;
 var $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy3 = sp + 25|0;
 $$byval_copy2 = sp + 22|0;
 $$byval_copy1 = sp + 19|0;
 $$byval_copy = sp + 16|0;
 $1 = $attrs;
 $2 = $a;
 $3 = $b;
 $4 = $1;
 $5 = $4 & 1;
 $6 = ($5|0)!=(0);
 if ($6) {
  $7 = $2;
  $8 = ((($7)) + 24|0);
  $9 = ((($8)) + 6|0);
  $10 = HEAP16[$9>>1]|0;
  $11 = $10 & 1;
  $12 = $11&65535;
  $13 = $3;
  $14 = ((($13)) + 24|0);
  $15 = ((($14)) + 6|0);
  $16 = HEAP16[$15>>1]|0;
  $17 = $16 & 1;
  $18 = $17&65535;
  $19 = ($12|0)!=($18|0);
  if ($19) {
   $0 = 1;
   $148 = $0;
   STACKTOP = sp;return ($148|0);
  }
 }
 $20 = $1;
 $21 = $20 & 2;
 $22 = ($21|0)!=(0);
 if ($22) {
  $23 = $2;
  $24 = ((($23)) + 24|0);
  $25 = ((($24)) + 6|0);
  $26 = HEAP16[$25>>1]|0;
  $27 = ($26&65535) >>> 1;
  $28 = $27 & 3;
  $29 = $28&65535;
  $30 = $3;
  $31 = ((($30)) + 24|0);
  $32 = ((($31)) + 6|0);
  $33 = HEAP16[$32>>1]|0;
  $34 = ($33&65535) >>> 1;
  $35 = $34 & 3;
  $36 = $35&65535;
  $37 = ($29|0)!=($36|0);
  if ($37) {
   $0 = 1;
   $148 = $0;
   STACKTOP = sp;return ($148|0);
  }
 }
 $38 = $1;
 $39 = $38 & 4;
 $40 = ($39|0)!=(0);
 if ($40) {
  $41 = $2;
  $42 = ((($41)) + 24|0);
  $43 = ((($42)) + 6|0);
  $44 = HEAP16[$43>>1]|0;
  $45 = ($44&65535) >>> 3;
  $46 = $45 & 1;
  $47 = $46&65535;
  $48 = $3;
  $49 = ((($48)) + 24|0);
  $50 = ((($49)) + 6|0);
  $51 = HEAP16[$50>>1]|0;
  $52 = ($51&65535) >>> 3;
  $53 = $52 & 1;
  $54 = $53&65535;
  $55 = ($47|0)!=($54|0);
  if ($55) {
   $0 = 1;
   $148 = $0;
   STACKTOP = sp;return ($148|0);
  }
 }
 $56 = $1;
 $57 = $56 & 8;
 $58 = ($57|0)!=(0);
 if ($58) {
  $59 = $2;
  $60 = ((($59)) + 24|0);
  $61 = ((($60)) + 6|0);
  $62 = HEAP16[$61>>1]|0;
  $63 = ($62&65535) >>> 4;
  $64 = $63 & 1;
  $65 = $64&65535;
  $66 = $3;
  $67 = ((($66)) + 24|0);
  $68 = ((($67)) + 6|0);
  $69 = HEAP16[$68>>1]|0;
  $70 = ($69&65535) >>> 4;
  $71 = $70 & 1;
  $72 = $71&65535;
  $73 = ($65|0)!=($72|0);
  if ($73) {
   $0 = 1;
   $148 = $0;
   STACKTOP = sp;return ($148|0);
  }
 }
 $74 = $1;
 $75 = $74 & 16;
 $76 = ($75|0)!=(0);
 if ($76) {
  $77 = $2;
  $78 = ((($77)) + 24|0);
  $79 = ((($78)) + 6|0);
  $80 = HEAP16[$79>>1]|0;
  $81 = ($80&65535) >>> 5;
  $82 = $81 & 1;
  $83 = $82&65535;
  $84 = $3;
  $85 = ((($84)) + 24|0);
  $86 = ((($85)) + 6|0);
  $87 = HEAP16[$86>>1]|0;
  $88 = ($87&65535) >>> 5;
  $89 = $88 & 1;
  $90 = $89&65535;
  $91 = ($83|0)!=($90|0);
  if ($91) {
   $0 = 1;
   $148 = $0;
   STACKTOP = sp;return ($148|0);
  }
 }
 $92 = $1;
 $93 = $92 & 32;
 $94 = ($93|0)!=(0);
 if ($94) {
  $95 = $2;
  $96 = ((($95)) + 24|0);
  $97 = ((($96)) + 6|0);
  $98 = HEAP16[$97>>1]|0;
  $99 = ($98&65535) >>> 6;
  $100 = $99 & 1;
  $101 = $100&65535;
  $102 = $3;
  $103 = ((($102)) + 24|0);
  $104 = ((($103)) + 6|0);
  $105 = HEAP16[$104>>1]|0;
  $106 = ($105&65535) >>> 6;
  $107 = $106 & 1;
  $108 = $107&65535;
  $109 = ($101|0)!=($108|0);
  if ($109) {
   $0 = 1;
   $148 = $0;
   STACKTOP = sp;return ($148|0);
  }
 }
 $110 = $1;
 $111 = $110 & 64;
 $112 = ($111|0)!=(0);
 if ($112) {
  $113 = $2;
  $114 = ((($113)) + 24|0);
  $115 = ((($114)) + 6|0);
  $116 = HEAP16[$115>>1]|0;
  $117 = ($116&65535) >>> 7;
  $118 = $117 & 15;
  $119 = $118&65535;
  $120 = $3;
  $121 = ((($120)) + 24|0);
  $122 = ((($121)) + 6|0);
  $123 = HEAP16[$122>>1]|0;
  $124 = ($123&65535) >>> 7;
  $125 = $124 & 15;
  $126 = $125&65535;
  $127 = ($119|0)!=($126|0);
  if ($127) {
   $0 = 1;
   $148 = $0;
   STACKTOP = sp;return ($148|0);
  }
 }
 $128 = $1;
 $129 = $128 & 128;
 $130 = ($129|0)!=(0);
 if ($130) {
  $131 = $2;
  $132 = ((($131)) + 24|0);
  $133 = $3;
  $134 = ((($133)) + 24|0);
  ;HEAP8[$$byval_copy>>0]=HEAP8[$132>>0]|0;HEAP8[$$byval_copy+1>>0]=HEAP8[$132+1>>0]|0;HEAP8[$$byval_copy+2>>0]=HEAP8[$132+2>>0]|0;
  ;HEAP8[$$byval_copy1>>0]=HEAP8[$134>>0]|0;HEAP8[$$byval_copy1+1>>0]=HEAP8[$134+1>>0]|0;HEAP8[$$byval_copy1+2>>0]=HEAP8[$134+2>>0]|0;
  $135 = (_vterm_color_equal($$byval_copy,$$byval_copy1)|0);
  $136 = ($135|0)!=(0);
  if (!($136)) {
   $0 = 1;
   $148 = $0;
   STACKTOP = sp;return ($148|0);
  }
 }
 $137 = $1;
 $138 = $137 & 256;
 $139 = ($138|0)!=(0);
 if ($139) {
  $140 = $2;
  $141 = ((($140)) + 24|0);
  $142 = ((($141)) + 3|0);
  $143 = $3;
  $144 = ((($143)) + 24|0);
  $145 = ((($144)) + 3|0);
  ;HEAP8[$$byval_copy2>>0]=HEAP8[$142>>0]|0;HEAP8[$$byval_copy2+1>>0]=HEAP8[$142+1>>0]|0;HEAP8[$$byval_copy2+2>>0]=HEAP8[$142+2>>0]|0;
  ;HEAP8[$$byval_copy3>>0]=HEAP8[$145>>0]|0;HEAP8[$$byval_copy3+1>>0]=HEAP8[$145+1>>0]|0;HEAP8[$$byval_copy3+2>>0]=HEAP8[$145+2>>0]|0;
  $146 = (_vterm_color_equal($$byval_copy2,$$byval_copy3)|0);
  $147 = ($146|0)!=(0);
  if (!($147)) {
   $0 = 1;
   $148 = $0;
   STACKTOP = sp;return ($148|0);
  }
 }
 $0 = 0;
 $148 = $0;
 STACKTOP = sp;return ($148|0);
}
function _utf8_seqlen32($codepoint) {
 $codepoint = $codepoint|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $codepoint;
 $2 = $1;
 $3 = ($2|0)<(128);
 do {
  if ($3) {
   $0 = 1;
  } else {
   $4 = $1;
   $5 = ($4|0)<(2048);
   if ($5) {
    $0 = 2;
    break;
   }
   $6 = $1;
   $7 = ($6|0)<(65536);
   if ($7) {
    $0 = 3;
    break;
   }
   $8 = $1;
   $9 = ($8|0)<(2097152);
   if ($9) {
    $0 = 4;
    break;
   }
   $10 = $1;
   $11 = ($10|0)<(67108864);
   if ($11) {
    $0 = 5;
    break;
   } else {
    $0 = 6;
    break;
   }
  }
 } while(0);
 $12 = $0;
 STACKTOP = sp;return ($12|0);
}
function _fill_utf833($codepoint,$str) {
 $codepoint = $codepoint|0;
 $str = $str|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $b = 0, $nbytes = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $codepoint;
 $1 = $str;
 $2 = $0;
 $3 = (_utf8_seqlen32($2)|0);
 $nbytes = $3;
 $4 = $nbytes;
 $b = $4;
 while(1) {
  $5 = $b;
  $6 = ($5|0)>(1);
  if (!($6)) {
   break;
  }
  $7 = $b;
  $8 = (($7) + -1)|0;
  $b = $8;
  $9 = $0;
  $10 = $9 & 63;
  $11 = 128 | $10;
  $12 = $11&255;
  $13 = $b;
  $14 = $1;
  $15 = (($14) + ($13)|0);
  HEAP8[$15>>0] = $12;
  $16 = $0;
  $17 = $16 >> 6;
  $0 = $17;
 }
 $18 = $nbytes;
 switch ($18|0) {
 case 1:  {
  $19 = $0;
  $20 = $19 & 127;
  $21 = $20&255;
  $22 = $1;
  HEAP8[$22>>0] = $21;
  break;
 }
 case 2:  {
  $23 = $0;
  $24 = $23 & 31;
  $25 = 192 | $24;
  $26 = $25&255;
  $27 = $1;
  HEAP8[$27>>0] = $26;
  break;
 }
 case 3:  {
  $28 = $0;
  $29 = $28 & 15;
  $30 = 224 | $29;
  $31 = $30&255;
  $32 = $1;
  HEAP8[$32>>0] = $31;
  break;
 }
 case 4:  {
  $33 = $0;
  $34 = $33 & 7;
  $35 = 240 | $34;
  $36 = $35&255;
  $37 = $1;
  HEAP8[$37>>0] = $36;
  break;
 }
 case 5:  {
  $38 = $0;
  $39 = $38 & 3;
  $40 = 248 | $39;
  $41 = $40&255;
  $42 = $1;
  HEAP8[$42>>0] = $41;
  break;
 }
 case 6:  {
  $43 = $0;
  $44 = $43 & 1;
  $45 = 252 | $44;
  $46 = $45&255;
  $47 = $1;
  HEAP8[$47>>0] = $46;
  break;
 }
 default: {
 }
 }
 $48 = $nbytes;
 STACKTOP = sp;return ($48|0);
}
function _putglyph($info,$pos,$user) {
 $info = $info|0;
 $pos = $pos|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0;
 var $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0;
 var $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0;
 var $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0;
 var $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0;
 var $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $cell = 0, $col = 0, $i = 0, $rect = 0, $rect$byval_copy = 0, $screen = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect$byval_copy = sp + 48|0;
 $rect = sp;
 $1 = $info;
 $2 = $user;
 $3 = $2;
 $screen = $3;
 $4 = $screen;
 $5 = HEAP32[$pos>>2]|0;
 $6 = ((($pos)) + 4|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = (_getcell($4,$5,$7)|0);
 $cell = $8;
 $9 = $cell;
 $10 = ($9|0)!=(0|0);
 if (!($10)) {
  $0 = 0;
  $110 = $0;
  STACKTOP = sp;return ($110|0);
 }
 $i = 0;
 while(1) {
  $11 = $i;
  $12 = ($11|0)<(6);
  if ($12) {
   $13 = $i;
   $14 = $1;
   $15 = HEAP32[$14>>2]|0;
   $16 = (($15) + ($13<<2)|0);
   $17 = HEAP32[$16>>2]|0;
   $18 = ($17|0)!=(0);
   $111 = $18;
  } else {
   $111 = 0;
  }
  $19 = $i;
  if (!($111)) {
   break;
  }
  $20 = $1;
  $21 = HEAP32[$20>>2]|0;
  $22 = (($21) + ($19<<2)|0);
  $23 = HEAP32[$22>>2]|0;
  $24 = $i;
  $25 = $cell;
  $26 = (($25) + ($24<<2)|0);
  HEAP32[$26>>2] = $23;
  $27 = $cell;
  $28 = ((($27)) + 24|0);
  $29 = $screen;
  $30 = ((($29)) + 88|0);
  ;HEAP32[$28>>2]=HEAP32[$30>>2]|0;HEAP32[$28+4>>2]=HEAP32[$30+4>>2]|0;
  $31 = $i;
  $32 = (($31) + 1)|0;
  $i = $32;
 }
 $33 = ($19|0)<(6);
 if ($33) {
  $34 = $i;
  $35 = $cell;
  $36 = (($35) + ($34<<2)|0);
  HEAP32[$36>>2] = 0;
 }
 $col = 1;
 while(1) {
  $37 = $col;
  $38 = $1;
  $39 = ((($38)) + 4|0);
  $40 = HEAP32[$39>>2]|0;
  $41 = ($37|0)<($40|0);
  if (!($41)) {
   break;
  }
  $42 = $screen;
  $43 = HEAP32[$pos>>2]|0;
  $44 = ((($pos)) + 4|0);
  $45 = HEAP32[$44>>2]|0;
  $46 = $col;
  $47 = (($45) + ($46))|0;
  $48 = (_getcell($42,$43,$47)|0);
  HEAP32[$48>>2] = -1;
  $49 = $col;
  $50 = (($49) + 1)|0;
  $col = $50;
 }
 $51 = HEAP32[$pos>>2]|0;
 HEAP32[$rect>>2] = $51;
 $52 = ((($rect)) + 4|0);
 $53 = HEAP32[$pos>>2]|0;
 $54 = (($53) + 1)|0;
 HEAP32[$52>>2] = $54;
 $55 = ((($rect)) + 8|0);
 $56 = ((($pos)) + 4|0);
 $57 = HEAP32[$56>>2]|0;
 HEAP32[$55>>2] = $57;
 $58 = ((($rect)) + 12|0);
 $59 = ((($pos)) + 4|0);
 $60 = HEAP32[$59>>2]|0;
 $61 = $1;
 $62 = ((($61)) + 4|0);
 $63 = HEAP32[$62>>2]|0;
 $64 = (($60) + ($63))|0;
 HEAP32[$58>>2] = $64;
 $65 = $1;
 $66 = ((($65)) + 8|0);
 $67 = HEAP8[$66>>0]|0;
 $68 = $67 & 1;
 $69 = $68&255;
 $70 = $cell;
 $71 = ((($70)) + 24|0);
 $72 = ((($71)) + 6|0);
 $73 = $69&65535;
 $74 = HEAP16[$72>>1]|0;
 $75 = $73 & 1;
 $76 = ($75 << 11)&65535;
 $77 = $74 & -2049;
 $78 = $77 | $76;
 HEAP16[$72>>1] = $78;
 $79 = $1;
 $80 = ((($79)) + 8|0);
 $81 = HEAP8[$80>>0]|0;
 $82 = ($81&255) >>> 1;
 $83 = $82 & 1;
 $84 = $83&255;
 $85 = $cell;
 $86 = ((($85)) + 24|0);
 $87 = ((($86)) + 6|0);
 $88 = $84&65535;
 $89 = HEAP16[$87>>1]|0;
 $90 = $88 & 1;
 $91 = ($90 << 12)&65535;
 $92 = $89 & -4097;
 $93 = $92 | $91;
 HEAP16[$87>>1] = $93;
 $94 = $1;
 $95 = ((($94)) + 8|0);
 $96 = HEAP8[$95>>0]|0;
 $97 = ($96&255) >>> 2;
 $98 = $97 & 3;
 $99 = $98&255;
 $100 = $cell;
 $101 = ((($100)) + 24|0);
 $102 = ((($101)) + 6|0);
 $103 = $99&65535;
 $104 = HEAP16[$102>>1]|0;
 $105 = $103 & 3;
 $106 = ($105 << 13)&65535;
 $107 = $104 & -24577;
 $108 = $107 | $106;
 HEAP16[$102>>1] = $108;
 $109 = $screen;
 ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
 _damagerect($109,$rect$byval_copy);
 $0 = 1;
 $110 = $0;
 STACKTOP = sp;return ($110|0);
}
function _damagerect($screen,$rect) {
 $screen = $screen|0;
 $rect = $rect|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $8 = 0, $9 = 0, $emit = 0, $emit$byval_copy = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $emit$byval_copy = sp + 32|0;
 $vararg_buffer = sp;
 $emit = sp + 8|0;
 $0 = $screen;
 $1 = $0;
 $2 = ((($1)) + 16|0);
 $3 = HEAP32[$2>>2]|0;
 L1: do {
  switch ($3|0) {
  case 0:  {
   ;HEAP32[$emit>>2]=HEAP32[$rect>>2]|0;HEAP32[$emit+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$emit+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$emit+12>>2]=HEAP32[$rect+12>>2]|0;
   break;
  }
  case 1:  {
   $4 = ((($rect)) + 4|0);
   $5 = HEAP32[$4>>2]|0;
   $6 = HEAP32[$rect>>2]|0;
   $7 = (($6) + 1)|0;
   $8 = ($5|0)>($7|0);
   $9 = $0;
   if ($8) {
    _vterm_screen_flush_damage($9);
    ;HEAP32[$emit>>2]=HEAP32[$rect>>2]|0;HEAP32[$emit+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$emit+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$emit+12>>2]=HEAP32[$rect+12>>2]|0;
    break L1;
   }
   $10 = ((($9)) + 20|0);
   $11 = HEAP32[$10>>2]|0;
   $12 = ($11|0)==(-1);
   if ($12) {
    $13 = $0;
    $14 = ((($13)) + 20|0);
    ;HEAP32[$14>>2]=HEAP32[$rect>>2]|0;HEAP32[$14+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$14+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$14+12>>2]=HEAP32[$rect+12>>2]|0;
    STACKTOP = sp;return;
   }
   $15 = HEAP32[$rect>>2]|0;
   $16 = $0;
   $17 = ((($16)) + 20|0);
   $18 = HEAP32[$17>>2]|0;
   $19 = ($15|0)==($18|0);
   $20 = $0;
   $21 = ((($20)) + 20|0);
   if (!($19)) {
    ;HEAP32[$emit>>2]=HEAP32[$21>>2]|0;HEAP32[$emit+4>>2]=HEAP32[$21+4>>2]|0;HEAP32[$emit+8>>2]=HEAP32[$21+8>>2]|0;HEAP32[$emit+12>>2]=HEAP32[$21+12>>2]|0;
    $44 = $0;
    $45 = ((($44)) + 20|0);
    ;HEAP32[$45>>2]=HEAP32[$rect>>2]|0;HEAP32[$45+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$45+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$45+12>>2]=HEAP32[$rect+12>>2]|0;
    break L1;
   }
   $22 = ((($21)) + 8|0);
   $23 = HEAP32[$22>>2]|0;
   $24 = ((($rect)) + 8|0);
   $25 = HEAP32[$24>>2]|0;
   $26 = ($23|0)>($25|0);
   if ($26) {
    $27 = ((($rect)) + 8|0);
    $28 = HEAP32[$27>>2]|0;
    $29 = $0;
    $30 = ((($29)) + 20|0);
    $31 = ((($30)) + 8|0);
    HEAP32[$31>>2] = $28;
   }
   $32 = $0;
   $33 = ((($32)) + 20|0);
   $34 = ((($33)) + 12|0);
   $35 = HEAP32[$34>>2]|0;
   $36 = ((($rect)) + 12|0);
   $37 = HEAP32[$36>>2]|0;
   $38 = ($35|0)<($37|0);
   if (!($38)) {
    STACKTOP = sp;return;
   }
   $39 = ((($rect)) + 12|0);
   $40 = HEAP32[$39>>2]|0;
   $41 = $0;
   $42 = ((($41)) + 20|0);
   $43 = ((($42)) + 12|0);
   HEAP32[$43>>2] = $40;
   STACKTOP = sp;return;
   break;
  }
  case 3: case 2:  {
   $46 = $0;
   $47 = ((($46)) + 20|0);
   $48 = HEAP32[$47>>2]|0;
   $49 = ($48|0)==(-1);
   $50 = $0;
   $51 = ((($50)) + 20|0);
   if ($49) {
    ;HEAP32[$51>>2]=HEAP32[$rect>>2]|0;HEAP32[$51+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$51+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$51+12>>2]=HEAP32[$rect+12>>2]|0;
    STACKTOP = sp;return;
   } else {
    _rect_expand($51,$rect);
    STACKTOP = sp;return;
   }
   break;
  }
  default: {
   $52 = HEAP32[3064>>2]|0;
   $53 = $0;
   $54 = ((($53)) + 16|0);
   $55 = HEAP32[$54>>2]|0;
   HEAP32[$vararg_buffer>>2] = $55;
   (_fprintf($52,4562,$vararg_buffer)|0);
   STACKTOP = sp;return;
  }
  }
 } while(0);
 $56 = $0;
 $57 = ((($56)) + 8|0);
 $58 = HEAP32[$57>>2]|0;
 $59 = ($58|0)!=(0|0);
 if (!($59)) {
  STACKTOP = sp;return;
 }
 $60 = $0;
 $61 = ((($60)) + 8|0);
 $62 = HEAP32[$61>>2]|0;
 $63 = HEAP32[$62>>2]|0;
 $64 = ($63|0)!=(0|0);
 if (!($64)) {
  STACKTOP = sp;return;
 }
 $65 = $0;
 $66 = ((($65)) + 8|0);
 $67 = HEAP32[$66>>2]|0;
 $68 = HEAP32[$67>>2]|0;
 $69 = $0;
 $70 = ((($69)) + 12|0);
 $71 = HEAP32[$70>>2]|0;
 ;HEAP32[$emit$byval_copy>>2]=HEAP32[$emit>>2]|0;HEAP32[$emit$byval_copy+4>>2]=HEAP32[$emit+4>>2]|0;HEAP32[$emit$byval_copy+8>>2]=HEAP32[$emit+8>>2]|0;HEAP32[$emit$byval_copy+12>>2]=HEAP32[$emit+12>>2]|0;
 (FUNCTION_TABLE_iii[$68 & 31]($emit$byval_copy,$71)|0);
 STACKTOP = sp;return;
}
function _rect_expand($dst,$src) {
 $dst = $dst|0;
 $src = $src|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $dst;
 $1 = $src;
 $2 = $0;
 $3 = HEAP32[$2>>2]|0;
 $4 = $1;
 $5 = HEAP32[$4>>2]|0;
 $6 = ($3|0)>($5|0);
 if ($6) {
  $7 = $1;
  $8 = HEAP32[$7>>2]|0;
  $9 = $0;
  HEAP32[$9>>2] = $8;
 }
 $10 = $0;
 $11 = ((($10)) + 8|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = $1;
 $14 = ((($13)) + 8|0);
 $15 = HEAP32[$14>>2]|0;
 $16 = ($12|0)>($15|0);
 if ($16) {
  $17 = $1;
  $18 = ((($17)) + 8|0);
  $19 = HEAP32[$18>>2]|0;
  $20 = $0;
  $21 = ((($20)) + 8|0);
  HEAP32[$21>>2] = $19;
 }
 $22 = $0;
 $23 = ((($22)) + 4|0);
 $24 = HEAP32[$23>>2]|0;
 $25 = $1;
 $26 = ((($25)) + 4|0);
 $27 = HEAP32[$26>>2]|0;
 $28 = ($24|0)<($27|0);
 if ($28) {
  $29 = $1;
  $30 = ((($29)) + 4|0);
  $31 = HEAP32[$30>>2]|0;
  $32 = $0;
  $33 = ((($32)) + 4|0);
  HEAP32[$33>>2] = $31;
 }
 $34 = $0;
 $35 = ((($34)) + 12|0);
 $36 = HEAP32[$35>>2]|0;
 $37 = $1;
 $38 = ((($37)) + 12|0);
 $39 = HEAP32[$38>>2]|0;
 $40 = ($36|0)<($39|0);
 if (!($40)) {
  STACKTOP = sp;return;
 }
 $41 = $1;
 $42 = ((($41)) + 12|0);
 $43 = HEAP32[$42>>2]|0;
 $44 = $0;
 $45 = ((($44)) + 12|0);
 HEAP32[$45>>2] = $43;
 STACKTOP = sp;return;
}
function _movecursor($pos,$oldpos,$visible,$user) {
 $pos = $pos|0;
 $oldpos = $oldpos|0;
 $visible = $visible|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $3 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $oldpos$byval_copy = 0, $pos$byval_copy = 0, $screen = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $oldpos$byval_copy = sp + 24|0;
 $pos$byval_copy = sp + 16|0;
 $1 = $visible;
 $2 = $user;
 $3 = $2;
 $screen = $3;
 $4 = $screen;
 $5 = ((($4)) + 8|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)!=(0|0);
 if ($7) {
  $8 = $screen;
  $9 = ((($8)) + 8|0);
  $10 = HEAP32[$9>>2]|0;
  $11 = ((($10)) + 8|0);
  $12 = HEAP32[$11>>2]|0;
  $13 = ($12|0)!=(0|0);
  if ($13) {
   $14 = $screen;
   $15 = ((($14)) + 8|0);
   $16 = HEAP32[$15>>2]|0;
   $17 = ((($16)) + 8|0);
   $18 = HEAP32[$17>>2]|0;
   $19 = $1;
   $20 = $screen;
   $21 = ((($20)) + 12|0);
   $22 = HEAP32[$21>>2]|0;
   ;HEAP32[$pos$byval_copy>>2]=HEAP32[$pos>>2]|0;HEAP32[$pos$byval_copy+4>>2]=HEAP32[$pos+4>>2]|0;
   ;HEAP32[$oldpos$byval_copy>>2]=HEAP32[$oldpos>>2]|0;HEAP32[$oldpos$byval_copy+4>>2]=HEAP32[$oldpos+4>>2]|0;
   $23 = (FUNCTION_TABLE_iiiii[$18 & 15]($pos$byval_copy,$oldpos$byval_copy,$19,$22)|0);
   $0 = $23;
   $24 = $0;
   STACKTOP = sp;return ($24|0);
  }
 }
 $0 = 0;
 $24 = $0;
 STACKTOP = sp;return ($24|0);
}
function _scrollrect($rect,$downward,$rightward,$user) {
 $rect = $rect|0;
 $downward = $downward|0;
 $rightward = $rightward|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0;
 var $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0;
 var $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0;
 var $96 = 0, $97 = 0, $98 = 0, $99 = 0, $or$cond = 0, $or$cond3 = 0, $or$cond5 = 0, $rect$byval_copy = 0, $rect$byval_copy13 = 0, $rect$byval_copy14 = 0, $screen = 0, $vararg_buffer = 0, $vararg_ptr10 = 0, $vararg_ptr11 = 0, $vararg_ptr12 = 0, $vararg_ptr6 = 0, $vararg_ptr7 = 0, $vararg_ptr8 = 0, $vararg_ptr9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect$byval_copy14 = sp + 88|0;
 $rect$byval_copy13 = sp + 72|0;
 $rect$byval_copy = sp + 56|0;
 $vararg_buffer = sp;
 $1 = $downward;
 $2 = $rightward;
 $3 = $user;
 $4 = $3;
 $screen = $4;
 $5 = $screen;
 $6 = ((($5)) + 16|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = ($7|0)!=(3);
 if ($8) {
  $9 = $1;
  $10 = $2;
  $11 = $screen;
  ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
  _vterm_scroll_rect($rect$byval_copy,$9,$10,29,30,$11);
  $12 = $screen;
  _vterm_screen_flush_damage($12);
  $13 = $1;
  $14 = $2;
  $15 = $screen;
  ;HEAP32[$rect$byval_copy13>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy13+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy13+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy13+12>>2]=HEAP32[$rect+12>>2]|0;
  _vterm_scroll_rect($rect$byval_copy13,$13,$14,27,28,$15);
  $0 = 1;
  $203 = $0;
  STACKTOP = sp;return ($203|0);
 }
 $16 = $screen;
 $17 = ((($16)) + 20|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = ($18|0)!=(-1);
 if ($19) {
  $20 = $screen;
  $21 = ((($20)) + 20|0);
  $22 = (_rect_intersects($rect,$21)|0);
  $23 = ($22|0)!=(0);
  if (!($23)) {
   $24 = $screen;
   _vterm_screen_flush_damage($24);
  }
 }
 $25 = $screen;
 $26 = ((($25)) + 36|0);
 $27 = HEAP32[$26>>2]|0;
 $28 = ($27|0)==(-1);
 $29 = $screen;
 $30 = ((($29)) + 36|0);
 L9: do {
  if ($28) {
   ;HEAP32[$30>>2]=HEAP32[$rect>>2]|0;HEAP32[$30+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$30+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$30+12>>2]=HEAP32[$rect+12>>2]|0;
   $31 = $1;
   $32 = $screen;
   $33 = ((($32)) + 52|0);
   HEAP32[$33>>2] = $31;
   $34 = $2;
   $35 = $screen;
   $36 = ((($35)) + 56|0);
   HEAP32[$36>>2] = $34;
  } else {
   $37 = (_rect_equal($30,$rect)|0);
   $38 = ($37|0)!=(0);
   do {
    if ($38) {
     $39 = $screen;
     $40 = ((($39)) + 52|0);
     $41 = HEAP32[$40>>2]|0;
     $42 = ($41|0)==(0);
     $43 = $1;
     $44 = ($43|0)==(0);
     $or$cond = $42 & $44;
     if (!($or$cond)) {
      $45 = $screen;
      $46 = ((($45)) + 56|0);
      $47 = HEAP32[$46>>2]|0;
      $48 = ($47|0)==(0);
      $49 = $2;
      $50 = ($49|0)==(0);
      $or$cond3 = $48 & $50;
      if (!($or$cond3)) {
       break;
      }
     }
     $51 = $1;
     $52 = $screen;
     $53 = ((($52)) + 52|0);
     $54 = HEAP32[$53>>2]|0;
     $55 = (($54) + ($51))|0;
     HEAP32[$53>>2] = $55;
     $56 = $2;
     $57 = $screen;
     $58 = ((($57)) + 56|0);
     $59 = HEAP32[$58>>2]|0;
     $60 = (($59) + ($56))|0;
     HEAP32[$58>>2] = $60;
     break L9;
    }
   } while(0);
   $61 = $screen;
   _vterm_screen_flush_damage($61);
   $62 = $screen;
   $63 = ((($62)) + 36|0);
   ;HEAP32[$63>>2]=HEAP32[$rect>>2]|0;HEAP32[$63+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$63+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$63+12>>2]=HEAP32[$rect+12>>2]|0;
   $64 = $1;
   $65 = $screen;
   $66 = ((($65)) + 52|0);
   HEAP32[$66>>2] = $64;
   $67 = $2;
   $68 = $screen;
   $69 = ((($68)) + 56|0);
   HEAP32[$69>>2] = $67;
  }
 } while(0);
 $70 = $1;
 $71 = $2;
 $72 = $screen;
 ;HEAP32[$rect$byval_copy14>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy14+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy14+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy14+12>>2]=HEAP32[$rect+12>>2]|0;
 _vterm_scroll_rect($rect$byval_copy14,$70,$71,29,30,$72);
 $73 = $screen;
 $74 = ((($73)) + 20|0);
 $75 = HEAP32[$74>>2]|0;
 $76 = ($75|0)==(-1);
 if ($76) {
  $0 = 1;
  $203 = $0;
  STACKTOP = sp;return ($203|0);
 }
 $77 = $screen;
 $78 = ((($77)) + 20|0);
 $79 = (_rect_contains($rect,$78)|0);
 $80 = ($79|0)!=(0);
 do {
  if ($80) {
   $81 = $screen;
   $82 = ((($81)) + 20|0);
   $83 = $1;
   $84 = (0 - ($83))|0;
   $85 = $2;
   $86 = (0 - ($85))|0;
   _vterm_rect_move($82,$84,$86);
   $87 = $screen;
   $88 = ((($87)) + 20|0);
   _rect_clip($88,$rect);
  } else {
   $89 = ((($rect)) + 8|0);
   $90 = HEAP32[$89>>2]|0;
   $91 = $screen;
   $92 = ((($91)) + 20|0);
   $93 = ((($92)) + 8|0);
   $94 = HEAP32[$93>>2]|0;
   $95 = ($90|0)<=($94|0);
   if ($95) {
    $96 = ((($rect)) + 12|0);
    $97 = HEAP32[$96>>2]|0;
    $98 = $screen;
    $99 = ((($98)) + 20|0);
    $100 = ((($99)) + 12|0);
    $101 = HEAP32[$100>>2]|0;
    $102 = ($97|0)>=($101|0);
    $103 = $2;
    $104 = ($103|0)==(0);
    $or$cond5 = $102 & $104;
    if ($or$cond5) {
     $105 = $screen;
     $106 = ((($105)) + 20|0);
     $107 = HEAP32[$106>>2]|0;
     $108 = HEAP32[$rect>>2]|0;
     $109 = ($107|0)>=($108|0);
     if ($109) {
      $110 = $screen;
      $111 = ((($110)) + 20|0);
      $112 = HEAP32[$111>>2]|0;
      $113 = ((($rect)) + 4|0);
      $114 = HEAP32[$113>>2]|0;
      $115 = ($112|0)<($114|0);
      if ($115) {
       $116 = $1;
       $117 = $screen;
       $118 = ((($117)) + 20|0);
       $119 = HEAP32[$118>>2]|0;
       $120 = (($119) - ($116))|0;
       HEAP32[$118>>2] = $120;
       $121 = $screen;
       $122 = ((($121)) + 20|0);
       $123 = HEAP32[$122>>2]|0;
       $124 = HEAP32[$rect>>2]|0;
       $125 = ($123|0)<($124|0);
       if ($125) {
        $126 = HEAP32[$rect>>2]|0;
        $127 = $screen;
        $128 = ((($127)) + 20|0);
        HEAP32[$128>>2] = $126;
       }
       $129 = $screen;
       $130 = ((($129)) + 20|0);
       $131 = HEAP32[$130>>2]|0;
       $132 = ((($rect)) + 4|0);
       $133 = HEAP32[$132>>2]|0;
       $134 = ($131|0)>($133|0);
       if ($134) {
        $135 = ((($rect)) + 4|0);
        $136 = HEAP32[$135>>2]|0;
        $137 = $screen;
        $138 = ((($137)) + 20|0);
        HEAP32[$138>>2] = $136;
       }
      }
     }
     $139 = $screen;
     $140 = ((($139)) + 20|0);
     $141 = ((($140)) + 4|0);
     $142 = HEAP32[$141>>2]|0;
     $143 = HEAP32[$rect>>2]|0;
     $144 = ($142|0)>=($143|0);
     if (!($144)) {
      break;
     }
     $145 = $screen;
     $146 = ((($145)) + 20|0);
     $147 = ((($146)) + 4|0);
     $148 = HEAP32[$147>>2]|0;
     $149 = ((($rect)) + 4|0);
     $150 = HEAP32[$149>>2]|0;
     $151 = ($148|0)<($150|0);
     if (!($151)) {
      break;
     }
     $152 = $1;
     $153 = $screen;
     $154 = ((($153)) + 20|0);
     $155 = ((($154)) + 4|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = (($156) - ($152))|0;
     HEAP32[$155>>2] = $157;
     $158 = $screen;
     $159 = ((($158)) + 20|0);
     $160 = ((($159)) + 4|0);
     $161 = HEAP32[$160>>2]|0;
     $162 = HEAP32[$rect>>2]|0;
     $163 = ($161|0)<($162|0);
     if ($163) {
      $164 = HEAP32[$rect>>2]|0;
      $165 = $screen;
      $166 = ((($165)) + 20|0);
      $167 = ((($166)) + 4|0);
      HEAP32[$167>>2] = $164;
     }
     $168 = $screen;
     $169 = ((($168)) + 20|0);
     $170 = ((($169)) + 4|0);
     $171 = HEAP32[$170>>2]|0;
     $172 = ((($rect)) + 4|0);
     $173 = HEAP32[$172>>2]|0;
     $174 = ($171|0)>($173|0);
     if (!($174)) {
      break;
     }
     $175 = ((($rect)) + 4|0);
     $176 = HEAP32[$175>>2]|0;
     $177 = $screen;
     $178 = ((($177)) + 20|0);
     $179 = ((($178)) + 4|0);
     HEAP32[$179>>2] = $176;
     break;
    }
   }
   $180 = HEAP32[3064>>2]|0;
   $181 = $screen;
   $182 = ((($181)) + 20|0);
   $183 = HEAP32[$182>>2]|0;
   $184 = $screen;
   $185 = ((($184)) + 20|0);
   $186 = ((($185)) + 8|0);
   $187 = HEAP32[$186>>2]|0;
   $188 = $screen;
   $189 = ((($188)) + 20|0);
   $190 = ((($189)) + 4|0);
   $191 = HEAP32[$190>>2]|0;
   $192 = $screen;
   $193 = ((($192)) + 20|0);
   $194 = ((($193)) + 12|0);
   $195 = HEAP32[$194>>2]|0;
   $196 = HEAP32[$rect>>2]|0;
   $197 = ((($rect)) + 8|0);
   $198 = HEAP32[$197>>2]|0;
   $199 = ((($rect)) + 4|0);
   $200 = HEAP32[$199>>2]|0;
   $201 = ((($rect)) + 12|0);
   $202 = HEAP32[$201>>2]|0;
   HEAP32[$vararg_buffer>>2] = $183;
   $vararg_ptr6 = ((($vararg_buffer)) + 4|0);
   HEAP32[$vararg_ptr6>>2] = $187;
   $vararg_ptr7 = ((($vararg_buffer)) + 8|0);
   HEAP32[$vararg_ptr7>>2] = $191;
   $vararg_ptr8 = ((($vararg_buffer)) + 12|0);
   HEAP32[$vararg_ptr8>>2] = $195;
   $vararg_ptr9 = ((($vararg_buffer)) + 16|0);
   HEAP32[$vararg_ptr9>>2] = $196;
   $vararg_ptr10 = ((($vararg_buffer)) + 20|0);
   HEAP32[$vararg_ptr10>>2] = $198;
   $vararg_ptr11 = ((($vararg_buffer)) + 24|0);
   HEAP32[$vararg_ptr11>>2] = $200;
   $vararg_ptr12 = ((($vararg_buffer)) + 28|0);
   HEAP32[$vararg_ptr12>>2] = $202;
   (_fprintf($180,4494,$vararg_buffer)|0);
  }
 } while(0);
 $0 = 1;
 $203 = $0;
 STACKTOP = sp;return ($203|0);
}
function _moverect_internal($dest,$src,$user) {
 $dest = $dest|0;
 $src = $src|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0;
 var $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0;
 var $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0;
 var $96 = 0, $97 = 0, $98 = 0, $99 = 0, $cols = 0, $downward = 0, $inc_row = 0, $init_row = 0, $pos = 0, $pos$byval_copy = 0, $row = 0, $screen = 0, $test_row = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $pos$byval_copy = sp + 40|0;
 $pos = sp + 24|0;
 $0 = $user;
 $1 = $0;
 $screen = $1;
 $2 = $screen;
 $3 = ((($2)) + 8|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($4|0)!=(0|0);
 L1: do {
  if ($5) {
   $6 = $screen;
   $7 = ((($6)) + 8|0);
   $8 = HEAP32[$7>>2]|0;
   $9 = ((($8)) + 24|0);
   $10 = HEAP32[$9>>2]|0;
   $11 = ($10|0)!=(0|0);
   if ($11) {
    $12 = HEAP32[$dest>>2]|0;
    $13 = ($12|0)==(0);
    if ($13) {
     $14 = ((($dest)) + 8|0);
     $15 = HEAP32[$14>>2]|0;
     $16 = ($15|0)==(0);
     if ($16) {
      $17 = ((($dest)) + 12|0);
      $18 = HEAP32[$17>>2]|0;
      $19 = $screen;
      $20 = ((($19)) + 64|0);
      $21 = HEAP32[$20>>2]|0;
      $22 = ($18|0)==($21|0);
      if ($22) {
       $23 = $screen;
       $24 = ((($23)) + 80|0);
       $25 = HEAP32[$24>>2]|0;
       $26 = $screen;
       $27 = ((($26)) + 72|0);
       $28 = HEAP32[$27>>2]|0;
       $29 = ($25|0)==($28|0);
       if ($29) {
        HEAP32[$pos>>2] = 0;
        while(1) {
         $30 = HEAP32[$pos>>2]|0;
         $31 = HEAP32[$src>>2]|0;
         $32 = ($30|0)<($31|0);
         if (!($32)) {
          break L1;
         }
         $33 = ((($pos)) + 4|0);
         HEAP32[$33>>2] = 0;
         while(1) {
          $34 = ((($pos)) + 4|0);
          $35 = HEAP32[$34>>2]|0;
          $36 = $screen;
          $37 = ((($36)) + 64|0);
          $38 = HEAP32[$37>>2]|0;
          $39 = ($35|0)<($38|0);
          $40 = $screen;
          if (!($39)) {
           break;
          }
          $41 = $screen;
          $42 = ((($41)) + 84|0);
          $43 = HEAP32[$42>>2]|0;
          $44 = ((($pos)) + 4|0);
          $45 = HEAP32[$44>>2]|0;
          $46 = (($43) + (($45*40)|0)|0);
          ;HEAP32[$pos$byval_copy>>2]=HEAP32[$pos>>2]|0;HEAP32[$pos$byval_copy+4>>2]=HEAP32[$pos+4>>2]|0;
          (_vterm_screen_get_cell($40,$pos$byval_copy,$46)|0);
          $47 = ((($pos)) + 4|0);
          $48 = HEAP32[$47>>2]|0;
          $49 = (($48) + 1)|0;
          HEAP32[$47>>2] = $49;
         }
         $50 = ((($40)) + 8|0);
         $51 = HEAP32[$50>>2]|0;
         $52 = ((($51)) + 24|0);
         $53 = HEAP32[$52>>2]|0;
         $54 = $screen;
         $55 = ((($54)) + 64|0);
         $56 = HEAP32[$55>>2]|0;
         $57 = $screen;
         $58 = ((($57)) + 84|0);
         $59 = HEAP32[$58>>2]|0;
         $60 = $screen;
         $61 = ((($60)) + 12|0);
         $62 = HEAP32[$61>>2]|0;
         (FUNCTION_TABLE_iiii[$53 & 31]($56,$59,$62)|0);
         $63 = HEAP32[$pos>>2]|0;
         $64 = (($63) + 1)|0;
         HEAP32[$pos>>2] = $64;
        }
       }
      }
     }
    }
   }
  }
 } while(0);
 $65 = ((($src)) + 12|0);
 $66 = HEAP32[$65>>2]|0;
 $67 = ((($src)) + 8|0);
 $68 = HEAP32[$67>>2]|0;
 $69 = (($66) - ($68))|0;
 $cols = $69;
 $70 = HEAP32[$src>>2]|0;
 $71 = HEAP32[$dest>>2]|0;
 $72 = (($70) - ($71))|0;
 $downward = $72;
 $73 = $downward;
 $74 = ($73|0)<(0);
 if ($74) {
  $75 = ((($dest)) + 4|0);
  $76 = HEAP32[$75>>2]|0;
  $77 = (($76) - 1)|0;
  $init_row = $77;
  $78 = HEAP32[$dest>>2]|0;
  $79 = (($78) - 1)|0;
  $test_row = $79;
  $inc_row = -1;
 } else {
  $80 = HEAP32[$dest>>2]|0;
  $init_row = $80;
  $81 = ((($dest)) + 4|0);
  $82 = HEAP32[$81>>2]|0;
  $test_row = $82;
  $inc_row = 1;
 }
 $83 = $init_row;
 $row = $83;
 while(1) {
  $84 = $row;
  $85 = $test_row;
  $86 = ($84|0)!=($85|0);
  if (!($86)) {
   break;
  }
  $87 = $screen;
  $88 = $row;
  $89 = ((($dest)) + 8|0);
  $90 = HEAP32[$89>>2]|0;
  $91 = (_getcell($87,$88,$90)|0);
  $92 = $screen;
  $93 = $row;
  $94 = $downward;
  $95 = (($93) + ($94))|0;
  $96 = ((($src)) + 8|0);
  $97 = HEAP32[$96>>2]|0;
  $98 = (_getcell($92,$95,$97)|0);
  $99 = $cols;
  $100 = $99<<5;
  _memmove(($91|0),($98|0),($100|0))|0;
  $101 = $inc_row;
  $102 = $row;
  $103 = (($102) + ($101))|0;
  $row = $103;
 }
 STACKTOP = sp;return 1;
}
function _erase_internal($rect,$selective,$user) {
 $rect = $rect|0;
 $selective = $selective|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $8 = 0, $9 = 0, $cell = 0, $col = 0, $info = 0, $row = 0;
 var $screen = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $selective;
 $1 = $user;
 $2 = $1;
 $screen = $2;
 $3 = HEAP32[$rect>>2]|0;
 $row = $3;
 while(1) {
  $4 = $row;
  $5 = $screen;
  $6 = ((($5)) + 4|0);
  $7 = HEAP32[$6>>2]|0;
  $8 = ((($7)) + 20|0);
  $9 = HEAP32[$8>>2]|0;
  $10 = ($4|0)<($9|0);
  if (!($10)) {
   label = 11;
   break;
  }
  $11 = $row;
  $12 = ((($rect)) + 4|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = ($11|0)<($13|0);
  if (!($14)) {
   label = 11;
   break;
  }
  $15 = $screen;
  $16 = ((($15)) + 4|0);
  $17 = HEAP32[$16>>2]|0;
  $18 = $row;
  $19 = (_vterm_state_get_lineinfo($17,$18)|0);
  $info = $19;
  $20 = ((($rect)) + 8|0);
  $21 = HEAP32[$20>>2]|0;
  $col = $21;
  while(1) {
   $22 = $col;
   $23 = ((($rect)) + 12|0);
   $24 = HEAP32[$23>>2]|0;
   $25 = ($22|0)<($24|0);
   if (!($25)) {
    break;
   }
   $26 = $screen;
   $27 = $row;
   $28 = $col;
   $29 = (_getcell($26,$27,$28)|0);
   $cell = $29;
   $30 = $0;
   $31 = ($30|0)!=(0);
   if ($31) {
    $32 = $cell;
    $33 = ((($32)) + 24|0);
    $34 = ((($33)) + 6|0);
    $35 = HEAP16[$34>>1]|0;
    $36 = ($35&65535) >>> 11;
    $37 = $36 & 1;
    $38 = $37&65535;
    $39 = ($38|0)!=(0);
    if (!($39)) {
     label = 8;
    }
   } else {
    label = 8;
   }
   if ((label|0) == 8) {
    label = 0;
    $40 = $cell;
    HEAP32[$40>>2] = 0;
    $41 = $cell;
    $42 = ((($41)) + 24|0);
    $43 = $screen;
    $44 = ((($43)) + 88|0);
    ;HEAP32[$42>>2]=HEAP32[$44>>2]|0;HEAP32[$42+4>>2]=HEAP32[$44+4>>2]|0;
    $45 = $info;
    $46 = HEAP8[$45>>0]|0;
    $47 = $46 & 1;
    $48 = $47&255;
    $49 = $cell;
    $50 = ((($49)) + 24|0);
    $51 = ((($50)) + 6|0);
    $52 = $48&65535;
    $53 = HEAP16[$51>>1]|0;
    $54 = $52 & 1;
    $55 = ($54 << 12)&65535;
    $56 = $53 & -4097;
    $57 = $56 | $55;
    HEAP16[$51>>1] = $57;
    $58 = $info;
    $59 = HEAP8[$58>>0]|0;
    $60 = ($59&255) >>> 1;
    $61 = $60 & 3;
    $62 = $61&255;
    $63 = $cell;
    $64 = ((($63)) + 24|0);
    $65 = ((($64)) + 6|0);
    $66 = $62&65535;
    $67 = HEAP16[$65>>1]|0;
    $68 = $66 & 3;
    $69 = ($68 << 13)&65535;
    $70 = $67 & -24577;
    $71 = $70 | $69;
    HEAP16[$65>>1] = $71;
   }
   $72 = $col;
   $73 = (($72) + 1)|0;
   $col = $73;
  }
  $74 = $row;
  $75 = (($74) + 1)|0;
  $row = $75;
 }
 if ((label|0) == 11) {
  STACKTOP = sp;return 1;
 }
 return (0)|0;
}
function _rect_intersects($a,$b) {
 $a = $a|0;
 $b = $b|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $a;
 $2 = $b;
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 $5 = $2;
 $6 = ((($5)) + 4|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = ($4|0)>($7|0);
 if (!($8)) {
  $9 = $2;
  $10 = HEAP32[$9>>2]|0;
  $11 = $1;
  $12 = ((($11)) + 4|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = ($10|0)>($13|0);
  if (!($14)) {
   $15 = $1;
   $16 = ((($15)) + 8|0);
   $17 = HEAP32[$16>>2]|0;
   $18 = $2;
   $19 = ((($18)) + 12|0);
   $20 = HEAP32[$19>>2]|0;
   $21 = ($17|0)>($20|0);
   if (!($21)) {
    $22 = $2;
    $23 = ((($22)) + 8|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = $1;
    $26 = ((($25)) + 12|0);
    $27 = HEAP32[$26>>2]|0;
    $28 = ($24|0)>($27|0);
    if (!($28)) {
     $0 = 1;
     $29 = $0;
     STACKTOP = sp;return ($29|0);
    }
   }
   $0 = 0;
   $29 = $0;
   STACKTOP = sp;return ($29|0);
  }
 }
 $0 = 0;
 $29 = $0;
 STACKTOP = sp;return ($29|0);
}
function _rect_equal($a,$b) {
 $a = $a|0;
 $b = $b|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $a;
 $1 = $b;
 $2 = $0;
 $3 = HEAP32[$2>>2]|0;
 $4 = $1;
 $5 = HEAP32[$4>>2]|0;
 $6 = ($3|0)==($5|0);
 if ($6) {
  $7 = $0;
  $8 = ((($7)) + 8|0);
  $9 = HEAP32[$8>>2]|0;
  $10 = $1;
  $11 = ((($10)) + 8|0);
  $12 = HEAP32[$11>>2]|0;
  $13 = ($9|0)==($12|0);
  if ($13) {
   $14 = $0;
   $15 = ((($14)) + 4|0);
   $16 = HEAP32[$15>>2]|0;
   $17 = $1;
   $18 = ((($17)) + 4|0);
   $19 = HEAP32[$18>>2]|0;
   $20 = ($16|0)==($19|0);
   if ($20) {
    $21 = $0;
    $22 = ((($21)) + 12|0);
    $23 = HEAP32[$22>>2]|0;
    $24 = $1;
    $25 = ((($24)) + 12|0);
    $26 = HEAP32[$25>>2]|0;
    $27 = ($23|0)==($26|0);
    $29 = $27;
   } else {
    $29 = 0;
   }
  } else {
   $29 = 0;
  }
 } else {
  $29 = 0;
 }
 $28 = $29&1;
 STACKTOP = sp;return ($28|0);
}
function _rect_contains($big,$small) {
 $big = $big|0;
 $small = $small|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $big;
 $2 = $small;
 $3 = $2;
 $4 = HEAP32[$3>>2]|0;
 $5 = $1;
 $6 = HEAP32[$5>>2]|0;
 $7 = ($4|0)<($6|0);
 do {
  if ($7) {
   $0 = 0;
  } else {
   $8 = $2;
   $9 = ((($8)) + 8|0);
   $10 = HEAP32[$9>>2]|0;
   $11 = $1;
   $12 = ((($11)) + 8|0);
   $13 = HEAP32[$12>>2]|0;
   $14 = ($10|0)<($13|0);
   if ($14) {
    $0 = 0;
    break;
   }
   $15 = $2;
   $16 = ((($15)) + 4|0);
   $17 = HEAP32[$16>>2]|0;
   $18 = $1;
   $19 = ((($18)) + 4|0);
   $20 = HEAP32[$19>>2]|0;
   $21 = ($17|0)>($20|0);
   if ($21) {
    $0 = 0;
    break;
   }
   $22 = $2;
   $23 = ((($22)) + 12|0);
   $24 = HEAP32[$23>>2]|0;
   $25 = $1;
   $26 = ((($25)) + 12|0);
   $27 = HEAP32[$26>>2]|0;
   $28 = ($24|0)>($27|0);
   if ($28) {
    $0 = 0;
    break;
   } else {
    $0 = 1;
    break;
   }
  }
 } while(0);
 $29 = $0;
 STACKTOP = sp;return ($29|0);
}
function _vterm_rect_move($rect,$row_delta,$col_delta) {
 $rect = $rect|0;
 $row_delta = $row_delta|0;
 $col_delta = $col_delta|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $rect;
 $1 = $row_delta;
 $2 = $col_delta;
 $3 = $1;
 $4 = $0;
 $5 = HEAP32[$4>>2]|0;
 $6 = (($5) + ($3))|0;
 HEAP32[$4>>2] = $6;
 $7 = $1;
 $8 = $0;
 $9 = ((($8)) + 4|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = (($10) + ($7))|0;
 HEAP32[$9>>2] = $11;
 $12 = $2;
 $13 = $0;
 $14 = ((($13)) + 8|0);
 $15 = HEAP32[$14>>2]|0;
 $16 = (($15) + ($12))|0;
 HEAP32[$14>>2] = $16;
 $17 = $2;
 $18 = $0;
 $19 = ((($18)) + 12|0);
 $20 = HEAP32[$19>>2]|0;
 $21 = (($20) + ($17))|0;
 HEAP32[$19>>2] = $21;
 STACKTOP = sp;return;
}
function _rect_clip($dst,$bounds) {
 $dst = $dst|0;
 $bounds = $bounds|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $dst;
 $1 = $bounds;
 $2 = $0;
 $3 = HEAP32[$2>>2]|0;
 $4 = $1;
 $5 = HEAP32[$4>>2]|0;
 $6 = ($3|0)<($5|0);
 if ($6) {
  $7 = $1;
  $8 = HEAP32[$7>>2]|0;
  $9 = $0;
  HEAP32[$9>>2] = $8;
 }
 $10 = $0;
 $11 = ((($10)) + 8|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = $1;
 $14 = ((($13)) + 8|0);
 $15 = HEAP32[$14>>2]|0;
 $16 = ($12|0)<($15|0);
 if ($16) {
  $17 = $1;
  $18 = ((($17)) + 8|0);
  $19 = HEAP32[$18>>2]|0;
  $20 = $0;
  $21 = ((($20)) + 8|0);
  HEAP32[$21>>2] = $19;
 }
 $22 = $0;
 $23 = ((($22)) + 4|0);
 $24 = HEAP32[$23>>2]|0;
 $25 = $1;
 $26 = ((($25)) + 4|0);
 $27 = HEAP32[$26>>2]|0;
 $28 = ($24|0)>($27|0);
 if ($28) {
  $29 = $1;
  $30 = ((($29)) + 4|0);
  $31 = HEAP32[$30>>2]|0;
  $32 = $0;
  $33 = ((($32)) + 4|0);
  HEAP32[$33>>2] = $31;
 }
 $34 = $0;
 $35 = ((($34)) + 12|0);
 $36 = HEAP32[$35>>2]|0;
 $37 = $1;
 $38 = ((($37)) + 12|0);
 $39 = HEAP32[$38>>2]|0;
 $40 = ($36|0)>($39|0);
 if ($40) {
  $41 = $1;
  $42 = ((($41)) + 12|0);
  $43 = HEAP32[$42>>2]|0;
  $44 = $0;
  $45 = ((($44)) + 12|0);
  HEAP32[$45>>2] = $43;
 }
 $46 = $0;
 $47 = ((($46)) + 4|0);
 $48 = HEAP32[$47>>2]|0;
 $49 = $0;
 $50 = HEAP32[$49>>2]|0;
 $51 = ($48|0)<($50|0);
 if ($51) {
  $52 = $0;
  $53 = HEAP32[$52>>2]|0;
  $54 = $0;
  $55 = ((($54)) + 4|0);
  HEAP32[$55>>2] = $53;
 }
 $56 = $0;
 $57 = ((($56)) + 12|0);
 $58 = HEAP32[$57>>2]|0;
 $59 = $0;
 $60 = ((($59)) + 8|0);
 $61 = HEAP32[$60>>2]|0;
 $62 = ($58|0)<($61|0);
 if (!($62)) {
  STACKTOP = sp;return;
 }
 $63 = $0;
 $64 = ((($63)) + 8|0);
 $65 = HEAP32[$64>>2]|0;
 $66 = $0;
 $67 = ((($66)) + 12|0);
 HEAP32[$67>>2] = $65;
 STACKTOP = sp;return;
}
function _erase($rect,$selective,$user) {
 $rect = $rect|0;
 $selective = $selective|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $rect$byval_copy = 0, $rect$byval_copy1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect$byval_copy1 = sp + 24|0;
 $rect$byval_copy = sp + 8|0;
 $0 = $selective;
 $1 = $user;
 $2 = $0;
 $3 = $1;
 ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
 (_erase_internal($rect$byval_copy,$2,$3)|0);
 $4 = $1;
 ;HEAP32[$rect$byval_copy1>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy1+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy1+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy1+12>>2]=HEAP32[$rect+12>>2]|0;
 $5 = (_erase_user($rect$byval_copy1,0,$4)|0);
 STACKTOP = sp;return ($5|0);
}
function _setpenattr34($attr,$val,$user) {
 $attr = $attr|0;
 $val = $val|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $screen = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $attr;
 $2 = $val;
 $3 = $user;
 $4 = $3;
 $screen = $4;
 $5 = $1;
 do {
  switch ($5|0) {
  case 1:  {
   $6 = $2;
   $7 = HEAP32[$6>>2]|0;
   $8 = $screen;
   $9 = ((($8)) + 88|0);
   $10 = ((($9)) + 6|0);
   $11 = $7&65535;
   $12 = HEAP16[$10>>1]|0;
   $13 = $11 & 1;
   $14 = $12 & -2;
   $15 = $14 | $13;
   HEAP16[$10>>1] = $15;
   $0 = 1;
   $89 = $0;
   STACKTOP = sp;return ($89|0);
   break;
  }
  case 2:  {
   $16 = $2;
   $17 = HEAP32[$16>>2]|0;
   $18 = $screen;
   $19 = ((($18)) + 88|0);
   $20 = ((($19)) + 6|0);
   $21 = $17&65535;
   $22 = HEAP16[$20>>1]|0;
   $23 = $21 & 3;
   $24 = ($23 << 1)&65535;
   $25 = $22 & -7;
   $26 = $25 | $24;
   HEAP16[$20>>1] = $26;
   $0 = 1;
   $89 = $0;
   STACKTOP = sp;return ($89|0);
   break;
  }
  case 3:  {
   $27 = $2;
   $28 = HEAP32[$27>>2]|0;
   $29 = $screen;
   $30 = ((($29)) + 88|0);
   $31 = ((($30)) + 6|0);
   $32 = $28&65535;
   $33 = HEAP16[$31>>1]|0;
   $34 = $32 & 1;
   $35 = ($34 << 3)&65535;
   $36 = $33 & -9;
   $37 = $36 | $35;
   HEAP16[$31>>1] = $37;
   $0 = 1;
   $89 = $0;
   STACKTOP = sp;return ($89|0);
   break;
  }
  case 4:  {
   $38 = $2;
   $39 = HEAP32[$38>>2]|0;
   $40 = $screen;
   $41 = ((($40)) + 88|0);
   $42 = ((($41)) + 6|0);
   $43 = $39&65535;
   $44 = HEAP16[$42>>1]|0;
   $45 = $43 & 1;
   $46 = ($45 << 4)&65535;
   $47 = $44 & -17;
   $48 = $47 | $46;
   HEAP16[$42>>1] = $48;
   $0 = 1;
   $89 = $0;
   STACKTOP = sp;return ($89|0);
   break;
  }
  case 5:  {
   $49 = $2;
   $50 = HEAP32[$49>>2]|0;
   $51 = $screen;
   $52 = ((($51)) + 88|0);
   $53 = ((($52)) + 6|0);
   $54 = $50&65535;
   $55 = HEAP16[$53>>1]|0;
   $56 = $54 & 1;
   $57 = ($56 << 5)&65535;
   $58 = $55 & -33;
   $59 = $58 | $57;
   HEAP16[$53>>1] = $59;
   $0 = 1;
   $89 = $0;
   STACKTOP = sp;return ($89|0);
   break;
  }
  case 6:  {
   $60 = $2;
   $61 = HEAP32[$60>>2]|0;
   $62 = $screen;
   $63 = ((($62)) + 88|0);
   $64 = ((($63)) + 6|0);
   $65 = $61&65535;
   $66 = HEAP16[$64>>1]|0;
   $67 = $65 & 1;
   $68 = ($67 << 6)&65535;
   $69 = $66 & -65;
   $70 = $69 | $68;
   HEAP16[$64>>1] = $70;
   $0 = 1;
   $89 = $0;
   STACKTOP = sp;return ($89|0);
   break;
  }
  case 7:  {
   $71 = $2;
   $72 = HEAP32[$71>>2]|0;
   $73 = $screen;
   $74 = ((($73)) + 88|0);
   $75 = ((($74)) + 6|0);
   $76 = $72&65535;
   $77 = HEAP16[$75>>1]|0;
   $78 = $76 & 15;
   $79 = ($78 << 7)&65535;
   $80 = $77 & -1921;
   $81 = $80 | $79;
   HEAP16[$75>>1] = $81;
   $0 = 1;
   $89 = $0;
   STACKTOP = sp;return ($89|0);
   break;
  }
  case 8:  {
   $82 = $screen;
   $83 = ((($82)) + 88|0);
   $84 = $2;
   ;HEAP8[$83>>0]=HEAP8[$84>>0]|0;HEAP8[$83+1>>0]=HEAP8[$84+1>>0]|0;HEAP8[$83+2>>0]=HEAP8[$84+2>>0]|0;
   $0 = 1;
   $89 = $0;
   STACKTOP = sp;return ($89|0);
   break;
  }
  case 9:  {
   $85 = $screen;
   $86 = ((($85)) + 88|0);
   $87 = ((($86)) + 3|0);
   $88 = $2;
   ;HEAP8[$87>>0]=HEAP8[$88>>0]|0;HEAP8[$87+1>>0]=HEAP8[$88+1>>0]|0;HEAP8[$87+2>>0]=HEAP8[$88+2>>0]|0;
   $0 = 1;
   $89 = $0;
   STACKTOP = sp;return ($89|0);
   break;
  }
  default: {
   $0 = 0;
   $89 = $0;
   STACKTOP = sp;return ($89|0);
  }
  }
 } while(0);
 return (0)|0;
}
function _settermprop($prop,$val,$user) {
 $prop = $prop|0;
 $val = $val|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $screen = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $prop;
 $2 = $val;
 $3 = $user;
 $4 = $3;
 $screen = $4;
 $5 = $1;
 switch ($5|0) {
 case 3:  {
  $6 = $2;
  $7 = HEAP32[$6>>2]|0;
  $8 = ($7|0)!=(0);
  if ($8) {
   $9 = $screen;
   $10 = ((($9)) + 72|0);
   $11 = ((($10)) + 4|0);
   $12 = HEAP32[$11>>2]|0;
   $13 = ($12|0)!=(0|0);
   if (!($13)) {
    $0 = 0;
    $55 = $0;
    STACKTOP = sp;return ($55|0);
   }
  }
  $14 = $2;
  $15 = HEAP32[$14>>2]|0;
  $16 = ($15|0)!=(0);
  $17 = $screen;
  $18 = ((($17)) + 72|0);
  if ($16) {
   $19 = ((($18)) + 4|0);
   $20 = HEAP32[$19>>2]|0;
   $24 = $20;
  } else {
   $21 = HEAP32[$18>>2]|0;
   $24 = $21;
  }
  $22 = $screen;
  $23 = ((($22)) + 80|0);
  HEAP32[$23>>2] = $24;
  $25 = $2;
  $26 = HEAP32[$25>>2]|0;
  $27 = ($26|0)!=(0);
  if (!($27)) {
   $28 = $screen;
   _damagescreen($28);
  }
  break;
 }
 case 6:  {
  $29 = $2;
  $30 = HEAP32[$29>>2]|0;
  $31 = $screen;
  $32 = ((($31)) + 68|0);
  HEAP32[$32>>2] = $30;
  $33 = $screen;
  _damagescreen($33);
  break;
 }
 default: {
 }
 }
 $34 = $screen;
 $35 = ((($34)) + 8|0);
 $36 = HEAP32[$35>>2]|0;
 $37 = ($36|0)!=(0|0);
 if ($37) {
  $38 = $screen;
  $39 = ((($38)) + 8|0);
  $40 = HEAP32[$39>>2]|0;
  $41 = ((($40)) + 12|0);
  $42 = HEAP32[$41>>2]|0;
  $43 = ($42|0)!=(0|0);
  if ($43) {
   $44 = $screen;
   $45 = ((($44)) + 8|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ((($46)) + 12|0);
   $48 = HEAP32[$47>>2]|0;
   $49 = $1;
   $50 = $2;
   $51 = $screen;
   $52 = ((($51)) + 12|0);
   $53 = HEAP32[$52>>2]|0;
   $54 = (FUNCTION_TABLE_iiii[$48 & 31]($49,$50,$53)|0);
   $0 = $54;
   $55 = $0;
   STACKTOP = sp;return ($55|0);
  }
 }
 $0 = 1;
 $55 = $0;
 STACKTOP = sp;return ($55|0);
}
function _damagescreen($screen) {
 $screen = $screen|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $rect = 0, $rect$byval_copy = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect$byval_copy = sp + 24|0;
 $rect = sp;
 $0 = $screen;
 HEAP32[$rect>>2] = 0;
 $1 = ((($rect)) + 4|0);
 $2 = $0;
 $3 = ((($2)) + 60|0);
 $4 = HEAP32[$3>>2]|0;
 HEAP32[$1>>2] = $4;
 $5 = ((($rect)) + 8|0);
 HEAP32[$5>>2] = 0;
 $6 = ((($rect)) + 12|0);
 $7 = $0;
 $8 = ((($7)) + 64|0);
 $9 = HEAP32[$8>>2]|0;
 HEAP32[$6>>2] = $9;
 $10 = $0;
 ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
 _damagerect($10,$rect$byval_copy);
 STACKTOP = sp;return;
}
function _bell($user) {
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $screen = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $user;
 $2 = $1;
 $screen = $2;
 $3 = $screen;
 $4 = ((($3)) + 8|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = ($5|0)!=(0|0);
 if ($6) {
  $7 = $screen;
  $8 = ((($7)) + 8|0);
  $9 = HEAP32[$8>>2]|0;
  $10 = ((($9)) + 16|0);
  $11 = HEAP32[$10>>2]|0;
  $12 = ($11|0)!=(0|0);
  if ($12) {
   $13 = $screen;
   $14 = ((($13)) + 8|0);
   $15 = HEAP32[$14>>2]|0;
   $16 = ((($15)) + 16|0);
   $17 = HEAP32[$16>>2]|0;
   $18 = $screen;
   $19 = ((($18)) + 12|0);
   $20 = HEAP32[$19>>2]|0;
   $21 = (FUNCTION_TABLE_ii[$17 & 31]($20)|0);
   $0 = $21;
   $22 = $0;
   STACKTOP = sp;return ($22|0);
  }
 }
 $0 = 0;
 $22 = $0;
 STACKTOP = sp;return ($22|0);
}
function _resize($new_rows,$new_cols,$delta,$user) {
 $new_rows = $new_rows|0;
 $new_cols = $new_cols|0;
 $delta = $delta|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0;
 var $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0;
 var $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0;
 var $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0;
 var $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $cursor = 0, $first_blank_row = 0, $is_altscreen = 0, $old_cols = 0, $old_rows = 0, $pos = 0, $pos$byval_copy = 0, $pos3 = 0, $pos3$byval_copy = 0, $rect = 0, $rect$byval_copy = 0, $rect1 = 0, $rect1$byval_copy = 0, $rect2 = 0;
 var $rect2$byval_copy = 0, $rect2$byval_copy1 = 0, $rect4 = 0, $rect4$byval_copy = 0, $rows = 0, $screen = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 240|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect4$byval_copy = sp + 224|0;
 $rect2$byval_copy1 = sp + 208|0;
 $pos3$byval_copy = sp + 200|0;
 $rect2$byval_copy = sp + 184|0;
 $rect1$byval_copy = sp + 168|0;
 $rect$byval_copy = sp + 152|0;
 $pos$byval_copy = sp + 144|0;
 $pos = sp + 96|0;
 $cursor = sp + 88|0;
 $rect = sp + 64|0;
 $rect1 = sp + 48|0;
 $rect2 = sp + 24|0;
 $pos3 = sp + 16|0;
 $rect4 = sp;
 $1 = $new_rows;
 $2 = $new_cols;
 $3 = $delta;
 $4 = $user;
 $5 = $4;
 $screen = $5;
 $6 = $screen;
 $7 = ((($6)) + 72|0);
 $8 = ((($7)) + 4|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($9|0)!=(0|0);
 if ($10) {
  $11 = $screen;
  $12 = ((($11)) + 80|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = $screen;
  $15 = ((($14)) + 72|0);
  $16 = ((($15)) + 4|0);
  $17 = HEAP32[$16>>2]|0;
  $18 = ($13|0)==($17|0);
  $20 = $18;
 } else {
  $20 = 0;
 }
 $19 = $20&1;
 $is_altscreen = $19;
 $21 = $screen;
 $22 = ((($21)) + 60|0);
 $23 = HEAP32[$22>>2]|0;
 $old_rows = $23;
 $24 = $screen;
 $25 = ((($24)) + 64|0);
 $26 = HEAP32[$25>>2]|0;
 $old_cols = $26;
 $27 = $is_altscreen;
 $28 = ($27|0)!=(0);
 if (!($28)) {
  $29 = $1;
  $30 = $old_rows;
  $31 = ($29|0)<($30|0);
  if ($31) {
   ;HEAP32[$pos>>2]=0|0;HEAP32[$pos+4>>2]=0|0;
   $32 = $screen;
   $33 = ((($32)) + 4|0);
   $34 = HEAP32[$33>>2]|0;
   $35 = ((($34)) + 28|0);
   ;HEAP32[$cursor>>2]=HEAP32[$35>>2]|0;HEAP32[$cursor+4>>2]=HEAP32[$35+4>>2]|0;
   $36 = $old_rows;
   $37 = (($36) - 1)|0;
   HEAP32[$pos>>2] = $37;
   while(1) {
    $38 = HEAP32[$pos>>2]|0;
    $39 = $1;
    $40 = ($38|0)>=($39|0);
    if (!($40)) {
     break;
    }
    $41 = $screen;
    ;HEAP32[$pos$byval_copy>>2]=HEAP32[$pos>>2]|0;HEAP32[$pos$byval_copy+4>>2]=HEAP32[$pos+4>>2]|0;
    $42 = (_vterm_screen_is_eol($41,$pos$byval_copy)|0);
    $43 = ($42|0)!=(0);
    if (!($43)) {
     break;
    }
    $44 = HEAP32[$cursor>>2]|0;
    $45 = HEAP32[$pos>>2]|0;
    $46 = ($44|0)==($45|0);
    if ($46) {
     break;
    }
    $47 = HEAP32[$pos>>2]|0;
    $48 = (($47) + -1)|0;
    HEAP32[$pos>>2] = $48;
   }
   $49 = HEAP32[$pos>>2]|0;
   $50 = (($49) + 1)|0;
   $first_blank_row = $50;
   $51 = $first_blank_row;
   $52 = $1;
   $53 = ($51|0)>($52|0);
   if ($53) {
    HEAP32[$rect>>2] = 0;
    $54 = ((($rect)) + 4|0);
    $55 = $old_rows;
    HEAP32[$54>>2] = $55;
    $56 = ((($rect)) + 8|0);
    HEAP32[$56>>2] = 0;
    $57 = ((($rect)) + 12|0);
    $58 = $old_cols;
    HEAP32[$57>>2] = $58;
    $59 = $first_blank_row;
    $60 = $1;
    $61 = (($59) - ($60))|0;
    $62 = $4;
    ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
    (_scrollrect($rect$byval_copy,$61,0,$62)|0);
    $63 = $screen;
    _vterm_screen_flush_damage($63);
    $64 = $first_blank_row;
    $65 = $1;
    $66 = (($64) - ($65))|0;
    $67 = $3;
    $68 = HEAP32[$67>>2]|0;
    $69 = (($68) - ($66))|0;
    HEAP32[$67>>2] = $69;
   }
  }
 }
 $70 = $screen;
 $71 = $screen;
 $72 = ((($71)) + 72|0);
 $73 = HEAP32[$72>>2]|0;
 $74 = $1;
 $75 = $2;
 $76 = (_realloc_buffer($70,$73,$74,$75)|0);
 $77 = $screen;
 $78 = ((($77)) + 72|0);
 HEAP32[$78>>2] = $76;
 $79 = $screen;
 $80 = ((($79)) + 72|0);
 $81 = ((($80)) + 4|0);
 $82 = HEAP32[$81>>2]|0;
 $83 = ($82|0)!=(0|0);
 if ($83) {
  $84 = $screen;
  $85 = $screen;
  $86 = ((($85)) + 72|0);
  $87 = ((($86)) + 4|0);
  $88 = HEAP32[$87>>2]|0;
  $89 = $1;
  $90 = $2;
  $91 = (_realloc_buffer($84,$88,$89,$90)|0);
  $92 = $screen;
  $93 = ((($92)) + 72|0);
  $94 = ((($93)) + 4|0);
  HEAP32[$94>>2] = $91;
 }
 $95 = $is_altscreen;
 $96 = ($95|0)!=(0);
 $97 = $screen;
 $98 = ((($97)) + 72|0);
 if ($96) {
  $99 = ((($98)) + 4|0);
  $100 = HEAP32[$99>>2]|0;
  $104 = $100;
 } else {
  $101 = HEAP32[$98>>2]|0;
  $104 = $101;
 }
 $102 = $screen;
 $103 = ((($102)) + 80|0);
 HEAP32[$103>>2] = $104;
 $105 = $1;
 $106 = $screen;
 $107 = ((($106)) + 60|0);
 HEAP32[$107>>2] = $105;
 $108 = $2;
 $109 = $screen;
 $110 = ((($109)) + 64|0);
 HEAP32[$110>>2] = $108;
 $111 = $screen;
 $112 = ((($111)) + 84|0);
 $113 = HEAP32[$112>>2]|0;
 $114 = ($113|0)!=(0|0);
 if ($114) {
  $115 = $screen;
  $116 = HEAP32[$115>>2]|0;
  $117 = $screen;
  $118 = ((($117)) + 84|0);
  $119 = HEAP32[$118>>2]|0;
  _vterm_allocator_free($116,$119);
 }
 $120 = $screen;
 $121 = HEAP32[$120>>2]|0;
 $122 = $2;
 $123 = ($122*40)|0;
 $124 = (_vterm_allocator_malloc($121,$123)|0);
 $125 = $screen;
 $126 = ((($125)) + 84|0);
 HEAP32[$126>>2] = $124;
 $127 = $2;
 $128 = $old_cols;
 $129 = ($127|0)>($128|0);
 if ($129) {
  HEAP32[$rect1>>2] = 0;
  $130 = ((($rect1)) + 4|0);
  $131 = $old_rows;
  HEAP32[$130>>2] = $131;
  $132 = ((($rect1)) + 8|0);
  $133 = $old_cols;
  HEAP32[$132>>2] = $133;
  $134 = ((($rect1)) + 12|0);
  $135 = $2;
  HEAP32[$134>>2] = $135;
  $136 = $screen;
  ;HEAP32[$rect1$byval_copy>>2]=HEAP32[$rect1>>2]|0;HEAP32[$rect1$byval_copy+4>>2]=HEAP32[$rect1+4>>2]|0;HEAP32[$rect1$byval_copy+8>>2]=HEAP32[$rect1+8>>2]|0;HEAP32[$rect1$byval_copy+12>>2]=HEAP32[$rect1+12>>2]|0;
  _damagerect($136,$rect1$byval_copy);
 }
 $137 = $1;
 $138 = $old_rows;
 $139 = ($137|0)>($138|0);
 if ($139) {
  $140 = $is_altscreen;
  $141 = ($140|0)!=(0);
  L30: do {
   if (!($141)) {
    $142 = $screen;
    $143 = ((($142)) + 8|0);
    $144 = HEAP32[$143>>2]|0;
    $145 = ($144|0)!=(0|0);
    if ($145) {
     $146 = $screen;
     $147 = ((($146)) + 8|0);
     $148 = HEAP32[$147>>2]|0;
     $149 = ((($148)) + 28|0);
     $150 = HEAP32[$149>>2]|0;
     $151 = ($150|0)!=(0|0);
     if ($151) {
      $152 = $1;
      $153 = $old_rows;
      $154 = (($152) - ($153))|0;
      $rows = $154;
      while(1) {
       $155 = $rows;
       $156 = ($155|0)!=(0);
       if (!($156)) {
        break L30;
       }
       $157 = $screen;
       $158 = ((($157)) + 8|0);
       $159 = HEAP32[$158>>2]|0;
       $160 = ((($159)) + 28|0);
       $161 = HEAP32[$160>>2]|0;
       $162 = $screen;
       $163 = ((($162)) + 64|0);
       $164 = HEAP32[$163>>2]|0;
       $165 = $screen;
       $166 = ((($165)) + 84|0);
       $167 = HEAP32[$166>>2]|0;
       $168 = $screen;
       $169 = ((($168)) + 12|0);
       $170 = HEAP32[$169>>2]|0;
       $171 = (FUNCTION_TABLE_iiii[$161 & 31]($164,$167,$170)|0);
       $172 = ($171|0)!=(0);
       if (!($172)) {
        break L30;
       }
       HEAP32[$rect2>>2] = 0;
       $173 = ((($rect2)) + 4|0);
       $174 = $screen;
       $175 = ((($174)) + 60|0);
       $176 = HEAP32[$175>>2]|0;
       HEAP32[$173>>2] = $176;
       $177 = ((($rect2)) + 8|0);
       HEAP32[$177>>2] = 0;
       $178 = ((($rect2)) + 12|0);
       $179 = $screen;
       $180 = ((($179)) + 64|0);
       $181 = HEAP32[$180>>2]|0;
       HEAP32[$178>>2] = $181;
       $182 = $4;
       ;HEAP32[$rect2$byval_copy>>2]=HEAP32[$rect2>>2]|0;HEAP32[$rect2$byval_copy+4>>2]=HEAP32[$rect2+4>>2]|0;HEAP32[$rect2$byval_copy+8>>2]=HEAP32[$rect2+8>>2]|0;HEAP32[$rect2$byval_copy+12>>2]=HEAP32[$rect2+12>>2]|0;
       (_scrollrect($rect2$byval_copy,-1,0,$182)|0);
       ;HEAP32[$pos3>>2]=0|0;HEAP32[$pos3+4>>2]=0|0;
       $183 = ((($pos3)) + 4|0);
       HEAP32[$183>>2] = 0;
       while(1) {
        $184 = ((($pos3)) + 4|0);
        $185 = HEAP32[$184>>2]|0;
        $186 = $screen;
        $187 = ((($186)) + 64|0);
        $188 = HEAP32[$187>>2]|0;
        $189 = ($185|0)<($188|0);
        if (!($189)) {
         break;
        }
        $190 = $screen;
        $191 = $screen;
        $192 = ((($191)) + 84|0);
        $193 = HEAP32[$192>>2]|0;
        $194 = ((($pos3)) + 4|0);
        $195 = HEAP32[$194>>2]|0;
        $196 = (($193) + (($195*40)|0)|0);
        ;HEAP32[$pos3$byval_copy>>2]=HEAP32[$pos3>>2]|0;HEAP32[$pos3$byval_copy+4>>2]=HEAP32[$pos3+4>>2]|0;
        (_vterm_screen_set_cell($190,$pos3$byval_copy,$196)|0);
        $197 = ((($pos3)) + 4|0);
        $198 = HEAP32[$197>>2]|0;
        $199 = $screen;
        $200 = ((($199)) + 84|0);
        $201 = HEAP32[$200>>2]|0;
        $202 = (($201) + (($198*40)|0)|0);
        $203 = ((($202)) + 24|0);
        $204 = HEAP8[$203>>0]|0;
        $205 = $204 << 24 >> 24;
        $206 = ((($pos3)) + 4|0);
        $207 = HEAP32[$206>>2]|0;
        $208 = (($207) + ($205))|0;
        HEAP32[$206>>2] = $208;
       }
       $209 = ((($rect2)) + 4|0);
       HEAP32[$209>>2] = 1;
       $210 = $screen;
       ;HEAP32[$rect2$byval_copy1>>2]=HEAP32[$rect2>>2]|0;HEAP32[$rect2$byval_copy1+4>>2]=HEAP32[$rect2+4>>2]|0;HEAP32[$rect2$byval_copy1+8>>2]=HEAP32[$rect2+8>>2]|0;HEAP32[$rect2$byval_copy1+12>>2]=HEAP32[$rect2+12>>2]|0;
       _damagerect($210,$rect2$byval_copy1);
       $211 = $screen;
       _vterm_screen_flush_damage($211);
       $212 = $rows;
       $213 = (($212) + -1)|0;
       $rows = $213;
       $214 = $3;
       $215 = HEAP32[$214>>2]|0;
       $216 = (($215) + 1)|0;
       HEAP32[$214>>2] = $216;
      }
     }
    }
   }
  } while(0);
  $217 = $old_rows;
  HEAP32[$rect4>>2] = $217;
  $218 = ((($rect4)) + 4|0);
  $219 = $1;
  HEAP32[$218>>2] = $219;
  $220 = ((($rect4)) + 8|0);
  HEAP32[$220>>2] = 0;
  $221 = ((($rect4)) + 12|0);
  $222 = $2;
  HEAP32[$221>>2] = $222;
  $223 = $screen;
  ;HEAP32[$rect4$byval_copy>>2]=HEAP32[$rect4>>2]|0;HEAP32[$rect4$byval_copy+4>>2]=HEAP32[$rect4+4>>2]|0;HEAP32[$rect4$byval_copy+8>>2]=HEAP32[$rect4+8>>2]|0;HEAP32[$rect4$byval_copy+12>>2]=HEAP32[$rect4+12>>2]|0;
  _damagerect($223,$rect4$byval_copy);
 }
 $224 = $screen;
 $225 = ((($224)) + 8|0);
 $226 = HEAP32[$225>>2]|0;
 $227 = ($226|0)!=(0|0);
 if ($227) {
  $228 = $screen;
  $229 = ((($228)) + 8|0);
  $230 = HEAP32[$229>>2]|0;
  $231 = ((($230)) + 20|0);
  $232 = HEAP32[$231>>2]|0;
  $233 = ($232|0)!=(0|0);
  if ($233) {
   $234 = $screen;
   $235 = ((($234)) + 8|0);
   $236 = HEAP32[$235>>2]|0;
   $237 = ((($236)) + 20|0);
   $238 = HEAP32[$237>>2]|0;
   $239 = $1;
   $240 = $2;
   $241 = $screen;
   $242 = ((($241)) + 12|0);
   $243 = HEAP32[$242>>2]|0;
   $244 = (FUNCTION_TABLE_iiii[$238 & 31]($239,$240,$243)|0);
   $0 = $244;
   $245 = $0;
   STACKTOP = sp;return ($245|0);
  }
 }
 $0 = 1;
 $245 = $0;
 STACKTOP = sp;return ($245|0);
}
function _vterm_screen_set_cell($screen,$pos,$cell) {
 $screen = $screen|0;
 $pos = $pos|0;
 $cell = $cell|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0;
 var $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0;
 var $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0;
 var $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0;
 var $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $i = 0, $intcell = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $screen;
 $2 = $cell;
 $3 = $1;
 $4 = HEAP32[$pos>>2]|0;
 $5 = ((($pos)) + 4|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = (_getcell($3,$4,$6)|0);
 $intcell = $7;
 $8 = $intcell;
 $9 = ($8|0)!=(0|0);
 if (!($9)) {
  $0 = 0;
  $151 = $0;
  STACKTOP = sp;return ($151|0);
 }
 $i = 0;
 while(1) {
  $10 = $i;
  $11 = $2;
  $12 = (($11) + ($10<<2)|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = $i;
  $15 = $intcell;
  $16 = (($15) + ($14<<2)|0);
  HEAP32[$16>>2] = $13;
  $17 = $i;
  $18 = $2;
  $19 = (($18) + ($17<<2)|0);
  $20 = HEAP32[$19>>2]|0;
  $21 = ($20|0)!=(0);
  if (!($21)) {
   break;
  }
  $22 = $i;
  $23 = (($22) + 1)|0;
  $i = $23;
 }
 $24 = $2;
 $25 = ((($24)) + 28|0);
 $26 = HEAP16[$25>>1]|0;
 $27 = $26 & 1;
 $28 = $27&65535;
 $29 = $intcell;
 $30 = ((($29)) + 24|0);
 $31 = ((($30)) + 6|0);
 $32 = $28&65535;
 $33 = HEAP16[$31>>1]|0;
 $34 = $32 & 1;
 $35 = $33 & -2;
 $36 = $35 | $34;
 HEAP16[$31>>1] = $36;
 $37 = $2;
 $38 = ((($37)) + 28|0);
 $39 = HEAP16[$38>>1]|0;
 $40 = ($39&65535) >>> 1;
 $41 = $40 & 3;
 $42 = $41&65535;
 $43 = $intcell;
 $44 = ((($43)) + 24|0);
 $45 = ((($44)) + 6|0);
 $46 = $42&65535;
 $47 = HEAP16[$45>>1]|0;
 $48 = $46 & 3;
 $49 = ($48 << 1)&65535;
 $50 = $47 & -7;
 $51 = $50 | $49;
 HEAP16[$45>>1] = $51;
 $52 = $2;
 $53 = ((($52)) + 28|0);
 $54 = HEAP16[$53>>1]|0;
 $55 = ($54&65535) >>> 3;
 $56 = $55 & 1;
 $57 = $56&65535;
 $58 = $intcell;
 $59 = ((($58)) + 24|0);
 $60 = ((($59)) + 6|0);
 $61 = $57&65535;
 $62 = HEAP16[$60>>1]|0;
 $63 = $61 & 1;
 $64 = ($63 << 3)&65535;
 $65 = $62 & -9;
 $66 = $65 | $64;
 HEAP16[$60>>1] = $66;
 $67 = $2;
 $68 = ((($67)) + 28|0);
 $69 = HEAP16[$68>>1]|0;
 $70 = ($69&65535) >>> 4;
 $71 = $70 & 1;
 $72 = $71&65535;
 $73 = $intcell;
 $74 = ((($73)) + 24|0);
 $75 = ((($74)) + 6|0);
 $76 = $72&65535;
 $77 = HEAP16[$75>>1]|0;
 $78 = $76 & 1;
 $79 = ($78 << 4)&65535;
 $80 = $77 & -17;
 $81 = $80 | $79;
 HEAP16[$75>>1] = $81;
 $82 = $2;
 $83 = ((($82)) + 28|0);
 $84 = HEAP16[$83>>1]|0;
 $85 = ($84&65535) >>> 5;
 $86 = $85 & 1;
 $87 = $86&65535;
 $88 = $1;
 $89 = ((($88)) + 68|0);
 $90 = HEAP32[$89>>2]|0;
 $91 = $87 ^ $90;
 $92 = $intcell;
 $93 = ((($92)) + 24|0);
 $94 = ((($93)) + 6|0);
 $95 = $91&65535;
 $96 = HEAP16[$94>>1]|0;
 $97 = $95 & 1;
 $98 = ($97 << 5)&65535;
 $99 = $96 & -33;
 $100 = $99 | $98;
 HEAP16[$94>>1] = $100;
 $101 = $2;
 $102 = ((($101)) + 28|0);
 $103 = HEAP16[$102>>1]|0;
 $104 = ($103&65535) >>> 6;
 $105 = $104 & 1;
 $106 = $105&65535;
 $107 = $intcell;
 $108 = ((($107)) + 24|0);
 $109 = ((($108)) + 6|0);
 $110 = $106&65535;
 $111 = HEAP16[$109>>1]|0;
 $112 = $110 & 1;
 $113 = ($112 << 6)&65535;
 $114 = $111 & -65;
 $115 = $114 | $113;
 HEAP16[$109>>1] = $115;
 $116 = $2;
 $117 = ((($116)) + 28|0);
 $118 = HEAP16[$117>>1]|0;
 $119 = ($118&65535) >>> 7;
 $120 = $119 & 15;
 $121 = $120&65535;
 $122 = $intcell;
 $123 = ((($122)) + 24|0);
 $124 = ((($123)) + 6|0);
 $125 = $121&65535;
 $126 = HEAP16[$124>>1]|0;
 $127 = $125 & 15;
 $128 = ($127 << 7)&65535;
 $129 = $126 & -1921;
 $130 = $129 | $128;
 HEAP16[$124>>1] = $130;
 $131 = $intcell;
 $132 = ((($131)) + 24|0);
 $133 = $2;
 $134 = ((($133)) + 32|0);
 ;HEAP8[$132>>0]=HEAP8[$134>>0]|0;HEAP8[$132+1>>0]=HEAP8[$134+1>>0]|0;HEAP8[$132+2>>0]=HEAP8[$134+2>>0]|0;
 $135 = $intcell;
 $136 = ((($135)) + 24|0);
 $137 = ((($136)) + 3|0);
 $138 = $2;
 $139 = ((($138)) + 35|0);
 ;HEAP8[$137>>0]=HEAP8[$139>>0]|0;HEAP8[$137+1>>0]=HEAP8[$139+1>>0]|0;HEAP8[$137+2>>0]=HEAP8[$139+2>>0]|0;
 $140 = $2;
 $141 = ((($140)) + 24|0);
 $142 = HEAP8[$141>>0]|0;
 $143 = $142 << 24 >> 24;
 $144 = ($143|0)==(2);
 if ($144) {
  $145 = $1;
  $146 = HEAP32[$pos>>2]|0;
  $147 = ((($pos)) + 4|0);
  $148 = HEAP32[$147>>2]|0;
  $149 = (($148) + 1)|0;
  $150 = (_getcell($145,$146,$149)|0);
  HEAP32[$150>>2] = -1;
 }
 $0 = 1;
 $151 = $0;
 STACKTOP = sp;return ($151|0);
}
function _setlineinfo($row,$newinfo,$oldinfo,$user) {
 $row = $row|0;
 $newinfo = $newinfo|0;
 $oldinfo = $oldinfo|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $cell = 0, $col = 0, $rect = 0, $rect$byval_copy = 0, $rect$byval_copy1 = 0;
 var $screen = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect$byval_copy1 = sp + 64|0;
 $rect$byval_copy = sp + 48|0;
 $rect = sp;
 $0 = $row;
 $1 = $newinfo;
 $2 = $oldinfo;
 $3 = $user;
 $4 = $3;
 $screen = $4;
 $5 = $1;
 $6 = HEAP8[$5>>0]|0;
 $7 = $6 & 1;
 $8 = $7&255;
 $9 = $2;
 $10 = HEAP8[$9>>0]|0;
 $11 = $10 & 1;
 $12 = $11&255;
 $13 = ($8|0)!=($12|0);
 if (!($13)) {
  $14 = $1;
  $15 = HEAP8[$14>>0]|0;
  $16 = ($15&255) >>> 1;
  $17 = $16 & 3;
  $18 = $17&255;
  $19 = $2;
  $20 = HEAP8[$19>>0]|0;
  $21 = ($20&255) >>> 1;
  $22 = $21 & 3;
  $23 = $22&255;
  $24 = ($18|0)!=($23|0);
  if (!($24)) {
   STACKTOP = sp;return 1;
  }
 }
 $col = 0;
 while(1) {
  $25 = $col;
  $26 = $screen;
  $27 = ((($26)) + 64|0);
  $28 = HEAP32[$27>>2]|0;
  $29 = ($25|0)<($28|0);
  if (!($29)) {
   break;
  }
  $30 = $screen;
  $31 = $0;
  $32 = $col;
  $33 = (_getcell($30,$31,$32)|0);
  $cell = $33;
  $34 = $1;
  $35 = HEAP8[$34>>0]|0;
  $36 = $35 & 1;
  $37 = $36&255;
  $38 = $cell;
  $39 = ((($38)) + 24|0);
  $40 = ((($39)) + 6|0);
  $41 = $37&65535;
  $42 = HEAP16[$40>>1]|0;
  $43 = $41 & 1;
  $44 = ($43 << 12)&65535;
  $45 = $42 & -4097;
  $46 = $45 | $44;
  HEAP16[$40>>1] = $46;
  $47 = $1;
  $48 = HEAP8[$47>>0]|0;
  $49 = ($48&255) >>> 1;
  $50 = $49 & 3;
  $51 = $50&255;
  $52 = $cell;
  $53 = ((($52)) + 24|0);
  $54 = ((($53)) + 6|0);
  $55 = $51&65535;
  $56 = HEAP16[$54>>1]|0;
  $57 = $55 & 3;
  $58 = ($57 << 13)&65535;
  $59 = $56 & -24577;
  $60 = $59 | $58;
  HEAP16[$54>>1] = $60;
  $61 = $col;
  $62 = (($61) + 1)|0;
  $col = $62;
 }
 $63 = $0;
 HEAP32[$rect>>2] = $63;
 $64 = ((($rect)) + 4|0);
 $65 = $0;
 $66 = (($65) + 1)|0;
 HEAP32[$64>>2] = $66;
 $67 = ((($rect)) + 8|0);
 HEAP32[$67>>2] = 0;
 $68 = ((($rect)) + 12|0);
 $69 = $1;
 $70 = HEAP8[$69>>0]|0;
 $71 = $70 & 1;
 $72 = $71&255;
 $73 = ($72|0)!=(0);
 $74 = $screen;
 $75 = ((($74)) + 64|0);
 $76 = HEAP32[$75>>2]|0;
 $77 = (($76|0) / 2)&-1;
 $78 = $73 ? $77 : $76;
 HEAP32[$68>>2] = $78;
 $79 = $screen;
 ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
 _damagerect($79,$rect$byval_copy);
 $80 = $1;
 $81 = HEAP8[$80>>0]|0;
 $82 = $81 & 1;
 $83 = $82&255;
 $84 = ($83|0)!=(0);
 if (!($84)) {
  STACKTOP = sp;return 1;
 }
 $85 = $screen;
 $86 = ((($85)) + 64|0);
 $87 = HEAP32[$86>>2]|0;
 $88 = (($87|0) / 2)&-1;
 $89 = ((($rect)) + 8|0);
 HEAP32[$89>>2] = $88;
 $90 = $screen;
 $91 = ((($90)) + 64|0);
 $92 = HEAP32[$91>>2]|0;
 $93 = ((($rect)) + 12|0);
 HEAP32[$93>>2] = $92;
 $94 = $3;
 ;HEAP32[$rect$byval_copy1>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy1+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy1+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy1+12>>2]=HEAP32[$rect+12>>2]|0;
 (_erase_internal($rect$byval_copy1,0,$94)|0);
 STACKTOP = sp;return 1;
}
function _vterm_color_equal($a,$b) {
 $a = $a|0;
 $b = $b|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$a>>0]|0;
 $1 = $0&255;
 $2 = HEAP8[$b>>0]|0;
 $3 = $2&255;
 $4 = ($1|0)==($3|0);
 if (!($4)) {
  $20 = 0;
  $19 = $20&1;
  return ($19|0);
 }
 $5 = ((($a)) + 1|0);
 $6 = HEAP8[$5>>0]|0;
 $7 = $6&255;
 $8 = ((($b)) + 1|0);
 $9 = HEAP8[$8>>0]|0;
 $10 = $9&255;
 $11 = ($7|0)==($10|0);
 if (!($11)) {
  $20 = 0;
  $19 = $20&1;
  return ($19|0);
 }
 $12 = ((($a)) + 2|0);
 $13 = HEAP8[$12>>0]|0;
 $14 = $13&255;
 $15 = ((($b)) + 2|0);
 $16 = HEAP8[$15>>0]|0;
 $17 = $16&255;
 $18 = ($14|0)==($17|0);
 $20 = $18;
 $19 = $20&1;
 return ($19|0);
}
function _vterm_state_free($state) {
 $state = $state|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = $0;
 $4 = ((($3)) + 56|0);
 $5 = HEAP32[$4>>2]|0;
 _vterm_allocator_free($2,$5);
 $6 = $0;
 $7 = HEAP32[$6>>2]|0;
 $8 = $0;
 $9 = ((($8)) + 60|0);
 $10 = HEAP32[$9>>2]|0;
 _vterm_allocator_free($7,$10);
 $11 = $0;
 $12 = HEAP32[$11>>2]|0;
 $13 = $0;
 $14 = ((($13)) + 84|0);
 $15 = HEAP32[$14>>2]|0;
 _vterm_allocator_free($12,$15);
 $16 = $0;
 $17 = HEAP32[$16>>2]|0;
 $18 = $0;
 _vterm_allocator_free($17,$18);
 STACKTOP = sp;return;
}
function _vterm_obtain_state($vt) {
 $vt = $vt|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $7 = 0, $8 = 0, $9 = 0, $state = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $vt;
 $2 = $1;
 $3 = ((($2)) + 56|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($4|0)!=(0|0);
 $6 = $1;
 if ($5) {
  $7 = ((($6)) + 56|0);
  $8 = HEAP32[$7>>2]|0;
  $0 = $8;
  $64 = $0;
  STACKTOP = sp;return ($64|0);
 }
 $9 = (_vterm_state_new($6)|0);
 $state = $9;
 $10 = $state;
 $11 = $1;
 $12 = ((($11)) + 56|0);
 HEAP32[$12>>2] = $10;
 $13 = $state;
 $14 = ((($13)) + 88|0);
 HEAP32[$14>>2] = 16;
 $15 = $state;
 $16 = HEAP32[$15>>2]|0;
 $17 = $state;
 $18 = ((($17)) + 88|0);
 $19 = HEAP32[$18>>2]|0;
 $20 = $19<<2;
 $21 = (_vterm_allocator_malloc($16,$20)|0);
 $22 = $state;
 $23 = ((($22)) + 84|0);
 HEAP32[$23>>2] = $21;
 $24 = $state;
 $25 = HEAP32[$24>>2]|0;
 $26 = $state;
 $27 = ((($26)) + 24|0);
 $28 = HEAP32[$27>>2]|0;
 $29 = (($28) + 7)|0;
 $30 = (($29|0) / 8)&-1;
 $31 = (_vterm_allocator_malloc($25,$30)|0);
 $32 = $state;
 $33 = ((($32)) + 56|0);
 HEAP32[$33>>2] = $31;
 $34 = $state;
 $35 = HEAP32[$34>>2]|0;
 $36 = $state;
 $37 = ((($36)) + 20|0);
 $38 = HEAP32[$37>>2]|0;
 $39 = $38<<2;
 $40 = (_vterm_allocator_malloc($35,$39)|0);
 $41 = $state;
 $42 = ((($41)) + 60|0);
 HEAP32[$42>>2] = $40;
 $43 = (_vterm_lookup_encoding(0,117)|0);
 $44 = $state;
 $45 = ((($44)) + 188|0);
 HEAP32[$45>>2] = $43;
 $46 = $state;
 $47 = ((($46)) + 188|0);
 $48 = HEAP32[$47>>2]|0;
 $49 = HEAP32[$48>>2]|0;
 $50 = ($49|0)!=(0|0);
 if ($50) {
  $51 = $state;
  $52 = ((($51)) + 188|0);
  $53 = HEAP32[$52>>2]|0;
  $54 = HEAP32[$53>>2]|0;
  $55 = $state;
  $56 = ((($55)) + 188|0);
  $57 = HEAP32[$56>>2]|0;
  $58 = $state;
  $59 = ((($58)) + 188|0);
  $60 = ((($59)) + 4|0);
  FUNCTION_TABLE_vii[$54 & 31]($57,$60);
 }
 $61 = $1;
 $62 = $state;
 _vterm_parser_set_callbacks($61,1840,$62);
 $63 = $state;
 $0 = $63;
 $64 = $0;
 STACKTOP = sp;return ($64|0);
}
function _vterm_state_reset($state,$hard) {
 $state = $state|0;
 $hard = $hard|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0;
 var $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0;
 var $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0;
 var $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0;
 var $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $col = 0, $default_enc = 0, $i = 0, $rect = 0, $rect$byval_copy = 0, $row = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect$byval_copy = sp + 40|0;
 $rect = sp;
 $0 = $state;
 $1 = $hard;
 $2 = $0;
 $3 = ((($2)) + 40|0);
 HEAP32[$3>>2] = 0;
 $4 = $0;
 $5 = ((($4)) + 44|0);
 HEAP32[$5>>2] = -1;
 $6 = $0;
 $7 = ((($6)) + 48|0);
 HEAP32[$7>>2] = 0;
 $8 = $0;
 $9 = ((($8)) + 52|0);
 HEAP32[$9>>2] = -1;
 $10 = $0;
 $11 = ((($10)) + 104|0);
 $12 = HEAP16[$11>>1]|0;
 $13 = $12 & -2;
 HEAP16[$11>>1] = $13;
 $14 = $0;
 $15 = ((($14)) + 104|0);
 $16 = HEAP16[$15>>1]|0;
 $17 = $16 & -3;
 HEAP16[$15>>1] = $17;
 $18 = $0;
 $19 = ((($18)) + 104|0);
 $20 = HEAP16[$19>>1]|0;
 $21 = $20 & -5;
 $22 = $21 | 4;
 HEAP16[$19>>1] = $22;
 $23 = $0;
 $24 = ((($23)) + 104|0);
 $25 = HEAP16[$24>>1]|0;
 $26 = $25 & -9;
 HEAP16[$24>>1] = $26;
 $27 = $0;
 $28 = ((($27)) + 104|0);
 $29 = HEAP16[$28>>1]|0;
 $30 = $29 & -17;
 HEAP16[$28>>1] = $30;
 $31 = $0;
 $32 = ((($31)) + 104|0);
 $33 = HEAP16[$32>>1]|0;
 $34 = $33 & -513;
 HEAP16[$32>>1] = $34;
 $35 = $0;
 $36 = ((($35)) + 104|0);
 $37 = HEAP16[$36>>1]|0;
 $38 = $37 & -1025;
 HEAP16[$36>>1] = $38;
 $39 = $0;
 $40 = ((($39)) + 104|0);
 $41 = HEAP16[$40>>1]|0;
 $42 = $41 & -4097;
 HEAP16[$40>>1] = $42;
 $43 = $0;
 $44 = ((($43)) + 104|0);
 $45 = HEAP16[$44>>1]|0;
 $46 = $45 & -8193;
 HEAP16[$44>>1] = $46;
 $47 = $0;
 $48 = HEAP32[$47>>2]|0;
 $49 = ((($48)) + 16|0);
 $50 = HEAP8[$49>>0]|0;
 $51 = $50 & -3;
 HEAP8[$49>>0] = $51;
 $col = 0;
 while(1) {
  $52 = $col;
  $53 = $0;
  $54 = ((($53)) + 24|0);
  $55 = HEAP32[$54>>2]|0;
  $56 = ($52|0)<($55|0);
  if (!($56)) {
   break;
  }
  $57 = $col;
  $58 = (($57|0) % 8)&-1;
  $59 = ($58|0)==(0);
  $60 = $0;
  $61 = $col;
  if ($59) {
   _set_col_tabstop($60,$61);
  } else {
   _clear_col_tabstop($60,$61);
  }
  $62 = $col;
  $63 = (($62) + 1)|0;
  $col = $63;
 }
 $row = 0;
 while(1) {
  $64 = $row;
  $65 = $0;
  $66 = ((($65)) + 20|0);
  $67 = HEAP32[$66>>2]|0;
  $68 = ($64|0)<($67|0);
  $69 = $0;
  if (!($68)) {
   break;
  }
  $70 = $row;
  _set_lineinfo($69,$70,1,0,0);
  $71 = $row;
  $72 = (($71) + 1)|0;
  $row = $72;
 }
 $73 = ((($69)) + 4|0);
 $74 = HEAP32[$73>>2]|0;
 $75 = ($74|0)!=(0|0);
 if ($75) {
  $76 = $0;
  $77 = ((($76)) + 4|0);
  $78 = HEAP32[$77>>2]|0;
  $79 = ((($78)) + 20|0);
  $80 = HEAP32[$79>>2]|0;
  $81 = ($80|0)!=(0|0);
  if ($81) {
   $82 = $0;
   $83 = ((($82)) + 4|0);
   $84 = HEAP32[$83>>2]|0;
   $85 = ((($84)) + 20|0);
   $86 = HEAP32[$85>>2]|0;
   $87 = $0;
   $88 = ((($87)) + 8|0);
   $89 = HEAP32[$88>>2]|0;
   (FUNCTION_TABLE_ii[$86 & 31]($89)|0);
  }
 }
 $90 = $0;
 _vterm_state_resetpen($90);
 $91 = $0;
 $92 = HEAP32[$91>>2]|0;
 $93 = ((($92)) + 16|0);
 $94 = HEAP8[$93>>0]|0;
 $95 = ($94 << 7)&255;
 $96 = ($95<<24>>24) >> 7;
 $97 = $96 << 24 >> 24;
 $98 = ($97|0)!=(0);
 if ($98) {
  $99 = (_vterm_lookup_encoding(0,117)|0);
  $101 = $99;
 } else {
  $100 = (_vterm_lookup_encoding(1,66)|0);
  $101 = $100;
 }
 $default_enc = $101;
 $i = 0;
 while(1) {
  $102 = $i;
  $103 = ($102|0)<(4);
  if (!($103)) {
   break;
  }
  $104 = $default_enc;
  $105 = $i;
  $106 = $0;
  $107 = ((($106)) + 108|0);
  $108 = (($107) + (($105*20)|0)|0);
  HEAP32[$108>>2] = $104;
  $109 = $default_enc;
  $110 = HEAP32[$109>>2]|0;
  $111 = ($110|0)!=(0|0);
  if ($111) {
   $112 = $default_enc;
   $113 = HEAP32[$112>>2]|0;
   $114 = $default_enc;
   $115 = $i;
   $116 = $0;
   $117 = ((($116)) + 108|0);
   $118 = (($117) + (($115*20)|0)|0);
   $119 = ((($118)) + 4|0);
   FUNCTION_TABLE_vii[$113 & 31]($114,$119);
  }
  $120 = $i;
  $121 = (($120) + 1)|0;
  $i = $121;
 }
 $122 = $0;
 $123 = ((($122)) + 208|0);
 HEAP32[$123>>2] = 0;
 $124 = $0;
 $125 = ((($124)) + 212|0);
 HEAP32[$125>>2] = 1;
 $126 = $0;
 $127 = ((($126)) + 216|0);
 HEAP32[$127>>2] = 0;
 $128 = $0;
 $129 = ((($128)) + 296|0);
 $130 = HEAP8[$129>>0]|0;
 $131 = $130 & -2;
 HEAP8[$129>>0] = $131;
 $132 = $0;
 (_settermprop_bool($132,1,1)|0);
 $133 = $0;
 (_settermprop_bool($133,2,1)|0);
 $134 = $0;
 (_settermprop_int($134,7,1)|0);
 $135 = $1;
 $136 = ($135|0)!=(0);
 if (!($136)) {
  STACKTOP = sp;return;
 }
 $137 = $0;
 $138 = ((($137)) + 28|0);
 HEAP32[$138>>2] = 0;
 $139 = $0;
 $140 = ((($139)) + 28|0);
 $141 = ((($140)) + 4|0);
 HEAP32[$141>>2] = 0;
 $142 = $0;
 $143 = ((($142)) + 36|0);
 HEAP32[$143>>2] = 0;
 HEAP32[$rect>>2] = 0;
 $144 = ((($rect)) + 4|0);
 $145 = $0;
 $146 = ((($145)) + 20|0);
 $147 = HEAP32[$146>>2]|0;
 HEAP32[$144>>2] = $147;
 $148 = ((($rect)) + 8|0);
 HEAP32[$148>>2] = 0;
 $149 = ((($rect)) + 12|0);
 $150 = $0;
 $151 = ((($150)) + 24|0);
 $152 = HEAP32[$151>>2]|0;
 HEAP32[$149>>2] = $152;
 $153 = $0;
 ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
 _erase49($153,$rect$byval_copy,0);
 STACKTOP = sp;return;
}
function _vterm_state_get_cursorpos($state,$cursorpos) {
 $state = $state|0;
 $cursorpos = $cursorpos|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $cursorpos;
 $2 = $1;
 $3 = $0;
 $4 = ((($3)) + 28|0);
 ;HEAP32[$2>>2]=HEAP32[$4>>2]|0;HEAP32[$2+4>>2]=HEAP32[$4+4>>2]|0;
 STACKTOP = sp;return;
}
function _vterm_state_set_callbacks($state,$callbacks,$user) {
 $state = $state|0;
 $callbacks = $callbacks|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $callbacks;
 $2 = $user;
 $3 = $1;
 $4 = ($3|0)!=(0|0);
 if (!($4)) {
  $29 = $0;
  $30 = ((($29)) + 4|0);
  HEAP32[$30>>2] = 0;
  $31 = $0;
  $32 = ((($31)) + 8|0);
  HEAP32[$32>>2] = 0;
  STACKTOP = sp;return;
 }
 $5 = $1;
 $6 = $0;
 $7 = ((($6)) + 4|0);
 HEAP32[$7>>2] = $5;
 $8 = $2;
 $9 = $0;
 $10 = ((($9)) + 8|0);
 HEAP32[$10>>2] = $8;
 $11 = $0;
 $12 = ((($11)) + 4|0);
 $13 = HEAP32[$12>>2]|0;
 $14 = ($13|0)!=(0|0);
 if (!($14)) {
  STACKTOP = sp;return;
 }
 $15 = $0;
 $16 = ((($15)) + 4|0);
 $17 = HEAP32[$16>>2]|0;
 $18 = ((($17)) + 20|0);
 $19 = HEAP32[$18>>2]|0;
 $20 = ($19|0)!=(0|0);
 if (!($20)) {
  STACKTOP = sp;return;
 }
 $21 = $0;
 $22 = ((($21)) + 4|0);
 $23 = HEAP32[$22>>2]|0;
 $24 = ((($23)) + 20|0);
 $25 = HEAP32[$24>>2]|0;
 $26 = $0;
 $27 = ((($26)) + 8|0);
 $28 = HEAP32[$27>>2]|0;
 (FUNCTION_TABLE_ii[$25 & 31]($28)|0);
 STACKTOP = sp;return;
}
function _vterm_state_get_cbdata($state) {
 $state = $state|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $0;
 $2 = ((($1)) + 8|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _vterm_state_set_unrecognised_fallbacks($state,$fallbacks,$user) {
 $state = $state|0;
 $fallbacks = $fallbacks|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $fallbacks;
 $2 = $user;
 $3 = $1;
 $4 = ($3|0)!=(0|0);
 if ($4) {
  $5 = $1;
  $6 = $0;
  $7 = ((($6)) + 12|0);
  HEAP32[$7>>2] = $5;
  $8 = $2;
  $9 = $0;
  $10 = ((($9)) + 16|0);
  HEAP32[$10>>2] = $8;
  STACKTOP = sp;return;
 } else {
  $11 = $0;
  $12 = ((($11)) + 12|0);
  HEAP32[$12>>2] = 0;
  $13 = $0;
  $14 = ((($13)) + 16|0);
  HEAP32[$14>>2] = 0;
  STACKTOP = sp;return;
 }
}
function _vterm_state_get_unrecognised_fbdata($state) {
 $state = $state|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $0;
 $2 = ((($1)) + 16|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _vterm_state_set_termprop($state,$prop,$val) {
 $state = $state|0;
 $prop = $prop|0;
 $val = $val|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0;
 var $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0;
 var $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $rect = 0, $rect$byval_copy = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect$byval_copy = sp + 32|0;
 $rect = sp;
 $1 = $state;
 $2 = $prop;
 $3 = $val;
 $4 = $1;
 $5 = ((($4)) + 4|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)!=(0|0);
 if ($7) {
  $8 = $1;
  $9 = ((($8)) + 4|0);
  $10 = HEAP32[$9>>2]|0;
  $11 = ((($10)) + 28|0);
  $12 = HEAP32[$11>>2]|0;
  $13 = ($12|0)!=(0|0);
  if ($13) {
   $14 = $1;
   $15 = ((($14)) + 4|0);
   $16 = HEAP32[$15>>2]|0;
   $17 = ((($16)) + 28|0);
   $18 = HEAP32[$17>>2]|0;
   $19 = $2;
   $20 = $3;
   $21 = $1;
   $22 = ((($21)) + 8|0);
   $23 = HEAP32[$22>>2]|0;
   $24 = (FUNCTION_TABLE_iiii[$18 & 31]($19,$20,$23)|0);
   $25 = ($24|0)!=(0);
   if (!($25)) {
    $0 = 0;
    $117 = $0;
    STACKTOP = sp;return ($117|0);
   }
  }
 }
 $26 = $2;
 switch ($26|0) {
 case 5: case 4:  {
  $0 = 1;
  $117 = $0;
  STACKTOP = sp;return ($117|0);
  break;
 }
 case 1:  {
  $27 = $3;
  $28 = HEAP32[$27>>2]|0;
  $29 = $1;
  $30 = ((($29)) + 104|0);
  $31 = $28&65535;
  $32 = HEAP16[$30>>1]|0;
  $33 = $31 & 1;
  $34 = ($33 << 5)&65535;
  $35 = $32 & -33;
  $36 = $35 | $34;
  HEAP16[$30>>1] = $36;
  $0 = 1;
  $117 = $0;
  STACKTOP = sp;return ($117|0);
  break;
 }
 case 2:  {
  $37 = $3;
  $38 = HEAP32[$37>>2]|0;
  $39 = $1;
  $40 = ((($39)) + 104|0);
  $41 = $38&65535;
  $42 = HEAP16[$40>>1]|0;
  $43 = $41 & 1;
  $44 = ($43 << 6)&65535;
  $45 = $42 & -65;
  $46 = $45 | $44;
  HEAP16[$40>>1] = $46;
  $0 = 1;
  $117 = $0;
  STACKTOP = sp;return ($117|0);
  break;
 }
 case 7:  {
  $47 = $3;
  $48 = HEAP32[$47>>2]|0;
  $49 = $1;
  $50 = ((($49)) + 104|0);
  $51 = $48&65535;
  $52 = HEAP16[$50>>1]|0;
  $53 = $51 & 3;
  $54 = ($53 << 7)&65535;
  $55 = $52 & -385;
  $56 = $55 | $54;
  HEAP16[$50>>1] = $56;
  $0 = 1;
  $117 = $0;
  STACKTOP = sp;return ($117|0);
  break;
 }
 case 6:  {
  $57 = $3;
  $58 = HEAP32[$57>>2]|0;
  $59 = $1;
  $60 = ((($59)) + 104|0);
  $61 = $58&65535;
  $62 = HEAP16[$60>>1]|0;
  $63 = $61 & 1;
  $64 = ($63 << 11)&65535;
  $65 = $62 & -2049;
  $66 = $65 | $64;
  HEAP16[$60>>1] = $66;
  $0 = 1;
  $117 = $0;
  STACKTOP = sp;return ($117|0);
  break;
 }
 case 3:  {
  $67 = $3;
  $68 = HEAP32[$67>>2]|0;
  $69 = $1;
  $70 = ((($69)) + 104|0);
  $71 = $68&65535;
  $72 = HEAP16[$70>>1]|0;
  $73 = $71 & 1;
  $74 = ($73 << 9)&65535;
  $75 = $72 & -513;
  $76 = $75 | $74;
  HEAP16[$70>>1] = $76;
  $77 = $1;
  $78 = ((($77)) + 104|0);
  $79 = HEAP16[$78>>1]|0;
  $80 = ($79 << 6)&65535;
  $81 = ($80<<16>>16) >> 15;
  $82 = $81 << 16 >> 16;
  $83 = ($82|0)!=(0);
  if ($83) {
   HEAP32[$rect>>2] = 0;
   $84 = ((($rect)) + 4|0);
   $85 = $1;
   $86 = ((($85)) + 20|0);
   $87 = HEAP32[$86>>2]|0;
   HEAP32[$84>>2] = $87;
   $88 = ((($rect)) + 8|0);
   HEAP32[$88>>2] = 0;
   $89 = ((($rect)) + 12|0);
   $90 = $1;
   $91 = ((($90)) + 24|0);
   $92 = HEAP32[$91>>2]|0;
   HEAP32[$89>>2] = $92;
   $93 = $1;
   ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
   _erase49($93,$rect$byval_copy,0);
  }
  $0 = 1;
  $117 = $0;
  STACKTOP = sp;return ($117|0);
  break;
 }
 case 8:  {
  $94 = $1;
  $95 = ((($94)) + 76|0);
  HEAP32[$95>>2] = 0;
  $96 = $3;
  $97 = HEAP32[$96>>2]|0;
  $98 = ($97|0)!=(0);
  if ($98) {
   $99 = $1;
   $100 = ((($99)) + 76|0);
   $101 = HEAP32[$100>>2]|0;
   $102 = $101 | 1;
   HEAP32[$100>>2] = $102;
  }
  $103 = $3;
  $104 = HEAP32[$103>>2]|0;
  $105 = ($104|0)==(2);
  if ($105) {
   $106 = $1;
   $107 = ((($106)) + 76|0);
   $108 = HEAP32[$107>>2]|0;
   $109 = $108 | 2;
   HEAP32[$107>>2] = $109;
  }
  $110 = $3;
  $111 = HEAP32[$110>>2]|0;
  $112 = ($111|0)==(3);
  if ($112) {
   $113 = $1;
   $114 = ((($113)) + 76|0);
   $115 = HEAP32[$114>>2]|0;
   $116 = $115 | 4;
   HEAP32[$114>>2] = $116;
  }
  $0 = 1;
  $117 = $0;
  STACKTOP = sp;return ($117|0);
  break;
 }
 default: {
  $0 = 0;
  $117 = $0;
  STACKTOP = sp;return ($117|0);
 }
 }
 return (0)|0;
}
function _vterm_state_get_lineinfo($state,$row) {
 $state = $state|0;
 $row = $row|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $row;
 $2 = $0;
 $3 = ((($2)) + 60|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = $1;
 $6 = (($4) + ($5<<2)|0);
 STACKTOP = sp;return ($6|0);
}
function _vterm_state_new($vt) {
 $vt = $vt|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $state = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $0;
 $2 = (_vterm_allocator_malloc($1,320)|0);
 $state = $2;
 $3 = $0;
 $4 = $state;
 HEAP32[$4>>2] = $3;
 $5 = $0;
 $6 = ((($5)) + 8|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = $state;
 $9 = ((($8)) + 20|0);
 HEAP32[$9>>2] = $7;
 $10 = $0;
 $11 = ((($10)) + 12|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = $state;
 $14 = ((($13)) + 24|0);
 HEAP32[$14>>2] = $12;
 $15 = $state;
 $16 = ((($15)) + 4|0);
 HEAP32[$16>>2] = 0;
 $17 = $state;
 $18 = ((($17)) + 8|0);
 HEAP32[$18>>2] = 0;
 $19 = $state;
 _vterm_state_newpen($19);
 $20 = $state;
 $21 = ((($20)) + 292|0);
 HEAP32[$21>>2] = 0;
 $22 = $state;
 STACKTOP = sp;return ($22|0);
}
function _set_col_tabstop($state,$col) {
 $state = $state|0;
 $col = $col|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $mask = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $col;
 $2 = $1;
 $3 = $2 & 7;
 $4 = 1 << $3;
 $5 = $4&255;
 $mask = $5;
 $6 = $mask;
 $7 = $6&255;
 $8 = $1;
 $9 = $8 >> 3;
 $10 = $0;
 $11 = ((($10)) + 56|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = (($12) + ($9)|0);
 $14 = HEAP8[$13>>0]|0;
 $15 = $14&255;
 $16 = $15 | $7;
 $17 = $16&255;
 HEAP8[$13>>0] = $17;
 STACKTOP = sp;return;
}
function _clear_col_tabstop($state,$col) {
 $state = $state|0;
 $col = $col|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $mask = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $col;
 $2 = $1;
 $3 = $2 & 7;
 $4 = 1 << $3;
 $5 = $4&255;
 $mask = $5;
 $6 = $mask;
 $7 = $6&255;
 $8 = $7 ^ -1;
 $9 = $1;
 $10 = $9 >> 3;
 $11 = $0;
 $12 = ((($11)) + 56|0);
 $13 = HEAP32[$12>>2]|0;
 $14 = (($13) + ($10)|0);
 $15 = HEAP8[$14>>0]|0;
 $16 = $15&255;
 $17 = $16 & $8;
 $18 = $17&255;
 HEAP8[$14>>0] = $18;
 STACKTOP = sp;return;
}
function _set_lineinfo($state,$row,$force,$dwl,$dhl) {
 $state = $state|0;
 $row = $row|0;
 $force = $force|0;
 $dwl = $dwl|0;
 $dhl = $dhl|0;
 var $$old = 0, $$old1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0;
 var $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $7 = 0, $8 = 0, $9 = 0, $info = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $info = sp;
 $0 = $state;
 $1 = $row;
 $2 = $force;
 $3 = $dwl;
 $4 = $dhl;
 $5 = $1;
 $6 = $0;
 $7 = ((($6)) + 60|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = (($8) + ($5<<2)|0);
 ;HEAP32[$info>>2]=HEAP32[$9>>2]|0;
 $10 = $3;
 $11 = ($10|0)==(0);
 if ($11) {
  $12 = HEAP8[$info>>0]|0;
  $13 = $12 & -2;
  HEAP8[$info>>0] = $13;
 } else {
  $14 = $3;
  $15 = ($14|0)==(1);
  if ($15) {
   $16 = HEAP8[$info>>0]|0;
   $17 = $16 & -2;
   $18 = $17 | 1;
   HEAP8[$info>>0] = $18;
  }
 }
 $19 = $4;
 $20 = ($19|0)==(0);
 do {
  if ($20) {
   $21 = HEAP8[$info>>0]|0;
   $22 = $21 & -7;
   HEAP8[$info>>0] = $22;
  } else {
   $23 = $4;
   $24 = ($23|0)==(1);
   if ($24) {
    $25 = HEAP8[$info>>0]|0;
    $26 = $25 & -7;
    $27 = $26 | 2;
    HEAP8[$info>>0] = $27;
    break;
   }
   $28 = $4;
   $29 = ($28|0)==(2);
   if ($29) {
    $30 = HEAP8[$info>>0]|0;
    $31 = $30 & -7;
    $32 = $31 | 4;
    HEAP8[$info>>0] = $32;
   }
  }
 } while(0);
 $33 = $0;
 $34 = ((($33)) + 4|0);
 $35 = HEAP32[$34>>2]|0;
 $36 = ($35|0)!=(0|0);
 if ($36) {
  $37 = $0;
  $38 = ((($37)) + 4|0);
  $39 = HEAP32[$38>>2]|0;
  $40 = ((($39)) + 40|0);
  $41 = HEAP32[$40>>2]|0;
  $42 = ($41|0)!=(0|0);
  if ($42) {
   $43 = $0;
   $44 = ((($43)) + 4|0);
   $45 = HEAP32[$44>>2]|0;
   $46 = ((($45)) + 40|0);
   $47 = HEAP32[$46>>2]|0;
   $48 = $1;
   $49 = $0;
   $50 = ((($49)) + 60|0);
   $51 = HEAP32[$50>>2]|0;
   $52 = $1;
   $53 = (($51) + ($52<<2)|0);
   $54 = $0;
   $55 = ((($54)) + 8|0);
   $56 = HEAP32[$55>>2]|0;
   $57 = (FUNCTION_TABLE_iiiii[$47 & 15]($48,$info,$53,$56)|0);
   $58 = ($57|0)!=(0);
   $59 = $2;
   $60 = ($59|0)!=(0);
   $or$cond = $58 | $60;
   if (!($or$cond)) {
    STACKTOP = sp;return;
   }
  } else {
   label = 14;
  }
 } else {
  label = 14;
 }
 if ((label|0) == 14) {
  $$old = $2;
  $$old1 = ($$old|0)!=(0);
  if (!($$old1)) {
   STACKTOP = sp;return;
  }
 }
 $61 = $1;
 $62 = $0;
 $63 = ((($62)) + 60|0);
 $64 = HEAP32[$63>>2]|0;
 $65 = (($64) + ($61<<2)|0);
 ;HEAP32[$65>>2]=HEAP32[$info>>2]|0;
 STACKTOP = sp;return;
}
function _settermprop_bool($state,$prop,$v) {
 $state = $state|0;
 $prop = $prop|0;
 $v = $v|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $val = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $val = sp;
 $0 = $state;
 $1 = $prop;
 $2 = $v;
 $3 = $2;
 HEAP32[$val>>2] = $3;
 $4 = $0;
 $5 = $1;
 $6 = (_vterm_state_set_termprop($4,$5,$val)|0);
 STACKTOP = sp;return ($6|0);
}
function _settermprop_int($state,$prop,$v) {
 $state = $state|0;
 $prop = $prop|0;
 $v = $v|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $val = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $val = sp;
 $0 = $state;
 $1 = $prop;
 $2 = $v;
 $3 = $2;
 HEAP32[$val>>2] = $3;
 $4 = $0;
 $5 = $1;
 $6 = (_vterm_state_set_termprop($4,$5,$val)|0);
 STACKTOP = sp;return ($6|0);
}
function _erase49($state,$rect,$selective) {
 $state = $state|0;
 $rect = $rect|0;
 $selective = $selective|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, $rect$byval_copy = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect$byval_copy = sp + 8|0;
 $0 = $state;
 $1 = $selective;
 $2 = $0;
 $3 = ((($2)) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($4|0)!=(0|0);
 if (!($5)) {
  STACKTOP = sp;return;
 }
 $6 = $0;
 $7 = ((($6)) + 4|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = ((($8)) + 16|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = ($10|0)!=(0|0);
 if (!($11)) {
  STACKTOP = sp;return;
 }
 $12 = $0;
 $13 = ((($12)) + 4|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = ((($14)) + 16|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = $1;
 $18 = $0;
 $19 = ((($18)) + 8|0);
 $20 = HEAP32[$19>>2]|0;
 ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
 (FUNCTION_TABLE_iiii[$16 & 31]($rect$byval_copy,$17,$20)|0);
 STACKTOP = sp;return;
}
function _on_text($bytes,$len,$user) {
 $bytes = $bytes|0;
 $len = $len|0;
 $user = $user|0;
 var $$alloca_mul = 0, $$alloca_mul16 = 0, $$byval_copy = 0, $$byval_copy8 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0;
 var $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0;
 var $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0;
 var $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0;
 var $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0;
 var $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0;
 var $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0;
 var $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0;
 var $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0;
 var $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0;
 var $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0;
 var $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0;
 var $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0;
 var $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0;
 var $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0;
 var $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0;
 var $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0;
 var $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0;
 var $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $eaten = 0, $encoding = 0;
 var $glyph_ends = 0, $glyph_starts = 0, $i = 0, $npoints = 0, $oldpos = 0, $or$cond = 0, $rect = 0, $rect$byval_copy = 0, $save_i = 0, $saved_i = 0, $state = 0, $this_width = 0, $vararg_buffer = 0, $vararg_buffer2 = 0, $vararg_buffer4 = 0, $vararg_ptr7 = 0, $width = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 160|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy8 = sp + 152|0;
 $rect$byval_copy = sp + 136|0;
 $$byval_copy = sp + 128|0;
 $vararg_buffer4 = sp + 16|0;
 $vararg_buffer2 = sp + 8|0;
 $vararg_buffer = sp;
 $oldpos = sp + 96|0;
 $npoints = sp + 88|0;
 $eaten = sp + 84|0;
 $rect = sp + 32|0;
 $1 = $bytes;
 $2 = $len;
 $3 = $user;
 $7 = $3;
 $state = $7;
 $8 = $state;
 $9 = ((($8)) + 28|0);
 ;HEAP32[$oldpos>>2]=HEAP32[$9>>2]|0;HEAP32[$oldpos+4>>2]=HEAP32[$9+4>>2]|0;
 $10 = $2;
 $11 = (_llvm_stacksave()|0);
 $4 = $11;
 $$alloca_mul = $10<<2;
 $12 = STACKTOP; STACKTOP = STACKTOP + ((((1*$$alloca_mul)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 HEAP32[$npoints>>2] = 0;
 HEAP32[$eaten>>2] = 0;
 $13 = $state;
 $14 = ((($13)) + 216|0);
 $15 = HEAP32[$14>>2]|0;
 $16 = ($15|0)!=(0);
 do {
  if ($16) {
   $17 = $state;
   $18 = ((($17)) + 216|0);
   $19 = HEAP32[$18>>2]|0;
   $20 = $state;
   $21 = ((($20)) + 108|0);
   $22 = (($21) + (($19*20)|0)|0);
   $50 = $22;
  } else {
   $23 = HEAP32[$eaten>>2]|0;
   $24 = $1;
   $25 = (($24) + ($23)|0);
   $26 = HEAP8[$25>>0]|0;
   $27 = $26 << 24 >> 24;
   $28 = $27 & 128;
   $29 = ($28|0)!=(0);
   $30 = $state;
   if (!($29)) {
    $31 = ((($30)) + 208|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $state;
    $34 = ((($33)) + 108|0);
    $35 = (($34) + (($32*20)|0)|0);
    $50 = $35;
    break;
   }
   $36 = HEAP32[$30>>2]|0;
   $37 = ((($36)) + 16|0);
   $38 = HEAP8[$37>>0]|0;
   $39 = ($38 << 7)&255;
   $40 = ($39<<24>>24) >> 7;
   $41 = $40 << 24 >> 24;
   $42 = ($41|0)!=(0);
   $43 = $state;
   if ($42) {
    $44 = ((($43)) + 188|0);
    $50 = $44;
    break;
   } else {
    $45 = ((($43)) + 212|0);
    $46 = HEAP32[$45>>2]|0;
    $47 = $state;
    $48 = ((($47)) + 108|0);
    $49 = (($48) + (($46*20)|0)|0);
    $50 = $49;
    break;
   }
  }
 } while(0);
 $encoding = $50;
 $51 = $encoding;
 $52 = HEAP32[$51>>2]|0;
 $53 = ((($52)) + 4|0);
 $54 = HEAP32[$53>>2]|0;
 $55 = $encoding;
 $56 = HEAP32[$55>>2]|0;
 $57 = $encoding;
 $58 = ((($57)) + 4|0);
 $59 = $state;
 $60 = ((($59)) + 216|0);
 $61 = HEAP32[$60>>2]|0;
 $62 = ($61|0)!=(0);
 $63 = $2;
 $64 = $62 ? 1 : $63;
 $65 = $1;
 $66 = $2;
 FUNCTION_TABLE_viiiiiiii[$54 & 7]($56,$58,$12,$npoints,$64,$65,$eaten,$66);
 $67 = HEAP32[$npoints>>2]|0;
 $68 = ($67|0)!=(0);
 if (!($68)) {
  $0 = 0;
  $5 = 1;
  $391 = $4;
  _llvm_stackrestore(($391|0));
  $392 = $0;
  STACKTOP = sp;return ($392|0);
 }
 $69 = $state;
 $70 = ((($69)) + 216|0);
 $71 = HEAP32[$70>>2]|0;
 $72 = ($71|0)!=(0);
 $73 = HEAP32[$npoints>>2]|0;
 $74 = ($73|0)!=(0);
 $or$cond = $72 & $74;
 if ($or$cond) {
  $75 = $state;
  $76 = ((($75)) + 216|0);
  HEAP32[$76>>2] = 0;
 }
 $i = 0;
 $77 = $i;
 $78 = (($12) + ($77<<2)|0);
 $79 = HEAP32[$78>>2]|0;
 $80 = (_vterm_unicode_is_combining($79)|0);
 $81 = ($80|0)!=(0);
 do {
  if ($81) {
   $82 = $state;
   $83 = ((($82)) + 28|0);
   $84 = HEAP32[$83>>2]|0;
   $85 = $state;
   $86 = ((($85)) + 96|0);
   $87 = HEAP32[$86>>2]|0;
   $88 = ($84|0)==($87|0);
   if ($88) {
    $89 = $state;
    $90 = ((($89)) + 28|0);
    $91 = ((($90)) + 4|0);
    $92 = HEAP32[$91>>2]|0;
    $93 = $state;
    $94 = ((($93)) + 96|0);
    $95 = ((($94)) + 4|0);
    $96 = HEAP32[$95>>2]|0;
    $97 = $state;
    $98 = ((($97)) + 92|0);
    $99 = HEAP32[$98>>2]|0;
    $100 = (($96) + ($99))|0;
    $101 = ($92|0)==($100|0);
    if ($101) {
     $saved_i = 0;
     while(1) {
      $102 = $saved_i;
      $103 = $state;
      $104 = ((($103)) + 84|0);
      $105 = HEAP32[$104>>2]|0;
      $106 = (($105) + ($102<<2)|0);
      $107 = HEAP32[$106>>2]|0;
      $108 = ($107|0)!=(0);
      if (!($108)) {
       break;
      }
      $109 = $saved_i;
      $110 = (($109) + 1)|0;
      $saved_i = $110;
     }
     while(1) {
      $111 = $i;
      $112 = HEAP32[$npoints>>2]|0;
      $113 = ($111|0)<($112|0);
      if ($113) {
       $114 = $i;
       $115 = (($12) + ($114<<2)|0);
       $116 = HEAP32[$115>>2]|0;
       $117 = (_vterm_unicode_is_combining($116)|0);
       $118 = ($117|0)!=(0);
       $393 = $118;
      } else {
       $393 = 0;
      }
      $119 = $saved_i;
      $120 = $state;
      $121 = ((($120)) + 88|0);
      $122 = HEAP32[$121>>2]|0;
      $123 = ($119>>>0)>=($122>>>0);
      if (!($393)) {
       break;
      }
      if ($123) {
       $124 = $state;
       _grow_combine_buffer($124);
      }
      $125 = $i;
      $126 = (($125) + 1)|0;
      $i = $126;
      $127 = (($12) + ($125<<2)|0);
      $128 = HEAP32[$127>>2]|0;
      $129 = $saved_i;
      $130 = (($129) + 1)|0;
      $saved_i = $130;
      $131 = $state;
      $132 = ((($131)) + 84|0);
      $133 = HEAP32[$132>>2]|0;
      $134 = (($133) + ($129<<2)|0);
      HEAP32[$134>>2] = $128;
     }
     if ($123) {
      $135 = $state;
      _grow_combine_buffer($135);
     }
     $136 = $saved_i;
     $137 = $state;
     $138 = ((($137)) + 84|0);
     $139 = HEAP32[$138>>2]|0;
     $140 = (($139) + ($136<<2)|0);
     HEAP32[$140>>2] = 0;
     $141 = $state;
     $142 = $state;
     $143 = ((($142)) + 84|0);
     $144 = HEAP32[$143>>2]|0;
     $145 = $state;
     $146 = ((($145)) + 92|0);
     $147 = HEAP32[$146>>2]|0;
     $148 = $state;
     $149 = ((($148)) + 96|0);
     ;HEAP32[$$byval_copy>>2]=HEAP32[$149>>2]|0;HEAP32[$$byval_copy+4>>2]=HEAP32[$149+4>>2]|0;
     _putglyph50($141,$144,$147,$$byval_copy);
     break;
    }
   }
   $150 = HEAP32[3064>>2]|0;
   (_fprintf($150,5039,$vararg_buffer)|0);
  }
 } while(0);
 L40: while(1) {
  $151 = $i;
  $152 = HEAP32[$npoints>>2]|0;
  $153 = ($151|0)<($152|0);
  if (!($153)) {
   break;
  }
  $154 = $i;
  $glyph_starts = $154;
  $155 = $i;
  $156 = (($155) + 1)|0;
  $glyph_ends = $156;
  while(1) {
   $157 = $glyph_ends;
   $158 = HEAP32[$npoints>>2]|0;
   $159 = ($157|0)<($158|0);
   if (!($159)) {
    break;
   }
   $160 = $glyph_ends;
   $161 = (($12) + ($160<<2)|0);
   $162 = HEAP32[$161>>2]|0;
   $163 = (_vterm_unicode_is_combining($162)|0);
   $164 = ($163|0)!=(0);
   if (!($164)) {
    break;
   }
   $165 = $glyph_ends;
   $166 = (($165) + 1)|0;
   $glyph_ends = $166;
  }
  $width = 0;
  $167 = $glyph_ends;
  $168 = $glyph_starts;
  $169 = (($167) - ($168))|0;
  $170 = (($169) + 1)|0;
  $171 = (_llvm_stacksave()|0);
  $6 = $171;
  $$alloca_mul16 = $170<<2;
  $172 = STACKTOP; STACKTOP = STACKTOP + ((((1*$$alloca_mul16)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
  while(1) {
   $173 = $i;
   $174 = $glyph_ends;
   $175 = ($173|0)<($174|0);
   if (!($175)) {
    break;
   }
   $176 = $i;
   $177 = (($12) + ($176<<2)|0);
   $178 = HEAP32[$177>>2]|0;
   $179 = $i;
   $180 = $glyph_starts;
   $181 = (($179) - ($180))|0;
   $182 = (($172) + ($181<<2)|0);
   HEAP32[$182>>2] = $178;
   $183 = $i;
   $184 = (($12) + ($183<<2)|0);
   $185 = HEAP32[$184>>2]|0;
   $186 = (_vterm_unicode_width($185)|0);
   $this_width = $186;
   $187 = $this_width;
   $188 = ($187|0)<(0);
   if ($188) {
    label = 36;
    break L40;
   }
   $193 = $this_width;
   $194 = $width;
   $195 = (($194) + ($193))|0;
   $width = $195;
   $196 = $i;
   $197 = (($196) + 1)|0;
   $i = $197;
  }
  $198 = $glyph_ends;
  $199 = $glyph_starts;
  $200 = (($198) - ($199))|0;
  $201 = (($172) + ($200<<2)|0);
  HEAP32[$201>>2] = 0;
  $202 = $i;
  $203 = (($202) + -1)|0;
  $i = $203;
  $204 = $state;
  $205 = ((($204)) + 36|0);
  $206 = HEAP32[$205>>2]|0;
  $207 = ($206|0)!=(0);
  if ($207) {
   label = 40;
  } else {
   $208 = $state;
   $209 = ((($208)) + 28|0);
   $210 = ((($209)) + 4|0);
   $211 = HEAP32[$210>>2]|0;
   $212 = $width;
   $213 = (($211) + ($212))|0;
   $214 = $state;
   $215 = ((($214)) + 28|0);
   $216 = HEAP32[$215>>2]|0;
   $217 = $state;
   $218 = ((($217)) + 60|0);
   $219 = HEAP32[$218>>2]|0;
   $220 = (($219) + ($216<<2)|0);
   $221 = HEAP8[$220>>0]|0;
   $222 = $221 & 1;
   $223 = $222&255;
   $224 = ($223|0)!=(0);
   $225 = $state;
   $226 = ((($225)) + 24|0);
   $227 = HEAP32[$226>>2]|0;
   $228 = (($227|0) / 2)&-1;
   $229 = $224 ? $228 : $227;
   $230 = ($213|0)>($229|0);
   if ($230) {
    label = 40;
   }
  }
  if ((label|0) == 40) {
   label = 0;
   $231 = $state;
   _linefeed($231);
   $232 = $state;
   $233 = ((($232)) + 28|0);
   $234 = ((($233)) + 4|0);
   HEAP32[$234>>2] = 0;
   $235 = $state;
   $236 = ((($235)) + 36|0);
   HEAP32[$236>>2] = 0;
  }
  $237 = $state;
  $238 = ((($237)) + 104|0);
  $239 = HEAP16[$238>>1]|0;
  $240 = ($239 << 12)&65535;
  $241 = ($240<<16>>16) >> 15;
  $242 = $241 << 16 >> 16;
  $243 = ($242|0)!=(0);
  if ($243) {
   $244 = $state;
   $245 = ((($244)) + 28|0);
   $246 = HEAP32[$245>>2]|0;
   HEAP32[$rect>>2] = $246;
   $247 = ((($rect)) + 4|0);
   $248 = $state;
   $249 = ((($248)) + 28|0);
   $250 = HEAP32[$249>>2]|0;
   $251 = (($250) + 1)|0;
   HEAP32[$247>>2] = $251;
   $252 = ((($rect)) + 8|0);
   $253 = $state;
   $254 = ((($253)) + 28|0);
   $255 = ((($254)) + 4|0);
   $256 = HEAP32[$255>>2]|0;
   HEAP32[$252>>2] = $256;
   $257 = ((($rect)) + 12|0);
   $258 = $state;
   $259 = ((($258)) + 28|0);
   $260 = HEAP32[$259>>2]|0;
   $261 = $state;
   $262 = ((($261)) + 60|0);
   $263 = HEAP32[$262>>2]|0;
   $264 = (($263) + ($260<<2)|0);
   $265 = HEAP8[$264>>0]|0;
   $266 = $265 & 1;
   $267 = $266&255;
   $268 = ($267|0)!=(0);
   $269 = $state;
   $270 = ((($269)) + 24|0);
   $271 = HEAP32[$270>>2]|0;
   $272 = (($271|0) / 2)&-1;
   $273 = $268 ? $272 : $271;
   HEAP32[$257>>2] = $273;
   $274 = $state;
   ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
   _scroll($274,$rect$byval_copy,0,-1);
  }
  $275 = $state;
  $276 = $width;
  $277 = $state;
  $278 = ((($277)) + 28|0);
  ;HEAP32[$$byval_copy8>>2]=HEAP32[$278>>2]|0;HEAP32[$$byval_copy8+4>>2]=HEAP32[$278+4>>2]|0;
  _putglyph50($275,$172,$276,$$byval_copy8);
  $279 = $i;
  $280 = HEAP32[$npoints>>2]|0;
  $281 = (($280) - 1)|0;
  $282 = ($279|0)==($281|0);
  if ($282) {
   $save_i = 0;
   while(1) {
    $283 = $save_i;
    $284 = (($172) + ($283<<2)|0);
    $285 = HEAP32[$284>>2]|0;
    $286 = ($285|0)!=(0);
    $287 = $save_i;
    $288 = $state;
    $289 = ((($288)) + 88|0);
    $290 = HEAP32[$289>>2]|0;
    $291 = ($287>>>0)>=($290>>>0);
    if (!($286)) {
     break;
    }
    if ($291) {
     $292 = $state;
     _grow_combine_buffer($292);
    }
    $293 = $save_i;
    $294 = (($172) + ($293<<2)|0);
    $295 = HEAP32[$294>>2]|0;
    $296 = $save_i;
    $297 = $state;
    $298 = ((($297)) + 84|0);
    $299 = HEAP32[$298>>2]|0;
    $300 = (($299) + ($296<<2)|0);
    HEAP32[$300>>2] = $295;
    $301 = $save_i;
    $302 = (($301) + 1)|0;
    $save_i = $302;
   }
   if ($291) {
    $303 = $state;
    _grow_combine_buffer($303);
   }
   $304 = $save_i;
   $305 = $state;
   $306 = ((($305)) + 84|0);
   $307 = HEAP32[$306>>2]|0;
   $308 = (($307) + ($304<<2)|0);
   HEAP32[$308>>2] = 0;
   $309 = $width;
   $310 = $state;
   $311 = ((($310)) + 92|0);
   HEAP32[$311>>2] = $309;
   $312 = $state;
   $313 = ((($312)) + 96|0);
   $314 = $state;
   $315 = ((($314)) + 28|0);
   ;HEAP32[$313>>2]=HEAP32[$315>>2]|0;HEAP32[$313+4>>2]=HEAP32[$315+4>>2]|0;
  }
  $316 = $state;
  $317 = ((($316)) + 28|0);
  $318 = ((($317)) + 4|0);
  $319 = HEAP32[$318>>2]|0;
  $320 = $width;
  $321 = (($319) + ($320))|0;
  $322 = $state;
  $323 = ((($322)) + 28|0);
  $324 = HEAP32[$323>>2]|0;
  $325 = $state;
  $326 = ((($325)) + 60|0);
  $327 = HEAP32[$326>>2]|0;
  $328 = (($327) + ($324<<2)|0);
  $329 = HEAP8[$328>>0]|0;
  $330 = $329 & 1;
  $331 = $330&255;
  $332 = ($331|0)!=(0);
  $333 = $state;
  $334 = ((($333)) + 24|0);
  $335 = HEAP32[$334>>2]|0;
  $336 = (($335|0) / 2)&-1;
  $337 = $332 ? $336 : $335;
  $338 = ($321|0)>=($337|0);
  if ($338) {
   $339 = $state;
   $340 = ((($339)) + 104|0);
   $341 = HEAP16[$340>>1]|0;
   $342 = ($341 << 13)&65535;
   $343 = ($342<<16>>16) >> 15;
   $344 = $343 << 16 >> 16;
   $345 = ($344|0)!=(0);
   if ($345) {
    $346 = $state;
    $347 = ((($346)) + 36|0);
    HEAP32[$347>>2] = 1;
   }
  } else {
   $348 = $width;
   $349 = $state;
   $350 = ((($349)) + 28|0);
   $351 = ((($350)) + 4|0);
   $352 = HEAP32[$351>>2]|0;
   $353 = (($352) + ($348))|0;
   HEAP32[$351>>2] = $353;
  }
  $354 = $6;
  _llvm_stackrestore(($354|0));
  $355 = $i;
  $356 = (($355) + 1)|0;
  $i = $356;
 }
 if ((label|0) == 36) {
  $189 = HEAP32[3064>>2]|0;
  $190 = $i;
  $191 = (($12) + ($190<<2)|0);
  $192 = HEAP32[$191>>2]|0;
  HEAP32[$vararg_buffer2>>2] = $192;
  (_fprintf($189,5087,$vararg_buffer2)|0);
  _abort();
  // unreachable;
 }
 $357 = $state;
 _updatecursor($357,$oldpos,0);
 $358 = $state;
 $359 = ((($358)) + 28|0);
 $360 = HEAP32[$359>>2]|0;
 $361 = ($360|0)<(0);
 if ($361) {
  $382 = HEAP32[3064>>2]|0;
  $383 = $state;
  $384 = ((($383)) + 28|0);
  $385 = HEAP32[$384>>2]|0;
  $386 = $state;
  $387 = ((($386)) + 28|0);
  $388 = ((($387)) + 4|0);
  $389 = HEAP32[$388>>2]|0;
  HEAP32[$vararg_buffer4>>2] = $385;
  $vararg_ptr7 = ((($vararg_buffer4)) + 4|0);
  HEAP32[$vararg_ptr7>>2] = $389;
  (_fprintf($382,5130,$vararg_buffer4)|0);
  _abort();
  // unreachable;
 }
 $362 = $state;
 $363 = ((($362)) + 28|0);
 $364 = HEAP32[$363>>2]|0;
 $365 = $state;
 $366 = ((($365)) + 20|0);
 $367 = HEAP32[$366>>2]|0;
 $368 = ($364|0)>=($367|0);
 if ($368) {
  $382 = HEAP32[3064>>2]|0;
  $383 = $state;
  $384 = ((($383)) + 28|0);
  $385 = HEAP32[$384>>2]|0;
  $386 = $state;
  $387 = ((($386)) + 28|0);
  $388 = ((($387)) + 4|0);
  $389 = HEAP32[$388>>2]|0;
  HEAP32[$vararg_buffer4>>2] = $385;
  $vararg_ptr7 = ((($vararg_buffer4)) + 4|0);
  HEAP32[$vararg_ptr7>>2] = $389;
  (_fprintf($382,5130,$vararg_buffer4)|0);
  _abort();
  // unreachable;
 }
 $369 = $state;
 $370 = ((($369)) + 28|0);
 $371 = ((($370)) + 4|0);
 $372 = HEAP32[$371>>2]|0;
 $373 = ($372|0)<(0);
 if ($373) {
  $382 = HEAP32[3064>>2]|0;
  $383 = $state;
  $384 = ((($383)) + 28|0);
  $385 = HEAP32[$384>>2]|0;
  $386 = $state;
  $387 = ((($386)) + 28|0);
  $388 = ((($387)) + 4|0);
  $389 = HEAP32[$388>>2]|0;
  HEAP32[$vararg_buffer4>>2] = $385;
  $vararg_ptr7 = ((($vararg_buffer4)) + 4|0);
  HEAP32[$vararg_ptr7>>2] = $389;
  (_fprintf($382,5130,$vararg_buffer4)|0);
  _abort();
  // unreachable;
 }
 $374 = $state;
 $375 = ((($374)) + 28|0);
 $376 = ((($375)) + 4|0);
 $377 = HEAP32[$376>>2]|0;
 $378 = $state;
 $379 = ((($378)) + 24|0);
 $380 = HEAP32[$379>>2]|0;
 $381 = ($377|0)>=($380|0);
 if ($381) {
  $382 = HEAP32[3064>>2]|0;
  $383 = $state;
  $384 = ((($383)) + 28|0);
  $385 = HEAP32[$384>>2]|0;
  $386 = $state;
  $387 = ((($386)) + 28|0);
  $388 = ((($387)) + 4|0);
  $389 = HEAP32[$388>>2]|0;
  HEAP32[$vararg_buffer4>>2] = $385;
  $vararg_ptr7 = ((($vararg_buffer4)) + 4|0);
  HEAP32[$vararg_ptr7>>2] = $389;
  (_fprintf($382,5130,$vararg_buffer4)|0);
  _abort();
  // unreachable;
 }
 $390 = HEAP32[$eaten>>2]|0;
 $0 = $390;
 $5 = 1;
 $391 = $4;
 _llvm_stackrestore(($391|0));
 $392 = $0;
 STACKTOP = sp;return ($392|0);
}
function _grow_combine_buffer($state) {
 $state = $state|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $new_chars = 0, $new_size = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $0;
 $2 = ((($1)) + 88|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = $3<<1;
 $new_size = $4;
 $5 = $0;
 $6 = HEAP32[$5>>2]|0;
 $7 = $new_size;
 $8 = $7<<2;
 $9 = (_vterm_allocator_malloc($6,$8)|0);
 $new_chars = $9;
 $10 = $new_chars;
 $11 = $0;
 $12 = ((($11)) + 84|0);
 $13 = HEAP32[$12>>2]|0;
 $14 = $0;
 $15 = ((($14)) + 88|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = $16<<2;
 _memcpy(($10|0),($13|0),($17|0))|0;
 $18 = $0;
 $19 = HEAP32[$18>>2]|0;
 $20 = $0;
 $21 = ((($20)) + 84|0);
 $22 = HEAP32[$21>>2]|0;
 _vterm_allocator_free($19,$22);
 $23 = $new_chars;
 $24 = $0;
 $25 = ((($24)) + 84|0);
 HEAP32[$25>>2] = $23;
 $26 = $new_size;
 $27 = $0;
 $28 = ((($27)) + 88|0);
 HEAP32[$28>>2] = $26;
 STACKTOP = sp;return;
}
function _putglyph50($state,$chars,$width,$pos) {
 $state = $state|0;
 $chars = $chars|0;
 $width = $width|0;
 $pos = $pos|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $8 = 0, $9 = 0, $info = 0, $pos$byval_copy = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $pos$byval_copy = sp + 40|0;
 $vararg_buffer = sp;
 $info = sp + 12|0;
 $0 = $state;
 $1 = $chars;
 $2 = $width;
 $3 = $1;
 HEAP32[$info>>2] = $3;
 $4 = ((($info)) + 4|0);
 $5 = $2;
 HEAP32[$4>>2] = $5;
 $6 = ((($info)) + 8|0);
 $7 = $0;
 $8 = ((($7)) + 296|0);
 $9 = HEAP8[$8>>0]|0;
 $10 = $9 & 1;
 $11 = $10&255;
 $12 = $11&255;
 $13 = HEAP8[$6>>0]|0;
 $14 = $12 & 1;
 $15 = $13 & -2;
 $16 = $15 | $14;
 HEAP8[$6>>0] = $16;
 $17 = ((($info)) + 8|0);
 $18 = HEAP32[$pos>>2]|0;
 $19 = $0;
 $20 = ((($19)) + 60|0);
 $21 = HEAP32[$20>>2]|0;
 $22 = (($21) + ($18<<2)|0);
 $23 = HEAP8[$22>>0]|0;
 $24 = $23 & 1;
 $25 = $24&255;
 $26 = $25&255;
 $27 = HEAP8[$17>>0]|0;
 $28 = $26 & 1;
 $29 = ($28 << 1)&255;
 $30 = $27 & -3;
 $31 = $30 | $29;
 HEAP8[$17>>0] = $31;
 $32 = ((($info)) + 8|0);
 $33 = HEAP32[$pos>>2]|0;
 $34 = $0;
 $35 = ((($34)) + 60|0);
 $36 = HEAP32[$35>>2]|0;
 $37 = (($36) + ($33<<2)|0);
 $38 = HEAP8[$37>>0]|0;
 $39 = ($38&255) >>> 1;
 $40 = $39 & 3;
 $41 = $40&255;
 $42 = $41&255;
 $43 = HEAP8[$32>>0]|0;
 $44 = $42 & 3;
 $45 = ($44 << 2)&255;
 $46 = $43 & -13;
 $47 = $46 | $45;
 HEAP8[$32>>0] = $47;
 $48 = $0;
 $49 = ((($48)) + 4|0);
 $50 = HEAP32[$49>>2]|0;
 $51 = ($50|0)!=(0|0);
 if ($51) {
  $52 = $0;
  $53 = ((($52)) + 4|0);
  $54 = HEAP32[$53>>2]|0;
  $55 = HEAP32[$54>>2]|0;
  $56 = ($55|0)!=(0|0);
  if ($56) {
   $57 = $0;
   $58 = ((($57)) + 4|0);
   $59 = HEAP32[$58>>2]|0;
   $60 = HEAP32[$59>>2]|0;
   $61 = $0;
   $62 = ((($61)) + 8|0);
   $63 = HEAP32[$62>>2]|0;
   ;HEAP32[$pos$byval_copy>>2]=HEAP32[$pos>>2]|0;HEAP32[$pos$byval_copy+4>>2]=HEAP32[$pos+4>>2]|0;
   $64 = (FUNCTION_TABLE_iiii[$60 & 31]($info,$pos$byval_copy,$63)|0);
   $65 = ($64|0)!=(0);
   if ($65) {
    STACKTOP = sp;return;
   }
  }
 }
 $66 = HEAP32[3064>>2]|0;
 $67 = $1;
 $68 = HEAP32[$67>>2]|0;
 $69 = ((($pos)) + 4|0);
 $70 = HEAP32[$69>>2]|0;
 $71 = HEAP32[$pos>>2]|0;
 HEAP32[$vararg_buffer>>2] = $68;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = $70;
 $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
 HEAP32[$vararg_ptr2>>2] = $71;
 (_fprintf($66,4991,$vararg_buffer)|0);
 STACKTOP = sp;return;
}
function _linefeed($state) {
 $state = $state|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $8 = 0, $9 = 0, $rect = 0, $rect$byval_copy = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect$byval_copy = sp + 24|0;
 $rect = sp;
 $0 = $state;
 $1 = $0;
 $2 = ((($1)) + 28|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = $0;
 $5 = ((($4)) + 44|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)>(-1);
 $8 = $0;
 if ($7) {
  $9 = ((($8)) + 44|0);
  $10 = HEAP32[$9>>2]|0;
  $14 = $10;
 } else {
  $11 = ((($8)) + 20|0);
  $12 = HEAP32[$11>>2]|0;
  $14 = $12;
 }
 $13 = (($14) - 1)|0;
 $15 = ($3|0)==($13|0);
 if (!($15)) {
  $62 = $0;
  $63 = ((($62)) + 28|0);
  $64 = HEAP32[$63>>2]|0;
  $65 = $0;
  $66 = ((($65)) + 20|0);
  $67 = HEAP32[$66>>2]|0;
  $68 = (($67) - 1)|0;
  $69 = ($64|0)<($68|0);
  if (!($69)) {
   STACKTOP = sp;return;
  }
  $70 = $0;
  $71 = ((($70)) + 28|0);
  $72 = HEAP32[$71>>2]|0;
  $73 = (($72) + 1)|0;
  HEAP32[$71>>2] = $73;
  STACKTOP = sp;return;
 }
 $16 = $0;
 $17 = ((($16)) + 40|0);
 $18 = HEAP32[$17>>2]|0;
 HEAP32[$rect>>2] = $18;
 $19 = ((($rect)) + 4|0);
 $20 = $0;
 $21 = ((($20)) + 44|0);
 $22 = HEAP32[$21>>2]|0;
 $23 = ($22|0)>(-1);
 $24 = $0;
 if ($23) {
  $25 = ((($24)) + 44|0);
  $26 = HEAP32[$25>>2]|0;
  $29 = $26;
 } else {
  $27 = ((($24)) + 20|0);
  $28 = HEAP32[$27>>2]|0;
  $29 = $28;
 }
 HEAP32[$19>>2] = $29;
 $30 = ((($rect)) + 8|0);
 $31 = $0;
 $32 = ((($31)) + 104|0);
 $33 = HEAP16[$32>>1]|0;
 $34 = ($33 << 3)&65535;
 $35 = ($34<<16>>16) >> 15;
 $36 = $35 << 16 >> 16;
 $37 = ($36|0)!=(0);
 if ($37) {
  $38 = $0;
  $39 = ((($38)) + 48|0);
  $40 = HEAP32[$39>>2]|0;
  $41 = $40;
 } else {
  $41 = 0;
 }
 HEAP32[$30>>2] = $41;
 $42 = ((($rect)) + 12|0);
 $43 = $0;
 $44 = ((($43)) + 104|0);
 $45 = HEAP16[$44>>1]|0;
 $46 = ($45 << 3)&65535;
 $47 = ($46<<16>>16) >> 15;
 $48 = $47 << 16 >> 16;
 $49 = ($48|0)!=(0);
 if ($49) {
  $50 = $0;
  $51 = ((($50)) + 52|0);
  $52 = HEAP32[$51>>2]|0;
  $53 = ($52|0)>(-1);
  if ($53) {
   $54 = $0;
   $55 = ((($54)) + 52|0);
   $56 = HEAP32[$55>>2]|0;
   $60 = $56;
  } else {
   label = 13;
  }
 } else {
  label = 13;
 }
 if ((label|0) == 13) {
  $57 = $0;
  $58 = ((($57)) + 24|0);
  $59 = HEAP32[$58>>2]|0;
  $60 = $59;
 }
 HEAP32[$42>>2] = $60;
 $61 = $0;
 ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
 _scroll($61,$rect$byval_copy,1,0);
 STACKTOP = sp;return;
}
function _scroll($state,$rect,$downward,$rightward) {
 $state = $state|0;
 $rect = $rect|0;
 $downward = $downward|0;
 $rightward = $rightward|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0;
 var $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0;
 var $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0;
 var $99 = 0, $cols = 0, $height = 0, $or$cond = 0, $or$cond3 = 0, $rect$byval_copy = 0, $rect$byval_copy4 = 0, $rows = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect$byval_copy4 = sp + 40|0;
 $rect$byval_copy = sp + 24|0;
 $0 = $state;
 $1 = $downward;
 $2 = $rightward;
 $3 = $1;
 $4 = ($3|0)!=(0);
 $5 = $2;
 $6 = ($5|0)!=(0);
 $or$cond = $4 | $6;
 if (!($or$cond)) {
  STACKTOP = sp;return;
 }
 $7 = ((($rect)) + 4|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = HEAP32[$rect>>2]|0;
 $10 = (($8) - ($9))|0;
 $rows = $10;
 $11 = $1;
 $12 = $rows;
 $13 = ($11|0)>($12|0);
 if ($13) {
  $14 = $rows;
  $1 = $14;
 } else {
  $15 = $1;
  $16 = $rows;
  $17 = (0 - ($16))|0;
  $18 = ($15|0)<($17|0);
  if ($18) {
   $19 = $rows;
   $20 = (0 - ($19))|0;
   $1 = $20;
  }
 }
 $21 = ((($rect)) + 12|0);
 $22 = HEAP32[$21>>2]|0;
 $23 = ((($rect)) + 8|0);
 $24 = HEAP32[$23>>2]|0;
 $25 = (($22) - ($24))|0;
 $cols = $25;
 $26 = $2;
 $27 = $cols;
 $28 = ($26|0)>($27|0);
 if ($28) {
  $29 = $cols;
  $2 = $29;
 } else {
  $30 = $2;
  $31 = $cols;
  $32 = (0 - ($31))|0;
  $33 = ($30|0)<($32|0);
  if ($33) {
   $34 = $cols;
   $35 = (0 - ($34))|0;
   $2 = $35;
  }
 }
 $36 = ((($rect)) + 8|0);
 $37 = HEAP32[$36>>2]|0;
 $38 = ($37|0)==(0);
 do {
  if ($38) {
   $39 = ((($rect)) + 12|0);
   $40 = HEAP32[$39>>2]|0;
   $41 = $0;
   $42 = ((($41)) + 24|0);
   $43 = HEAP32[$42>>2]|0;
   $44 = ($40|0)==($43|0);
   $45 = $2;
   $46 = ($45|0)==(0);
   $or$cond3 = $44 & $46;
   if ($or$cond3) {
    $47 = ((($rect)) + 4|0);
    $48 = HEAP32[$47>>2]|0;
    $49 = HEAP32[$rect>>2]|0;
    $50 = (($48) - ($49))|0;
    $51 = $1;
    $52 = (Math_abs(($51|0))|0);
    $53 = (($50) - ($52))|0;
    $height = $53;
    $54 = $1;
    $55 = ($54|0)>(0);
    $56 = $0;
    $57 = ((($56)) + 60|0);
    $58 = HEAP32[$57>>2]|0;
    $59 = HEAP32[$rect>>2]|0;
    $60 = (($58) + ($59<<2)|0);
    if ($55) {
     $61 = $0;
     $62 = ((($61)) + 60|0);
     $63 = HEAP32[$62>>2]|0;
     $64 = HEAP32[$rect>>2]|0;
     $65 = (($63) + ($64<<2)|0);
     $66 = $1;
     $67 = (($65) + ($66<<2)|0);
     $68 = $height;
     $69 = $68<<2;
     _memmove(($60|0),($67|0),($69|0))|0;
     break;
    } else {
     $70 = $1;
     $71 = (0 - ($70))|0;
     $72 = (($60) + ($71<<2)|0);
     $73 = $0;
     $74 = ((($73)) + 60|0);
     $75 = HEAP32[$74>>2]|0;
     $76 = HEAP32[$rect>>2]|0;
     $77 = (($75) + ($76<<2)|0);
     $78 = $height;
     $79 = $78<<2;
     _memmove(($72|0),($77|0),($79|0))|0;
     break;
    }
   }
  }
 } while(0);
 $80 = $0;
 $81 = ((($80)) + 4|0);
 $82 = HEAP32[$81>>2]|0;
 $83 = ($82|0)!=(0|0);
 if ($83) {
  $84 = $0;
  $85 = ((($84)) + 4|0);
  $86 = HEAP32[$85>>2]|0;
  $87 = ((($86)) + 8|0);
  $88 = HEAP32[$87>>2]|0;
  $89 = ($88|0)!=(0|0);
  if ($89) {
   $90 = $0;
   $91 = ((($90)) + 4|0);
   $92 = HEAP32[$91>>2]|0;
   $93 = ((($92)) + 8|0);
   $94 = HEAP32[$93>>2]|0;
   $95 = $1;
   $96 = $2;
   $97 = $0;
   $98 = ((($97)) + 8|0);
   $99 = HEAP32[$98>>2]|0;
   ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
   $100 = (FUNCTION_TABLE_iiiii[$94 & 15]($rect$byval_copy,$95,$96,$99)|0);
   $101 = ($100|0)!=(0);
   if ($101) {
    STACKTOP = sp;return;
   }
  }
 }
 $102 = $0;
 $103 = ((($102)) + 4|0);
 $104 = HEAP32[$103>>2]|0;
 $105 = ($104|0)!=(0|0);
 if (!($105)) {
  STACKTOP = sp;return;
 }
 $106 = $1;
 $107 = $2;
 $108 = $0;
 $109 = ((($108)) + 4|0);
 $110 = HEAP32[$109>>2]|0;
 $111 = ((($110)) + 12|0);
 $112 = HEAP32[$111>>2]|0;
 $113 = $0;
 $114 = ((($113)) + 4|0);
 $115 = HEAP32[$114>>2]|0;
 $116 = ((($115)) + 16|0);
 $117 = HEAP32[$116>>2]|0;
 $118 = $0;
 $119 = ((($118)) + 8|0);
 $120 = HEAP32[$119>>2]|0;
 ;HEAP32[$rect$byval_copy4>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy4+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy4+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy4+12>>2]=HEAP32[$rect+12>>2]|0;
 _vterm_scroll_rect($rect$byval_copy4,$106,$107,$112,$117,$120);
 STACKTOP = sp;return;
}
function _updatecursor($state,$oldpos,$cancel_phantom) {
 $state = $state|0;
 $oldpos = $oldpos|0;
 $cancel_phantom = $cancel_phantom|0;
 var $$byval_copy = 0, $$byval_copy1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy1 = sp + 24|0;
 $$byval_copy = sp + 16|0;
 $0 = $state;
 $1 = $oldpos;
 $2 = $cancel_phantom;
 $3 = $0;
 $4 = ((($3)) + 28|0);
 $5 = ((($4)) + 4|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = $1;
 $8 = ((($7)) + 4|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($6|0)==($9|0);
 if ($10) {
  $11 = $0;
  $12 = ((($11)) + 28|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = $1;
  $15 = HEAP32[$14>>2]|0;
  $16 = ($13|0)==($15|0);
  if ($16) {
   STACKTOP = sp;return;
  }
 }
 $17 = $2;
 $18 = ($17|0)!=(0);
 if ($18) {
  $19 = $0;
  $20 = ((($19)) + 36|0);
  HEAP32[$20>>2] = 0;
 }
 $21 = $0;
 $22 = ((($21)) + 4|0);
 $23 = HEAP32[$22>>2]|0;
 $24 = ($23|0)!=(0|0);
 if (!($24)) {
  STACKTOP = sp;return;
 }
 $25 = $0;
 $26 = ((($25)) + 4|0);
 $27 = HEAP32[$26>>2]|0;
 $28 = ((($27)) + 4|0);
 $29 = HEAP32[$28>>2]|0;
 $30 = ($29|0)!=(0|0);
 if (!($30)) {
  STACKTOP = sp;return;
 }
 $31 = $0;
 $32 = ((($31)) + 4|0);
 $33 = HEAP32[$32>>2]|0;
 $34 = ((($33)) + 4|0);
 $35 = HEAP32[$34>>2]|0;
 $36 = $0;
 $37 = ((($36)) + 28|0);
 $38 = $1;
 $39 = $0;
 $40 = ((($39)) + 104|0);
 $41 = HEAP16[$40>>1]|0;
 $42 = ($41 << 10)&65535;
 $43 = ($42<<16>>16) >> 15;
 $44 = $43 << 16 >> 16;
 $45 = $0;
 $46 = ((($45)) + 8|0);
 $47 = HEAP32[$46>>2]|0;
 ;HEAP32[$$byval_copy>>2]=HEAP32[$37>>2]|0;HEAP32[$$byval_copy+4>>2]=HEAP32[$37+4>>2]|0;
 ;HEAP32[$$byval_copy1>>2]=HEAP32[$38>>2]|0;HEAP32[$$byval_copy1+4>>2]=HEAP32[$38+4>>2]|0;
 (FUNCTION_TABLE_iiiii[$35 & 15]($$byval_copy,$$byval_copy1,$44,$47)|0);
 STACKTOP = sp;return;
}
function _on_control($control,$user) {
 $control = $control|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $19 = 0, $2 = 0;
 var $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0;
 var $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0;
 var $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0;
 var $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0;
 var $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $oldpos = 0, $rect = 0, $rect$byval_copy = 0, $state = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect$byval_copy = sp + 56|0;
 $vararg_buffer = sp;
 $oldpos = sp + 32|0;
 $rect = sp + 16|0;
 $1 = $control;
 $2 = $user;
 $3 = $2;
 $state = $3;
 $4 = $state;
 $5 = ((($4)) + 28|0);
 ;HEAP32[$oldpos>>2]=HEAP32[$5>>2]|0;HEAP32[$oldpos+4>>2]=HEAP32[$5+4>>2]|0;
 $6 = $1;
 $7 = $6&255;
 L1: do {
  switch ($7|0) {
  case 7:  {
   $8 = $state;
   $9 = ((($8)) + 4|0);
   $10 = HEAP32[$9>>2]|0;
   $11 = ($10|0)!=(0|0);
   if ($11) {
    $12 = $state;
    $13 = ((($12)) + 4|0);
    $14 = HEAP32[$13>>2]|0;
    $15 = ((($14)) + 32|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = ($16|0)!=(0|0);
    if ($17) {
     $18 = $state;
     $19 = ((($18)) + 4|0);
     $20 = HEAP32[$19>>2]|0;
     $21 = ((($20)) + 32|0);
     $22 = HEAP32[$21>>2]|0;
     $23 = $state;
     $24 = ((($23)) + 8|0);
     $25 = HEAP32[$24>>2]|0;
     (FUNCTION_TABLE_ii[$22 & 31]($25)|0);
    }
   }
   break;
  }
  case 8:  {
   $26 = $state;
   $27 = ((($26)) + 28|0);
   $28 = ((($27)) + 4|0);
   $29 = HEAP32[$28>>2]|0;
   $30 = ($29|0)>(0);
   if ($30) {
    $31 = $state;
    $32 = ((($31)) + 28|0);
    $33 = ((($32)) + 4|0);
    $34 = HEAP32[$33>>2]|0;
    $35 = (($34) + -1)|0;
    HEAP32[$33>>2] = $35;
   }
   break;
  }
  case 9:  {
   $36 = $state;
   _tab($36,1,1);
   break;
  }
  case 12: case 11: case 10:  {
   $37 = $state;
   _linefeed($37);
   $38 = $state;
   $39 = ((($38)) + 104|0);
   $40 = HEAP16[$39>>1]|0;
   $41 = ($40 << 11)&65535;
   $42 = ($41<<16>>16) >> 15;
   $43 = $42 << 16 >> 16;
   $44 = ($43|0)!=(0);
   if ($44) {
    $45 = $state;
    $46 = ((($45)) + 28|0);
    $47 = ((($46)) + 4|0);
    HEAP32[$47>>2] = 0;
   }
   break;
  }
  case 13:  {
   $48 = $state;
   $49 = ((($48)) + 28|0);
   $50 = ((($49)) + 4|0);
   HEAP32[$50>>2] = 0;
   break;
  }
  case 14:  {
   $51 = $state;
   $52 = ((($51)) + 208|0);
   HEAP32[$52>>2] = 1;
   break;
  }
  case 15:  {
   $53 = $state;
   $54 = ((($53)) + 208|0);
   HEAP32[$54>>2] = 0;
   break;
  }
  case 132:  {
   $55 = $state;
   _linefeed($55);
   break;
  }
  case 133:  {
   $56 = $state;
   _linefeed($56);
   $57 = $state;
   $58 = ((($57)) + 28|0);
   $59 = ((($58)) + 4|0);
   HEAP32[$59>>2] = 0;
   break;
  }
  case 136:  {
   $60 = $state;
   $61 = $state;
   $62 = ((($61)) + 28|0);
   $63 = ((($62)) + 4|0);
   $64 = HEAP32[$63>>2]|0;
   _set_col_tabstop($60,$64);
   break;
  }
  case 141:  {
   $65 = $state;
   $66 = ((($65)) + 28|0);
   $67 = HEAP32[$66>>2]|0;
   $68 = $state;
   $69 = ((($68)) + 40|0);
   $70 = HEAP32[$69>>2]|0;
   $71 = ($67|0)==($70|0);
   if (!($71)) {
    $118 = $state;
    $119 = ((($118)) + 28|0);
    $120 = HEAP32[$119>>2]|0;
    $121 = ($120|0)>(0);
    if (!($121)) {
     break L1;
    }
    $122 = $state;
    $123 = ((($122)) + 28|0);
    $124 = HEAP32[$123>>2]|0;
    $125 = (($124) + -1)|0;
    HEAP32[$123>>2] = $125;
    break L1;
   }
   $72 = $state;
   $73 = ((($72)) + 40|0);
   $74 = HEAP32[$73>>2]|0;
   HEAP32[$rect>>2] = $74;
   $75 = ((($rect)) + 4|0);
   $76 = $state;
   $77 = ((($76)) + 44|0);
   $78 = HEAP32[$77>>2]|0;
   $79 = ($78|0)>(-1);
   $80 = $state;
   if ($79) {
    $81 = ((($80)) + 44|0);
    $82 = HEAP32[$81>>2]|0;
    $85 = $82;
   } else {
    $83 = ((($80)) + 20|0);
    $84 = HEAP32[$83>>2]|0;
    $85 = $84;
   }
   HEAP32[$75>>2] = $85;
   $86 = ((($rect)) + 8|0);
   $87 = $state;
   $88 = ((($87)) + 104|0);
   $89 = HEAP16[$88>>1]|0;
   $90 = ($89 << 3)&65535;
   $91 = ($90<<16>>16) >> 15;
   $92 = $91 << 16 >> 16;
   $93 = ($92|0)!=(0);
   if ($93) {
    $94 = $state;
    $95 = ((($94)) + 48|0);
    $96 = HEAP32[$95>>2]|0;
    $97 = $96;
   } else {
    $97 = 0;
   }
   HEAP32[$86>>2] = $97;
   $98 = ((($rect)) + 12|0);
   $99 = $state;
   $100 = ((($99)) + 104|0);
   $101 = HEAP16[$100>>1]|0;
   $102 = ($101 << 3)&65535;
   $103 = ($102<<16>>16) >> 15;
   $104 = $103 << 16 >> 16;
   $105 = ($104|0)!=(0);
   if ($105) {
    $106 = $state;
    $107 = ((($106)) + 52|0);
    $108 = HEAP32[$107>>2]|0;
    $109 = ($108|0)>(-1);
    if ($109) {
     $110 = $state;
     $111 = ((($110)) + 52|0);
     $112 = HEAP32[$111>>2]|0;
     $116 = $112;
    } else {
     label = 25;
    }
   } else {
    label = 25;
   }
   if ((label|0) == 25) {
    $113 = $state;
    $114 = ((($113)) + 24|0);
    $115 = HEAP32[$114>>2]|0;
    $116 = $115;
   }
   HEAP32[$98>>2] = $116;
   $117 = $state;
   ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
   _scroll($117,$rect$byval_copy,-1,0);
   break;
  }
  case 142:  {
   $126 = $state;
   $127 = ((($126)) + 216|0);
   HEAP32[$127>>2] = 2;
   break;
  }
  case 143:  {
   $128 = $state;
   $129 = ((($128)) + 216|0);
   HEAP32[$129>>2] = 3;
   break;
  }
  default: {
   $130 = $state;
   $131 = ((($130)) + 12|0);
   $132 = HEAP32[$131>>2]|0;
   $133 = ($132|0)!=(0|0);
   if ($133) {
    $134 = $state;
    $135 = ((($134)) + 12|0);
    $136 = HEAP32[$135>>2]|0;
    $137 = ((($136)) + 4|0);
    $138 = HEAP32[$137>>2]|0;
    $139 = ($138|0)!=(0|0);
    if ($139) {
     $140 = $state;
     $141 = ((($140)) + 12|0);
     $142 = HEAP32[$141>>2]|0;
     $143 = ((($142)) + 4|0);
     $144 = HEAP32[$143>>2]|0;
     $145 = $1;
     $146 = $state;
     $147 = ((($146)) + 16|0);
     $148 = HEAP32[$147>>2]|0;
     $149 = (FUNCTION_TABLE_iii[$144 & 31]($145,$148)|0);
     $150 = ($149|0)!=(0);
     if ($150) {
      $0 = 1;
      $186 = $0;
      STACKTOP = sp;return ($186|0);
     }
    }
   }
   $0 = 0;
   $186 = $0;
   STACKTOP = sp;return ($186|0);
  }
  }
 } while(0);
 $151 = $state;
 _updatecursor($151,$oldpos,1);
 $152 = $state;
 $153 = ((($152)) + 28|0);
 $154 = HEAP32[$153>>2]|0;
 $155 = ($154|0)<(0);
 if (!($155)) {
  $156 = $state;
  $157 = ((($156)) + 28|0);
  $158 = HEAP32[$157>>2]|0;
  $159 = $state;
  $160 = ((($159)) + 20|0);
  $161 = HEAP32[$160>>2]|0;
  $162 = ($158|0)>=($161|0);
  if (!($162)) {
   $163 = $state;
   $164 = ((($163)) + 28|0);
   $165 = ((($164)) + 4|0);
   $166 = HEAP32[$165>>2]|0;
   $167 = ($166|0)<(0);
   if (!($167)) {
    $168 = $state;
    $169 = ((($168)) + 28|0);
    $170 = ((($169)) + 4|0);
    $171 = HEAP32[$170>>2]|0;
    $172 = $state;
    $173 = ((($172)) + 24|0);
    $174 = HEAP32[$173>>2]|0;
    $175 = ($171|0)>=($174|0);
    if (!($175)) {
     $0 = 1;
     $186 = $0;
     STACKTOP = sp;return ($186|0);
    }
   }
  }
 }
 $176 = HEAP32[3064>>2]|0;
 $177 = $1;
 $178 = $177&255;
 $179 = $state;
 $180 = ((($179)) + 28|0);
 $181 = HEAP32[$180>>2]|0;
 $182 = $state;
 $183 = ((($182)) + 28|0);
 $184 = ((($183)) + 4|0);
 $185 = HEAP32[$184>>2]|0;
 HEAP32[$vararg_buffer>>2] = $178;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = $181;
 $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
 HEAP32[$vararg_ptr2>>2] = $185;
 (_fprintf($176,4942,$vararg_buffer)|0);
 _abort();
 // unreachable;
 return (0)|0;
}
function _tab($state,$count,$direction) {
 $state = $state|0;
 $count = $count|0;
 $direction = $direction|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $count;
 $2 = $direction;
 while(1) {
  $3 = $1;
  $4 = ($3|0)>(0);
  if (!($4)) {
   label = 11;
   break;
  }
  $5 = $2;
  $6 = ($5|0)>(0);
  if ($6) {
   $7 = $0;
   $8 = ((($7)) + 28|0);
   $9 = ((($8)) + 4|0);
   $10 = HEAP32[$9>>2]|0;
   $11 = $0;
   $12 = ((($11)) + 28|0);
   $13 = HEAP32[$12>>2]|0;
   $14 = $0;
   $15 = ((($14)) + 60|0);
   $16 = HEAP32[$15>>2]|0;
   $17 = (($16) + ($13<<2)|0);
   $18 = HEAP8[$17>>0]|0;
   $19 = $18 & 1;
   $20 = $19&255;
   $21 = ($20|0)!=(0);
   $22 = $0;
   $23 = ((($22)) + 24|0);
   $24 = HEAP32[$23>>2]|0;
   $25 = (($24|0) / 2)&-1;
   $26 = $21 ? $25 : $24;
   $27 = (($26) - 1)|0;
   $28 = ($10|0)>=($27|0);
   if ($28) {
    label = 11;
    break;
   }
   $29 = $0;
   $30 = ((($29)) + 28|0);
   $31 = ((($30)) + 4|0);
   $32 = HEAP32[$31>>2]|0;
   $33 = (($32) + 1)|0;
   HEAP32[$31>>2] = $33;
  } else {
   $34 = $2;
   $35 = ($34|0)<(0);
   if ($35) {
    $36 = $0;
    $37 = ((($36)) + 28|0);
    $38 = ((($37)) + 4|0);
    $39 = HEAP32[$38>>2]|0;
    $40 = ($39|0)<(1);
    if ($40) {
     label = 11;
     break;
    }
    $41 = $0;
    $42 = ((($41)) + 28|0);
    $43 = ((($42)) + 4|0);
    $44 = HEAP32[$43>>2]|0;
    $45 = (($44) + -1)|0;
    HEAP32[$43>>2] = $45;
   }
  }
  $46 = $0;
  $47 = $0;
  $48 = ((($47)) + 28|0);
  $49 = ((($48)) + 4|0);
  $50 = HEAP32[$49>>2]|0;
  $51 = (_is_col_tabstop($46,$50)|0);
  $52 = ($51|0)!=(0);
  if (!($52)) {
   continue;
  }
  $53 = $1;
  $54 = (($53) + -1)|0;
  $1 = $54;
 }
 if ((label|0) == 11) {
  STACKTOP = sp;return;
 }
}
function _is_col_tabstop($state,$col) {
 $state = $state|0;
 $col = $col|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $mask = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $state;
 $1 = $col;
 $2 = $1;
 $3 = $2 & 7;
 $4 = 1 << $3;
 $5 = $4&255;
 $mask = $5;
 $6 = $1;
 $7 = $6 >> 3;
 $8 = $0;
 $9 = ((($8)) + 56|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = (($10) + ($7)|0);
 $12 = HEAP8[$11>>0]|0;
 $13 = $12&255;
 $14 = $mask;
 $15 = $14&255;
 $16 = $13 & $15;
 STACKTOP = sp;return ($16|0);
}
function _on_escape($bytes,$len,$user) {
 $bytes = $bytes|0;
 $len = $len|0;
 $user = $user|0;
 var $$byval_copy = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0;
 var $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0;
 var $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0;
 var $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0;
 var $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0;
 var $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0;
 var $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0;
 var $96 = 0, $97 = 0, $98 = 0, $99 = 0, $E = 0, $newenc = 0, $oldpos = 0, $oldpos$byval_copy = 0, $pos = 0, $pos$byval_copy = 0, $setnum = 0, $state = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $oldpos$byval_copy = sp + 72|0;
 $$byval_copy = sp + 64|0;
 $pos$byval_copy = sp + 56|0;
 $pos = sp + 24|0;
 $E = sp + 16|0;
 $oldpos = sp;
 $1 = $bytes;
 $2 = $len;
 $3 = $user;
 $4 = $3;
 $state = $4;
 $5 = $1;
 $6 = HEAP8[$5>>0]|0;
 $7 = $6 << 24 >> 24;
 do {
  switch ($7|0) {
  case 32:  {
   $8 = $2;
   $9 = ($8|0)!=(2);
   if ($9) {
    $0 = 0;
    $182 = $0;
    STACKTOP = sp;return ($182|0);
   }
   $10 = $1;
   $11 = ((($10)) + 1|0);
   $12 = HEAP8[$11>>0]|0;
   $13 = $12 << 24 >> 24;
   switch ($13|0) {
   case 70:  {
    $14 = $state;
    $15 = HEAP32[$14>>2]|0;
    $16 = ((($15)) + 16|0);
    $17 = HEAP8[$16>>0]|0;
    $18 = $17 & -3;
    HEAP8[$16>>0] = $18;
    break;
   }
   case 71:  {
    $19 = $state;
    $20 = HEAP32[$19>>2]|0;
    $21 = ((($20)) + 16|0);
    $22 = HEAP8[$21>>0]|0;
    $23 = $22 & -3;
    $24 = $23 | 2;
    HEAP8[$21>>0] = $24;
    break;
   }
   default: {
    $0 = 0;
    $182 = $0;
    STACKTOP = sp;return ($182|0);
   }
   }
   $0 = 2;
   $182 = $0;
   STACKTOP = sp;return ($182|0);
   break;
  }
  case 35:  {
   $25 = $2;
   $26 = ($25|0)!=(2);
   if ($26) {
    $0 = 0;
    $182 = $0;
    STACKTOP = sp;return ($182|0);
   }
   $27 = $1;
   $28 = ((($27)) + 1|0);
   $29 = HEAP8[$28>>0]|0;
   $30 = $29 << 24 >> 24;
   L21: do {
    switch ($30|0) {
    case 51:  {
     $31 = $state;
     $32 = ((($31)) + 104|0);
     $33 = HEAP16[$32>>1]|0;
     $34 = ($33 << 3)&65535;
     $35 = ($34<<16>>16) >> 15;
     $36 = $35 << 16 >> 16;
     $37 = ($36|0)!=(0);
     if (!($37)) {
      $38 = $state;
      $39 = $state;
      $40 = ((($39)) + 28|0);
      $41 = HEAP32[$40>>2]|0;
      _set_lineinfo($38,$41,0,1,1);
     }
     break;
    }
    case 52:  {
     $42 = $state;
     $43 = ((($42)) + 104|0);
     $44 = HEAP16[$43>>1]|0;
     $45 = ($44 << 3)&65535;
     $46 = ($45<<16>>16) >> 15;
     $47 = $46 << 16 >> 16;
     $48 = ($47|0)!=(0);
     if (!($48)) {
      $49 = $state;
      $50 = $state;
      $51 = ((($50)) + 28|0);
      $52 = HEAP32[$51>>2]|0;
      _set_lineinfo($49,$52,0,1,2);
     }
     break;
    }
    case 53:  {
     $53 = $state;
     $54 = ((($53)) + 104|0);
     $55 = HEAP16[$54>>1]|0;
     $56 = ($55 << 3)&65535;
     $57 = ($56<<16>>16) >> 15;
     $58 = $57 << 16 >> 16;
     $59 = ($58|0)!=(0);
     if (!($59)) {
      $60 = $state;
      $61 = $state;
      $62 = ((($61)) + 28|0);
      $63 = HEAP32[$62>>2]|0;
      _set_lineinfo($60,$63,0,0,0);
     }
     break;
    }
    case 54:  {
     $64 = $state;
     $65 = ((($64)) + 104|0);
     $66 = HEAP16[$65>>1]|0;
     $67 = ($66 << 3)&65535;
     $68 = ($67<<16>>16) >> 15;
     $69 = $68 << 16 >> 16;
     $70 = ($69|0)!=(0);
     if (!($70)) {
      $71 = $state;
      $72 = $state;
      $73 = ((($72)) + 28|0);
      $74 = HEAP32[$73>>2]|0;
      _set_lineinfo($71,$74,0,1,0);
     }
     break;
    }
    case 56:  {
     ;HEAP32[$E>>2]=HEAP32[1868>>2]|0;HEAP32[$E+4>>2]=HEAP32[1868+4>>2]|0;
     HEAP32[$pos>>2] = 0;
     while(1) {
      $75 = HEAP32[$pos>>2]|0;
      $76 = $state;
      $77 = ((($76)) + 20|0);
      $78 = HEAP32[$77>>2]|0;
      $79 = ($75|0)<($78|0);
      if (!($79)) {
       break L21;
      }
      $80 = ((($pos)) + 4|0);
      HEAP32[$80>>2] = 0;
      while(1) {
       $81 = ((($pos)) + 4|0);
       $82 = HEAP32[$81>>2]|0;
       $83 = HEAP32[$pos>>2]|0;
       $84 = $state;
       $85 = ((($84)) + 60|0);
       $86 = HEAP32[$85>>2]|0;
       $87 = (($86) + ($83<<2)|0);
       $88 = HEAP8[$87>>0]|0;
       $89 = $88 & 1;
       $90 = $89&255;
       $91 = ($90|0)!=(0);
       $92 = $state;
       $93 = ((($92)) + 24|0);
       $94 = HEAP32[$93>>2]|0;
       $95 = (($94|0) / 2)&-1;
       $96 = $91 ? $95 : $94;
       $97 = ($82|0)<($96|0);
       if (!($97)) {
        break;
       }
       $98 = $state;
       ;HEAP32[$pos$byval_copy>>2]=HEAP32[$pos>>2]|0;HEAP32[$pos$byval_copy+4>>2]=HEAP32[$pos+4>>2]|0;
       _putglyph50($98,$E,1,$pos$byval_copy);
       $99 = ((($pos)) + 4|0);
       $100 = HEAP32[$99>>2]|0;
       $101 = (($100) + 1)|0;
       HEAP32[$99>>2] = $101;
      }
      $102 = HEAP32[$pos>>2]|0;
      $103 = (($102) + 1)|0;
      HEAP32[$pos>>2] = $103;
     }
     break;
    }
    default: {
     $0 = 0;
     $182 = $0;
     STACKTOP = sp;return ($182|0);
    }
    }
   } while(0);
   $0 = 2;
   $182 = $0;
   STACKTOP = sp;return ($182|0);
   break;
  }
  case 43: case 42: case 41: case 40:  {
   $104 = $2;
   $105 = ($104|0)!=(2);
   if ($105) {
    $0 = 0;
    $182 = $0;
    STACKTOP = sp;return ($182|0);
   }
   $106 = $1;
   $107 = HEAP8[$106>>0]|0;
   $108 = $107 << 24 >> 24;
   $109 = (($108) - 40)|0;
   $setnum = $109;
   $110 = $1;
   $111 = ((($110)) + 1|0);
   $112 = HEAP8[$111>>0]|0;
   $113 = (_vterm_lookup_encoding(1,$112)|0);
   $newenc = $113;
   $114 = $newenc;
   $115 = ($114|0)!=(0|0);
   if ($115) {
    $116 = $newenc;
    $117 = $setnum;
    $118 = $state;
    $119 = ((($118)) + 108|0);
    $120 = (($119) + (($117*20)|0)|0);
    HEAP32[$120>>2] = $116;
    $121 = $newenc;
    $122 = HEAP32[$121>>2]|0;
    $123 = ($122|0)!=(0|0);
    if ($123) {
     $124 = $newenc;
     $125 = HEAP32[$124>>2]|0;
     $126 = $newenc;
     $127 = $setnum;
     $128 = $state;
     $129 = ((($128)) + 108|0);
     $130 = (($129) + (($127*20)|0)|0);
     $131 = ((($130)) + 4|0);
     FUNCTION_TABLE_vii[$125 & 31]($126,$131);
    }
   }
   $0 = 2;
   $182 = $0;
   STACKTOP = sp;return ($182|0);
   break;
  }
  case 55:  {
   $132 = $state;
   _savecursor($132,1);
   $0 = 1;
   $182 = $0;
   STACKTOP = sp;return ($182|0);
   break;
  }
  case 56:  {
   $133 = $state;
   _savecursor($133,0);
   $0 = 1;
   $182 = $0;
   STACKTOP = sp;return ($182|0);
   break;
  }
  case 60:  {
   $0 = 1;
   $182 = $0;
   STACKTOP = sp;return ($182|0);
   break;
  }
  case 61:  {
   $134 = $state;
   $135 = ((($134)) + 104|0);
   $136 = HEAP16[$135>>1]|0;
   $137 = $136 & -2;
   $138 = $137 | 1;
   HEAP16[$135>>1] = $138;
   $0 = 1;
   $182 = $0;
   STACKTOP = sp;return ($182|0);
   break;
  }
  case 62:  {
   $139 = $state;
   $140 = ((($139)) + 104|0);
   $141 = HEAP16[$140>>1]|0;
   $142 = $141 & -2;
   HEAP16[$140>>1] = $142;
   $0 = 1;
   $182 = $0;
   STACKTOP = sp;return ($182|0);
   break;
  }
  case 99:  {
   $143 = $state;
   $144 = ((($143)) + 28|0);
   ;HEAP32[$oldpos>>2]=HEAP32[$144>>2]|0;HEAP32[$oldpos+4>>2]=HEAP32[$144+4>>2]|0;
   $145 = $state;
   _vterm_state_reset($145,1);
   $146 = $state;
   $147 = ((($146)) + 4|0);
   $148 = HEAP32[$147>>2]|0;
   $149 = ($148|0)!=(0|0);
   if ($149) {
    $150 = $state;
    $151 = ((($150)) + 4|0);
    $152 = HEAP32[$151>>2]|0;
    $153 = ((($152)) + 4|0);
    $154 = HEAP32[$153>>2]|0;
    $155 = ($154|0)!=(0|0);
    if ($155) {
     $156 = $state;
     $157 = ((($156)) + 4|0);
     $158 = HEAP32[$157>>2]|0;
     $159 = ((($158)) + 4|0);
     $160 = HEAP32[$159>>2]|0;
     $161 = $state;
     $162 = ((($161)) + 28|0);
     $163 = $state;
     $164 = ((($163)) + 104|0);
     $165 = HEAP16[$164>>1]|0;
     $166 = ($165 << 10)&65535;
     $167 = ($166<<16>>16) >> 15;
     $168 = $167 << 16 >> 16;
     $169 = $state;
     $170 = ((($169)) + 8|0);
     $171 = HEAP32[$170>>2]|0;
     ;HEAP32[$$byval_copy>>2]=HEAP32[$162>>2]|0;HEAP32[$$byval_copy+4>>2]=HEAP32[$162+4>>2]|0;
     ;HEAP32[$oldpos$byval_copy>>2]=HEAP32[$oldpos>>2]|0;HEAP32[$oldpos$byval_copy+4>>2]=HEAP32[$oldpos+4>>2]|0;
     (FUNCTION_TABLE_iiiii[$160 & 15]($$byval_copy,$oldpos$byval_copy,$168,$171)|0);
    }
   }
   $0 = 1;
   $182 = $0;
   STACKTOP = sp;return ($182|0);
   break;
  }
  case 110:  {
   $172 = $state;
   $173 = ((($172)) + 208|0);
   HEAP32[$173>>2] = 2;
   $0 = 1;
   $182 = $0;
   STACKTOP = sp;return ($182|0);
   break;
  }
  case 111:  {
   $174 = $state;
   $175 = ((($174)) + 208|0);
   HEAP32[$175>>2] = 3;
   $0 = 1;
   $182 = $0;
   STACKTOP = sp;return ($182|0);
   break;
  }
  case 126:  {
   $176 = $state;
   $177 = ((($176)) + 212|0);
   HEAP32[$177>>2] = 1;
   $0 = 1;
   $182 = $0;
   STACKTOP = sp;return ($182|0);
   break;
  }
  case 125:  {
   $178 = $state;
   $179 = ((($178)) + 212|0);
   HEAP32[$179>>2] = 2;
   $0 = 1;
   $182 = $0;
   STACKTOP = sp;return ($182|0);
   break;
  }
  case 124:  {
   $180 = $state;
   $181 = ((($180)) + 212|0);
   HEAP32[$181>>2] = 3;
   $0 = 1;
   $182 = $0;
   STACKTOP = sp;return ($182|0);
   break;
  }
  default: {
   $0 = 0;
   $182 = $0;
   STACKTOP = sp;return ($182|0);
  }
  }
 } while(0);
 return (0)|0;
}
function _savecursor($state,$save) {
 $state = $state|0;
 $save = $save|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $9 = 0, $oldpos = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $oldpos = sp;
 $0 = $state;
 $1 = $save;
 $2 = $1;
 $3 = ($2|0)!=(0);
 $4 = $0;
 if ($3) {
  $5 = ((($4)) + 300|0);
  $6 = $0;
  $7 = ((($6)) + 28|0);
  ;HEAP32[$5>>2]=HEAP32[$7>>2]|0;HEAP32[$5+4>>2]=HEAP32[$7+4>>2]|0;
  $8 = $0;
  $9 = ((($8)) + 104|0);
  $10 = HEAP16[$9>>1]|0;
  $11 = ($10 << 10)&65535;
  $12 = ($11<<16>>16) >> 15;
  $13 = $12 << 16 >> 16;
  $14 = $0;
  $15 = ((($14)) + 300|0);
  $16 = ((($15)) + 16|0);
  $17 = $13&255;
  $18 = HEAP8[$16>>0]|0;
  $19 = $17 & 1;
  $20 = $18 & -2;
  $21 = $20 | $19;
  HEAP8[$16>>0] = $21;
  $22 = $0;
  $23 = ((($22)) + 104|0);
  $24 = HEAP16[$23>>1]|0;
  $25 = ($24 << 9)&65535;
  $26 = ($25<<16>>16) >> 15;
  $27 = $26 << 16 >> 16;
  $28 = $0;
  $29 = ((($28)) + 300|0);
  $30 = ((($29)) + 16|0);
  $31 = $27&255;
  $32 = HEAP8[$30>>0]|0;
  $33 = $31 & 1;
  $34 = ($33 << 1)&255;
  $35 = $32 & -3;
  $36 = $35 | $34;
  HEAP8[$30>>0] = $36;
  $37 = $0;
  $38 = ((($37)) + 104|0);
  $39 = HEAP16[$38>>1]|0;
  $40 = ($39&65535) >>> 7;
  $41 = $40 & 3;
  $42 = $41&65535;
  $43 = $0;
  $44 = ((($43)) + 300|0);
  $45 = ((($44)) + 16|0);
  $46 = $42&255;
  $47 = HEAP8[$45>>0]|0;
  $48 = $46 & 3;
  $49 = ($48 << 2)&255;
  $50 = $47 & -13;
  $51 = $50 | $49;
  HEAP8[$45>>0] = $51;
  $52 = $0;
  _vterm_state_savepen($52,1);
  STACKTOP = sp;return;
 } else {
  $53 = ((($4)) + 28|0);
  ;HEAP32[$oldpos>>2]=HEAP32[$53>>2]|0;HEAP32[$oldpos+4>>2]=HEAP32[$53+4>>2]|0;
  $54 = $0;
  $55 = ((($54)) + 28|0);
  $56 = $0;
  $57 = ((($56)) + 300|0);
  ;HEAP32[$55>>2]=HEAP32[$57>>2]|0;HEAP32[$55+4>>2]=HEAP32[$57+4>>2]|0;
  $58 = $0;
  $59 = $0;
  $60 = ((($59)) + 300|0);
  $61 = ((($60)) + 16|0);
  $62 = HEAP8[$61>>0]|0;
  $63 = ($62 << 7)&255;
  $64 = ($63<<24>>24) >> 7;
  $65 = $64 << 24 >> 24;
  (_settermprop_bool($58,1,$65)|0);
  $66 = $0;
  $67 = $0;
  $68 = ((($67)) + 300|0);
  $69 = ((($68)) + 16|0);
  $70 = HEAP8[$69>>0]|0;
  $71 = ($70 << 6)&255;
  $72 = ($71<<24>>24) >> 7;
  $73 = $72 << 24 >> 24;
  (_settermprop_bool($66,2,$73)|0);
  $74 = $0;
  $75 = $0;
  $76 = ((($75)) + 300|0);
  $77 = ((($76)) + 16|0);
  $78 = HEAP8[$77>>0]|0;
  $79 = ($78&255) >>> 2;
  $80 = $79 & 3;
  $81 = $80&255;
  (_settermprop_int($74,7,$81)|0);
  $82 = $0;
  _vterm_state_savepen($82,0);
  $83 = $0;
  _updatecursor($83,$oldpos,1);
  STACKTOP = sp;return;
 }
}
function _on_csi($leader,$args,$argcount,$intermed,$command,$user) {
 $leader = $leader|0;
 $args = $args|0;
 $argcount = $argcount|0;
 $intermed = $intermed|0;
 $command = $command|0;
 $user = $user|0;
 var $$off = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0;
 var $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0;
 var $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0;
 var $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0;
 var $1069 = 0, $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $1075 = 0, $1076 = 0, $1077 = 0, $1078 = 0, $1079 = 0, $108 = 0, $1080 = 0, $1081 = 0, $1082 = 0, $1083 = 0, $1084 = 0, $1085 = 0, $1086 = 0;
 var $1087 = 0, $1088 = 0, $1089 = 0, $109 = 0, $1090 = 0, $1091 = 0, $1092 = 0, $1093 = 0, $1094 = 0, $1095 = 0, $1096 = 0, $1097 = 0, $1098 = 0, $1099 = 0, $11 = 0, $110 = 0, $1100 = 0, $1101 = 0, $1102 = 0, $1103 = 0;
 var $1104 = 0, $1105 = 0, $1106 = 0, $1107 = 0, $1108 = 0, $1109 = 0, $111 = 0, $1110 = 0, $1111 = 0, $1112 = 0, $1113 = 0, $1114 = 0, $1115 = 0, $1116 = 0, $1117 = 0, $1118 = 0, $1119 = 0, $112 = 0, $1120 = 0, $1121 = 0;
 var $1122 = 0, $1123 = 0, $1124 = 0, $1125 = 0, $1126 = 0, $1127 = 0, $1128 = 0, $1129 = 0, $113 = 0, $1130 = 0, $1131 = 0, $1132 = 0, $1133 = 0, $1134 = 0, $1135 = 0, $1136 = 0, $1137 = 0, $1138 = 0, $1139 = 0, $114 = 0;
 var $1140 = 0, $1141 = 0, $1142 = 0, $1143 = 0, $1144 = 0, $1145 = 0, $1146 = 0, $1147 = 0, $1148 = 0, $1149 = 0, $115 = 0, $1150 = 0, $1151 = 0, $1152 = 0, $1153 = 0, $1154 = 0, $1155 = 0, $1156 = 0, $1157 = 0, $1158 = 0;
 var $1159 = 0, $116 = 0, $1160 = 0, $1161 = 0, $1162 = 0, $1163 = 0, $1164 = 0, $1165 = 0, $1166 = 0, $1167 = 0, $1168 = 0, $1169 = 0, $117 = 0, $1170 = 0, $1171 = 0, $1172 = 0, $1173 = 0, $1174 = 0, $1175 = 0, $1176 = 0;
 var $1177 = 0, $1178 = 0, $1179 = 0, $118 = 0, $1180 = 0, $1181 = 0, $1182 = 0, $1183 = 0, $1184 = 0, $1185 = 0, $1186 = 0, $1187 = 0, $1188 = 0, $1189 = 0, $119 = 0, $1190 = 0, $1191 = 0, $1192 = 0, $1193 = 0, $1194 = 0;
 var $1195 = 0, $1196 = 0, $1197 = 0, $1198 = 0, $1199 = 0, $12 = 0, $120 = 0, $1200 = 0, $1201 = 0, $1202 = 0, $1203 = 0, $1204 = 0, $1205 = 0, $1206 = 0, $1207 = 0, $1208 = 0, $1209 = 0, $121 = 0, $1210 = 0, $1211 = 0;
 var $1212 = 0, $1213 = 0, $1214 = 0, $1215 = 0, $1216 = 0, $1217 = 0, $1218 = 0, $1219 = 0, $122 = 0, $1220 = 0, $1221 = 0, $1222 = 0, $1223 = 0, $1224 = 0, $1225 = 0, $1226 = 0, $1227 = 0, $1228 = 0, $1229 = 0, $123 = 0;
 var $1230 = 0, $1231 = 0, $1232 = 0, $1233 = 0, $1234 = 0, $1235 = 0, $1236 = 0, $1237 = 0, $1238 = 0, $1239 = 0, $124 = 0, $1240 = 0, $1241 = 0, $1242 = 0, $1243 = 0, $1244 = 0, $1245 = 0, $1246 = 0, $1247 = 0, $1248 = 0;
 var $1249 = 0, $125 = 0, $1250 = 0, $1251 = 0, $1252 = 0, $1253 = 0, $1254 = 0, $1255 = 0, $1256 = 0, $1257 = 0, $1258 = 0, $1259 = 0, $126 = 0, $1260 = 0, $1261 = 0, $1262 = 0, $1263 = 0, $1264 = 0, $1265 = 0, $1266 = 0;
 var $1267 = 0, $1268 = 0, $1269 = 0, $127 = 0, $1270 = 0, $1271 = 0, $1272 = 0, $1273 = 0, $1274 = 0, $1275 = 0, $1276 = 0, $1277 = 0, $1278 = 0, $1279 = 0, $128 = 0, $1280 = 0, $1281 = 0, $1282 = 0, $1283 = 0, $1284 = 0;
 var $1285 = 0, $1286 = 0, $1287 = 0, $1288 = 0, $1289 = 0, $129 = 0, $1290 = 0, $1291 = 0, $1292 = 0, $1293 = 0, $1294 = 0, $1295 = 0, $1296 = 0, $1297 = 0, $1298 = 0, $1299 = 0, $13 = 0, $130 = 0, $1300 = 0, $1301 = 0;
 var $1302 = 0, $1303 = 0, $1304 = 0, $1305 = 0, $1306 = 0, $1307 = 0, $1308 = 0, $1309 = 0, $131 = 0, $1310 = 0, $1311 = 0, $1312 = 0, $1313 = 0, $1314 = 0, $1315 = 0, $1316 = 0, $1317 = 0, $1318 = 0, $1319 = 0, $132 = 0;
 var $1320 = 0, $1321 = 0, $1322 = 0, $1323 = 0, $1324 = 0, $1325 = 0, $1326 = 0, $1327 = 0, $1328 = 0, $1329 = 0, $133 = 0, $1330 = 0, $1331 = 0, $1332 = 0, $1333 = 0, $1334 = 0, $1335 = 0, $1336 = 0, $1337 = 0, $1338 = 0;
 var $1339 = 0, $134 = 0, $1340 = 0, $1341 = 0, $1342 = 0, $1343 = 0, $1344 = 0, $1345 = 0, $1346 = 0, $1347 = 0, $1348 = 0, $1349 = 0, $135 = 0, $1350 = 0, $1351 = 0, $1352 = 0, $1353 = 0, $1354 = 0, $1355 = 0, $1356 = 0;
 var $1357 = 0, $1358 = 0, $1359 = 0, $136 = 0, $1360 = 0, $1361 = 0, $1362 = 0, $1363 = 0, $1364 = 0, $1365 = 0, $1366 = 0, $1367 = 0, $1368 = 0, $1369 = 0, $137 = 0, $1370 = 0, $1371 = 0, $1372 = 0, $1373 = 0, $1374 = 0;
 var $1375 = 0, $1376 = 0, $1377 = 0, $1378 = 0, $1379 = 0, $138 = 0, $1380 = 0, $1381 = 0, $1382 = 0, $1383 = 0, $1384 = 0, $1385 = 0, $1386 = 0, $1387 = 0, $1388 = 0, $1389 = 0, $139 = 0, $1390 = 0, $1391 = 0, $1392 = 0;
 var $1393 = 0, $1394 = 0, $1395 = 0, $1396 = 0, $1397 = 0, $1398 = 0, $1399 = 0, $14 = 0, $140 = 0, $1400 = 0, $1401 = 0, $1402 = 0, $1403 = 0, $1404 = 0, $1405 = 0, $1406 = 0, $1407 = 0, $1408 = 0, $1409 = 0, $141 = 0;
 var $1410 = 0, $1411 = 0, $1412 = 0, $1413 = 0, $1414 = 0, $1415 = 0, $1416 = 0, $1417 = 0, $1418 = 0, $1419 = 0, $142 = 0, $1420 = 0, $1421 = 0, $1422 = 0, $1423 = 0, $1424 = 0, $1425 = 0, $1426 = 0, $1427 = 0, $1428 = 0;
 var $1429 = 0, $143 = 0, $1430 = 0, $1431 = 0, $1432 = 0, $1433 = 0, $1434 = 0, $1435 = 0, $1436 = 0, $1437 = 0, $1438 = 0, $1439 = 0, $144 = 0, $1440 = 0, $1441 = 0, $1442 = 0, $1443 = 0, $1444 = 0, $1445 = 0, $1446 = 0;
 var $1447 = 0, $1448 = 0, $1449 = 0, $145 = 0, $1450 = 0, $1451 = 0, $1452 = 0, $1453 = 0, $1454 = 0, $1455 = 0, $1456 = 0, $1457 = 0, $1458 = 0, $1459 = 0, $146 = 0, $1460 = 0, $1461 = 0, $1462 = 0, $1463 = 0, $1464 = 0;
 var $1465 = 0, $1466 = 0, $1467 = 0, $1468 = 0, $1469 = 0, $147 = 0, $1470 = 0, $1471 = 0, $1472 = 0, $1473 = 0, $1474 = 0, $1475 = 0, $1476 = 0, $1477 = 0, $1478 = 0, $1479 = 0, $148 = 0, $1480 = 0, $1481 = 0, $1482 = 0;
 var $1483 = 0, $1484 = 0, $1485 = 0, $1486 = 0, $1487 = 0, $1488 = 0, $1489 = 0, $149 = 0, $1490 = 0, $1491 = 0, $1492 = 0, $1493 = 0, $1494 = 0, $1495 = 0, $1496 = 0, $1497 = 0, $1498 = 0, $1499 = 0, $15 = 0, $150 = 0;
 var $1500 = 0, $1501 = 0, $1502 = 0, $1503 = 0, $1504 = 0, $1505 = 0, $1506 = 0, $1507 = 0, $1508 = 0, $1509 = 0, $151 = 0, $1510 = 0, $1511 = 0, $1512 = 0, $1513 = 0, $1514 = 0, $1515 = 0, $1516 = 0, $1517 = 0, $1518 = 0;
 var $1519 = 0, $152 = 0, $1520 = 0, $1521 = 0, $1522 = 0, $1523 = 0, $1524 = 0, $1525 = 0, $1526 = 0, $1527 = 0, $1528 = 0, $1529 = 0, $153 = 0, $1530 = 0, $1531 = 0, $1532 = 0, $1533 = 0, $1534 = 0, $1535 = 0, $1536 = 0;
 var $1537 = 0, $1538 = 0, $1539 = 0, $154 = 0, $1540 = 0, $1541 = 0, $1542 = 0, $1543 = 0, $1544 = 0, $1545 = 0, $1546 = 0, $1547 = 0, $1548 = 0, $1549 = 0, $155 = 0, $1550 = 0, $1551 = 0, $1552 = 0, $1553 = 0, $1554 = 0;
 var $1555 = 0, $1556 = 0, $1557 = 0, $1558 = 0, $1559 = 0, $156 = 0, $1560 = 0, $1561 = 0, $1562 = 0, $1563 = 0, $1564 = 0, $1565 = 0, $1566 = 0, $1567 = 0, $1568 = 0, $1569 = 0, $157 = 0, $1570 = 0, $1571 = 0, $1572 = 0;
 var $1573 = 0, $1574 = 0, $1575 = 0, $1576 = 0, $1577 = 0, $1578 = 0, $1579 = 0, $158 = 0, $1580 = 0, $1581 = 0, $1582 = 0, $1583 = 0, $1584 = 0, $1585 = 0, $1586 = 0, $1587 = 0, $1588 = 0, $1589 = 0, $159 = 0, $1590 = 0;
 var $1591 = 0, $1592 = 0, $1593 = 0, $1594 = 0, $1595 = 0, $1596 = 0, $1597 = 0, $1598 = 0, $1599 = 0, $16 = 0, $160 = 0, $1600 = 0, $1601 = 0, $1602 = 0, $1603 = 0, $1604 = 0, $1605 = 0, $1606 = 0, $1607 = 0, $1608 = 0;
 var $1609 = 0, $161 = 0, $1610 = 0, $1611 = 0, $1612 = 0, $1613 = 0, $1614 = 0, $1615 = 0, $1616 = 0, $1617 = 0, $1618 = 0, $1619 = 0, $162 = 0, $1620 = 0, $1621 = 0, $1622 = 0, $1623 = 0, $1624 = 0, $1625 = 0, $1626 = 0;
 var $1627 = 0, $1628 = 0, $1629 = 0, $163 = 0, $1630 = 0, $1631 = 0, $1632 = 0, $1633 = 0, $1634 = 0, $1635 = 0, $1636 = 0, $1637 = 0, $1638 = 0, $1639 = 0, $164 = 0, $1640 = 0, $1641 = 0, $1642 = 0, $1643 = 0, $1644 = 0;
 var $1645 = 0, $1646 = 0, $1647 = 0, $1648 = 0, $1649 = 0, $165 = 0, $1650 = 0, $1651 = 0, $1652 = 0, $1653 = 0, $1654 = 0, $1655 = 0, $1656 = 0, $1657 = 0, $1658 = 0, $1659 = 0, $166 = 0, $1660 = 0, $1661 = 0, $1662 = 0;
 var $1663 = 0, $1664 = 0, $1665 = 0, $1666 = 0, $1667 = 0, $1668 = 0, $1669 = 0, $167 = 0, $1670 = 0, $1671 = 0, $1672 = 0, $1673 = 0, $1674 = 0, $1675 = 0, $1676 = 0, $1677 = 0, $1678 = 0, $1679 = 0, $168 = 0, $1680 = 0;
 var $1681 = 0, $1682 = 0, $1683 = 0, $1684 = 0, $1685 = 0, $1686 = 0, $1687 = 0, $1688 = 0, $1689 = 0, $169 = 0, $1690 = 0, $1691 = 0, $1692 = 0, $1693 = 0, $1694 = 0, $1695 = 0, $1696 = 0, $1697 = 0, $1698 = 0, $1699 = 0;
 var $17 = 0, $170 = 0, $1700 = 0, $1701 = 0, $1702 = 0, $1703 = 0, $1704 = 0, $1705 = 0, $1706 = 0, $1707 = 0, $1708 = 0, $1709 = 0, $171 = 0, $1710 = 0, $1711 = 0, $1712 = 0, $1713 = 0, $1714 = 0, $1715 = 0, $1716 = 0;
 var $1717 = 0, $1718 = 0, $1719 = 0, $172 = 0, $1720 = 0, $1721 = 0, $1722 = 0, $1723 = 0, $1724 = 0, $1725 = 0, $1726 = 0, $1727 = 0, $1728 = 0, $1729 = 0, $173 = 0, $1730 = 0, $1731 = 0, $1732 = 0, $1733 = 0, $1734 = 0;
 var $1735 = 0, $1736 = 0, $1737 = 0, $1738 = 0, $1739 = 0, $174 = 0, $1740 = 0, $1741 = 0, $1742 = 0, $1743 = 0, $1744 = 0, $1745 = 0, $1746 = 0, $1747 = 0, $1748 = 0, $1749 = 0, $175 = 0, $1750 = 0, $1751 = 0, $1752 = 0;
 var $1753 = 0, $1754 = 0, $1755 = 0, $1756 = 0, $1757 = 0, $1758 = 0, $1759 = 0, $176 = 0, $1760 = 0, $1761 = 0, $1762 = 0, $1763 = 0, $1764 = 0, $1765 = 0, $1766 = 0, $1767 = 0, $1768 = 0, $1769 = 0, $177 = 0, $1770 = 0;
 var $1771 = 0, $1772 = 0, $1773 = 0, $1774 = 0, $1775 = 0, $1776 = 0, $1777 = 0, $1778 = 0, $1779 = 0, $178 = 0, $1780 = 0, $1781 = 0, $1782 = 0, $1783 = 0, $1784 = 0, $1785 = 0, $1786 = 0, $1787 = 0, $1788 = 0, $1789 = 0;
 var $179 = 0, $1790 = 0, $1791 = 0, $1792 = 0, $1793 = 0, $1794 = 0, $1795 = 0, $1796 = 0, $1797 = 0, $1798 = 0, $1799 = 0, $18 = 0, $180 = 0, $1800 = 0, $1801 = 0, $1802 = 0, $1803 = 0, $1804 = 0, $1805 = 0, $1806 = 0;
 var $1807 = 0, $1808 = 0, $1809 = 0, $181 = 0, $1810 = 0, $1811 = 0, $1812 = 0, $1813 = 0, $1814 = 0, $1815 = 0, $1816 = 0, $1817 = 0, $1818 = 0, $1819 = 0, $182 = 0, $1820 = 0, $1821 = 0, $1822 = 0, $1823 = 0, $1824 = 0;
 var $1825 = 0, $1826 = 0, $1827 = 0, $1828 = 0, $1829 = 0, $183 = 0, $1830 = 0, $1831 = 0, $1832 = 0, $1833 = 0, $1834 = 0, $1835 = 0, $1836 = 0, $1837 = 0, $1838 = 0, $1839 = 0, $184 = 0, $1840 = 0, $1841 = 0, $1842 = 0;
 var $1843 = 0, $1844 = 0, $1845 = 0, $1846 = 0, $1847 = 0, $1848 = 0, $1849 = 0, $185 = 0, $1850 = 0, $1851 = 0, $1852 = 0, $1853 = 0, $1854 = 0, $1855 = 0, $1856 = 0, $1857 = 0, $1858 = 0, $1859 = 0, $186 = 0, $1860 = 0;
 var $1861 = 0, $1862 = 0, $1863 = 0, $1864 = 0, $1865 = 0, $1866 = 0, $1867 = 0, $1868 = 0, $1869 = 0, $187 = 0, $1870 = 0, $1871 = 0, $1872 = 0, $1873 = 0, $1874 = 0, $1875 = 0, $1876 = 0, $1877 = 0, $1878 = 0, $1879 = 0;
 var $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0;
 var $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0;
 var $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0;
 var $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0;
 var $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0;
 var $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0;
 var $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0;
 var $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0;
 var $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0;
 var $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0;
 var $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0;
 var $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0;
 var $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0;
 var $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0;
 var $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0;
 var $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0;
 var $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0;
 var $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0;
 var $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0;
 var $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0;
 var $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0;
 var $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0;
 var $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0;
 var $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0;
 var $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0;
 var $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0;
 var $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0;
 var $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0;
 var $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0;
 var $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0;
 var $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0;
 var $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0;
 var $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0;
 var $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0;
 var $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0;
 var $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0;
 var $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0;
 var $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0;
 var $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0;
 var $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0;
 var $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0;
 var $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0;
 var $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0;
 var $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0;
 var $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0;
 var $999 = 0, $col = 0, $count = 0, $intermed_byte = 0, $leader_byte = 0, $oldpos = 0, $qmark = 0, $rect = 0, $rect$byval_copy = 0, $rect$byval_copy28 = 0, $rect$byval_copy29 = 0, $rect$byval_copy30 = 0, $rect$byval_copy31 = 0, $rect$byval_copy32 = 0, $rect$byval_copy33 = 0, $rect$byval_copy34 = 0, $rect$byval_copy35 = 0, $rect$byval_copy36 = 0, $rect$byval_copy37 = 0, $rect$byval_copy38 = 0;
 var $rect$byval_copy39 = 0, $rect$byval_copy40 = 0, $rect$byval_copy41 = 0, $row = 0, $row1 = 0, $row2 = 0, $row3 = 0, $selective = 0, $state = 0, $switch = 0, $switch$split102D = 0, $switch$split12D = 0, $switch$split132D = 0, $switch$split162D = 0, $switch$split192D = 0, $switch$split222D = 0, $switch$split252D = 0, $switch$split282D = 0, $switch$split2D = 0, $switch$split312D = 0;
 var $switch$split342D = 0, $switch$split42D = 0, $switch$split72D = 0, $val = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer13 = 0, $vararg_buffer18 = 0, $vararg_buffer23 = 0, $vararg_buffer5 = 0, $vararg_buffer8 = 0, $vararg_ptr11 = 0, $vararg_ptr12 = 0, $vararg_ptr16 = 0, $vararg_ptr17 = 0, $vararg_ptr21 = 0, $vararg_ptr22 = 0, $vararg_ptr26 = 0, $vararg_ptr27 = 0, $vararg_ptr3 = 0;
 var $vararg_ptr4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 448|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect$byval_copy41 = sp + 416|0;
 $rect$byval_copy40 = sp + 400|0;
 $rect$byval_copy39 = sp + 384|0;
 $rect$byval_copy38 = sp + 368|0;
 $rect$byval_copy37 = sp + 352|0;
 $rect$byval_copy36 = sp + 336|0;
 $rect$byval_copy35 = sp + 320|0;
 $rect$byval_copy34 = sp + 304|0;
 $rect$byval_copy33 = sp + 288|0;
 $rect$byval_copy32 = sp + 272|0;
 $rect$byval_copy31 = sp + 256|0;
 $rect$byval_copy30 = sp + 240|0;
 $rect$byval_copy29 = sp + 224|0;
 $rect$byval_copy28 = sp + 208|0;
 $rect$byval_copy = sp + 192|0;
 $vararg_buffer23 = sp + 80|0;
 $vararg_buffer18 = sp + 64|0;
 $vararg_buffer13 = sp + 48|0;
 $vararg_buffer8 = sp + 32|0;
 $vararg_buffer5 = sp + 24|0;
 $vararg_buffer1 = sp + 8|0;
 $vararg_buffer = sp;
 $oldpos = sp + 144|0;
 $rect = sp + 112|0;
 $1 = $leader;
 $2 = $args;
 $3 = $argcount;
 $4 = $intermed;
 $5 = $command;
 $6 = $user;
 $7 = $6;
 $state = $7;
 $leader_byte = 0;
 $intermed_byte = 0;
 $8 = $1;
 $9 = ($8|0)!=(0|0);
 do {
  if ($9) {
   $10 = $1;
   $11 = HEAP8[$10>>0]|0;
   $12 = $11 << 24 >> 24;
   $13 = ($12|0)!=(0);
   if ($13) {
    $14 = $1;
    $15 = ((($14)) + 1|0);
    $16 = HEAP8[$15>>0]|0;
    $17 = ($16<<24>>24)!=(0);
    if ($17) {
     $0 = 0;
     $1879 = $0;
     STACKTOP = sp;return ($1879|0);
    }
    $18 = $1;
    $19 = HEAP8[$18>>0]|0;
    $20 = $19 << 24 >> 24;
    $$off = (($20) + -62)|0;
    $switch = ($$off>>>0)<(2);
    if ($switch) {
     $21 = $1;
     $22 = HEAP8[$21>>0]|0;
     $23 = $22 << 24 >> 24;
     $leader_byte = $23;
     break;
    }
    $0 = 0;
    $1879 = $0;
    STACKTOP = sp;return ($1879|0);
   }
  }
 } while(0);
 $24 = $4;
 $25 = ($24|0)!=(0|0);
 L13: do {
  if ($25) {
   $26 = $4;
   $27 = HEAP8[$26>>0]|0;
   $28 = $27 << 24 >> 24;
   $29 = ($28|0)!=(0);
   if ($29) {
    $30 = $4;
    $31 = ((($30)) + 1|0);
    $32 = HEAP8[$31>>0]|0;
    $33 = ($32<<24>>24)!=(0);
    if ($33) {
     $0 = 0;
     $1879 = $0;
     STACKTOP = sp;return ($1879|0);
    }
    $34 = $4;
    $35 = HEAP8[$34>>0]|0;
    $36 = $35 << 24 >> 24;
    switch ($36|0) {
    case 39: case 36: case 34: case 32:  {
     $37 = $4;
     $38 = HEAP8[$37>>0]|0;
     $39 = $38 << 24 >> 24;
     $intermed_byte = $39;
     break L13;
     break;
    }
    default: {
    }
    }
    $0 = 0;
    $1879 = $0;
    STACKTOP = sp;return ($1879|0);
   }
  }
 } while(0);
 $40 = $state;
 $41 = ((($40)) + 28|0);
 ;HEAP32[$oldpos>>2]=HEAP32[$41>>2]|0;HEAP32[$oldpos+4>>2]=HEAP32[$41+4>>2]|0;
 $42 = $intermed_byte;
 $43 = $42 << 16;
 $44 = $leader_byte;
 $45 = $44 << 8;
 $46 = $43 | $45;
 $47 = $5;
 $48 = $47 << 24 >> 24;
 $49 = $46 | $48;
 $switch$split2D = ($49|0)<(101);
 L25: do {
  if ($switch$split2D) {
   do {
    switch ($49|0) {
    case 74:  {
     label = 69;
     break L25;
     break;
    }
    case 75:  {
     label = 88;
     break L25;
     break;
    }
    case 64:  {
     $50 = $2;
     $51 = HEAP32[$50>>2]|0;
     $52 = $51 & 2147483647;
     $53 = ($52|0)==(2147483647);
     if ($53) {
      $61 = 1;
     } else {
      $54 = $2;
      $55 = HEAP32[$54>>2]|0;
      $56 = $55 & 2147483647;
      $57 = ($56|0)==(0);
      if ($57) {
       $61 = 1;
      } else {
       $58 = $2;
       $59 = HEAP32[$58>>2]|0;
       $60 = $59 & 2147483647;
       $61 = $60;
      }
     }
     $count = $61;
     $62 = $state;
     $63 = (_is_cursor_in_scrollregion($62)|0);
     $64 = ($63|0)!=(0);
     if (!($64)) {
      break L25;
     }
     $65 = $state;
     $66 = ((($65)) + 28|0);
     $67 = HEAP32[$66>>2]|0;
     HEAP32[$rect>>2] = $67;
     $68 = $state;
     $69 = ((($68)) + 28|0);
     $70 = HEAP32[$69>>2]|0;
     $71 = (($70) + 1)|0;
     $72 = ((($rect)) + 4|0);
     HEAP32[$72>>2] = $71;
     $73 = $state;
     $74 = ((($73)) + 28|0);
     $75 = ((($74)) + 4|0);
     $76 = HEAP32[$75>>2]|0;
     $77 = ((($rect)) + 8|0);
     HEAP32[$77>>2] = $76;
     $78 = $state;
     $79 = ((($78)) + 104|0);
     $80 = HEAP16[$79>>1]|0;
     $81 = ($80 << 3)&65535;
     $82 = ($81<<16>>16) >> 15;
     $83 = $82 << 16 >> 16;
     $84 = ($83|0)!=(0);
     $85 = $state;
     if ($84) {
      $86 = ((($85)) + 104|0);
      $87 = HEAP16[$86>>1]|0;
      $88 = ($87 << 3)&65535;
      $89 = ($88<<16>>16) >> 15;
      $90 = $89 << 16 >> 16;
      $91 = ($90|0)!=(0);
      if ($91) {
       $92 = $state;
       $93 = ((($92)) + 52|0);
       $94 = HEAP32[$93>>2]|0;
       $95 = ($94|0)>(-1);
       if ($95) {
        $96 = $state;
        $97 = ((($96)) + 52|0);
        $98 = HEAP32[$97>>2]|0;
        $103 = $98;
       } else {
        label = 24;
       }
      } else {
       label = 24;
      }
      if ((label|0) == 24) {
       $99 = $state;
       $100 = ((($99)) + 24|0);
       $101 = HEAP32[$100>>2]|0;
       $103 = $101;
      }
      $102 = ((($rect)) + 12|0);
      HEAP32[$102>>2] = $103;
     } else {
      $104 = ((($85)) + 28|0);
      $105 = HEAP32[$104>>2]|0;
      $106 = $state;
      $107 = ((($106)) + 60|0);
      $108 = HEAP32[$107>>2]|0;
      $109 = (($108) + ($105<<2)|0);
      $110 = HEAP8[$109>>0]|0;
      $111 = $110 & 1;
      $112 = $111&255;
      $113 = ($112|0)!=(0);
      $114 = $state;
      $115 = ((($114)) + 24|0);
      $116 = HEAP32[$115>>2]|0;
      $117 = (($116|0) / 2)&-1;
      $118 = $113 ? $117 : $116;
      $119 = ((($rect)) + 12|0);
      HEAP32[$119>>2] = $118;
     }
     $120 = $state;
     $121 = $count;
     $122 = (0 - ($121))|0;
     ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
     _scroll($120,$rect$byval_copy,0,$122);
     break L25;
     break;
    }
    case 65:  {
     $123 = $2;
     $124 = HEAP32[$123>>2]|0;
     $125 = $124 & 2147483647;
     $126 = ($125|0)==(2147483647);
     if ($126) {
      $134 = 1;
     } else {
      $127 = $2;
      $128 = HEAP32[$127>>2]|0;
      $129 = $128 & 2147483647;
      $130 = ($129|0)==(0);
      if ($130) {
       $134 = 1;
      } else {
       $131 = $2;
       $132 = HEAP32[$131>>2]|0;
       $133 = $132 & 2147483647;
       $134 = $133;
      }
     }
     $count = $134;
     $135 = $count;
     $136 = $state;
     $137 = ((($136)) + 28|0);
     $138 = HEAP32[$137>>2]|0;
     $139 = (($138) - ($135))|0;
     HEAP32[$137>>2] = $139;
     $140 = $state;
     $141 = ((($140)) + 36|0);
     HEAP32[$141>>2] = 0;
     break L25;
     break;
    }
    case 66:  {
     $142 = $2;
     $143 = HEAP32[$142>>2]|0;
     $144 = $143 & 2147483647;
     $145 = ($144|0)==(2147483647);
     if ($145) {
      $153 = 1;
     } else {
      $146 = $2;
      $147 = HEAP32[$146>>2]|0;
      $148 = $147 & 2147483647;
      $149 = ($148|0)==(0);
      if ($149) {
       $153 = 1;
      } else {
       $150 = $2;
       $151 = HEAP32[$150>>2]|0;
       $152 = $151 & 2147483647;
       $153 = $152;
      }
     }
     $count = $153;
     $154 = $count;
     $155 = $state;
     $156 = ((($155)) + 28|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = (($157) + ($154))|0;
     HEAP32[$156>>2] = $158;
     $159 = $state;
     $160 = ((($159)) + 36|0);
     HEAP32[$160>>2] = 0;
     break L25;
     break;
    }
    case 67:  {
     $161 = $2;
     $162 = HEAP32[$161>>2]|0;
     $163 = $162 & 2147483647;
     $164 = ($163|0)==(2147483647);
     if ($164) {
      $172 = 1;
     } else {
      $165 = $2;
      $166 = HEAP32[$165>>2]|0;
      $167 = $166 & 2147483647;
      $168 = ($167|0)==(0);
      if ($168) {
       $172 = 1;
      } else {
       $169 = $2;
       $170 = HEAP32[$169>>2]|0;
       $171 = $170 & 2147483647;
       $172 = $171;
      }
     }
     $count = $172;
     $173 = $count;
     $174 = $state;
     $175 = ((($174)) + 28|0);
     $176 = ((($175)) + 4|0);
     $177 = HEAP32[$176>>2]|0;
     $178 = (($177) + ($173))|0;
     HEAP32[$176>>2] = $178;
     $179 = $state;
     $180 = ((($179)) + 36|0);
     HEAP32[$180>>2] = 0;
     break L25;
     break;
    }
    case 68:  {
     $181 = $2;
     $182 = HEAP32[$181>>2]|0;
     $183 = $182 & 2147483647;
     $184 = ($183|0)==(2147483647);
     if ($184) {
      $192 = 1;
     } else {
      $185 = $2;
      $186 = HEAP32[$185>>2]|0;
      $187 = $186 & 2147483647;
      $188 = ($187|0)==(0);
      if ($188) {
       $192 = 1;
      } else {
       $189 = $2;
       $190 = HEAP32[$189>>2]|0;
       $191 = $190 & 2147483647;
       $192 = $191;
      }
     }
     $count = $192;
     $193 = $count;
     $194 = $state;
     $195 = ((($194)) + 28|0);
     $196 = ((($195)) + 4|0);
     $197 = HEAP32[$196>>2]|0;
     $198 = (($197) - ($193))|0;
     HEAP32[$196>>2] = $198;
     $199 = $state;
     $200 = ((($199)) + 36|0);
     HEAP32[$200>>2] = 0;
     break L25;
     break;
    }
    case 69:  {
     $201 = $2;
     $202 = HEAP32[$201>>2]|0;
     $203 = $202 & 2147483647;
     $204 = ($203|0)==(2147483647);
     if ($204) {
      $212 = 1;
     } else {
      $205 = $2;
      $206 = HEAP32[$205>>2]|0;
      $207 = $206 & 2147483647;
      $208 = ($207|0)==(0);
      if ($208) {
       $212 = 1;
      } else {
       $209 = $2;
       $210 = HEAP32[$209>>2]|0;
       $211 = $210 & 2147483647;
       $212 = $211;
      }
     }
     $count = $212;
     $213 = $state;
     $214 = ((($213)) + 28|0);
     $215 = ((($214)) + 4|0);
     HEAP32[$215>>2] = 0;
     $216 = $count;
     $217 = $state;
     $218 = ((($217)) + 28|0);
     $219 = HEAP32[$218>>2]|0;
     $220 = (($219) + ($216))|0;
     HEAP32[$218>>2] = $220;
     $221 = $state;
     $222 = ((($221)) + 36|0);
     HEAP32[$222>>2] = 0;
     break L25;
     break;
    }
    case 70:  {
     $223 = $2;
     $224 = HEAP32[$223>>2]|0;
     $225 = $224 & 2147483647;
     $226 = ($225|0)==(2147483647);
     if ($226) {
      $234 = 1;
     } else {
      $227 = $2;
      $228 = HEAP32[$227>>2]|0;
      $229 = $228 & 2147483647;
      $230 = ($229|0)==(0);
      if ($230) {
       $234 = 1;
      } else {
       $231 = $2;
       $232 = HEAP32[$231>>2]|0;
       $233 = $232 & 2147483647;
       $234 = $233;
      }
     }
     $count = $234;
     $235 = $state;
     $236 = ((($235)) + 28|0);
     $237 = ((($236)) + 4|0);
     HEAP32[$237>>2] = 0;
     $238 = $count;
     $239 = $state;
     $240 = ((($239)) + 28|0);
     $241 = HEAP32[$240>>2]|0;
     $242 = (($241) - ($238))|0;
     HEAP32[$240>>2] = $242;
     $243 = $state;
     $244 = ((($243)) + 36|0);
     HEAP32[$244>>2] = 0;
     break L25;
     break;
    }
    case 71:  {
     $245 = $2;
     $246 = HEAP32[$245>>2]|0;
     $247 = $246 & 2147483647;
     $248 = ($247|0)==(2147483647);
     if ($248) {
      $252 = 1;
     } else {
      $249 = $2;
      $250 = HEAP32[$249>>2]|0;
      $251 = $250 & 2147483647;
      $252 = $251;
     }
     $val = $252;
     $253 = $val;
     $254 = (($253) - 1)|0;
     $255 = $state;
     $256 = ((($255)) + 28|0);
     $257 = ((($256)) + 4|0);
     HEAP32[$257>>2] = $254;
     $258 = $state;
     $259 = ((($258)) + 36|0);
     HEAP32[$259>>2] = 0;
     break L25;
     break;
    }
    case 72:  {
     $260 = $2;
     $261 = HEAP32[$260>>2]|0;
     $262 = $261 & 2147483647;
     $263 = ($262|0)==(2147483647);
     if ($263) {
      $267 = 1;
     } else {
      $264 = $2;
      $265 = HEAP32[$264>>2]|0;
      $266 = $265 & 2147483647;
      $267 = $266;
     }
     $row = $267;
     $268 = $3;
     $269 = ($268|0)<(2);
     if ($269) {
      $279 = 1;
     } else {
      $270 = $2;
      $271 = ((($270)) + 4|0);
      $272 = HEAP32[$271>>2]|0;
      $273 = $272 & 2147483647;
      $274 = ($273|0)==(2147483647);
      if ($274) {
       $279 = 1;
      } else {
       $275 = $2;
       $276 = ((($275)) + 4|0);
       $277 = HEAP32[$276>>2]|0;
       $278 = $277 & 2147483647;
       $279 = $278;
      }
     }
     $col = $279;
     $280 = $row;
     $281 = (($280) - 1)|0;
     $282 = $state;
     $283 = ((($282)) + 28|0);
     HEAP32[$283>>2] = $281;
     $284 = $col;
     $285 = (($284) - 1)|0;
     $286 = $state;
     $287 = ((($286)) + 28|0);
     $288 = ((($287)) + 4|0);
     HEAP32[$288>>2] = $285;
     $289 = $state;
     $290 = ((($289)) + 104|0);
     $291 = HEAP16[$290>>1]|0;
     $292 = ($291 << 5)&65535;
     $293 = ($292<<16>>16) >> 15;
     $294 = $293 << 16 >> 16;
     $295 = ($294|0)!=(0);
     if ($295) {
      $296 = $state;
      $297 = ((($296)) + 40|0);
      $298 = HEAP32[$297>>2]|0;
      $299 = $state;
      $300 = ((($299)) + 28|0);
      $301 = HEAP32[$300>>2]|0;
      $302 = (($301) + ($298))|0;
      HEAP32[$300>>2] = $302;
      $303 = $state;
      $304 = ((($303)) + 104|0);
      $305 = HEAP16[$304>>1]|0;
      $306 = ($305 << 3)&65535;
      $307 = ($306<<16>>16) >> 15;
      $308 = $307 << 16 >> 16;
      $309 = ($308|0)!=(0);
      if ($309) {
       $310 = $state;
       $311 = ((($310)) + 48|0);
       $312 = HEAP32[$311>>2]|0;
       $318 = $312;
      } else {
       $318 = 0;
      }
      $313 = $state;
      $314 = ((($313)) + 28|0);
      $315 = ((($314)) + 4|0);
      $316 = HEAP32[$315>>2]|0;
      $317 = (($316) + ($318))|0;
      HEAP32[$315>>2] = $317;
     }
     $319 = $state;
     $320 = ((($319)) + 36|0);
     HEAP32[$320>>2] = 0;
     break L25;
     break;
    }
    case 73:  {
     $321 = $2;
     $322 = HEAP32[$321>>2]|0;
     $323 = $322 & 2147483647;
     $324 = ($323|0)==(2147483647);
     if ($324) {
      $332 = 1;
     } else {
      $325 = $2;
      $326 = HEAP32[$325>>2]|0;
      $327 = $326 & 2147483647;
      $328 = ($327|0)==(0);
      if ($328) {
       $332 = 1;
      } else {
       $329 = $2;
       $330 = HEAP32[$329>>2]|0;
       $331 = $330 & 2147483647;
       $332 = $331;
      }
     }
     $count = $332;
     $333 = $state;
     $334 = $count;
     _tab($333,$334,1);
     break L25;
     break;
    }
    case 76:  {
     $521 = $2;
     $522 = HEAP32[$521>>2]|0;
     $523 = $522 & 2147483647;
     $524 = ($523|0)==(2147483647);
     if ($524) {
      $532 = 1;
     } else {
      $525 = $2;
      $526 = HEAP32[$525>>2]|0;
      $527 = $526 & 2147483647;
      $528 = ($527|0)==(0);
      if ($528) {
       $532 = 1;
      } else {
       $529 = $2;
       $530 = HEAP32[$529>>2]|0;
       $531 = $530 & 2147483647;
       $532 = $531;
      }
     }
     $count = $532;
     $533 = $state;
     $534 = (_is_cursor_in_scrollregion($533)|0);
     $535 = ($534|0)!=(0);
     if (!($535)) {
      break L25;
     }
     $536 = $state;
     $537 = ((($536)) + 28|0);
     $538 = HEAP32[$537>>2]|0;
     HEAP32[$rect>>2] = $538;
     $539 = $state;
     $540 = ((($539)) + 44|0);
     $541 = HEAP32[$540>>2]|0;
     $542 = ($541|0)>(-1);
     $543 = $state;
     if ($542) {
      $544 = ((($543)) + 44|0);
      $545 = HEAP32[$544>>2]|0;
      $549 = $545;
     } else {
      $546 = ((($543)) + 20|0);
      $547 = HEAP32[$546>>2]|0;
      $549 = $547;
     }
     $548 = ((($rect)) + 4|0);
     HEAP32[$548>>2] = $549;
     $550 = $state;
     $551 = ((($550)) + 104|0);
     $552 = HEAP16[$551>>1]|0;
     $553 = ($552 << 3)&65535;
     $554 = ($553<<16>>16) >> 15;
     $555 = $554 << 16 >> 16;
     $556 = ($555|0)!=(0);
     if ($556) {
      $557 = $state;
      $558 = ((($557)) + 48|0);
      $559 = HEAP32[$558>>2]|0;
      $561 = $559;
     } else {
      $561 = 0;
     }
     $560 = ((($rect)) + 8|0);
     HEAP32[$560>>2] = $561;
     $562 = $state;
     $563 = ((($562)) + 104|0);
     $564 = HEAP16[$563>>1]|0;
     $565 = ($564 << 3)&65535;
     $566 = ($565<<16>>16) >> 15;
     $567 = $566 << 16 >> 16;
     $568 = ($567|0)!=(0);
     if ($568) {
      $569 = $state;
      $570 = ((($569)) + 52|0);
      $571 = HEAP32[$570>>2]|0;
      $572 = ($571|0)>(-1);
      if ($572) {
       $573 = $state;
       $574 = ((($573)) + 52|0);
       $575 = HEAP32[$574>>2]|0;
       $580 = $575;
      } else {
       label = 107;
      }
     } else {
      label = 107;
     }
     if ((label|0) == 107) {
      $576 = $state;
      $577 = ((($576)) + 24|0);
      $578 = HEAP32[$577>>2]|0;
      $580 = $578;
     }
     $579 = ((($rect)) + 12|0);
     HEAP32[$579>>2] = $580;
     $581 = $state;
     $582 = $count;
     $583 = (0 - ($582))|0;
     ;HEAP32[$rect$byval_copy34>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy34+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy34+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy34+12>>2]=HEAP32[$rect+12>>2]|0;
     _scroll($581,$rect$byval_copy34,$583,0);
     break L25;
     break;
    }
    case 77:  {
     $584 = $2;
     $585 = HEAP32[$584>>2]|0;
     $586 = $585 & 2147483647;
     $587 = ($586|0)==(2147483647);
     if ($587) {
      $595 = 1;
     } else {
      $588 = $2;
      $589 = HEAP32[$588>>2]|0;
      $590 = $589 & 2147483647;
      $591 = ($590|0)==(0);
      if ($591) {
       $595 = 1;
      } else {
       $592 = $2;
       $593 = HEAP32[$592>>2]|0;
       $594 = $593 & 2147483647;
       $595 = $594;
      }
     }
     $count = $595;
     $596 = $state;
     $597 = (_is_cursor_in_scrollregion($596)|0);
     $598 = ($597|0)!=(0);
     if (!($598)) {
      break L25;
     }
     $599 = $state;
     $600 = ((($599)) + 28|0);
     $601 = HEAP32[$600>>2]|0;
     HEAP32[$rect>>2] = $601;
     $602 = $state;
     $603 = ((($602)) + 44|0);
     $604 = HEAP32[$603>>2]|0;
     $605 = ($604|0)>(-1);
     $606 = $state;
     if ($605) {
      $607 = ((($606)) + 44|0);
      $608 = HEAP32[$607>>2]|0;
      $612 = $608;
     } else {
      $609 = ((($606)) + 20|0);
      $610 = HEAP32[$609>>2]|0;
      $612 = $610;
     }
     $611 = ((($rect)) + 4|0);
     HEAP32[$611>>2] = $612;
     $613 = $state;
     $614 = ((($613)) + 104|0);
     $615 = HEAP16[$614>>1]|0;
     $616 = ($615 << 3)&65535;
     $617 = ($616<<16>>16) >> 15;
     $618 = $617 << 16 >> 16;
     $619 = ($618|0)!=(0);
     if ($619) {
      $620 = $state;
      $621 = ((($620)) + 48|0);
      $622 = HEAP32[$621>>2]|0;
      $624 = $622;
     } else {
      $624 = 0;
     }
     $623 = ((($rect)) + 8|0);
     HEAP32[$623>>2] = $624;
     $625 = $state;
     $626 = ((($625)) + 104|0);
     $627 = HEAP16[$626>>1]|0;
     $628 = ($627 << 3)&65535;
     $629 = ($628<<16>>16) >> 15;
     $630 = $629 << 16 >> 16;
     $631 = ($630|0)!=(0);
     if ($631) {
      $632 = $state;
      $633 = ((($632)) + 52|0);
      $634 = HEAP32[$633>>2]|0;
      $635 = ($634|0)>(-1);
      if ($635) {
       $636 = $state;
       $637 = ((($636)) + 52|0);
       $638 = HEAP32[$637>>2]|0;
       $643 = $638;
      } else {
       label = 121;
      }
     } else {
      label = 121;
     }
     if ((label|0) == 121) {
      $639 = $state;
      $640 = ((($639)) + 24|0);
      $641 = HEAP32[$640>>2]|0;
      $643 = $641;
     }
     $642 = ((($rect)) + 12|0);
     HEAP32[$642>>2] = $643;
     $644 = $state;
     $645 = $count;
     ;HEAP32[$rect$byval_copy35>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy35+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy35+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy35+12>>2]=HEAP32[$rect+12>>2]|0;
     _scroll($644,$rect$byval_copy35,$645,0);
     break L25;
     break;
    }
    case 80:  {
     $646 = $2;
     $647 = HEAP32[$646>>2]|0;
     $648 = $647 & 2147483647;
     $649 = ($648|0)==(2147483647);
     if ($649) {
      $657 = 1;
     } else {
      $650 = $2;
      $651 = HEAP32[$650>>2]|0;
      $652 = $651 & 2147483647;
      $653 = ($652|0)==(0);
      if ($653) {
       $657 = 1;
      } else {
       $654 = $2;
       $655 = HEAP32[$654>>2]|0;
       $656 = $655 & 2147483647;
       $657 = $656;
      }
     }
     $count = $657;
     $658 = $state;
     $659 = (_is_cursor_in_scrollregion($658)|0);
     $660 = ($659|0)!=(0);
     if (!($660)) {
      break L25;
     }
     $661 = $state;
     $662 = ((($661)) + 28|0);
     $663 = HEAP32[$662>>2]|0;
     HEAP32[$rect>>2] = $663;
     $664 = $state;
     $665 = ((($664)) + 28|0);
     $666 = HEAP32[$665>>2]|0;
     $667 = (($666) + 1)|0;
     $668 = ((($rect)) + 4|0);
     HEAP32[$668>>2] = $667;
     $669 = $state;
     $670 = ((($669)) + 28|0);
     $671 = ((($670)) + 4|0);
     $672 = HEAP32[$671>>2]|0;
     $673 = ((($rect)) + 8|0);
     HEAP32[$673>>2] = $672;
     $674 = $state;
     $675 = ((($674)) + 104|0);
     $676 = HEAP16[$675>>1]|0;
     $677 = ($676 << 3)&65535;
     $678 = ($677<<16>>16) >> 15;
     $679 = $678 << 16 >> 16;
     $680 = ($679|0)!=(0);
     $681 = $state;
     if ($680) {
      $682 = ((($681)) + 104|0);
      $683 = HEAP16[$682>>1]|0;
      $684 = ($683 << 3)&65535;
      $685 = ($684<<16>>16) >> 15;
      $686 = $685 << 16 >> 16;
      $687 = ($686|0)!=(0);
      if ($687) {
       $688 = $state;
       $689 = ((($688)) + 52|0);
       $690 = HEAP32[$689>>2]|0;
       $691 = ($690|0)>(-1);
       if ($691) {
        $692 = $state;
        $693 = ((($692)) + 52|0);
        $694 = HEAP32[$693>>2]|0;
        $699 = $694;
       } else {
        label = 131;
       }
      } else {
       label = 131;
      }
      if ((label|0) == 131) {
       $695 = $state;
       $696 = ((($695)) + 24|0);
       $697 = HEAP32[$696>>2]|0;
       $699 = $697;
      }
      $698 = ((($rect)) + 12|0);
      HEAP32[$698>>2] = $699;
     } else {
      $700 = ((($681)) + 28|0);
      $701 = HEAP32[$700>>2]|0;
      $702 = $state;
      $703 = ((($702)) + 60|0);
      $704 = HEAP32[$703>>2]|0;
      $705 = (($704) + ($701<<2)|0);
      $706 = HEAP8[$705>>0]|0;
      $707 = $706 & 1;
      $708 = $707&255;
      $709 = ($708|0)!=(0);
      $710 = $state;
      $711 = ((($710)) + 24|0);
      $712 = HEAP32[$711>>2]|0;
      $713 = (($712|0) / 2)&-1;
      $714 = $709 ? $713 : $712;
      $715 = ((($rect)) + 12|0);
      HEAP32[$715>>2] = $714;
     }
     $716 = $state;
     $717 = $count;
     ;HEAP32[$rect$byval_copy36>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy36+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy36+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy36+12>>2]=HEAP32[$rect+12>>2]|0;
     _scroll($716,$rect$byval_copy36,0,$717);
     break L25;
     break;
    }
    case 83:  {
     $718 = $2;
     $719 = HEAP32[$718>>2]|0;
     $720 = $719 & 2147483647;
     $721 = ($720|0)==(2147483647);
     if ($721) {
      $729 = 1;
     } else {
      $722 = $2;
      $723 = HEAP32[$722>>2]|0;
      $724 = $723 & 2147483647;
      $725 = ($724|0)==(0);
      if ($725) {
       $729 = 1;
      } else {
       $726 = $2;
       $727 = HEAP32[$726>>2]|0;
       $728 = $727 & 2147483647;
       $729 = $728;
      }
     }
     $count = $729;
     $730 = $state;
     $731 = ((($730)) + 40|0);
     $732 = HEAP32[$731>>2]|0;
     HEAP32[$rect>>2] = $732;
     $733 = $state;
     $734 = ((($733)) + 44|0);
     $735 = HEAP32[$734>>2]|0;
     $736 = ($735|0)>(-1);
     $737 = $state;
     if ($736) {
      $738 = ((($737)) + 44|0);
      $739 = HEAP32[$738>>2]|0;
      $743 = $739;
     } else {
      $740 = ((($737)) + 20|0);
      $741 = HEAP32[$740>>2]|0;
      $743 = $741;
     }
     $742 = ((($rect)) + 4|0);
     HEAP32[$742>>2] = $743;
     $744 = $state;
     $745 = ((($744)) + 104|0);
     $746 = HEAP16[$745>>1]|0;
     $747 = ($746 << 3)&65535;
     $748 = ($747<<16>>16) >> 15;
     $749 = $748 << 16 >> 16;
     $750 = ($749|0)!=(0);
     if ($750) {
      $751 = $state;
      $752 = ((($751)) + 48|0);
      $753 = HEAP32[$752>>2]|0;
      $755 = $753;
     } else {
      $755 = 0;
     }
     $754 = ((($rect)) + 8|0);
     HEAP32[$754>>2] = $755;
     $756 = $state;
     $757 = ((($756)) + 104|0);
     $758 = HEAP16[$757>>1]|0;
     $759 = ($758 << 3)&65535;
     $760 = ($759<<16>>16) >> 15;
     $761 = $760 << 16 >> 16;
     $762 = ($761|0)!=(0);
     if ($762) {
      $763 = $state;
      $764 = ((($763)) + 52|0);
      $765 = HEAP32[$764>>2]|0;
      $766 = ($765|0)>(-1);
      if ($766) {
       $767 = $state;
       $768 = ((($767)) + 52|0);
       $769 = HEAP32[$768>>2]|0;
       $774 = $769;
      } else {
       label = 146;
      }
     } else {
      label = 146;
     }
     if ((label|0) == 146) {
      $770 = $state;
      $771 = ((($770)) + 24|0);
      $772 = HEAP32[$771>>2]|0;
      $774 = $772;
     }
     $773 = ((($rect)) + 12|0);
     HEAP32[$773>>2] = $774;
     $775 = $state;
     $776 = $count;
     ;HEAP32[$rect$byval_copy37>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy37+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy37+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy37+12>>2]=HEAP32[$rect+12>>2]|0;
     _scroll($775,$rect$byval_copy37,$776,0);
     break L25;
     break;
    }
    case 84:  {
     $777 = $2;
     $778 = HEAP32[$777>>2]|0;
     $779 = $778 & 2147483647;
     $780 = ($779|0)==(2147483647);
     if ($780) {
      $788 = 1;
     } else {
      $781 = $2;
      $782 = HEAP32[$781>>2]|0;
      $783 = $782 & 2147483647;
      $784 = ($783|0)==(0);
      if ($784) {
       $788 = 1;
      } else {
       $785 = $2;
       $786 = HEAP32[$785>>2]|0;
       $787 = $786 & 2147483647;
       $788 = $787;
      }
     }
     $count = $788;
     $789 = $state;
     $790 = ((($789)) + 40|0);
     $791 = HEAP32[$790>>2]|0;
     HEAP32[$rect>>2] = $791;
     $792 = $state;
     $793 = ((($792)) + 44|0);
     $794 = HEAP32[$793>>2]|0;
     $795 = ($794|0)>(-1);
     $796 = $state;
     if ($795) {
      $797 = ((($796)) + 44|0);
      $798 = HEAP32[$797>>2]|0;
      $802 = $798;
     } else {
      $799 = ((($796)) + 20|0);
      $800 = HEAP32[$799>>2]|0;
      $802 = $800;
     }
     $801 = ((($rect)) + 4|0);
     HEAP32[$801>>2] = $802;
     $803 = $state;
     $804 = ((($803)) + 104|0);
     $805 = HEAP16[$804>>1]|0;
     $806 = ($805 << 3)&65535;
     $807 = ($806<<16>>16) >> 15;
     $808 = $807 << 16 >> 16;
     $809 = ($808|0)!=(0);
     if ($809) {
      $810 = $state;
      $811 = ((($810)) + 48|0);
      $812 = HEAP32[$811>>2]|0;
      $814 = $812;
     } else {
      $814 = 0;
     }
     $813 = ((($rect)) + 8|0);
     HEAP32[$813>>2] = $814;
     $815 = $state;
     $816 = ((($815)) + 104|0);
     $817 = HEAP16[$816>>1]|0;
     $818 = ($817 << 3)&65535;
     $819 = ($818<<16>>16) >> 15;
     $820 = $819 << 16 >> 16;
     $821 = ($820|0)!=(0);
     if ($821) {
      $822 = $state;
      $823 = ((($822)) + 52|0);
      $824 = HEAP32[$823>>2]|0;
      $825 = ($824|0)>(-1);
      if ($825) {
       $826 = $state;
       $827 = ((($826)) + 52|0);
       $828 = HEAP32[$827>>2]|0;
       $833 = $828;
      } else {
       label = 159;
      }
     } else {
      label = 159;
     }
     if ((label|0) == 159) {
      $829 = $state;
      $830 = ((($829)) + 24|0);
      $831 = HEAP32[$830>>2]|0;
      $833 = $831;
     }
     $832 = ((($rect)) + 12|0);
     HEAP32[$832>>2] = $833;
     $834 = $state;
     $835 = $count;
     $836 = (0 - ($835))|0;
     ;HEAP32[$rect$byval_copy38>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy38+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy38+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy38+12>>2]=HEAP32[$rect+12>>2]|0;
     _scroll($834,$rect$byval_copy38,$836,0);
     break L25;
     break;
    }
    case 88:  {
     $837 = $2;
     $838 = HEAP32[$837>>2]|0;
     $839 = $838 & 2147483647;
     $840 = ($839|0)==(2147483647);
     if ($840) {
      $848 = 1;
     } else {
      $841 = $2;
      $842 = HEAP32[$841>>2]|0;
      $843 = $842 & 2147483647;
      $844 = ($843|0)==(0);
      if ($844) {
       $848 = 1;
      } else {
       $845 = $2;
       $846 = HEAP32[$845>>2]|0;
       $847 = $846 & 2147483647;
       $848 = $847;
      }
     }
     $count = $848;
     $849 = $state;
     $850 = ((($849)) + 28|0);
     $851 = HEAP32[$850>>2]|0;
     HEAP32[$rect>>2] = $851;
     $852 = $state;
     $853 = ((($852)) + 28|0);
     $854 = HEAP32[$853>>2]|0;
     $855 = (($854) + 1)|0;
     $856 = ((($rect)) + 4|0);
     HEAP32[$856>>2] = $855;
     $857 = $state;
     $858 = ((($857)) + 28|0);
     $859 = ((($858)) + 4|0);
     $860 = HEAP32[$859>>2]|0;
     $861 = ((($rect)) + 8|0);
     HEAP32[$861>>2] = $860;
     $862 = $state;
     $863 = ((($862)) + 28|0);
     $864 = ((($863)) + 4|0);
     $865 = HEAP32[$864>>2]|0;
     $866 = $count;
     $867 = (($865) + ($866))|0;
     $868 = ((($rect)) + 12|0);
     HEAP32[$868>>2] = $867;
     $869 = ((($rect)) + 12|0);
     $870 = HEAP32[$869>>2]|0;
     $871 = $state;
     $872 = ((($871)) + 28|0);
     $873 = HEAP32[$872>>2]|0;
     $874 = $state;
     $875 = ((($874)) + 60|0);
     $876 = HEAP32[$875>>2]|0;
     $877 = (($876) + ($873<<2)|0);
     $878 = HEAP8[$877>>0]|0;
     $879 = $878 & 1;
     $880 = $879&255;
     $881 = ($880|0)!=(0);
     $882 = $state;
     $883 = ((($882)) + 24|0);
     $884 = HEAP32[$883>>2]|0;
     $885 = (($884|0) / 2)&-1;
     $886 = $881 ? $885 : $884;
     $887 = ($870|0)>($886|0);
     if ($887) {
      $888 = $state;
      $889 = ((($888)) + 28|0);
      $890 = HEAP32[$889>>2]|0;
      $891 = $state;
      $892 = ((($891)) + 60|0);
      $893 = HEAP32[$892>>2]|0;
      $894 = (($893) + ($890<<2)|0);
      $895 = HEAP8[$894>>0]|0;
      $896 = $895 & 1;
      $897 = $896&255;
      $898 = ($897|0)!=(0);
      $899 = $state;
      $900 = ((($899)) + 24|0);
      $901 = HEAP32[$900>>2]|0;
      $902 = (($901|0) / 2)&-1;
      $903 = $898 ? $902 : $901;
      $904 = ((($rect)) + 12|0);
      HEAP32[$904>>2] = $903;
     }
     $905 = $state;
     ;HEAP32[$rect$byval_copy39>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy39+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy39+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy39+12>>2]=HEAP32[$rect+12>>2]|0;
     _erase49($905,$rect$byval_copy39,0);
     break L25;
     break;
    }
    case 90:  {
     $906 = $2;
     $907 = HEAP32[$906>>2]|0;
     $908 = $907 & 2147483647;
     $909 = ($908|0)==(2147483647);
     if ($909) {
      $917 = 1;
     } else {
      $910 = $2;
      $911 = HEAP32[$910>>2]|0;
      $912 = $911 & 2147483647;
      $913 = ($912|0)==(0);
      if ($913) {
       $917 = 1;
      } else {
       $914 = $2;
       $915 = HEAP32[$914>>2]|0;
       $916 = $915 & 2147483647;
       $917 = $916;
      }
     }
     $count = $917;
     $918 = $state;
     $919 = $count;
     _tab($918,$919,-1);
     break L25;
     break;
    }
    case 96:  {
     $920 = $2;
     $921 = HEAP32[$920>>2]|0;
     $922 = $921 & 2147483647;
     $923 = ($922|0)==(2147483647);
     if ($923) {
      $927 = 1;
     } else {
      $924 = $2;
      $925 = HEAP32[$924>>2]|0;
      $926 = $925 & 2147483647;
      $927 = $926;
     }
     $col = $927;
     $928 = $col;
     $929 = (($928) - 1)|0;
     $930 = $state;
     $931 = ((($930)) + 28|0);
     $932 = ((($931)) + 4|0);
     HEAP32[$932>>2] = $929;
     $933 = $state;
     $934 = ((($933)) + 36|0);
     HEAP32[$934>>2] = 0;
     break L25;
     break;
    }
    case 97:  {
     $935 = $2;
     $936 = HEAP32[$935>>2]|0;
     $937 = $936 & 2147483647;
     $938 = ($937|0)==(2147483647);
     if ($938) {
      $946 = 1;
     } else {
      $939 = $2;
      $940 = HEAP32[$939>>2]|0;
      $941 = $940 & 2147483647;
      $942 = ($941|0)==(0);
      if ($942) {
       $946 = 1;
      } else {
       $943 = $2;
       $944 = HEAP32[$943>>2]|0;
       $945 = $944 & 2147483647;
       $946 = $945;
      }
     }
     $count = $946;
     $947 = $count;
     $948 = $state;
     $949 = ((($948)) + 28|0);
     $950 = ((($949)) + 4|0);
     $951 = HEAP32[$950>>2]|0;
     $952 = (($951) + ($947))|0;
     HEAP32[$950>>2] = $952;
     $953 = $state;
     $954 = ((($953)) + 36|0);
     HEAP32[$954>>2] = 0;
     break L25;
     break;
    }
    case 99:  {
     $955 = $2;
     $956 = HEAP32[$955>>2]|0;
     $957 = $956 & 2147483647;
     $958 = ($957|0)==(2147483647);
     if ($958) {
      $962 = 0;
     } else {
      $959 = $2;
      $960 = HEAP32[$959>>2]|0;
      $961 = $960 & 2147483647;
      $962 = $961;
     }
     $val = $962;
     $963 = $val;
     $964 = ($963|0)==(0);
     if (!($964)) {
      break L25;
     }
     $965 = $state;
     $966 = HEAP32[$965>>2]|0;
     _vterm_push_output_sprintf_ctrl($966,-101,4746,$vararg_buffer);
     break L25;
     break;
    }
    case 100:  {
     $969 = $2;
     $970 = HEAP32[$969>>2]|0;
     $971 = $970 & 2147483647;
     $972 = ($971|0)==(2147483647);
     if ($972) {
      $976 = 1;
     } else {
      $973 = $2;
      $974 = HEAP32[$973>>2]|0;
      $975 = $974 & 2147483647;
      $976 = $975;
     }
     $row = $976;
     $977 = $row;
     $978 = (($977) - 1)|0;
     $979 = $state;
     $980 = ((($979)) + 28|0);
     HEAP32[$980>>2] = $978;
     $981 = $state;
     $982 = ((($981)) + 104|0);
     $983 = HEAP16[$982>>1]|0;
     $984 = ($983 << 5)&65535;
     $985 = ($984<<16>>16) >> 15;
     $986 = $985 << 16 >> 16;
     $987 = ($986|0)!=(0);
     if ($987) {
      $988 = $state;
      $989 = ((($988)) + 40|0);
      $990 = HEAP32[$989>>2]|0;
      $991 = $state;
      $992 = ((($991)) + 28|0);
      $993 = HEAP32[$992>>2]|0;
      $994 = (($993) + ($990))|0;
      HEAP32[$992>>2] = $994;
     }
     $995 = $state;
     $996 = ((($995)) + 36|0);
     HEAP32[$996>>2] = 0;
     break L25;
     break;
    }
    default: {
     label = 312;
     break L25;
    }
    }
   } while(0);
  } else {
   $switch$split72D = ($49|0)<(8560);
   L222: do {
    if ($switch$split72D) {
     do {
      switch ($49|0) {
      case 110:  {
       break L222;
       break;
      }
      case 101:  {
       $997 = $2;
       $998 = HEAP32[$997>>2]|0;
       $999 = $998 & 2147483647;
       $1000 = ($999|0)==(2147483647);
       if ($1000) {
        $1008 = 1;
       } else {
        $1001 = $2;
        $1002 = HEAP32[$1001>>2]|0;
        $1003 = $1002 & 2147483647;
        $1004 = ($1003|0)==(0);
        if ($1004) {
         $1008 = 1;
        } else {
         $1005 = $2;
         $1006 = HEAP32[$1005>>2]|0;
         $1007 = $1006 & 2147483647;
         $1008 = $1007;
        }
       }
       $count = $1008;
       $1009 = $count;
       $1010 = $state;
       $1011 = ((($1010)) + 28|0);
       $1012 = HEAP32[$1011>>2]|0;
       $1013 = (($1012) + ($1009))|0;
       HEAP32[$1011>>2] = $1013;
       $1014 = $state;
       $1015 = ((($1014)) + 36|0);
       HEAP32[$1015>>2] = 0;
       break L25;
       break;
      }
      case 102:  {
       $1016 = $2;
       $1017 = HEAP32[$1016>>2]|0;
       $1018 = $1017 & 2147483647;
       $1019 = ($1018|0)==(2147483647);
       if ($1019) {
        $1023 = 1;
       } else {
        $1020 = $2;
        $1021 = HEAP32[$1020>>2]|0;
        $1022 = $1021 & 2147483647;
        $1023 = $1022;
       }
       $row = $1023;
       $1024 = $3;
       $1025 = ($1024|0)<(2);
       if ($1025) {
        $1035 = 1;
       } else {
        $1026 = $2;
        $1027 = ((($1026)) + 4|0);
        $1028 = HEAP32[$1027>>2]|0;
        $1029 = $1028 & 2147483647;
        $1030 = ($1029|0)==(2147483647);
        if ($1030) {
         $1035 = 1;
        } else {
         $1031 = $2;
         $1032 = ((($1031)) + 4|0);
         $1033 = HEAP32[$1032>>2]|0;
         $1034 = $1033 & 2147483647;
         $1035 = $1034;
        }
       }
       $col = $1035;
       $1036 = $row;
       $1037 = (($1036) - 1)|0;
       $1038 = $state;
       $1039 = ((($1038)) + 28|0);
       HEAP32[$1039>>2] = $1037;
       $1040 = $col;
       $1041 = (($1040) - 1)|0;
       $1042 = $state;
       $1043 = ((($1042)) + 28|0);
       $1044 = ((($1043)) + 4|0);
       HEAP32[$1044>>2] = $1041;
       $1045 = $state;
       $1046 = ((($1045)) + 104|0);
       $1047 = HEAP16[$1046>>1]|0;
       $1048 = ($1047 << 5)&65535;
       $1049 = ($1048<<16>>16) >> 15;
       $1050 = $1049 << 16 >> 16;
       $1051 = ($1050|0)!=(0);
       if ($1051) {
        $1052 = $state;
        $1053 = ((($1052)) + 40|0);
        $1054 = HEAP32[$1053>>2]|0;
        $1055 = $state;
        $1056 = ((($1055)) + 28|0);
        $1057 = HEAP32[$1056>>2]|0;
        $1058 = (($1057) + ($1054))|0;
        HEAP32[$1056>>2] = $1058;
        $1059 = $state;
        $1060 = ((($1059)) + 104|0);
        $1061 = HEAP16[$1060>>1]|0;
        $1062 = ($1061 << 3)&65535;
        $1063 = ($1062<<16>>16) >> 15;
        $1064 = $1063 << 16 >> 16;
        $1065 = ($1064|0)!=(0);
        if ($1065) {
         $1066 = $state;
         $1067 = ((($1066)) + 48|0);
         $1068 = HEAP32[$1067>>2]|0;
         $1074 = $1068;
        } else {
         $1074 = 0;
        }
        $1069 = $state;
        $1070 = ((($1069)) + 28|0);
        $1071 = ((($1070)) + 4|0);
        $1072 = HEAP32[$1071>>2]|0;
        $1073 = (($1072) + ($1074))|0;
        HEAP32[$1071>>2] = $1073;
       }
       $1075 = $state;
       $1076 = ((($1075)) + 36|0);
       HEAP32[$1076>>2] = 0;
       break L25;
       break;
      }
      case 103:  {
       $1077 = $2;
       $1078 = HEAP32[$1077>>2]|0;
       $1079 = $1078 & 2147483647;
       $1080 = ($1079|0)==(2147483647);
       if ($1080) {
        $1084 = 0;
       } else {
        $1081 = $2;
        $1082 = HEAP32[$1081>>2]|0;
        $1083 = $1082 & 2147483647;
        $1084 = $1083;
       }
       $val = $1084;
       $1085 = $val;
       switch ($1085|0) {
       case 4: case 2: case 1:  {
        break L25;
        break;
       }
       case 0:  {
        $1086 = $state;
        $1087 = $state;
        $1088 = ((($1087)) + 28|0);
        $1089 = ((($1088)) + 4|0);
        $1090 = HEAP32[$1089>>2]|0;
        _clear_col_tabstop($1086,$1090);
        break L25;
        break;
       }
       case 5: case 3:  {
        $col = 0;
        while(1) {
         $1091 = $col;
         $1092 = $state;
         $1093 = ((($1092)) + 24|0);
         $1094 = HEAP32[$1093>>2]|0;
         $1095 = ($1091|0)<($1094|0);
         if (!($1095)) {
          break L25;
         }
         $1096 = $state;
         $1097 = $col;
         _clear_col_tabstop($1096,$1097);
         $1098 = $col;
         $1099 = (($1098) + 1)|0;
         $col = $1099;
        }
        break;
       }
       default: {
        $0 = 0;
        $1879 = $0;
        STACKTOP = sp;return ($1879|0);
       }
       }
       break;
      }
      case 104:  {
       $1100 = $2;
       $1101 = HEAP32[$1100>>2]|0;
       $1102 = $1101 & 2147483647;
       $1103 = ($1102|0)==(2147483647);
       if ($1103) {
        break L25;
       }
       $1104 = $state;
       $1105 = $2;
       $1106 = HEAP32[$1105>>2]|0;
       $1107 = $1106 & 2147483647;
       _set_mode($1104,$1107,1);
       break L25;
       break;
      }
      case 106:  {
       $1116 = $2;
       $1117 = HEAP32[$1116>>2]|0;
       $1118 = $1117 & 2147483647;
       $1119 = ($1118|0)==(2147483647);
       if ($1119) {
        $1127 = 1;
       } else {
        $1120 = $2;
        $1121 = HEAP32[$1120>>2]|0;
        $1122 = $1121 & 2147483647;
        $1123 = ($1122|0)==(0);
        if ($1123) {
         $1127 = 1;
        } else {
         $1124 = $2;
         $1125 = HEAP32[$1124>>2]|0;
         $1126 = $1125 & 2147483647;
         $1127 = $1126;
        }
       }
       $count = $1127;
       $1128 = $count;
       $1129 = $state;
       $1130 = ((($1129)) + 28|0);
       $1131 = ((($1130)) + 4|0);
       $1132 = HEAP32[$1131>>2]|0;
       $1133 = (($1132) - ($1128))|0;
       HEAP32[$1131>>2] = $1133;
       $1134 = $state;
       $1135 = ((($1134)) + 36|0);
       HEAP32[$1135>>2] = 0;
       break L25;
       break;
      }
      case 107:  {
       $1136 = $2;
       $1137 = HEAP32[$1136>>2]|0;
       $1138 = $1137 & 2147483647;
       $1139 = ($1138|0)==(2147483647);
       if ($1139) {
        $1147 = 1;
       } else {
        $1140 = $2;
        $1141 = HEAP32[$1140>>2]|0;
        $1142 = $1141 & 2147483647;
        $1143 = ($1142|0)==(0);
        if ($1143) {
         $1147 = 1;
        } else {
         $1144 = $2;
         $1145 = HEAP32[$1144>>2]|0;
         $1146 = $1145 & 2147483647;
         $1147 = $1146;
        }
       }
       $count = $1147;
       $1148 = $count;
       $1149 = $state;
       $1150 = ((($1149)) + 28|0);
       $1151 = HEAP32[$1150>>2]|0;
       $1152 = (($1151) - ($1148))|0;
       HEAP32[$1150>>2] = $1152;
       $1153 = $state;
       $1154 = ((($1153)) + 36|0);
       HEAP32[$1154>>2] = 0;
       break L25;
       break;
      }
      case 108:  {
       $1155 = $2;
       $1156 = HEAP32[$1155>>2]|0;
       $1157 = $1156 & 2147483647;
       $1158 = ($1157|0)==(2147483647);
       if ($1158) {
        break L25;
       }
       $1159 = $state;
       $1160 = $2;
       $1161 = HEAP32[$1160>>2]|0;
       $1162 = $1161 & 2147483647;
       _set_mode($1159,$1162,0);
       break L25;
       break;
      }
      case 109:  {
       $1171 = $state;
       $1172 = $2;
       $1173 = $3;
       _vterm_state_setpen($1171,$1172,$1173);
       break L25;
       break;
      }
      case 114:  {
       $1245 = $2;
       $1246 = HEAP32[$1245>>2]|0;
       $1247 = $1246 & 2147483647;
       $1248 = ($1247|0)==(2147483647);
       if ($1248) {
        $1253 = 1;
       } else {
        $1249 = $2;
        $1250 = HEAP32[$1249>>2]|0;
        $1251 = $1250 & 2147483647;
        $1253 = $1251;
       }
       $1252 = (($1253) - 1)|0;
       $1254 = $state;
       $1255 = ((($1254)) + 40|0);
       HEAP32[$1255>>2] = $1252;
       $1256 = $3;
       $1257 = ($1256|0)<(2);
       if ($1257) {
        $1269 = -1;
       } else {
        $1258 = $2;
        $1259 = ((($1258)) + 4|0);
        $1260 = HEAP32[$1259>>2]|0;
        $1261 = $1260 & 2147483647;
        $1262 = ($1261|0)==(2147483647);
        if ($1262) {
         $1269 = -1;
        } else {
         $1263 = $2;
         $1264 = ((($1263)) + 4|0);
         $1265 = HEAP32[$1264>>2]|0;
         $1266 = $1265 & 2147483647;
         $1269 = $1266;
        }
       }
       $1267 = $state;
       $1268 = ((($1267)) + 44|0);
       HEAP32[$1268>>2] = $1269;
       $1270 = $state;
       $1271 = ((($1270)) + 40|0);
       $1272 = HEAP32[$1271>>2]|0;
       $1273 = ($1272|0)<(0);
       if ($1273) {
        $1274 = $state;
        $1275 = ((($1274)) + 40|0);
        HEAP32[$1275>>2] = 0;
       }
       $1276 = $state;
       $1277 = ((($1276)) + 40|0);
       $1278 = HEAP32[$1277>>2]|0;
       $1279 = $state;
       $1280 = ((($1279)) + 20|0);
       $1281 = HEAP32[$1280>>2]|0;
       $1282 = ($1278|0)>($1281|0);
       if ($1282) {
        $1283 = $state;
        $1284 = ((($1283)) + 20|0);
        $1285 = HEAP32[$1284>>2]|0;
        $1286 = $state;
        $1287 = ((($1286)) + 40|0);
        HEAP32[$1287>>2] = $1285;
       }
       $1288 = $state;
       $1289 = ((($1288)) + 44|0);
       $1290 = HEAP32[$1289>>2]|0;
       $1291 = ($1290|0)<(-1);
       if ($1291) {
        $1292 = $state;
        $1293 = ((($1292)) + 44|0);
        HEAP32[$1293>>2] = -1;
       }
       $1294 = $state;
       $1295 = ((($1294)) + 40|0);
       $1296 = HEAP32[$1295>>2]|0;
       $1297 = ($1296|0)==(0);
       if ($1297) {
        $1298 = $state;
        $1299 = ((($1298)) + 44|0);
        $1300 = HEAP32[$1299>>2]|0;
        $1301 = $state;
        $1302 = ((($1301)) + 20|0);
        $1303 = HEAP32[$1302>>2]|0;
        $1304 = ($1300|0)==($1303|0);
        if ($1304) {
         $1305 = $state;
         $1306 = ((($1305)) + 44|0);
         HEAP32[$1306>>2] = -1;
        } else {
         label = 262;
        }
       } else {
        label = 262;
       }
       if ((label|0) == 262) {
        $1307 = $state;
        $1308 = ((($1307)) + 44|0);
        $1309 = HEAP32[$1308>>2]|0;
        $1310 = $state;
        $1311 = ((($1310)) + 20|0);
        $1312 = HEAP32[$1311>>2]|0;
        $1313 = ($1309|0)>($1312|0);
        if ($1313) {
         $1314 = $state;
         $1315 = ((($1314)) + 20|0);
         $1316 = HEAP32[$1315>>2]|0;
         $1317 = $state;
         $1318 = ((($1317)) + 44|0);
         HEAP32[$1318>>2] = $1316;
        }
       }
       $1319 = $state;
       $1320 = ((($1319)) + 44|0);
       $1321 = HEAP32[$1320>>2]|0;
       $1322 = ($1321|0)>(-1);
       $1323 = $state;
       if ($1322) {
        $1324 = ((($1323)) + 44|0);
        $1325 = HEAP32[$1324>>2]|0;
        $1331 = $1325;
       } else {
        $1326 = ((($1323)) + 20|0);
        $1327 = HEAP32[$1326>>2]|0;
        $1331 = $1327;
       }
       $1328 = $state;
       $1329 = ((($1328)) + 40|0);
       $1330 = HEAP32[$1329>>2]|0;
       $1332 = ($1331|0)<=($1330|0);
       if (!($1332)) {
        break L25;
       }
       $1333 = $state;
       $1334 = ((($1333)) + 40|0);
       HEAP32[$1334>>2] = 0;
       $1335 = $state;
       $1336 = ((($1335)) + 44|0);
       HEAP32[$1336>>2] = -1;
       break L25;
       break;
      }
      case 115:  {
       $1337 = $2;
       $1338 = HEAP32[$1337>>2]|0;
       $1339 = $1338 & 2147483647;
       $1340 = ($1339|0)==(2147483647);
       if ($1340) {
        $1345 = 1;
       } else {
        $1341 = $2;
        $1342 = HEAP32[$1341>>2]|0;
        $1343 = $1342 & 2147483647;
        $1345 = $1343;
       }
       $1344 = (($1345) - 1)|0;
       $1346 = $state;
       $1347 = ((($1346)) + 48|0);
       HEAP32[$1347>>2] = $1344;
       $1348 = $3;
       $1349 = ($1348|0)<(2);
       if ($1349) {
        $1361 = -1;
       } else {
        $1350 = $2;
        $1351 = ((($1350)) + 4|0);
        $1352 = HEAP32[$1351>>2]|0;
        $1353 = $1352 & 2147483647;
        $1354 = ($1353|0)==(2147483647);
        if ($1354) {
         $1361 = -1;
        } else {
         $1355 = $2;
         $1356 = ((($1355)) + 4|0);
         $1357 = HEAP32[$1356>>2]|0;
         $1358 = $1357 & 2147483647;
         $1361 = $1358;
        }
       }
       $1359 = $state;
       $1360 = ((($1359)) + 52|0);
       HEAP32[$1360>>2] = $1361;
       $1362 = $state;
       $1363 = ((($1362)) + 48|0);
       $1364 = HEAP32[$1363>>2]|0;
       $1365 = ($1364|0)<(0);
       if ($1365) {
        $1366 = $state;
        $1367 = ((($1366)) + 48|0);
        HEAP32[$1367>>2] = 0;
       }
       $1368 = $state;
       $1369 = ((($1368)) + 48|0);
       $1370 = HEAP32[$1369>>2]|0;
       $1371 = $state;
       $1372 = ((($1371)) + 24|0);
       $1373 = HEAP32[$1372>>2]|0;
       $1374 = ($1370|0)>($1373|0);
       if ($1374) {
        $1375 = $state;
        $1376 = ((($1375)) + 24|0);
        $1377 = HEAP32[$1376>>2]|0;
        $1378 = $state;
        $1379 = ((($1378)) + 48|0);
        HEAP32[$1379>>2] = $1377;
       }
       $1380 = $state;
       $1381 = ((($1380)) + 52|0);
       $1382 = HEAP32[$1381>>2]|0;
       $1383 = ($1382|0)<(-1);
       if ($1383) {
        $1384 = $state;
        $1385 = ((($1384)) + 52|0);
        HEAP32[$1385>>2] = -1;
       }
       $1386 = $state;
       $1387 = ((($1386)) + 48|0);
       $1388 = HEAP32[$1387>>2]|0;
       $1389 = ($1388|0)==(0);
       if ($1389) {
        $1390 = $state;
        $1391 = ((($1390)) + 52|0);
        $1392 = HEAP32[$1391>>2]|0;
        $1393 = $state;
        $1394 = ((($1393)) + 24|0);
        $1395 = HEAP32[$1394>>2]|0;
        $1396 = ($1392|0)==($1395|0);
        if ($1396) {
         $1397 = $state;
         $1398 = ((($1397)) + 52|0);
         HEAP32[$1398>>2] = -1;
        } else {
         label = 283;
        }
       } else {
        label = 283;
       }
       if ((label|0) == 283) {
        $1399 = $state;
        $1400 = ((($1399)) + 52|0);
        $1401 = HEAP32[$1400>>2]|0;
        $1402 = $state;
        $1403 = ((($1402)) + 24|0);
        $1404 = HEAP32[$1403>>2]|0;
        $1405 = ($1401|0)>($1404|0);
        if ($1405) {
         $1406 = $state;
         $1407 = ((($1406)) + 24|0);
         $1408 = HEAP32[$1407>>2]|0;
         $1409 = $state;
         $1410 = ((($1409)) + 52|0);
         HEAP32[$1410>>2] = $1408;
        }
       }
       $1411 = $state;
       $1412 = ((($1411)) + 52|0);
       $1413 = HEAP32[$1412>>2]|0;
       $1414 = ($1413|0)>(-1);
       if (!($1414)) {
        break L25;
       }
       $1415 = $state;
       $1416 = ((($1415)) + 52|0);
       $1417 = HEAP32[$1416>>2]|0;
       $1418 = $state;
       $1419 = ((($1418)) + 48|0);
       $1420 = HEAP32[$1419>>2]|0;
       $1421 = ($1417|0)<=($1420|0);
       if (!($1421)) {
        break L25;
       }
       $1422 = $state;
       $1423 = ((($1422)) + 48|0);
       HEAP32[$1423>>2] = 0;
       $1424 = $state;
       $1425 = ((($1424)) + 52|0);
       HEAP32[$1425>>2] = -1;
       break L25;
       break;
      }
      default: {
       label = 312;
       break L25;
      }
      }
     } while(0);
    } else {
     $switch$split162D = ($49|0)<(16238);
     if ($switch$split162D) {
      $switch$split192D = ($49|0)<(16203);
      if ($switch$split192D) {
       $switch$split252D = ($49|0)<(15971);
       if ($switch$split252D) {
        switch ($49|0) {
        case 8560:  {
         break;
        }
        default: {
         label = 312;
         break L25;
        }
        }
        $1201 = $state;
        _vterm_state_reset($1201,0);
        break L25;
       } else {
        switch ($49|0) {
        case 16202:  {
         label = 69;
         break L25;
         break;
        }
        case 15971:  {
         break;
        }
        default: {
         label = 312;
         break L25;
        }
        }
        $967 = $state;
        $968 = HEAP32[$967>>2]|0;
        HEAP32[$vararg_buffer1>>2] = 0;
        $vararg_ptr3 = ((($vararg_buffer1)) + 4|0);
        HEAP32[$vararg_ptr3>>2] = 100;
        $vararg_ptr4 = ((($vararg_buffer1)) + 8|0);
        HEAP32[$vararg_ptr4>>2] = 0;
        _vterm_push_output_sprintf_ctrl($968,-101,4752,$vararg_buffer1);
        break L25;
       }
      } else {
       switch ($49|0) {
       case 16203:  {
        label = 88;
        break L25;
        break;
       }
       case 16232:  {
        $1108 = $2;
        $1109 = HEAP32[$1108>>2]|0;
        $1110 = $1109 & 2147483647;
        $1111 = ($1110|0)==(2147483647);
        if ($1111) {
         break L25;
        }
        $1112 = $state;
        $1113 = $2;
        $1114 = HEAP32[$1113>>2]|0;
        $1115 = $1114 & 2147483647;
        _set_dec_mode($1112,$1115,1);
        break L25;
        break;
       }
       case 16236:  {
        $1163 = $2;
        $1164 = HEAP32[$1163>>2]|0;
        $1165 = $1164 & 2147483647;
        $1166 = ($1165|0)==(2147483647);
        if ($1166) {
         break L25;
        }
        $1167 = $state;
        $1168 = $2;
        $1169 = HEAP32[$1168>>2]|0;
        $1170 = $1169 & 2147483647;
        _set_dec_mode($1167,$1170,0);
        break L25;
        break;
       }
       default: {
        label = 312;
        break L25;
       }
       }
      }
     }
     $switch$split222D = ($49|0)<(2375536);
     if ($switch$split222D) {
      $switch$split282D = ($49|0)<(2097265);
      if ($switch$split282D) {
       switch ($49|0) {
       case 16238:  {
        break L222;
        break;
       }
       default: {
        label = 312;
        break L25;
       }
       }
      }
      $switch$split342D = ($49|0)<(2228337);
      if (!($switch$split342D)) {
       switch ($49|0) {
       case 2228337:  {
        break;
       }
       default: {
        label = 312;
        break L25;
       }
       }
       $1227 = $2;
       $1228 = HEAP32[$1227>>2]|0;
       $1229 = $1228 & 2147483647;
       $1230 = ($1229|0)==(2147483647);
       if ($1230) {
        $1234 = 0;
       } else {
        $1231 = $2;
        $1232 = HEAP32[$1231>>2]|0;
        $1233 = $1232 & 2147483647;
        $1234 = $1233;
       }
       $val = $1234;
       $1235 = $val;
       switch ($1235|0) {
       case 2: case 0:  {
        $1236 = $state;
        $1237 = ((($1236)) + 296|0);
        $1238 = HEAP8[$1237>>0]|0;
        $1239 = $1238 & -2;
        HEAP8[$1237>>0] = $1239;
        break L25;
        break;
       }
       case 1:  {
        $1240 = $state;
        $1241 = ((($1240)) + 296|0);
        $1242 = HEAP8[$1241>>0]|0;
        $1243 = $1242 & -2;
        $1244 = $1243 | 1;
        HEAP8[$1241>>0] = $1244;
        break L25;
        break;
       }
       default: {
        break L25;
       }
       }
      }
      switch ($49|0) {
      case 2097265:  {
       break;
      }
      default: {
       label = 312;
       break L25;
      }
      }
      $1206 = $2;
      $1207 = HEAP32[$1206>>2]|0;
      $1208 = $1207 & 2147483647;
      $1209 = ($1208|0)==(2147483647);
      if ($1209) {
       $1213 = 1;
      } else {
       $1210 = $2;
       $1211 = HEAP32[$1210>>2]|0;
       $1212 = $1211 & 2147483647;
       $1213 = $1212;
      }
      $val = $1213;
      $1214 = $val;
      switch ($1214|0) {
      case 1: case 0:  {
       $1215 = $state;
       (_settermprop_bool($1215,2,1)|0);
       $1216 = $state;
       (_settermprop_int($1216,7,1)|0);
       break L25;
       break;
      }
      case 2:  {
       $1217 = $state;
       (_settermprop_bool($1217,2,0)|0);
       $1218 = $state;
       (_settermprop_int($1218,7,1)|0);
       break L25;
       break;
      }
      case 3:  {
       $1219 = $state;
       (_settermprop_bool($1219,2,1)|0);
       $1220 = $state;
       (_settermprop_int($1220,7,2)|0);
       break L25;
       break;
      }
      case 4:  {
       $1221 = $state;
       (_settermprop_bool($1221,2,0)|0);
       $1222 = $state;
       (_settermprop_int($1222,7,2)|0);
       break L25;
       break;
      }
      case 5:  {
       $1223 = $state;
       (_settermprop_bool($1223,2,1)|0);
       $1224 = $state;
       (_settermprop_int($1224,7,3)|0);
       break L25;
       break;
      }
      case 6:  {
       $1225 = $state;
       (_settermprop_bool($1225,2,0)|0);
       $1226 = $state;
       (_settermprop_int($1226,7,3)|0);
       break L25;
       break;
      }
      default: {
       break L25;
      }
      }
     }
     $switch$split312D = ($49|0)<(2556029);
     if ($switch$split312D) {
      switch ($49|0) {
      case 2375536:  {
       break;
      }
      default: {
       label = 312;
       break L25;
      }
      }
      $1202 = $state;
      $1203 = $2;
      $1204 = HEAP32[$1203>>2]|0;
      $1205 = $1204 & 2147483647;
      _request_dec_mode($1202,$1205);
      break L25;
     }
     switch ($49|0) {
     case 2556029:  {
      $1426 = $2;
      $1427 = HEAP32[$1426>>2]|0;
      $1428 = $1427 & 2147483647;
      $1429 = ($1428|0)==(2147483647);
      if ($1429) {
       $1437 = 1;
      } else {
       $1430 = $2;
       $1431 = HEAP32[$1430>>2]|0;
       $1432 = $1431 & 2147483647;
       $1433 = ($1432|0)==(0);
       if ($1433) {
        $1437 = 1;
       } else {
        $1434 = $2;
        $1435 = HEAP32[$1434>>2]|0;
        $1436 = $1435 & 2147483647;
        $1437 = $1436;
       }
      }
      $count = $1437;
      $1438 = $state;
      $1439 = (_is_cursor_in_scrollregion($1438)|0);
      $1440 = ($1439|0)!=(0);
      if (!($1440)) {
       break L25;
      }
      $1441 = $state;
      $1442 = ((($1441)) + 40|0);
      $1443 = HEAP32[$1442>>2]|0;
      HEAP32[$rect>>2] = $1443;
      $1444 = $state;
      $1445 = ((($1444)) + 44|0);
      $1446 = HEAP32[$1445>>2]|0;
      $1447 = ($1446|0)>(-1);
      $1448 = $state;
      if ($1447) {
       $1449 = ((($1448)) + 44|0);
       $1450 = HEAP32[$1449>>2]|0;
       $1454 = $1450;
      } else {
       $1451 = ((($1448)) + 20|0);
       $1452 = HEAP32[$1451>>2]|0;
       $1454 = $1452;
      }
      $1453 = ((($rect)) + 4|0);
      HEAP32[$1453>>2] = $1454;
      $1455 = $state;
      $1456 = ((($1455)) + 28|0);
      $1457 = ((($1456)) + 4|0);
      $1458 = HEAP32[$1457>>2]|0;
      $1459 = ((($rect)) + 8|0);
      HEAP32[$1459>>2] = $1458;
      $1460 = $state;
      $1461 = ((($1460)) + 104|0);
      $1462 = HEAP16[$1461>>1]|0;
      $1463 = ($1462 << 3)&65535;
      $1464 = ($1463<<16>>16) >> 15;
      $1465 = $1464 << 16 >> 16;
      $1466 = ($1465|0)!=(0);
      if ($1466) {
       $1467 = $state;
       $1468 = ((($1467)) + 52|0);
       $1469 = HEAP32[$1468>>2]|0;
       $1470 = ($1469|0)>(-1);
       if ($1470) {
        $1471 = $state;
        $1472 = ((($1471)) + 52|0);
        $1473 = HEAP32[$1472>>2]|0;
        $1478 = $1473;
       } else {
        label = 298;
       }
      } else {
       label = 298;
      }
      if ((label|0) == 298) {
       $1474 = $state;
       $1475 = ((($1474)) + 24|0);
       $1476 = HEAP32[$1475>>2]|0;
       $1478 = $1476;
      }
      $1477 = ((($rect)) + 12|0);
      HEAP32[$1477>>2] = $1478;
      $1479 = $state;
      $1480 = $count;
      $1481 = (0 - ($1480))|0;
      ;HEAP32[$rect$byval_copy40>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy40+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy40+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy40+12>>2]=HEAP32[$rect+12>>2]|0;
      _scroll($1479,$rect$byval_copy40,0,$1481);
      break L25;
      break;
     }
     case 2556030:  {
      $1482 = $2;
      $1483 = HEAP32[$1482>>2]|0;
      $1484 = $1483 & 2147483647;
      $1485 = ($1484|0)==(2147483647);
      if ($1485) {
       $1493 = 1;
      } else {
       $1486 = $2;
       $1487 = HEAP32[$1486>>2]|0;
       $1488 = $1487 & 2147483647;
       $1489 = ($1488|0)==(0);
       if ($1489) {
        $1493 = 1;
       } else {
        $1490 = $2;
        $1491 = HEAP32[$1490>>2]|0;
        $1492 = $1491 & 2147483647;
        $1493 = $1492;
       }
      }
      $count = $1493;
      $1494 = $state;
      $1495 = (_is_cursor_in_scrollregion($1494)|0);
      $1496 = ($1495|0)!=(0);
      if (!($1496)) {
       break L25;
      }
      $1497 = $state;
      $1498 = ((($1497)) + 40|0);
      $1499 = HEAP32[$1498>>2]|0;
      HEAP32[$rect>>2] = $1499;
      $1500 = $state;
      $1501 = ((($1500)) + 44|0);
      $1502 = HEAP32[$1501>>2]|0;
      $1503 = ($1502|0)>(-1);
      $1504 = $state;
      if ($1503) {
       $1505 = ((($1504)) + 44|0);
       $1506 = HEAP32[$1505>>2]|0;
       $1510 = $1506;
      } else {
       $1507 = ((($1504)) + 20|0);
       $1508 = HEAP32[$1507>>2]|0;
       $1510 = $1508;
      }
      $1509 = ((($rect)) + 4|0);
      HEAP32[$1509>>2] = $1510;
      $1511 = $state;
      $1512 = ((($1511)) + 28|0);
      $1513 = ((($1512)) + 4|0);
      $1514 = HEAP32[$1513>>2]|0;
      $1515 = ((($rect)) + 8|0);
      HEAP32[$1515>>2] = $1514;
      $1516 = $state;
      $1517 = ((($1516)) + 104|0);
      $1518 = HEAP16[$1517>>1]|0;
      $1519 = ($1518 << 3)&65535;
      $1520 = ($1519<<16>>16) >> 15;
      $1521 = $1520 << 16 >> 16;
      $1522 = ($1521|0)!=(0);
      if ($1522) {
       $1523 = $state;
       $1524 = ((($1523)) + 52|0);
       $1525 = HEAP32[$1524>>2]|0;
       $1526 = ($1525|0)>(-1);
       if ($1526) {
        $1527 = $state;
        $1528 = ((($1527)) + 52|0);
        $1529 = HEAP32[$1528>>2]|0;
        $1534 = $1529;
       } else {
        label = 310;
       }
      } else {
       label = 310;
      }
      if ((label|0) == 310) {
       $1530 = $state;
       $1531 = ((($1530)) + 24|0);
       $1532 = HEAP32[$1531>>2]|0;
       $1534 = $1532;
      }
      $1533 = ((($rect)) + 12|0);
      HEAP32[$1533>>2] = $1534;
      $1535 = $state;
      $1536 = $count;
      ;HEAP32[$rect$byval_copy41>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy41+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy41+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy41+12>>2]=HEAP32[$rect+12>>2]|0;
      _scroll($1535,$rect$byval_copy41,0,$1536);
      break L25;
      break;
     }
     default: {
      label = 312;
      break L25;
     }
     }
    }
   } while(0);
   $1174 = $2;
   $1175 = HEAP32[$1174>>2]|0;
   $1176 = $1175 & 2147483647;
   $1177 = ($1176|0)==(2147483647);
   if ($1177) {
    $1181 = 0;
   } else {
    $1178 = $2;
    $1179 = HEAP32[$1178>>2]|0;
    $1180 = $1179 & 2147483647;
    $1181 = $1180;
   }
   $val = $1181;
   $1182 = $leader_byte;
   $1183 = ($1182|0)==(63);
   $1184 = $1183 ? 4763 : 5238;
   $qmark = $1184;
   $1185 = $val;
   switch ($1185|0) {
   case 6:  {
    $1189 = $state;
    $1190 = HEAP32[$1189>>2]|0;
    $1191 = $qmark;
    $1192 = $state;
    $1193 = ((($1192)) + 28|0);
    $1194 = HEAP32[$1193>>2]|0;
    $1195 = (($1194) + 1)|0;
    $1196 = $state;
    $1197 = ((($1196)) + 28|0);
    $1198 = ((($1197)) + 4|0);
    $1199 = HEAP32[$1198>>2]|0;
    $1200 = (($1199) + 1)|0;
    HEAP32[$vararg_buffer8>>2] = $1191;
    $vararg_ptr11 = ((($vararg_buffer8)) + 4|0);
    HEAP32[$vararg_ptr11>>2] = $1195;
    $vararg_ptr12 = ((($vararg_buffer8)) + 8|0);
    HEAP32[$vararg_ptr12>>2] = $1200;
    _vterm_push_output_sprintf_ctrl($1190,-101,4770,$vararg_buffer8);
    break L25;
    break;
   }
   case 5:  {
    $1186 = $state;
    $1187 = HEAP32[$1186>>2]|0;
    $1188 = $qmark;
    HEAP32[$vararg_buffer5>>2] = $1188;
    _vterm_push_output_sprintf_ctrl($1187,-101,4765,$vararg_buffer5);
    break L25;
    break;
   }
   default: {
    break L25;
   }
   }
  }
 } while(0);
 L414: do {
  if ((label|0) == 69) {
   $335 = $leader_byte;
   $336 = ($335|0)==(63);
   $337 = $336&1;
   $selective = $337;
   $338 = $2;
   $339 = HEAP32[$338>>2]|0;
   $340 = $339 & 2147483647;
   $switch$split12D = ($340|0)<(2);
   L424: do {
    if ($switch$split12D) {
     switch ($340|0) {
     case 0:  {
      break L424;
      break;
     }
     case 1:  {
      break;
     }
     default: {
      break L414;
     }
     }
     HEAP32[$rect>>2] = 0;
     $389 = $state;
     $390 = ((($389)) + 28|0);
     $391 = HEAP32[$390>>2]|0;
     $392 = ((($rect)) + 4|0);
     HEAP32[$392>>2] = $391;
     $393 = ((($rect)) + 8|0);
     HEAP32[$393>>2] = 0;
     $394 = $state;
     $395 = ((($394)) + 24|0);
     $396 = HEAP32[$395>>2]|0;
     $397 = ((($rect)) + 12|0);
     HEAP32[$397>>2] = $396;
     $398 = HEAP32[$rect>>2]|0;
     $row2 = $398;
     while(1) {
      $399 = $row2;
      $400 = ((($rect)) + 4|0);
      $401 = HEAP32[$400>>2]|0;
      $402 = ($399|0)<($401|0);
      if (!($402)) {
       break;
      }
      $403 = $state;
      $404 = $row2;
      _set_lineinfo($403,$404,1,0,0);
      $405 = $row2;
      $406 = (($405) + 1)|0;
      $row2 = $406;
     }
     $407 = ((($rect)) + 12|0);
     $408 = HEAP32[$407>>2]|0;
     $409 = ((($rect)) + 8|0);
     $410 = HEAP32[$409>>2]|0;
     $411 = ($408|0)>($410|0);
     if ($411) {
      $412 = $state;
      $413 = $selective;
      ;HEAP32[$rect$byval_copy30>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy30+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy30+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy30+12>>2]=HEAP32[$rect+12>>2]|0;
      _erase49($412,$rect$byval_copy30,$413);
     }
     $414 = $state;
     $415 = ((($414)) + 28|0);
     $416 = HEAP32[$415>>2]|0;
     HEAP32[$rect>>2] = $416;
     $417 = $state;
     $418 = ((($417)) + 28|0);
     $419 = HEAP32[$418>>2]|0;
     $420 = (($419) + 1)|0;
     $421 = ((($rect)) + 4|0);
     HEAP32[$421>>2] = $420;
     $422 = $state;
     $423 = ((($422)) + 28|0);
     $424 = ((($423)) + 4|0);
     $425 = HEAP32[$424>>2]|0;
     $426 = (($425) + 1)|0;
     $427 = ((($rect)) + 12|0);
     HEAP32[$427>>2] = $426;
     $428 = ((($rect)) + 4|0);
     $429 = HEAP32[$428>>2]|0;
     $430 = HEAP32[$rect>>2]|0;
     $431 = ($429|0)>($430|0);
     if (!($431)) {
      break L414;
     }
     $432 = $state;
     $433 = $selective;
     ;HEAP32[$rect$byval_copy31>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy31+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy31+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy31+12>>2]=HEAP32[$rect+12>>2]|0;
     _erase49($432,$rect$byval_copy31,$433);
     break L414;
    } else {
     $switch$split102D = ($340|0)<(2147483647);
     if (!($switch$split102D)) {
      switch ($340|0) {
      case 2147483647:  {
       break L424;
       break;
      }
      default: {
       break L414;
      }
      }
     }
     switch ($340|0) {
     case 2:  {
      break;
     }
     default: {
      break L414;
     }
     }
     HEAP32[$rect>>2] = 0;
     $434 = $state;
     $435 = ((($434)) + 20|0);
     $436 = HEAP32[$435>>2]|0;
     $437 = ((($rect)) + 4|0);
     HEAP32[$437>>2] = $436;
     $438 = ((($rect)) + 8|0);
     HEAP32[$438>>2] = 0;
     $439 = $state;
     $440 = ((($439)) + 24|0);
     $441 = HEAP32[$440>>2]|0;
     $442 = ((($rect)) + 12|0);
     HEAP32[$442>>2] = $441;
     $443 = HEAP32[$rect>>2]|0;
     $row3 = $443;
     while(1) {
      $444 = $row3;
      $445 = ((($rect)) + 4|0);
      $446 = HEAP32[$445>>2]|0;
      $447 = ($444|0)<($446|0);
      $448 = $state;
      if (!($447)) {
       break;
      }
      $449 = $row3;
      _set_lineinfo($448,$449,1,0,0);
      $450 = $row3;
      $451 = (($450) + 1)|0;
      $row3 = $451;
     }
     $452 = $selective;
     ;HEAP32[$rect$byval_copy32>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy32+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy32+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy32+12>>2]=HEAP32[$rect+12>>2]|0;
     _erase49($448,$rect$byval_copy32,$452);
     break L414;
    }
   } while(0);
   $341 = $state;
   $342 = ((($341)) + 28|0);
   $343 = HEAP32[$342>>2]|0;
   HEAP32[$rect>>2] = $343;
   $344 = $state;
   $345 = ((($344)) + 28|0);
   $346 = HEAP32[$345>>2]|0;
   $347 = (($346) + 1)|0;
   $348 = ((($rect)) + 4|0);
   HEAP32[$348>>2] = $347;
   $349 = $state;
   $350 = ((($349)) + 28|0);
   $351 = ((($350)) + 4|0);
   $352 = HEAP32[$351>>2]|0;
   $353 = ((($rect)) + 8|0);
   HEAP32[$353>>2] = $352;
   $354 = $state;
   $355 = ((($354)) + 24|0);
   $356 = HEAP32[$355>>2]|0;
   $357 = ((($rect)) + 12|0);
   HEAP32[$357>>2] = $356;
   $358 = ((($rect)) + 12|0);
   $359 = HEAP32[$358>>2]|0;
   $360 = ((($rect)) + 8|0);
   $361 = HEAP32[$360>>2]|0;
   $362 = ($359|0)>($361|0);
   if ($362) {
    $363 = $state;
    $364 = $selective;
    ;HEAP32[$rect$byval_copy28>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy28+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy28+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy28+12>>2]=HEAP32[$rect+12>>2]|0;
    _erase49($363,$rect$byval_copy28,$364);
   }
   $365 = $state;
   $366 = ((($365)) + 28|0);
   $367 = HEAP32[$366>>2]|0;
   $368 = (($367) + 1)|0;
   HEAP32[$rect>>2] = $368;
   $369 = $state;
   $370 = ((($369)) + 20|0);
   $371 = HEAP32[$370>>2]|0;
   $372 = ((($rect)) + 4|0);
   HEAP32[$372>>2] = $371;
   $373 = ((($rect)) + 8|0);
   HEAP32[$373>>2] = 0;
   $374 = HEAP32[$rect>>2]|0;
   $row1 = $374;
   while(1) {
    $375 = $row1;
    $376 = ((($rect)) + 4|0);
    $377 = HEAP32[$376>>2]|0;
    $378 = ($375|0)<($377|0);
    if (!($378)) {
     break;
    }
    $379 = $state;
    $380 = $row1;
    _set_lineinfo($379,$380,1,0,0);
    $381 = $row1;
    $382 = (($381) + 1)|0;
    $row1 = $382;
   }
   $383 = ((($rect)) + 4|0);
   $384 = HEAP32[$383>>2]|0;
   $385 = HEAP32[$rect>>2]|0;
   $386 = ($384|0)>($385|0);
   if ($386) {
    $387 = $state;
    $388 = $selective;
    ;HEAP32[$rect$byval_copy29>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy29+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy29+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy29+12>>2]=HEAP32[$rect+12>>2]|0;
    _erase49($387,$rect$byval_copy29,$388);
   }
  }
  else if ((label|0) == 88) {
   $453 = $leader_byte;
   $454 = ($453|0)==(63);
   $455 = $454&1;
   $selective = $455;
   $456 = $state;
   $457 = ((($456)) + 28|0);
   $458 = HEAP32[$457>>2]|0;
   HEAP32[$rect>>2] = $458;
   $459 = $state;
   $460 = ((($459)) + 28|0);
   $461 = HEAP32[$460>>2]|0;
   $462 = (($461) + 1)|0;
   $463 = ((($rect)) + 4|0);
   HEAP32[$463>>2] = $462;
   $464 = $2;
   $465 = HEAP32[$464>>2]|0;
   $466 = $465 & 2147483647;
   $switch$split42D = ($466|0)<(2);
   L454: do {
    if ($switch$split42D) {
     switch ($466|0) {
     case 0:  {
      label = 89;
      break L454;
      break;
     }
     case 1:  {
      break;
     }
     default: {
      label = 92;
      break L454;
     }
     }
     $489 = ((($rect)) + 8|0);
     HEAP32[$489>>2] = 0;
     $490 = $state;
     $491 = ((($490)) + 28|0);
     $492 = ((($491)) + 4|0);
     $493 = HEAP32[$492>>2]|0;
     $494 = (($493) + 1)|0;
     $495 = ((($rect)) + 12|0);
     HEAP32[$495>>2] = $494;
    } else {
     $switch$split132D = ($466|0)<(2147483647);
     if (!($switch$split132D)) {
      switch ($466|0) {
      case 2147483647:  {
       label = 89;
       break L454;
       break;
      }
      default: {
       label = 92;
       break L454;
      }
      }
     }
     switch ($466|0) {
     case 2:  {
      break;
     }
     default: {
      label = 92;
      break L454;
     }
     }
     $496 = ((($rect)) + 8|0);
     HEAP32[$496>>2] = 0;
     $497 = $state;
     $498 = ((($497)) + 28|0);
     $499 = HEAP32[$498>>2]|0;
     $500 = $state;
     $501 = ((($500)) + 60|0);
     $502 = HEAP32[$501>>2]|0;
     $503 = (($502) + ($499<<2)|0);
     $504 = HEAP8[$503>>0]|0;
     $505 = $504 & 1;
     $506 = $505&255;
     $507 = ($506|0)!=(0);
     $508 = $state;
     $509 = ((($508)) + 24|0);
     $510 = HEAP32[$509>>2]|0;
     $511 = (($510|0) / 2)&-1;
     $512 = $507 ? $511 : $510;
     $513 = ((($rect)) + 12|0);
     HEAP32[$513>>2] = $512;
    }
   } while(0);
   if ((label|0) == 89) {
    $467 = $state;
    $468 = ((($467)) + 28|0);
    $469 = ((($468)) + 4|0);
    $470 = HEAP32[$469>>2]|0;
    $471 = ((($rect)) + 8|0);
    HEAP32[$471>>2] = $470;
    $472 = $state;
    $473 = ((($472)) + 28|0);
    $474 = HEAP32[$473>>2]|0;
    $475 = $state;
    $476 = ((($475)) + 60|0);
    $477 = HEAP32[$476>>2]|0;
    $478 = (($477) + ($474<<2)|0);
    $479 = HEAP8[$478>>0]|0;
    $480 = $479 & 1;
    $481 = $480&255;
    $482 = ($481|0)!=(0);
    $483 = $state;
    $484 = ((($483)) + 24|0);
    $485 = HEAP32[$484>>2]|0;
    $486 = (($485|0) / 2)&-1;
    $487 = $482 ? $486 : $485;
    $488 = ((($rect)) + 12|0);
    HEAP32[$488>>2] = $487;
   }
   else if ((label|0) == 92) {
    $0 = 0;
    $1879 = $0;
    STACKTOP = sp;return ($1879|0);
   }
   $514 = ((($rect)) + 12|0);
   $515 = HEAP32[$514>>2]|0;
   $516 = ((($rect)) + 8|0);
   $517 = HEAP32[$516>>2]|0;
   $518 = ($515|0)>($517|0);
   if ($518) {
    $519 = $state;
    $520 = $selective;
    ;HEAP32[$rect$byval_copy33>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy33+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy33+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy33+12>>2]=HEAP32[$rect+12>>2]|0;
    _erase49($519,$rect$byval_copy33,$520);
   }
  }
  else if ((label|0) == 312) {
   $1537 = $state;
   $1538 = ((($1537)) + 12|0);
   $1539 = HEAP32[$1538>>2]|0;
   $1540 = ($1539|0)!=(0|0);
   if ($1540) {
    $1541 = $state;
    $1542 = ((($1541)) + 12|0);
    $1543 = HEAP32[$1542>>2]|0;
    $1544 = ((($1543)) + 12|0);
    $1545 = HEAP32[$1544>>2]|0;
    $1546 = ($1545|0)!=(0|0);
    if ($1546) {
     $1547 = $state;
     $1548 = ((($1547)) + 12|0);
     $1549 = HEAP32[$1548>>2]|0;
     $1550 = ((($1549)) + 12|0);
     $1551 = HEAP32[$1550>>2]|0;
     $1552 = $1;
     $1553 = $2;
     $1554 = $3;
     $1555 = $4;
     $1556 = $5;
     $1557 = $state;
     $1558 = ((($1557)) + 16|0);
     $1559 = HEAP32[$1558>>2]|0;
     $1560 = (FUNCTION_TABLE_iiiiiii[$1551 & 31]($1552,$1553,$1554,$1555,$1556,$1559)|0);
     $1561 = ($1560|0)!=(0);
     if ($1561) {
      $0 = 1;
      $1879 = $0;
      STACKTOP = sp;return ($1879|0);
     }
    }
   }
   $0 = 0;
   $1879 = $0;
   STACKTOP = sp;return ($1879|0);
  }
 } while(0);
 $1562 = $state;
 $1563 = ((($1562)) + 104|0);
 $1564 = HEAP16[$1563>>1]|0;
 $1565 = ($1564 << 5)&65535;
 $1566 = ($1565<<16>>16) >> 15;
 $1567 = $1566 << 16 >> 16;
 $1568 = ($1567|0)!=(0);
 $1569 = $state;
 $1570 = ((($1569)) + 28|0);
 $1571 = HEAP32[$1570>>2]|0;
 if ($1568) {
  $1572 = $state;
  $1573 = ((($1572)) + 40|0);
  $1574 = HEAP32[$1573>>2]|0;
  $1575 = ($1571|0)<($1574|0);
  if ($1575) {
   $1576 = $state;
   $1577 = ((($1576)) + 40|0);
   $1578 = HEAP32[$1577>>2]|0;
   $1579 = $state;
   $1580 = ((($1579)) + 28|0);
   HEAP32[$1580>>2] = $1578;
  }
  $1581 = $state;
  $1582 = ((($1581)) + 28|0);
  $1583 = HEAP32[$1582>>2]|0;
  $1584 = $state;
  $1585 = ((($1584)) + 44|0);
  $1586 = HEAP32[$1585>>2]|0;
  $1587 = ($1586|0)>(-1);
  $1588 = $state;
  if ($1587) {
   $1589 = ((($1588)) + 44|0);
   $1590 = HEAP32[$1589>>2]|0;
   $1594 = $1590;
  } else {
   $1591 = ((($1588)) + 20|0);
   $1592 = HEAP32[$1591>>2]|0;
   $1594 = $1592;
  }
  $1593 = (($1594) - 1)|0;
  $1595 = ($1583|0)>($1593|0);
  if ($1595) {
   $1596 = $state;
   $1597 = ((($1596)) + 44|0);
   $1598 = HEAP32[$1597>>2]|0;
   $1599 = ($1598|0)>(-1);
   $1600 = $state;
   if ($1599) {
    $1601 = ((($1600)) + 44|0);
    $1602 = HEAP32[$1601>>2]|0;
    $1606 = $1602;
   } else {
    $1603 = ((($1600)) + 20|0);
    $1604 = HEAP32[$1603>>2]|0;
    $1606 = $1604;
   }
   $1605 = (($1606) - 1)|0;
   $1607 = $state;
   $1608 = ((($1607)) + 28|0);
   HEAP32[$1608>>2] = $1605;
  }
  $1609 = $state;
  $1610 = ((($1609)) + 28|0);
  $1611 = ((($1610)) + 4|0);
  $1612 = HEAP32[$1611>>2]|0;
  $1613 = $state;
  $1614 = ((($1613)) + 104|0);
  $1615 = HEAP16[$1614>>1]|0;
  $1616 = ($1615 << 3)&65535;
  $1617 = ($1616<<16>>16) >> 15;
  $1618 = $1617 << 16 >> 16;
  $1619 = ($1618|0)!=(0);
  if ($1619) {
   $1620 = $state;
   $1621 = ((($1620)) + 48|0);
   $1622 = HEAP32[$1621>>2]|0;
   $1624 = $1622;
  } else {
   $1624 = 0;
  }
  $1623 = ($1612|0)<($1624|0);
  if ($1623) {
   $1625 = $state;
   $1626 = ((($1625)) + 104|0);
   $1627 = HEAP16[$1626>>1]|0;
   $1628 = ($1627 << 3)&65535;
   $1629 = ($1628<<16>>16) >> 15;
   $1630 = $1629 << 16 >> 16;
   $1631 = ($1630|0)!=(0);
   if ($1631) {
    $1632 = $state;
    $1633 = ((($1632)) + 48|0);
    $1634 = HEAP32[$1633>>2]|0;
    $1638 = $1634;
   } else {
    $1638 = 0;
   }
   $1635 = $state;
   $1636 = ((($1635)) + 28|0);
   $1637 = ((($1636)) + 4|0);
   HEAP32[$1637>>2] = $1638;
  }
  $1639 = $state;
  $1640 = ((($1639)) + 28|0);
  $1641 = ((($1640)) + 4|0);
  $1642 = HEAP32[$1641>>2]|0;
  $1643 = $state;
  $1644 = ((($1643)) + 104|0);
  $1645 = HEAP16[$1644>>1]|0;
  $1646 = ($1645 << 3)&65535;
  $1647 = ($1646<<16>>16) >> 15;
  $1648 = $1647 << 16 >> 16;
  $1649 = ($1648|0)!=(0);
  if ($1649) {
   $1650 = $state;
   $1651 = ((($1650)) + 52|0);
   $1652 = HEAP32[$1651>>2]|0;
   $1653 = ($1652|0)>(-1);
   if ($1653) {
    $1654 = $state;
    $1655 = ((($1654)) + 52|0);
    $1656 = HEAP32[$1655>>2]|0;
    $1661 = $1656;
   } else {
    label = 337;
   }
  } else {
   label = 337;
  }
  if ((label|0) == 337) {
   $1657 = $state;
   $1658 = ((($1657)) + 24|0);
   $1659 = HEAP32[$1658>>2]|0;
   $1661 = $1659;
  }
  $1660 = (($1661) - 1)|0;
  $1662 = ($1642|0)>($1660|0);
  if ($1662) {
   $1663 = $state;
   $1664 = ((($1663)) + 104|0);
   $1665 = HEAP16[$1664>>1]|0;
   $1666 = ($1665 << 3)&65535;
   $1667 = ($1666<<16>>16) >> 15;
   $1668 = $1667 << 16 >> 16;
   $1669 = ($1668|0)!=(0);
   if ($1669) {
    $1670 = $state;
    $1671 = ((($1670)) + 52|0);
    $1672 = HEAP32[$1671>>2]|0;
    $1673 = ($1672|0)>(-1);
    if ($1673) {
     $1674 = $state;
     $1675 = ((($1674)) + 52|0);
     $1676 = HEAP32[$1675>>2]|0;
     $1681 = $1676;
    } else {
     label = 342;
    }
   } else {
    label = 342;
   }
   if ((label|0) == 342) {
    $1677 = $state;
    $1678 = ((($1677)) + 24|0);
    $1679 = HEAP32[$1678>>2]|0;
    $1681 = $1679;
   }
   $1680 = (($1681) - 1)|0;
   $1682 = $state;
   $1683 = ((($1682)) + 28|0);
   $1684 = ((($1683)) + 4|0);
   HEAP32[$1684>>2] = $1680;
  }
 } else {
  $1685 = ($1571|0)<(0);
  if ($1685) {
   $1686 = $state;
   $1687 = ((($1686)) + 28|0);
   HEAP32[$1687>>2] = 0;
  }
  $1688 = $state;
  $1689 = ((($1688)) + 28|0);
  $1690 = HEAP32[$1689>>2]|0;
  $1691 = $state;
  $1692 = ((($1691)) + 20|0);
  $1693 = HEAP32[$1692>>2]|0;
  $1694 = (($1693) - 1)|0;
  $1695 = ($1690|0)>($1694|0);
  if ($1695) {
   $1696 = $state;
   $1697 = ((($1696)) + 20|0);
   $1698 = HEAP32[$1697>>2]|0;
   $1699 = (($1698) - 1)|0;
   $1700 = $state;
   $1701 = ((($1700)) + 28|0);
   HEAP32[$1701>>2] = $1699;
  }
  $1702 = $state;
  $1703 = ((($1702)) + 28|0);
  $1704 = ((($1703)) + 4|0);
  $1705 = HEAP32[$1704>>2]|0;
  $1706 = ($1705|0)<(0);
  if ($1706) {
   $1707 = $state;
   $1708 = ((($1707)) + 28|0);
   $1709 = ((($1708)) + 4|0);
   HEAP32[$1709>>2] = 0;
  }
  $1710 = $state;
  $1711 = ((($1710)) + 28|0);
  $1712 = ((($1711)) + 4|0);
  $1713 = HEAP32[$1712>>2]|0;
  $1714 = $state;
  $1715 = ((($1714)) + 28|0);
  $1716 = HEAP32[$1715>>2]|0;
  $1717 = $state;
  $1718 = ((($1717)) + 60|0);
  $1719 = HEAP32[$1718>>2]|0;
  $1720 = (($1719) + ($1716<<2)|0);
  $1721 = HEAP8[$1720>>0]|0;
  $1722 = $1721 & 1;
  $1723 = $1722&255;
  $1724 = ($1723|0)!=(0);
  $1725 = $state;
  $1726 = ((($1725)) + 24|0);
  $1727 = HEAP32[$1726>>2]|0;
  $1728 = (($1727|0) / 2)&-1;
  $1729 = $1724 ? $1728 : $1727;
  $1730 = (($1729) - 1)|0;
  $1731 = ($1713|0)>($1730|0);
  if ($1731) {
   $1732 = $state;
   $1733 = ((($1732)) + 28|0);
   $1734 = HEAP32[$1733>>2]|0;
   $1735 = $state;
   $1736 = ((($1735)) + 60|0);
   $1737 = HEAP32[$1736>>2]|0;
   $1738 = (($1737) + ($1734<<2)|0);
   $1739 = HEAP8[$1738>>0]|0;
   $1740 = $1739 & 1;
   $1741 = $1740&255;
   $1742 = ($1741|0)!=(0);
   $1743 = $state;
   $1744 = ((($1743)) + 24|0);
   $1745 = HEAP32[$1744>>2]|0;
   $1746 = (($1745|0) / 2)&-1;
   $1747 = $1742 ? $1746 : $1745;
   $1748 = (($1747) - 1)|0;
   $1749 = $state;
   $1750 = ((($1749)) + 28|0);
   $1751 = ((($1750)) + 4|0);
   HEAP32[$1751>>2] = $1748;
  }
 }
 $1752 = $state;
 _updatecursor($1752,$oldpos,1);
 $1753 = $state;
 $1754 = ((($1753)) + 28|0);
 $1755 = HEAP32[$1754>>2]|0;
 $1756 = ($1755|0)<(0);
 if ($1756) {
  $1777 = HEAP32[3064>>2]|0;
  $1778 = $5;
  $1779 = $1778 << 24 >> 24;
  $1780 = $state;
  $1781 = ((($1780)) + 28|0);
  $1782 = HEAP32[$1781>>2]|0;
  $1783 = $state;
  $1784 = ((($1783)) + 28|0);
  $1785 = ((($1784)) + 4|0);
  $1786 = HEAP32[$1785>>2]|0;
  HEAP32[$vararg_buffer13>>2] = $1779;
  $vararg_ptr16 = ((($vararg_buffer13)) + 4|0);
  HEAP32[$vararg_ptr16>>2] = $1782;
  $vararg_ptr17 = ((($vararg_buffer13)) + 8|0);
  HEAP32[$vararg_ptr17>>2] = $1786;
  (_fprintf($1777,4779,$vararg_buffer13)|0);
  _abort();
  // unreachable;
 }
 $1757 = $state;
 $1758 = ((($1757)) + 28|0);
 $1759 = HEAP32[$1758>>2]|0;
 $1760 = $state;
 $1761 = ((($1760)) + 20|0);
 $1762 = HEAP32[$1761>>2]|0;
 $1763 = ($1759|0)>=($1762|0);
 if ($1763) {
  $1777 = HEAP32[3064>>2]|0;
  $1778 = $5;
  $1779 = $1778 << 24 >> 24;
  $1780 = $state;
  $1781 = ((($1780)) + 28|0);
  $1782 = HEAP32[$1781>>2]|0;
  $1783 = $state;
  $1784 = ((($1783)) + 28|0);
  $1785 = ((($1784)) + 4|0);
  $1786 = HEAP32[$1785>>2]|0;
  HEAP32[$vararg_buffer13>>2] = $1779;
  $vararg_ptr16 = ((($vararg_buffer13)) + 4|0);
  HEAP32[$vararg_ptr16>>2] = $1782;
  $vararg_ptr17 = ((($vararg_buffer13)) + 8|0);
  HEAP32[$vararg_ptr17>>2] = $1786;
  (_fprintf($1777,4779,$vararg_buffer13)|0);
  _abort();
  // unreachable;
 }
 $1764 = $state;
 $1765 = ((($1764)) + 28|0);
 $1766 = ((($1765)) + 4|0);
 $1767 = HEAP32[$1766>>2]|0;
 $1768 = ($1767|0)<(0);
 if ($1768) {
  $1777 = HEAP32[3064>>2]|0;
  $1778 = $5;
  $1779 = $1778 << 24 >> 24;
  $1780 = $state;
  $1781 = ((($1780)) + 28|0);
  $1782 = HEAP32[$1781>>2]|0;
  $1783 = $state;
  $1784 = ((($1783)) + 28|0);
  $1785 = ((($1784)) + 4|0);
  $1786 = HEAP32[$1785>>2]|0;
  HEAP32[$vararg_buffer13>>2] = $1779;
  $vararg_ptr16 = ((($vararg_buffer13)) + 4|0);
  HEAP32[$vararg_ptr16>>2] = $1782;
  $vararg_ptr17 = ((($vararg_buffer13)) + 8|0);
  HEAP32[$vararg_ptr17>>2] = $1786;
  (_fprintf($1777,4779,$vararg_buffer13)|0);
  _abort();
  // unreachable;
 }
 $1769 = $state;
 $1770 = ((($1769)) + 28|0);
 $1771 = ((($1770)) + 4|0);
 $1772 = HEAP32[$1771>>2]|0;
 $1773 = $state;
 $1774 = ((($1773)) + 24|0);
 $1775 = HEAP32[$1774>>2]|0;
 $1776 = ($1772|0)>=($1775|0);
 if ($1776) {
  $1777 = HEAP32[3064>>2]|0;
  $1778 = $5;
  $1779 = $1778 << 24 >> 24;
  $1780 = $state;
  $1781 = ((($1780)) + 28|0);
  $1782 = HEAP32[$1781>>2]|0;
  $1783 = $state;
  $1784 = ((($1783)) + 28|0);
  $1785 = ((($1784)) + 4|0);
  $1786 = HEAP32[$1785>>2]|0;
  HEAP32[$vararg_buffer13>>2] = $1779;
  $vararg_ptr16 = ((($vararg_buffer13)) + 4|0);
  HEAP32[$vararg_ptr16>>2] = $1782;
  $vararg_ptr17 = ((($vararg_buffer13)) + 8|0);
  HEAP32[$vararg_ptr17>>2] = $1786;
  (_fprintf($1777,4779,$vararg_buffer13)|0);
  _abort();
  // unreachable;
 }
 $1787 = $state;
 $1788 = ((($1787)) + 44|0);
 $1789 = HEAP32[$1788>>2]|0;
 $1790 = ($1789|0)>(-1);
 $1791 = $state;
 if ($1790) {
  $1792 = ((($1791)) + 44|0);
  $1793 = HEAP32[$1792>>2]|0;
  $1799 = $1793;
 } else {
  $1794 = ((($1791)) + 20|0);
  $1795 = HEAP32[$1794>>2]|0;
  $1799 = $1795;
 }
 $1796 = $state;
 $1797 = ((($1796)) + 40|0);
 $1798 = HEAP32[$1797>>2]|0;
 $1800 = ($1799|0)<=($1798|0);
 if ($1800) {
  $1801 = HEAP32[3064>>2]|0;
  $1802 = $5;
  $1803 = $1802 << 24 >> 24;
  $1804 = $state;
  $1805 = ((($1804)) + 44|0);
  $1806 = HEAP32[$1805>>2]|0;
  $1807 = ($1806|0)>(-1);
  $1808 = $state;
  if ($1807) {
   $1809 = ((($1808)) + 44|0);
   $1810 = HEAP32[$1809>>2]|0;
   $1816 = $1810;
   $1813 = $state;
   $1814 = ((($1813)) + 40|0);
   $1815 = HEAP32[$1814>>2]|0;
   HEAP32[$vararg_buffer18>>2] = $1803;
   $vararg_ptr21 = ((($vararg_buffer18)) + 4|0);
   HEAP32[$vararg_ptr21>>2] = $1816;
   $vararg_ptr22 = ((($vararg_buffer18)) + 8|0);
   HEAP32[$vararg_ptr22>>2] = $1815;
   (_fprintf($1801,4825,$vararg_buffer18)|0);
   _abort();
   // unreachable;
  } else {
   $1811 = ((($1808)) + 20|0);
   $1812 = HEAP32[$1811>>2]|0;
   $1816 = $1812;
   $1813 = $state;
   $1814 = ((($1813)) + 40|0);
   $1815 = HEAP32[$1814>>2]|0;
   HEAP32[$vararg_buffer18>>2] = $1803;
   $vararg_ptr21 = ((($vararg_buffer18)) + 4|0);
   HEAP32[$vararg_ptr21>>2] = $1816;
   $vararg_ptr22 = ((($vararg_buffer18)) + 8|0);
   HEAP32[$vararg_ptr22>>2] = $1815;
   (_fprintf($1801,4825,$vararg_buffer18)|0);
   _abort();
   // unreachable;
  }
 }
 $1817 = $state;
 $1818 = ((($1817)) + 104|0);
 $1819 = HEAP16[$1818>>1]|0;
 $1820 = ($1819 << 3)&65535;
 $1821 = ($1820<<16>>16) >> 15;
 $1822 = $1821 << 16 >> 16;
 $1823 = ($1822|0)!=(0);
 if ($1823) {
  $1824 = $state;
  $1825 = ((($1824)) + 52|0);
  $1826 = HEAP32[$1825>>2]|0;
  $1827 = ($1826|0)>(-1);
  if ($1827) {
   $1828 = $state;
   $1829 = ((($1828)) + 52|0);
   $1830 = HEAP32[$1829>>2]|0;
   $1844 = $1830;
  } else {
   label = 368;
  }
 } else {
  label = 368;
 }
 if ((label|0) == 368) {
  $1831 = $state;
  $1832 = ((($1831)) + 24|0);
  $1833 = HEAP32[$1832>>2]|0;
  $1844 = $1833;
 }
 $1834 = $state;
 $1835 = ((($1834)) + 104|0);
 $1836 = HEAP16[$1835>>1]|0;
 $1837 = ($1836 << 3)&65535;
 $1838 = ($1837<<16>>16) >> 15;
 $1839 = $1838 << 16 >> 16;
 $1840 = ($1839|0)!=(0);
 if ($1840) {
  $1841 = $state;
  $1842 = ((($1841)) + 48|0);
  $1843 = HEAP32[$1842>>2]|0;
  $1846 = $1843;
 } else {
  $1846 = 0;
 }
 $1845 = ($1844|0)<=($1846|0);
 if (!($1845)) {
  $0 = 1;
  $1879 = $0;
  STACKTOP = sp;return ($1879|0);
 }
 $1847 = HEAP32[3064>>2]|0;
 $1848 = $5;
 $1849 = $1848 << 24 >> 24;
 $1850 = $state;
 $1851 = ((($1850)) + 104|0);
 $1852 = HEAP16[$1851>>1]|0;
 $1853 = ($1852 << 3)&65535;
 $1854 = ($1853<<16>>16) >> 15;
 $1855 = $1854 << 16 >> 16;
 $1856 = ($1855|0)!=(0);
 if ($1856) {
  $1857 = $state;
  $1858 = ((($1857)) + 52|0);
  $1859 = HEAP32[$1858>>2]|0;
  $1860 = ($1859|0)>(-1);
  if ($1860) {
   $1861 = $state;
   $1862 = ((($1861)) + 52|0);
   $1863 = HEAP32[$1862>>2]|0;
   $1877 = $1863;
  } else {
   label = 375;
  }
 } else {
  label = 375;
 }
 if ((label|0) == 375) {
  $1864 = $state;
  $1865 = ((($1864)) + 24|0);
  $1866 = HEAP32[$1865>>2]|0;
  $1877 = $1866;
 }
 $1867 = $state;
 $1868 = ((($1867)) + 104|0);
 $1869 = HEAP16[$1868>>1]|0;
 $1870 = ($1869 << 3)&65535;
 $1871 = ($1870<<16>>16) >> 15;
 $1872 = $1871 << 16 >> 16;
 $1873 = ($1872|0)!=(0);
 if (!($1873)) {
  $1878 = 0;
  HEAP32[$vararg_buffer23>>2] = $1849;
  $vararg_ptr26 = ((($vararg_buffer23)) + 4|0);
  HEAP32[$vararg_ptr26>>2] = $1877;
  $vararg_ptr27 = ((($vararg_buffer23)) + 8|0);
  HEAP32[$vararg_ptr27>>2] = $1878;
  (_fprintf($1847,4884,$vararg_buffer23)|0);
  _abort();
  // unreachable;
 }
 $1874 = $state;
 $1875 = ((($1874)) + 48|0);
 $1876 = HEAP32[$1875>>2]|0;
 $1878 = $1876;
 HEAP32[$vararg_buffer23>>2] = $1849;
 $vararg_ptr26 = ((($vararg_buffer23)) + 4|0);
 HEAP32[$vararg_ptr26>>2] = $1877;
 $vararg_ptr27 = ((($vararg_buffer23)) + 8|0);
 HEAP32[$vararg_ptr27>>2] = $1878;
 (_fprintf($1847,4884,$vararg_buffer23)|0);
 _abort();
 // unreachable;
 return (0)|0;
}
function _is_cursor_in_scrollregion($state) {
 $state = $state|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $state;
 $2 = $1;
 $3 = ((($2)) + 28|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = $1;
 $6 = ((($5)) + 40|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = ($4|0)<($7|0);
 if (!($8)) {
  $9 = $1;
  $10 = ((($9)) + 28|0);
  $11 = HEAP32[$10>>2]|0;
  $12 = $1;
  $13 = ((($12)) + 44|0);
  $14 = HEAP32[$13>>2]|0;
  $15 = ($14|0)>(-1);
  $16 = $1;
  if ($15) {
   $17 = ((($16)) + 44|0);
   $18 = HEAP32[$17>>2]|0;
   $22 = $18;
  } else {
   $19 = ((($16)) + 20|0);
   $20 = HEAP32[$19>>2]|0;
   $22 = $20;
  }
  $21 = ($11|0)>=($22|0);
  if (!($21)) {
   $23 = $1;
   $24 = ((($23)) + 28|0);
   $25 = ((($24)) + 4|0);
   $26 = HEAP32[$25>>2]|0;
   $27 = $1;
   $28 = ((($27)) + 104|0);
   $29 = HEAP16[$28>>1]|0;
   $30 = ($29 << 3)&65535;
   $31 = ($30<<16>>16) >> 15;
   $32 = $31 << 16 >> 16;
   $33 = ($32|0)!=(0);
   if ($33) {
    $34 = $1;
    $35 = ((($34)) + 48|0);
    $36 = HEAP32[$35>>2]|0;
    $38 = $36;
   } else {
    $38 = 0;
   }
   $37 = ($26|0)<($38|0);
   if (!($37)) {
    $39 = $1;
    $40 = ((($39)) + 28|0);
    $41 = ((($40)) + 4|0);
    $42 = HEAP32[$41>>2]|0;
    $43 = $1;
    $44 = ((($43)) + 104|0);
    $45 = HEAP16[$44>>1]|0;
    $46 = ($45 << 3)&65535;
    $47 = ($46<<16>>16) >> 15;
    $48 = $47 << 16 >> 16;
    $49 = ($48|0)!=(0);
    if ($49) {
     $50 = $1;
     $51 = ((($50)) + 52|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = ($52|0)>(-1);
     if ($53) {
      $54 = $1;
      $55 = ((($54)) + 52|0);
      $56 = HEAP32[$55>>2]|0;
      $61 = $56;
     } else {
      label = 13;
     }
    } else {
     label = 13;
    }
    if ((label|0) == 13) {
     $57 = $1;
     $58 = ((($57)) + 24|0);
     $59 = HEAP32[$58>>2]|0;
     $61 = $59;
    }
    $60 = ($42|0)>=($61|0);
    if (!($60)) {
     $0 = 1;
     $62 = $0;
     STACKTOP = sp;return ($62|0);
    }
   }
   $0 = 0;
   $62 = $0;
   STACKTOP = sp;return ($62|0);
  }
 }
 $0 = 0;
 $62 = $0;
 STACKTOP = sp;return ($62|0);
}
function _set_mode($state,$num,$val) {
 $state = $state|0;
 $num = $num|0;
 $val = $val|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $3 = 0, $4 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $0 = $state;
 $1 = $num;
 $2 = $val;
 $3 = $1;
 switch ($3|0) {
 case 4:  {
  $4 = $2;
  $5 = $0;
  $6 = ((($5)) + 104|0);
  $7 = $4&65535;
  $8 = HEAP16[$6>>1]|0;
  $9 = $7 & 1;
  $10 = ($9 << 3)&65535;
  $11 = $8 & -9;
  $12 = $11 | $10;
  HEAP16[$6>>1] = $12;
  STACKTOP = sp;return;
  break;
 }
 case 20:  {
  $13 = $2;
  $14 = $0;
  $15 = ((($14)) + 104|0);
  $16 = $13&65535;
  $17 = HEAP16[$15>>1]|0;
  $18 = $16 & 1;
  $19 = ($18 << 4)&65535;
  $20 = $17 & -17;
  $21 = $20 | $19;
  HEAP16[$15>>1] = $21;
  STACKTOP = sp;return;
  break;
 }
 default: {
  $22 = HEAP32[3064>>2]|0;
  $23 = $1;
  HEAP32[$vararg_buffer>>2] = $23;
  (_fprintf($22,4719,$vararg_buffer)|0);
  STACKTOP = sp;return;
 }
 }
}
function _set_dec_mode($state,$num,$val) {
 $state = $state|0;
 $num = $num|0;
 $val = $val|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0;
 var $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0;
 var $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0;
 var $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0;
 var $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $oldpos = 0, $row = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $oldpos = sp + 8|0;
 $0 = $state;
 $1 = $num;
 $2 = $val;
 $3 = $1;
 do {
  switch ($3|0) {
  case 1:  {
   $4 = $2;
   $5 = $0;
   $6 = ((($5)) + 104|0);
   $7 = $4&65535;
   $8 = HEAP16[$6>>1]|0;
   $9 = $7 & 1;
   $10 = ($9 << 1)&65535;
   $11 = $8 & -3;
   $12 = $11 | $10;
   HEAP16[$6>>1] = $12;
   STACKTOP = sp;return;
   break;
  }
  case 5:  {
   $13 = $0;
   $14 = $2;
   (_settermprop_bool($13,6,$14)|0);
   STACKTOP = sp;return;
   break;
  }
  case 6:  {
   $15 = $0;
   $16 = ((($15)) + 28|0);
   ;HEAP32[$oldpos>>2]=HEAP32[$16>>2]|0;HEAP32[$oldpos+4>>2]=HEAP32[$16+4>>2]|0;
   $17 = $2;
   $18 = $0;
   $19 = ((($18)) + 104|0);
   $20 = $17&65535;
   $21 = HEAP16[$19>>1]|0;
   $22 = $20 & 1;
   $23 = ($22 << 10)&65535;
   $24 = $21 & -1025;
   $25 = $24 | $23;
   HEAP16[$19>>1] = $25;
   $26 = $0;
   $27 = ((($26)) + 104|0);
   $28 = HEAP16[$27>>1]|0;
   $29 = ($28 << 5)&65535;
   $30 = ($29<<16>>16) >> 15;
   $31 = $30 << 16 >> 16;
   $32 = ($31|0)!=(0);
   if ($32) {
    $33 = $0;
    $34 = ((($33)) + 40|0);
    $35 = HEAP32[$34>>2]|0;
    $38 = $35;
   } else {
    $38 = 0;
   }
   $36 = $0;
   $37 = ((($36)) + 28|0);
   HEAP32[$37>>2] = $38;
   $39 = $0;
   $40 = ((($39)) + 104|0);
   $41 = HEAP16[$40>>1]|0;
   $42 = ($41 << 5)&65535;
   $43 = ($42<<16>>16) >> 15;
   $44 = $43 << 16 >> 16;
   $45 = ($44|0)!=(0);
   if ($45) {
    $46 = $0;
    $47 = ((($46)) + 104|0);
    $48 = HEAP16[$47>>1]|0;
    $49 = ($48 << 3)&65535;
    $50 = ($49<<16>>16) >> 15;
    $51 = $50 << 16 >> 16;
    $52 = ($51|0)!=(0);
    if ($52) {
     $53 = $0;
     $54 = ((($53)) + 48|0);
     $55 = HEAP32[$54>>2]|0;
     $59 = $55;
    } else {
     $59 = 0;
    }
   } else {
    $59 = 0;
   }
   $56 = $0;
   $57 = ((($56)) + 28|0);
   $58 = ((($57)) + 4|0);
   HEAP32[$58>>2] = $59;
   $60 = $0;
   _updatecursor($60,$oldpos,1);
   STACKTOP = sp;return;
   break;
  }
  case 7:  {
   $61 = $2;
   $62 = $0;
   $63 = ((($62)) + 104|0);
   $64 = $61&65535;
   $65 = HEAP16[$63>>1]|0;
   $66 = $64 & 1;
   $67 = ($66 << 2)&65535;
   $68 = $65 & -5;
   $69 = $68 | $67;
   HEAP16[$63>>1] = $69;
   STACKTOP = sp;return;
   break;
  }
  case 12:  {
   $70 = $0;
   $71 = $2;
   (_settermprop_bool($70,2,$71)|0);
   STACKTOP = sp;return;
   break;
  }
  case 25:  {
   $72 = $0;
   $73 = $2;
   (_settermprop_bool($72,1,$73)|0);
   STACKTOP = sp;return;
   break;
  }
  case 69:  {
   $74 = $2;
   $75 = $0;
   $76 = ((($75)) + 104|0);
   $77 = $74&65535;
   $78 = HEAP16[$76>>1]|0;
   $79 = $77 & 1;
   $80 = ($79 << 12)&65535;
   $81 = $78 & -4097;
   $82 = $81 | $80;
   HEAP16[$76>>1] = $82;
   $83 = $2;
   $84 = ($83|0)!=(0);
   if (!($84)) {
    STACKTOP = sp;return;
   }
   $row = 0;
   while(1) {
    $85 = $row;
    $86 = $0;
    $87 = ((($86)) + 20|0);
    $88 = HEAP32[$87>>2]|0;
    $89 = ($85|0)<($88|0);
    if (!($89)) {
     break;
    }
    $90 = $0;
    $91 = $row;
    _set_lineinfo($90,$91,1,0,0);
    $92 = $row;
    $93 = (($92) + 1)|0;
    $row = $93;
   }
   STACKTOP = sp;return;
   break;
  }
  case 1003: case 1002: case 1000:  {
   $94 = $2;
   $95 = ($94|0)!=(0);
   $96 = $0;
   if (!($95)) {
    (_settermprop_int($96,8,0)|0);
    STACKTOP = sp;return;
   }
   $97 = ((($96)) + 64|0);
   HEAP32[$97>>2] = 0;
   $98 = $0;
   $99 = ((($98)) + 68|0);
   HEAP32[$99>>2] = 0;
   $100 = $0;
   $101 = ((($100)) + 72|0);
   HEAP32[$101>>2] = 0;
   $102 = $0;
   $103 = ((($102)) + 80|0);
   HEAP32[$103>>2] = 0;
   $104 = $0;
   $105 = $1;
   $106 = ($105|0)==(1000);
   if ($106) {
    $110 = 1;
   } else {
    $107 = $1;
    $108 = ($107|0)==(1002);
    $109 = $108 ? 2 : 3;
    $110 = $109;
   }
   (_settermprop_int($104,8,$110)|0);
   STACKTOP = sp;return;
   break;
  }
  case 1005:  {
   $111 = $2;
   $112 = ($111|0)!=(0);
   $113 = $112 ? 1 : 0;
   $114 = $0;
   $115 = ((($114)) + 80|0);
   HEAP32[$115>>2] = $113;
   STACKTOP = sp;return;
   break;
  }
  case 1006:  {
   $116 = $2;
   $117 = ($116|0)!=(0);
   $118 = $117 ? 2 : 0;
   $119 = $0;
   $120 = ((($119)) + 80|0);
   HEAP32[$120>>2] = $118;
   STACKTOP = sp;return;
   break;
  }
  case 1015:  {
   $121 = $2;
   $122 = ($121|0)!=(0);
   $123 = $122 ? 3 : 0;
   $124 = $0;
   $125 = ((($124)) + 80|0);
   HEAP32[$125>>2] = $123;
   STACKTOP = sp;return;
   break;
  }
  case 1047:  {
   $126 = $0;
   $127 = $2;
   (_settermprop_bool($126,3,$127)|0);
   STACKTOP = sp;return;
   break;
  }
  case 1048:  {
   $128 = $0;
   $129 = $2;
   _savecursor($128,$129);
   STACKTOP = sp;return;
   break;
  }
  case 1049:  {
   $130 = $0;
   $131 = $2;
   (_settermprop_bool($130,3,$131)|0);
   $132 = $0;
   $133 = $2;
   _savecursor($132,$133);
   STACKTOP = sp;return;
   break;
  }
  case 2004:  {
   $134 = $2;
   $135 = $0;
   $136 = ((($135)) + 104|0);
   $137 = $134&65535;
   $138 = HEAP16[$136>>1]|0;
   $139 = $137 & 1;
   $140 = ($139 << 13)&65535;
   $141 = $138 & -8193;
   $142 = $141 | $140;
   HEAP16[$136>>1] = $142;
   STACKTOP = sp;return;
   break;
  }
  default: {
   $143 = HEAP32[3064>>2]|0;
   $144 = $1;
   HEAP32[$vararg_buffer>>2] = $144;
   (_fprintf($143,4688,$vararg_buffer)|0);
   STACKTOP = sp;return;
  }
  }
 } while(0);
}
function _request_dec_mode($state,$num) {
 $state = $state|0;
 $num = $num|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $reply = 0, $vararg_buffer = 0, $vararg_buffer2 = 0, $vararg_ptr1 = 0;
 var $vararg_ptr5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer2 = sp + 8|0;
 $vararg_buffer = sp;
 $0 = $state;
 $1 = $num;
 $2 = $1;
 do {
  switch ($2|0) {
  case 1:  {
   $3 = $0;
   $4 = ((($3)) + 104|0);
   $5 = HEAP16[$4>>1]|0;
   $6 = ($5 << 14)&65535;
   $7 = ($6<<16>>16) >> 15;
   $8 = $7 << 16 >> 16;
   $reply = $8;
   label = 18;
   break;
  }
  case 5:  {
   $9 = $0;
   $10 = ((($9)) + 104|0);
   $11 = HEAP16[$10>>1]|0;
   $12 = ($11 << 4)&65535;
   $13 = ($12<<16>>16) >> 15;
   $14 = $13 << 16 >> 16;
   $reply = $14;
   label = 18;
   break;
  }
  case 6:  {
   $15 = $0;
   $16 = ((($15)) + 104|0);
   $17 = HEAP16[$16>>1]|0;
   $18 = ($17 << 5)&65535;
   $19 = ($18<<16>>16) >> 15;
   $20 = $19 << 16 >> 16;
   $reply = $20;
   label = 18;
   break;
  }
  case 7:  {
   $21 = $0;
   $22 = ((($21)) + 104|0);
   $23 = HEAP16[$22>>1]|0;
   $24 = ($23 << 13)&65535;
   $25 = ($24<<16>>16) >> 15;
   $26 = $25 << 16 >> 16;
   $reply = $26;
   label = 18;
   break;
  }
  case 12:  {
   $27 = $0;
   $28 = ((($27)) + 104|0);
   $29 = HEAP16[$28>>1]|0;
   $30 = ($29 << 9)&65535;
   $31 = ($30<<16>>16) >> 15;
   $32 = $31 << 16 >> 16;
   $reply = $32;
   label = 18;
   break;
  }
  case 25:  {
   $33 = $0;
   $34 = ((($33)) + 104|0);
   $35 = HEAP16[$34>>1]|0;
   $36 = ($35 << 10)&65535;
   $37 = ($36<<16>>16) >> 15;
   $38 = $37 << 16 >> 16;
   $reply = $38;
   label = 18;
   break;
  }
  case 69:  {
   $39 = $0;
   $40 = ((($39)) + 104|0);
   $41 = HEAP16[$40>>1]|0;
   $42 = ($41 << 3)&65535;
   $43 = ($42<<16>>16) >> 15;
   $44 = $43 << 16 >> 16;
   $reply = $44;
   label = 18;
   break;
  }
  case 1000:  {
   $45 = $0;
   $46 = ((($45)) + 76|0);
   $47 = HEAP32[$46>>2]|0;
   $48 = ($47|0)==(1);
   $49 = $48&1;
   $reply = $49;
   label = 18;
   break;
  }
  case 1002:  {
   $50 = $0;
   $51 = ((($50)) + 76|0);
   $52 = HEAP32[$51>>2]|0;
   $53 = ($52|0)==(3);
   $54 = $53&1;
   $reply = $54;
   label = 18;
   break;
  }
  case 1003:  {
   $55 = $0;
   $56 = ((($55)) + 76|0);
   $57 = HEAP32[$56>>2]|0;
   $58 = ($57|0)==(5);
   $59 = $58&1;
   $reply = $59;
   label = 18;
   break;
  }
  case 1005:  {
   $60 = $0;
   $61 = ((($60)) + 80|0);
   $62 = HEAP32[$61>>2]|0;
   $63 = ($62|0)==(1);
   $64 = $63&1;
   $reply = $64;
   label = 18;
   break;
  }
  case 1006:  {
   $65 = $0;
   $66 = ((($65)) + 80|0);
   $67 = HEAP32[$66>>2]|0;
   $68 = ($67|0)==(2);
   $69 = $68&1;
   $reply = $69;
   label = 18;
   break;
  }
  case 1015:  {
   $70 = $0;
   $71 = ((($70)) + 80|0);
   $72 = HEAP32[$71>>2]|0;
   $73 = ($72|0)==(3);
   $74 = $73&1;
   $reply = $74;
   label = 18;
   break;
  }
  case 1047:  {
   $75 = $0;
   $76 = ((($75)) + 104|0);
   $77 = HEAP16[$76>>1]|0;
   $78 = ($77 << 6)&65535;
   $79 = ($78<<16>>16) >> 15;
   $80 = $79 << 16 >> 16;
   $reply = $80;
   label = 18;
   break;
  }
  case 2004:  {
   $81 = $0;
   $82 = ((($81)) + 104|0);
   $83 = HEAP16[$82>>1]|0;
   $84 = ($83 << 2)&65535;
   $85 = ($84<<16>>16) >> 15;
   $86 = $85 << 16 >> 16;
   $reply = $86;
   label = 17;
   break;
  }
  default: {
   label = 17;
  }
  }
 } while(0);
 if ((label|0) == 17) {
  $87 = $0;
  $88 = HEAP32[$87>>2]|0;
  $89 = $1;
  HEAP32[$vararg_buffer>>2] = $89;
  $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
  HEAP32[$vararg_ptr1>>2] = 0;
  _vterm_push_output_sprintf_ctrl($88,-101,4679,$vararg_buffer);
  STACKTOP = sp;return;
 }
 else if ((label|0) == 18) {
  $90 = $0;
  $91 = HEAP32[$90>>2]|0;
  $92 = $1;
  $93 = $reply;
  $94 = ($93|0)!=(0);
  $95 = $94 ? 1 : 2;
  HEAP32[$vararg_buffer2>>2] = $92;
  $vararg_ptr5 = ((($vararg_buffer2)) + 4|0);
  HEAP32[$vararg_ptr5>>2] = $95;
  _vterm_push_output_sprintf_ctrl($91,-101,4679,$vararg_buffer2);
  STACKTOP = sp;return;
 }
}
function _on_osc($command,$cmdlen,$user) {
 $command = $command|0;
 $cmdlen = $cmdlen|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $state = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $command;
 $2 = $cmdlen;
 $3 = $user;
 $4 = $3;
 $state = $4;
 $5 = $2;
 $6 = ($5>>>0)<(2);
 if ($6) {
  $0 = 0;
  $57 = $0;
  STACKTOP = sp;return ($57|0);
 }
 $7 = $1;
 $8 = (_strncmp($7,4670,2)|0);
 $9 = ($8|0)==(0);
 if ($9) {
  $10 = $state;
  $11 = $1;
  $12 = ((($11)) + 2|0);
  $13 = $2;
  $14 = (($13) - 2)|0;
  (_settermprop_string($10,5,$12,$14)|0);
  $15 = $state;
  $16 = $1;
  $17 = ((($16)) + 2|0);
  $18 = $2;
  $19 = (($18) - 2)|0;
  (_settermprop_string($15,4,$17,$19)|0);
  $0 = 1;
  $57 = $0;
  STACKTOP = sp;return ($57|0);
 }
 $20 = $1;
 $21 = (_strncmp($20,4673,2)|0);
 $22 = ($21|0)==(0);
 if ($22) {
  $23 = $state;
  $24 = $1;
  $25 = ((($24)) + 2|0);
  $26 = $2;
  $27 = (($26) - 2)|0;
  (_settermprop_string($23,5,$25,$27)|0);
  $0 = 1;
  $57 = $0;
  STACKTOP = sp;return ($57|0);
 }
 $28 = $1;
 $29 = (_strncmp($28,4676,2)|0);
 $30 = ($29|0)==(0);
 $31 = $state;
 if ($30) {
  $32 = $1;
  $33 = ((($32)) + 2|0);
  $34 = $2;
  $35 = (($34) - 2)|0;
  (_settermprop_string($31,4,$33,$35)|0);
  $0 = 1;
  $57 = $0;
  STACKTOP = sp;return ($57|0);
 }
 $36 = ((($31)) + 12|0);
 $37 = HEAP32[$36>>2]|0;
 $38 = ($37|0)!=(0|0);
 if ($38) {
  $39 = $state;
  $40 = ((($39)) + 12|0);
  $41 = HEAP32[$40>>2]|0;
  $42 = ((($41)) + 16|0);
  $43 = HEAP32[$42>>2]|0;
  $44 = ($43|0)!=(0|0);
  if ($44) {
   $45 = $state;
   $46 = ((($45)) + 12|0);
   $47 = HEAP32[$46>>2]|0;
   $48 = ((($47)) + 16|0);
   $49 = HEAP32[$48>>2]|0;
   $50 = $1;
   $51 = $2;
   $52 = $state;
   $53 = ((($52)) + 16|0);
   $54 = HEAP32[$53>>2]|0;
   $55 = (FUNCTION_TABLE_iiii[$49 & 31]($50,$51,$54)|0);
   $56 = ($55|0)!=(0);
   if ($56) {
    $0 = 1;
    $57 = $0;
    STACKTOP = sp;return ($57|0);
   }
  }
 }
 $0 = 0;
 $57 = $0;
 STACKTOP = sp;return ($57|0);
}
function _settermprop_string($state,$prop,$str,$len) {
 $state = $state|0;
 $prop = $prop|0;
 $str = $str|0;
 $len = $len|0;
 var $$alloca_mul = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $val = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $val = sp + 4|0;
 $0 = $state;
 $1 = $prop;
 $2 = $str;
 $3 = $len;
 $6 = $3;
 $7 = (($6) + 1)|0;
 $8 = (_llvm_stacksave()|0);
 $4 = $8;
 $$alloca_mul = $7;
 $9 = STACKTOP; STACKTOP = STACKTOP + ((((1*$$alloca_mul)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $10 = $2;
 $11 = $3;
 (_strncpy($9,$10,$11)|0);
 $12 = $3;
 $13 = (($9) + ($12)|0);
 HEAP8[$13>>0] = 0;
 HEAP32[$val>>2] = $9;
 $14 = $0;
 $15 = $1;
 $16 = (_vterm_state_set_termprop($14,$15,$val)|0);
 $5 = 1;
 $17 = $4;
 _llvm_stackrestore(($17|0));
 STACKTOP = sp;return ($16|0);
}
function _on_dcs($command,$cmdlen,$user) {
 $command = $command|0;
 $cmdlen = $cmdlen|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $state = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $command;
 $2 = $cmdlen;
 $3 = $user;
 $4 = $3;
 $state = $4;
 $5 = $2;
 $6 = ($5>>>0)>=(2);
 if ($6) {
  $7 = $1;
  $8 = (_strncmp($7,4667,2)|0);
  $9 = ($8|0)==(0);
  if ($9) {
   $10 = $state;
   $11 = $1;
   $12 = ((($11)) + 2|0);
   $13 = $2;
   $14 = (($13) - 2)|0;
   _request_status_string($10,$12,$14);
   $0 = 1;
   $37 = $0;
   STACKTOP = sp;return ($37|0);
  }
 }
 $15 = $state;
 $16 = ((($15)) + 12|0);
 $17 = HEAP32[$16>>2]|0;
 $18 = ($17|0)!=(0|0);
 if ($18) {
  $19 = $state;
  $20 = ((($19)) + 12|0);
  $21 = HEAP32[$20>>2]|0;
  $22 = ((($21)) + 20|0);
  $23 = HEAP32[$22>>2]|0;
  $24 = ($23|0)!=(0|0);
  if ($24) {
   $25 = $state;
   $26 = ((($25)) + 12|0);
   $27 = HEAP32[$26>>2]|0;
   $28 = ((($27)) + 20|0);
   $29 = HEAP32[$28>>2]|0;
   $30 = $1;
   $31 = $2;
   $32 = $state;
   $33 = ((($32)) + 16|0);
   $34 = HEAP32[$33>>2]|0;
   $35 = (FUNCTION_TABLE_iiii[$29 & 31]($30,$31,$34)|0);
   $36 = ($35|0)!=(0);
   if ($36) {
    $0 = 1;
    $37 = $0;
    STACKTOP = sp;return ($37|0);
   }
  }
 }
 $0 = 0;
 $37 = $0;
 STACKTOP = sp;return ($37|0);
}
function _request_status_string($state,$command,$cmdlen) {
 $state = $state|0;
 $command = $command|0;
 $cmdlen = $cmdlen|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0;
 var $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0;
 var $97 = 0, $98 = 0, $99 = 0, $argc = 0, $argi = 0, $args = 0, $reply = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer11 = 0, $vararg_buffer15 = 0, $vararg_buffer18 = 0, $vararg_buffer21 = 0, $vararg_buffer3 = 0, $vararg_buffer5 = 0, $vararg_buffer7 = 0, $vararg_ptr10 = 0, $vararg_ptr14 = 0, $vararg_ptr24 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 192|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer21 = sp + 64|0;
 $vararg_buffer18 = sp + 56|0;
 $vararg_buffer15 = sp + 48|0;
 $vararg_buffer11 = sp + 40|0;
 $vararg_buffer7 = sp + 32|0;
 $vararg_buffer5 = sp + 24|0;
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer1 = sp + 8|0;
 $vararg_buffer = sp;
 $args = sp + 88|0;
 $0 = $state;
 $1 = $command;
 $2 = $cmdlen;
 $3 = $2;
 $4 = ($3|0)==(1);
 L1: do {
  if ($4) {
   $5 = $1;
   $6 = HEAP8[$5>>0]|0;
   $7 = $6 << 24 >> 24;
   switch ($7|0) {
   case 109:  {
    $8 = $0;
    $9 = (_vterm_state_getpen($8,$args,20)|0);
    $argc = $9;
    $10 = $0;
    $11 = HEAP32[$10>>2]|0;
    _vterm_push_output_sprintf_ctrl($11,-112,4601,$vararg_buffer);
    $argi = 0;
    while(1) {
     $12 = $argi;
     $13 = $argc;
     $14 = ($12|0)<($13|0);
     $15 = $0;
     $16 = HEAP32[$15>>2]|0;
     if (!($14)) {
      break;
     }
     $17 = $argi;
     $18 = $argc;
     $19 = (($18) - 1)|0;
     $20 = ($17|0)==($19|0);
     if ($20) {
      $31 = 4613;
     } else {
      $21 = $argi;
      $22 = (($args) + ($21<<2)|0);
      $23 = HEAP32[$22>>2]|0;
      $24 = $23 & -2147483648;
      $25 = ($24|0)!=(0);
      $26 = $25 ? 4605 : 4609;
      $31 = $26;
     }
     $27 = $argi;
     $28 = (($args) + ($27<<2)|0);
     $29 = HEAP32[$28>>2]|0;
     $30 = $29 & 2147483647;
     HEAP32[$vararg_buffer1>>2] = $30;
     _vterm_push_output_sprintf($16,$31,$vararg_buffer1);
     $32 = $argi;
     $33 = (($32) + 1)|0;
     $argi = $33;
    }
    _vterm_push_output_sprintf($16,4616,$vararg_buffer3);
    $34 = $0;
    $35 = HEAP32[$34>>2]|0;
    _vterm_push_output_sprintf_ctrl($35,-100,5238,$vararg_buffer5);
    STACKTOP = sp;return;
    break;
   }
   case 114:  {
    $36 = $0;
    $37 = HEAP32[$36>>2]|0;
    $38 = $0;
    $39 = ((($38)) + 40|0);
    $40 = HEAP32[$39>>2]|0;
    $41 = (($40) + 1)|0;
    $42 = $0;
    $43 = ((($42)) + 44|0);
    $44 = HEAP32[$43>>2]|0;
    $45 = ($44|0)>(-1);
    $46 = $0;
    if ($45) {
     $47 = ((($46)) + 44|0);
     $48 = HEAP32[$47>>2]|0;
     $51 = $48;
    } else {
     $49 = ((($46)) + 20|0);
     $50 = HEAP32[$49>>2]|0;
     $51 = $50;
    }
    HEAP32[$vararg_buffer7>>2] = $41;
    $vararg_ptr10 = ((($vararg_buffer7)) + 4|0);
    HEAP32[$vararg_ptr10>>2] = $51;
    _vterm_push_output_sprintf_dcs($37,4618,$vararg_buffer7);
    STACKTOP = sp;return;
    break;
   }
   case 115:  {
    $52 = $0;
    $53 = HEAP32[$52>>2]|0;
    $54 = $0;
    $55 = ((($54)) + 104|0);
    $56 = HEAP16[$55>>1]|0;
    $57 = ($56 << 3)&65535;
    $58 = ($57<<16>>16) >> 15;
    $59 = $58 << 16 >> 16;
    $60 = ($59|0)!=(0);
    if ($60) {
     $61 = $0;
     $62 = ((($61)) + 48|0);
     $63 = HEAP32[$62>>2]|0;
     $65 = $63;
    } else {
     $65 = 0;
    }
    $64 = (($65) + 1)|0;
    $66 = $0;
    $67 = ((($66)) + 104|0);
    $68 = HEAP16[$67>>1]|0;
    $69 = ($68 << 3)&65535;
    $70 = ($69<<16>>16) >> 15;
    $71 = $70 << 16 >> 16;
    $72 = ($71|0)!=(0);
    if ($72) {
     $73 = $0;
     $74 = ((($73)) + 52|0);
     $75 = HEAP32[$74>>2]|0;
     $76 = ($75|0)>(-1);
     if ($76) {
      $77 = $0;
      $78 = ((($77)) + 52|0);
      $79 = HEAP32[$78>>2]|0;
      $83 = $79;
     } else {
      label = 18;
     }
    } else {
     label = 18;
    }
    if ((label|0) == 18) {
     $80 = $0;
     $81 = ((($80)) + 24|0);
     $82 = HEAP32[$81>>2]|0;
     $83 = $82;
    }
    HEAP32[$vararg_buffer11>>2] = $64;
    $vararg_ptr14 = ((($vararg_buffer11)) + 4|0);
    HEAP32[$vararg_ptr14>>2] = $83;
    _vterm_push_output_sprintf_dcs($53,4628,$vararg_buffer11);
    STACKTOP = sp;return;
    break;
   }
   default: {
    break L1;
   }
   }
  }
 } while(0);
 $84 = $2;
 $85 = ($84|0)==(2);
 do {
  if ($85) {
   $86 = $1;
   $87 = (_strncmp($86,4638,2)|0);
   $88 = ($87|0)==(0);
   if (!($88)) {
    $107 = $1;
    $108 = (_strncmp($107,4649,2)|0);
    $109 = ($108|0)==(0);
    if (!($109)) {
     break;
    }
    $110 = $0;
    $111 = HEAP32[$110>>2]|0;
    $112 = $0;
    $113 = ((($112)) + 296|0);
    $114 = HEAP8[$113>>0]|0;
    $115 = $114 & 1;
    $116 = $115&255;
    $117 = ($116|0)!=(0);
    $118 = $117 ? 1 : 2;
    HEAP32[$vararg_buffer18>>2] = $118;
    _vterm_push_output_sprintf_dcs($111,4652,$vararg_buffer18);
    STACKTOP = sp;return;
   }
   $89 = $0;
   $90 = ((($89)) + 104|0);
   $91 = HEAP16[$90>>1]|0;
   $92 = ($91&65535) >>> 7;
   $93 = $92 & 3;
   $94 = $93&65535;
   switch ($94|0) {
   case 1:  {
    $reply = 2;
    break;
   }
   case 2:  {
    $reply = 4;
    break;
   }
   case 3:  {
    $reply = 6;
    break;
   }
   default: {
   }
   }
   $95 = $0;
   $96 = ((($95)) + 104|0);
   $97 = HEAP16[$96>>1]|0;
   $98 = ($97 << 9)&65535;
   $99 = ($98<<16>>16) >> 15;
   $100 = $99 << 16 >> 16;
   $101 = ($100|0)!=(0);
   if ($101) {
    $102 = $reply;
    $103 = (($102) + -1)|0;
    $reply = $103;
   }
   $104 = $0;
   $105 = HEAP32[$104>>2]|0;
   $106 = $reply;
   HEAP32[$vararg_buffer15>>2] = $106;
   _vterm_push_output_sprintf_dcs($105,4641,$vararg_buffer15);
   STACKTOP = sp;return;
  }
 } while(0);
 $119 = $0;
 $120 = HEAP32[$119>>2]|0;
 $121 = $2;
 $122 = $1;
 HEAP32[$vararg_buffer21>>2] = $121;
 $vararg_ptr24 = ((($vararg_buffer21)) + 4|0);
 HEAP32[$vararg_ptr24>>2] = $122;
 _vterm_push_output_sprintf_dcs($120,4660,$vararg_buffer21);
 STACKTOP = sp;return;
}
function _on_resize($rows,$cols,$user) {
 $rows = $rows|0;
 $cols = $cols|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0;
 var $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0;
 var $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $col = 0;
 var $delta = 0, $mask = 0, $mask1 = 0, $newlineinfo = 0, $newtabstops = 0, $oldpos = 0, $row = 0, $state = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $oldpos = sp + 32|0;
 $3 = sp + 8|0;
 $delta = sp;
 $0 = $rows;
 $1 = $cols;
 $2 = $user;
 $4 = $2;
 $state = $4;
 $5 = $state;
 $6 = ((($5)) + 28|0);
 ;HEAP32[$oldpos>>2]=HEAP32[$6>>2]|0;HEAP32[$oldpos+4>>2]=HEAP32[$6+4>>2]|0;
 $7 = $1;
 $8 = $state;
 $9 = ((($8)) + 24|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = ($7|0)!=($10|0);
 if ($11) {
  $12 = $state;
  $13 = HEAP32[$12>>2]|0;
  $14 = $1;
  $15 = (($14) + 7)|0;
  $16 = (($15|0) / 8)&-1;
  $17 = (_vterm_allocator_malloc($13,$16)|0);
  $newtabstops = $17;
  $col = 0;
  while(1) {
   $18 = $col;
   $19 = $state;
   $20 = ((($19)) + 24|0);
   $21 = HEAP32[$20>>2]|0;
   $22 = ($18|0)<($21|0);
   if (!($22)) {
    break;
   }
   $23 = $col;
   $24 = $1;
   $25 = ($23|0)<($24|0);
   if (!($25)) {
    break;
   }
   $26 = $col;
   $27 = $26 & 7;
   $28 = 1 << $27;
   $29 = $28&255;
   $mask = $29;
   $30 = $col;
   $31 = $30 >> 3;
   $32 = $state;
   $33 = ((($32)) + 56|0);
   $34 = HEAP32[$33>>2]|0;
   $35 = (($34) + ($31)|0);
   $36 = HEAP8[$35>>0]|0;
   $37 = $36&255;
   $38 = $mask;
   $39 = $38&255;
   $40 = $37 & $39;
   $41 = ($40|0)!=(0);
   $42 = $mask;
   $43 = $42&255;
   if ($41) {
    $44 = $col;
    $45 = $44 >> 3;
    $46 = $newtabstops;
    $47 = (($46) + ($45)|0);
    $48 = HEAP8[$47>>0]|0;
    $49 = $48&255;
    $50 = $49 | $43;
    $51 = $50&255;
    HEAP8[$47>>0] = $51;
   } else {
    $52 = $43 ^ -1;
    $53 = $col;
    $54 = $53 >> 3;
    $55 = $newtabstops;
    $56 = (($55) + ($54)|0);
    $57 = HEAP8[$56>>0]|0;
    $58 = $57&255;
    $59 = $58 & $52;
    $60 = $59&255;
    HEAP8[$56>>0] = $60;
   }
   $61 = $col;
   $62 = (($61) + 1)|0;
   $col = $62;
  }
  while(1) {
   $63 = $col;
   $64 = $1;
   $65 = ($63|0)<($64|0);
   if (!($65)) {
    break;
   }
   $66 = $col;
   $67 = $66 & 7;
   $68 = 1 << $67;
   $69 = $68&255;
   $mask1 = $69;
   $70 = $col;
   $71 = (($70|0) % 8)&-1;
   $72 = ($71|0)==(0);
   $73 = $mask1;
   $74 = $73&255;
   if ($72) {
    $75 = $col;
    $76 = $75 >> 3;
    $77 = $newtabstops;
    $78 = (($77) + ($76)|0);
    $79 = HEAP8[$78>>0]|0;
    $80 = $79&255;
    $81 = $80 | $74;
    $82 = $81&255;
    HEAP8[$78>>0] = $82;
   } else {
    $83 = $74 ^ -1;
    $84 = $col;
    $85 = $84 >> 3;
    $86 = $newtabstops;
    $87 = (($86) + ($85)|0);
    $88 = HEAP8[$87>>0]|0;
    $89 = $88&255;
    $90 = $89 & $83;
    $91 = $90&255;
    HEAP8[$87>>0] = $91;
   }
   $92 = $col;
   $93 = (($92) + 1)|0;
   $col = $93;
  }
  $94 = $state;
  $95 = HEAP32[$94>>2]|0;
  $96 = $state;
  $97 = ((($96)) + 56|0);
  $98 = HEAP32[$97>>2]|0;
  _vterm_allocator_free($95,$98);
  $99 = $newtabstops;
  $100 = $state;
  $101 = ((($100)) + 56|0);
  HEAP32[$101>>2] = $99;
 }
 $102 = $0;
 $103 = $state;
 $104 = ((($103)) + 20|0);
 $105 = HEAP32[$104>>2]|0;
 $106 = ($102|0)!=($105|0);
 if ($106) {
  $107 = $state;
  $108 = HEAP32[$107>>2]|0;
  $109 = $0;
  $110 = $109<<2;
  $111 = (_vterm_allocator_malloc($108,$110)|0);
  $newlineinfo = $111;
  $row = 0;
  while(1) {
   $112 = $row;
   $113 = $state;
   $114 = ((($113)) + 20|0);
   $115 = HEAP32[$114>>2]|0;
   $116 = ($112|0)<($115|0);
   if (!($116)) {
    break;
   }
   $117 = $row;
   $118 = $0;
   $119 = ($117|0)<($118|0);
   if (!($119)) {
    break;
   }
   $120 = $row;
   $121 = $newlineinfo;
   $122 = (($121) + ($120<<2)|0);
   $123 = $row;
   $124 = $state;
   $125 = ((($124)) + 60|0);
   $126 = HEAP32[$125>>2]|0;
   $127 = (($126) + ($123<<2)|0);
   ;HEAP32[$122>>2]=HEAP32[$127>>2]|0;
   $128 = $row;
   $129 = (($128) + 1)|0;
   $row = $129;
  }
  while(1) {
   $130 = $row;
   $131 = $0;
   $132 = ($130|0)<($131|0);
   if (!($132)) {
    break;
   }
   $133 = $row;
   $134 = $newlineinfo;
   $135 = (($134) + ($133<<2)|0);
   $136 = HEAP8[$3>>0]|0;
   $137 = $136 & -2;
   HEAP8[$3>>0] = $137;
   $138 = HEAP8[$3>>0]|0;
   $139 = $138 & -7;
   HEAP8[$3>>0] = $139;
   ;HEAP32[$135>>2]=HEAP32[$3>>2]|0;
   $140 = $row;
   $141 = (($140) + 1)|0;
   $row = $141;
  }
  $142 = $state;
  $143 = HEAP32[$142>>2]|0;
  $144 = $state;
  $145 = ((($144)) + 60|0);
  $146 = HEAP32[$145>>2]|0;
  _vterm_allocator_free($143,$146);
  $147 = $newlineinfo;
  $148 = $state;
  $149 = ((($148)) + 60|0);
  HEAP32[$149>>2] = $147;
 }
 $150 = $0;
 $151 = $state;
 $152 = ((($151)) + 20|0);
 HEAP32[$152>>2] = $150;
 $153 = $1;
 $154 = $state;
 $155 = ((($154)) + 24|0);
 HEAP32[$155>>2] = $153;
 $156 = $state;
 $157 = ((($156)) + 44|0);
 $158 = HEAP32[$157>>2]|0;
 $159 = ($158|0)>(-1);
 if ($159) {
  $160 = $state;
  $161 = ((($160)) + 44|0);
  $162 = HEAP32[$161>>2]|0;
  $163 = $state;
  $164 = ((($163)) + 20|0);
  $165 = HEAP32[$164>>2]|0;
  $166 = ($162|0)>($165|0);
  if ($166) {
   $167 = $state;
   $168 = ((($167)) + 20|0);
   $169 = HEAP32[$168>>2]|0;
   $170 = $state;
   $171 = ((($170)) + 44|0);
   HEAP32[$171>>2] = $169;
  }
 }
 $172 = $state;
 $173 = ((($172)) + 52|0);
 $174 = HEAP32[$173>>2]|0;
 $175 = ($174|0)>(-1);
 if ($175) {
  $176 = $state;
  $177 = ((($176)) + 52|0);
  $178 = HEAP32[$177>>2]|0;
  $179 = $state;
  $180 = ((($179)) + 24|0);
  $181 = HEAP32[$180>>2]|0;
  $182 = ($178|0)>($181|0);
  if ($182) {
   $183 = $state;
   $184 = ((($183)) + 24|0);
   $185 = HEAP32[$184>>2]|0;
   $186 = $state;
   $187 = ((($186)) + 52|0);
   HEAP32[$187>>2] = $185;
  }
 }
 ;HEAP32[$delta>>2]=0|0;HEAP32[$delta+4>>2]=0|0;
 $188 = $state;
 $189 = ((($188)) + 4|0);
 $190 = HEAP32[$189>>2]|0;
 $191 = ($190|0)!=(0|0);
 if ($191) {
  $192 = $state;
  $193 = ((($192)) + 4|0);
  $194 = HEAP32[$193>>2]|0;
  $195 = ((($194)) + 36|0);
  $196 = HEAP32[$195>>2]|0;
  $197 = ($196|0)!=(0|0);
  if ($197) {
   $198 = $state;
   $199 = ((($198)) + 4|0);
   $200 = HEAP32[$199>>2]|0;
   $201 = ((($200)) + 36|0);
   $202 = HEAP32[$201>>2]|0;
   $203 = $0;
   $204 = $1;
   $205 = $state;
   $206 = ((($205)) + 8|0);
   $207 = HEAP32[$206>>2]|0;
   (FUNCTION_TABLE_iiiii[$202 & 15]($203,$204,$delta,$207)|0);
  }
 }
 $208 = $state;
 $209 = ((($208)) + 36|0);
 $210 = HEAP32[$209>>2]|0;
 $211 = ($210|0)!=(0);
 if ($211) {
  $212 = $state;
  $213 = ((($212)) + 28|0);
  $214 = ((($213)) + 4|0);
  $215 = HEAP32[$214>>2]|0;
  $216 = $1;
  $217 = (($216) - 1)|0;
  $218 = ($215|0)<($217|0);
  if ($218) {
   $219 = $state;
   $220 = ((($219)) + 36|0);
   HEAP32[$220>>2] = 0;
   $221 = $state;
   $222 = ((($221)) + 28|0);
   $223 = ((($222)) + 4|0);
   $224 = HEAP32[$223>>2]|0;
   $225 = (($224) + 1)|0;
   HEAP32[$223>>2] = $225;
  }
 }
 $226 = HEAP32[$delta>>2]|0;
 $227 = $state;
 $228 = ((($227)) + 28|0);
 $229 = HEAP32[$228>>2]|0;
 $230 = (($229) + ($226))|0;
 HEAP32[$228>>2] = $230;
 $231 = ((($delta)) + 4|0);
 $232 = HEAP32[$231>>2]|0;
 $233 = $state;
 $234 = ((($233)) + 28|0);
 $235 = ((($234)) + 4|0);
 $236 = HEAP32[$235>>2]|0;
 $237 = (($236) + ($232))|0;
 HEAP32[$235>>2] = $237;
 $238 = $state;
 $239 = ((($238)) + 28|0);
 $240 = HEAP32[$239>>2]|0;
 $241 = $0;
 $242 = ($240|0)>=($241|0);
 if ($242) {
  $243 = $0;
  $244 = (($243) - 1)|0;
  $245 = $state;
  $246 = ((($245)) + 28|0);
  HEAP32[$246>>2] = $244;
 }
 $247 = $state;
 $248 = ((($247)) + 28|0);
 $249 = ((($248)) + 4|0);
 $250 = HEAP32[$249>>2]|0;
 $251 = $1;
 $252 = ($250|0)>=($251|0);
 if (!($252)) {
  $258 = $state;
  _updatecursor($258,$oldpos,1);
  STACKTOP = sp;return 1;
 }
 $253 = $1;
 $254 = (($253) - 1)|0;
 $255 = $state;
 $256 = ((($255)) + 28|0);
 $257 = ((($256)) + 4|0);
 HEAP32[$257>>2] = $254;
 $258 = $state;
 _updatecursor($258,$oldpos,1);
 STACKTOP = sp;return 1;
}
function _vterm_unicode_width($codepoint) {
 $codepoint = $codepoint|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $codepoint;
 $1 = $0;
 $2 = (_mk_wcwidth($1)|0);
 STACKTOP = sp;return ($2|0);
}
function _vterm_unicode_is_combining($codepoint) {
 $codepoint = $codepoint|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $codepoint;
 $1 = $0;
 $2 = (_bisearch($1,1876,141)|0);
 STACKTOP = sp;return ($2|0);
}
function _mk_wcwidth($ucs) {
 $ucs = $ucs|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond11 = 0, $or$cond13 = 0, $or$cond15 = 0, $or$cond17 = 0, $or$cond19 = 0, $or$cond21 = 0, $or$cond23 = 0, $or$cond3 = 0, $or$cond5 = 0, $or$cond7 = 0, $or$cond9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $ucs;
 $2 = $1;
 $3 = ($2|0)==(0);
 if ($3) {
  $0 = 0;
  $63 = $0;
  STACKTOP = sp;return ($63|0);
 }
 $4 = $1;
 $5 = ($4|0)<(32);
 if (!($5)) {
  $6 = $1;
  $7 = ($6|0)>=(127);
  $8 = $1;
  $9 = ($8|0)<(160);
  $or$cond = $7 & $9;
  if (!($or$cond)) {
   $10 = $1;
   $11 = (_bisearch($10,1876,141)|0);
   $12 = ($11|0)!=(0);
   if ($12) {
    $0 = 0;
    $63 = $0;
    STACKTOP = sp;return ($63|0);
   }
   $13 = $1;
   $14 = ($13|0)>=(4352);
   if ($14) {
    $15 = $1;
    $16 = ($15|0)<=(4447);
    $17 = $1;
    $18 = ($17|0)==(9001);
    $or$cond3 = $16 | $18;
    $19 = $1;
    $20 = ($19|0)==(9002);
    $or$cond5 = $or$cond3 | $20;
    if ($or$cond5) {
     $61 = 1;
    } else {
     $21 = $1;
     $22 = ($21|0)>=(11904);
     $23 = $1;
     $24 = ($23|0)<=(42191);
     $or$cond7 = $22 & $24;
     $25 = $1;
     $26 = ($25|0)!=(12351);
     $or$cond9 = $or$cond7 & $26;
     if ($or$cond9) {
      $61 = 1;
     } else {
      $27 = $1;
      $28 = ($27|0)>=(44032);
      $29 = $1;
      $30 = ($29|0)<=(55203);
      $or$cond11 = $28 & $30;
      if ($or$cond11) {
       $61 = 1;
      } else {
       $31 = $1;
       $32 = ($31|0)>=(63744);
       $33 = $1;
       $34 = ($33|0)<=(64255);
       $or$cond13 = $32 & $34;
       if ($or$cond13) {
        $61 = 1;
       } else {
        $35 = $1;
        $36 = ($35|0)>=(65040);
        $37 = $1;
        $38 = ($37|0)<=(65049);
        $or$cond15 = $36 & $38;
        if ($or$cond15) {
         $61 = 1;
        } else {
         $39 = $1;
         $40 = ($39|0)>=(65072);
         $41 = $1;
         $42 = ($41|0)<=(65135);
         $or$cond17 = $40 & $42;
         if ($or$cond17) {
          $61 = 1;
         } else {
          $43 = $1;
          $44 = ($43|0)>=(65280);
          $45 = $1;
          $46 = ($45|0)<=(65376);
          $or$cond19 = $44 & $46;
          if ($or$cond19) {
           $61 = 1;
          } else {
           $47 = $1;
           $48 = ($47|0)>=(65504);
           $49 = $1;
           $50 = ($49|0)<=(65510);
           $or$cond21 = $48 & $50;
           if ($or$cond21) {
            $61 = 1;
           } else {
            $51 = $1;
            $52 = ($51|0)>=(131072);
            $53 = $1;
            $54 = ($53|0)<=(196605);
            $or$cond23 = $52 & $54;
            if ($or$cond23) {
             $61 = 1;
            } else {
             $55 = $1;
             $56 = ($55|0)>=(196608);
             $57 = $1;
             $58 = ($57|0)<=(262141);
             $59 = $56 ? $58 : 0;
             $61 = $59;
            }
           }
          }
         }
        }
       }
      }
     }
    }
   } else {
    $61 = 0;
   }
   $60 = $61&1;
   $62 = (1 + ($60))|0;
   $0 = $62;
   $63 = $0;
   STACKTOP = sp;return ($63|0);
  }
 }
 $0 = -1;
 $63 = $0;
 STACKTOP = sp;return ($63|0);
}
function _bisearch($ucs,$table,$max) {
 $ucs = $ucs|0;
 $table = $table|0;
 $max = $max|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $mid = 0, $min = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $ucs;
 $2 = $table;
 $3 = $max;
 $min = 0;
 $4 = $1;
 $5 = $2;
 $6 = HEAP32[$5>>2]|0;
 $7 = ($4|0)<($6|0);
 if (!($7)) {
  $8 = $1;
  $9 = $3;
  $10 = $2;
  $11 = (($10) + ($9<<3)|0);
  $12 = ((($11)) + 4|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = ($8|0)>($13|0);
  if (!($14)) {
   while(1) {
    $15 = $3;
    $16 = $min;
    $17 = ($15|0)>=($16|0);
    if (!($17)) {
     label = 10;
     break;
    }
    $18 = $min;
    $19 = $3;
    $20 = (($18) + ($19))|0;
    $21 = (($20|0) / 2)&-1;
    $mid = $21;
    $22 = $1;
    $23 = $mid;
    $24 = $2;
    $25 = (($24) + ($23<<3)|0);
    $26 = ((($25)) + 4|0);
    $27 = HEAP32[$26>>2]|0;
    $28 = ($22|0)>($27|0);
    if ($28) {
     $29 = $mid;
     $30 = (($29) + 1)|0;
     $min = $30;
     continue;
    }
    $31 = $1;
    $32 = $mid;
    $33 = $2;
    $34 = (($33) + ($32<<3)|0);
    $35 = HEAP32[$34>>2]|0;
    $36 = ($31|0)<($35|0);
    if (!($36)) {
     label = 9;
     break;
    }
    $37 = $mid;
    $38 = (($37) - 1)|0;
    $3 = $38;
   }
   if ((label|0) == 9) {
    $0 = 1;
    $39 = $0;
    STACKTOP = sp;return ($39|0);
   }
   else if ((label|0) == 10) {
    $0 = 0;
    $39 = $0;
    STACKTOP = sp;return ($39|0);
   }
  }
 }
 $0 = 0;
 $39 = $0;
 STACKTOP = sp;return ($39|0);
}
function _vterm_new($rows,$cols) {
 $rows = $rows|0;
 $cols = $cols|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $rows;
 $1 = $cols;
 $2 = $0;
 $3 = $1;
 $4 = (_vterm_new_with_allocator($2,$3,3012,0)|0);
 STACKTOP = sp;return ($4|0);
}
function _vterm_new_with_allocator($rows,$cols,$funcs,$allocdata) {
 $rows = $rows|0;
 $cols = $cols|0;
 $funcs = $funcs|0;
 $allocdata = $allocdata|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vt = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $rows;
 $1 = $cols;
 $2 = $funcs;
 $3 = $allocdata;
 $4 = $2;
 $5 = HEAP32[$4>>2]|0;
 $6 = $3;
 $7 = (FUNCTION_TABLE_iii[$5 & 31](64,$6)|0);
 $vt = $7;
 $8 = $2;
 $9 = $vt;
 HEAP32[$9>>2] = $8;
 $10 = $3;
 $11 = $vt;
 $12 = ((($11)) + 4|0);
 HEAP32[$12>>2] = $10;
 $13 = $0;
 $14 = $vt;
 $15 = ((($14)) + 8|0);
 HEAP32[$15>>2] = $13;
 $16 = $1;
 $17 = $vt;
 $18 = ((($17)) + 12|0);
 HEAP32[$18>>2] = $16;
 $19 = $vt;
 $20 = ((($19)) + 20|0);
 HEAP32[$20>>2] = 0;
 $21 = $vt;
 $22 = ((($21)) + 24|0);
 HEAP32[$22>>2] = 0;
 $23 = $vt;
 $24 = ((($23)) + 28|0);
 HEAP32[$24>>2] = 0;
 $25 = $vt;
 $26 = ((($25)) + 36|0);
 HEAP32[$26>>2] = 64;
 $27 = $vt;
 $28 = ((($27)) + 40|0);
 HEAP32[$28>>2] = 0;
 $29 = $vt;
 $30 = $vt;
 $31 = ((($30)) + 36|0);
 $32 = HEAP32[$31>>2]|0;
 $33 = (_vterm_allocator_malloc($29,$32)|0);
 $34 = $vt;
 $35 = ((($34)) + 32|0);
 HEAP32[$35>>2] = $33;
 $36 = $vt;
 $37 = ((($36)) + 48|0);
 HEAP32[$37>>2] = 64;
 $38 = $vt;
 $39 = ((($38)) + 52|0);
 HEAP32[$39>>2] = 0;
 $40 = $vt;
 $41 = $vt;
 $42 = ((($41)) + 48|0);
 $43 = HEAP32[$42>>2]|0;
 $44 = (_vterm_allocator_malloc($40,$43)|0);
 $45 = $vt;
 $46 = ((($45)) + 44|0);
 HEAP32[$46>>2] = $44;
 $47 = $vt;
 STACKTOP = sp;return ($47|0);
}
function _vterm_allocator_malloc($vt,$size) {
 $vt = $vt|0;
 $size = $size|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $size;
 $2 = $0;
 $3 = HEAP32[$2>>2]|0;
 $4 = HEAP32[$3>>2]|0;
 $5 = $1;
 $6 = $0;
 $7 = ((($6)) + 4|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = (FUNCTION_TABLE_iii[$4 & 31]($5,$8)|0);
 STACKTOP = sp;return ($9|0);
}
function _vterm_free($vt) {
 $vt = $vt|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $3 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $0;
 $2 = ((($1)) + 60|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3|0)!=(0|0);
 if ($4) {
  $5 = $0;
  $6 = ((($5)) + 60|0);
  $7 = HEAP32[$6>>2]|0;
  _vterm_screen_free($7);
 }
 $8 = $0;
 $9 = ((($8)) + 56|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = ($10|0)!=(0|0);
 if ($11) {
  $12 = $0;
  $13 = ((($12)) + 56|0);
  $14 = HEAP32[$13>>2]|0;
  _vterm_state_free($14);
 }
 $15 = $0;
 $16 = $0;
 $17 = ((($16)) + 32|0);
 $18 = HEAP32[$17>>2]|0;
 _vterm_allocator_free($15,$18);
 $19 = $0;
 $20 = $0;
 $21 = ((($20)) + 44|0);
 $22 = HEAP32[$21>>2]|0;
 _vterm_allocator_free($19,$22);
 $23 = $0;
 $24 = $0;
 _vterm_allocator_free($23,$24);
 STACKTOP = sp;return;
}
function _vterm_allocator_free($vt,$ptr) {
 $vt = $vt|0;
 $ptr = $ptr|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $ptr;
 $2 = $0;
 $3 = HEAP32[$2>>2]|0;
 $4 = ((($3)) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $1;
 $7 = $0;
 $8 = ((($7)) + 4|0);
 $9 = HEAP32[$8>>2]|0;
 FUNCTION_TABLE_vii[$5 & 31]($6,$9);
 STACKTOP = sp;return;
}
function _vterm_get_size($vt,$rowsp,$colsp) {
 $vt = $vt|0;
 $rowsp = $rowsp|0;
 $colsp = $colsp|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $rowsp;
 $2 = $colsp;
 $3 = $1;
 $4 = ($3|0)!=(0|0);
 if ($4) {
  $5 = $0;
  $6 = ((($5)) + 8|0);
  $7 = HEAP32[$6>>2]|0;
  $8 = $1;
  HEAP32[$8>>2] = $7;
 }
 $9 = $2;
 $10 = ($9|0)!=(0|0);
 if (!($10)) {
  STACKTOP = sp;return;
 }
 $11 = $0;
 $12 = ((($11)) + 12|0);
 $13 = HEAP32[$12>>2]|0;
 $14 = $2;
 HEAP32[$14>>2] = $13;
 STACKTOP = sp;return;
}
function _vterm_set_size($vt,$rows,$cols) {
 $vt = $vt|0;
 $rows = $rows|0;
 $cols = $cols|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $rows;
 $2 = $cols;
 $3 = $1;
 $4 = $0;
 $5 = ((($4)) + 8|0);
 HEAP32[$5>>2] = $3;
 $6 = $2;
 $7 = $0;
 $8 = ((($7)) + 12|0);
 HEAP32[$8>>2] = $6;
 $9 = $0;
 $10 = ((($9)) + 24|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = ($11|0)!=(0|0);
 if (!($12)) {
  STACKTOP = sp;return;
 }
 $13 = $0;
 $14 = ((($13)) + 24|0);
 $15 = HEAP32[$14>>2]|0;
 $16 = ((($15)) + 24|0);
 $17 = HEAP32[$16>>2]|0;
 $18 = ($17|0)!=(0|0);
 if (!($18)) {
  STACKTOP = sp;return;
 }
 $19 = $0;
 $20 = ((($19)) + 24|0);
 $21 = HEAP32[$20>>2]|0;
 $22 = ((($21)) + 24|0);
 $23 = HEAP32[$22>>2]|0;
 $24 = $1;
 $25 = $2;
 $26 = $0;
 $27 = ((($26)) + 28|0);
 $28 = HEAP32[$27>>2]|0;
 (FUNCTION_TABLE_iiii[$23 & 31]($24,$25,$28)|0);
 STACKTOP = sp;return;
}
function _vterm_get_utf8($vt) {
 $vt = $vt|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $0;
 $2 = ((($1)) + 16|0);
 $3 = HEAP8[$2>>0]|0;
 $4 = ($3 << 7)&255;
 $5 = ($4<<24>>24) >> 7;
 $6 = $5 << 24 >> 24;
 STACKTOP = sp;return ($6|0);
}
function _vterm_set_utf8($vt,$is_utf8) {
 $vt = $vt|0;
 $is_utf8 = $is_utf8|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $is_utf8;
 $2 = $1;
 $3 = $0;
 $4 = ((($3)) + 16|0);
 $5 = $2&255;
 $6 = HEAP8[$4>>0]|0;
 $7 = $5 & 1;
 $8 = $6 & -2;
 $9 = $8 | $7;
 HEAP8[$4>>0] = $9;
 STACKTOP = sp;return;
}
function _vterm_push_output_bytes($vt,$bytes,$len) {
 $vt = $vt|0;
 $bytes = $bytes|0;
 $len = $len|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $0 = $vt;
 $1 = $bytes;
 $2 = $len;
 $3 = $2;
 $4 = $0;
 $5 = ((($4)) + 48|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = $0;
 $8 = ((($7)) + 52|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = (($6) - ($9))|0;
 $11 = ($3>>>0)>($10>>>0);
 if ($11) {
  $12 = HEAP32[3064>>2]|0;
  (_fprintf($12,5174,$vararg_buffer)|0);
  $13 = $0;
  $14 = ((($13)) + 48|0);
  $15 = HEAP32[$14>>2]|0;
  $16 = $0;
  $17 = ((($16)) + 52|0);
  $18 = HEAP32[$17>>2]|0;
  $19 = (($15) - ($18))|0;
  $2 = $19;
 }
 $20 = $0;
 $21 = ((($20)) + 44|0);
 $22 = HEAP32[$21>>2]|0;
 $23 = $0;
 $24 = ((($23)) + 52|0);
 $25 = HEAP32[$24>>2]|0;
 $26 = (($22) + ($25)|0);
 $27 = $1;
 $28 = $2;
 _memcpy(($26|0),($27|0),($28|0))|0;
 $29 = $2;
 $30 = $0;
 $31 = ((($30)) + 52|0);
 $32 = HEAP32[$31>>2]|0;
 $33 = (($32) + ($29))|0;
 HEAP32[$31>>2] = $33;
 STACKTOP = sp;return;
}
function _vterm_push_output_vsprintf($vt,$format,$args) {
 $vt = $vt|0;
 $format = $format|0;
 $args = $args|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, $written = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $0 = $vt;
 $1 = $format;
 $2 = $args;
 $3 = $0;
 $4 = (_outbuffer_is_full($3)|0);
 $5 = ($4|0)!=(0);
 if ($5) {
  $6 = HEAP32[3064>>2]|0;
  (_fprintf($6,5174,$vararg_buffer)|0);
  STACKTOP = sp;return;
 }
 $7 = $0;
 $8 = ((($7)) + 44|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = $0;
 $11 = ((($10)) + 52|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = (($9) + ($12)|0);
 $14 = $0;
 $15 = ((($14)) + 48|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = $0;
 $18 = ((($17)) + 52|0);
 $19 = HEAP32[$18>>2]|0;
 $20 = (($16) - ($19))|0;
 $21 = $1;
 $22 = $2;
 $23 = (_vsnprintf($13,$20,$21,$22)|0);
 $written = $23;
 $24 = $written;
 $25 = $0;
 $26 = ((($25)) + 48|0);
 $27 = HEAP32[$26>>2]|0;
 $28 = $0;
 $29 = ((($28)) + 52|0);
 $30 = HEAP32[$29>>2]|0;
 $31 = (($27) - ($30))|0;
 $32 = ($24|0)==($31|0);
 if ($32) {
  $33 = $0;
  $34 = ((($33)) + 48|0);
  $35 = HEAP32[$34>>2]|0;
  $36 = (($35) - 1)|0;
  $37 = $0;
  $38 = ((($37)) + 52|0);
  HEAP32[$38>>2] = $36;
  STACKTOP = sp;return;
 } else {
  $39 = $written;
  $40 = $0;
  $41 = ((($40)) + 52|0);
  $42 = HEAP32[$41>>2]|0;
  $43 = (($42) + ($39))|0;
  HEAP32[$41>>2] = $43;
  STACKTOP = sp;return;
 }
}
function _vterm_push_output_sprintf($vt,$format,$varargs) {
 $vt = $vt|0;
 $format = $format|0;
 $varargs = $varargs|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $args = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $args = sp;
 $0 = $vt;
 $1 = $format;
 HEAP32[$args>>2] = $varargs;
 $2 = $0;
 $3 = $1;
 _vterm_push_output_vsprintf($2,$3,$args);
 STACKTOP = sp;return;
}
function _vterm_push_output_sprintf_ctrl($vt,$ctrl,$fmt,$varargs) {
 $vt = $vt|0;
 $ctrl = $ctrl|0;
 $fmt = $fmt|0;
 $varargs = $varargs|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $args = 0, $orig_cur = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer1 = sp + 8|0;
 $vararg_buffer = sp;
 $args = sp + 16|0;
 $0 = $vt;
 $1 = $ctrl;
 $2 = $fmt;
 $3 = $0;
 $4 = ((($3)) + 52|0);
 $5 = HEAP32[$4>>2]|0;
 $orig_cur = $5;
 $6 = $1;
 $7 = $6&255;
 $8 = ($7|0)>=(128);
 if ($8) {
  $9 = $0;
  $10 = ((($9)) + 16|0);
  $11 = HEAP8[$10>>0]|0;
  $12 = ($11 << 6)&255;
  $13 = ($12<<24>>24) >> 7;
  $14 = $13 << 24 >> 24;
  $15 = ($14|0)!=(0);
  if ($15) {
   label = 4;
  } else {
   $16 = $0;
   $17 = $1;
   $18 = $17&255;
   $19 = (($18) - 64)|0;
   HEAP32[$vararg_buffer>>2] = $19;
   _vterm_push_output_sprintf($16,5231,$vararg_buffer);
  }
 } else {
  label = 4;
 }
 if ((label|0) == 4) {
  $20 = $0;
  $21 = $1;
  $22 = $21&255;
  HEAP32[$vararg_buffer1>>2] = $22;
  _vterm_push_output_sprintf($20,5235,$vararg_buffer1);
 }
 HEAP32[$args>>2] = $varargs;
 $23 = $0;
 $24 = $2;
 _vterm_push_output_vsprintf($23,$24,$args);
 $25 = $0;
 $26 = (_outbuffer_is_full($25)|0);
 $27 = ($26|0)!=(0);
 if (!($27)) {
  STACKTOP = sp;return;
 }
 $28 = $orig_cur;
 $29 = $0;
 $30 = ((($29)) + 52|0);
 HEAP32[$30>>2] = $28;
 STACKTOP = sp;return;
}
function _vterm_push_output_sprintf_dcs($vt,$fmt,$varargs) {
 $vt = $vt|0;
 $fmt = $fmt|0;
 $varargs = $varargs|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $args = 0, $orig_cur = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer4 = sp + 16|0;
 $vararg_buffer1 = sp + 8|0;
 $vararg_buffer = sp;
 $args = sp + 24|0;
 $0 = $vt;
 $1 = $fmt;
 $2 = $0;
 $3 = ((($2)) + 52|0);
 $4 = HEAP32[$3>>2]|0;
 $orig_cur = $4;
 $5 = $0;
 $6 = ((($5)) + 16|0);
 $7 = HEAP8[$6>>0]|0;
 $8 = ($7 << 6)&255;
 $9 = ($8<<24>>24) >> 7;
 $10 = $9 << 24 >> 24;
 $11 = ($10|0)!=(0);
 $12 = $0;
 if ($11) {
  HEAP32[$vararg_buffer1>>2] = 144;
  _vterm_push_output_sprintf($12,5235,$vararg_buffer1);
 } else {
  HEAP32[$vararg_buffer>>2] = 80;
  _vterm_push_output_sprintf($12,5231,$vararg_buffer);
 }
 HEAP32[$args>>2] = $varargs;
 $13 = $0;
 $14 = $1;
 _vterm_push_output_vsprintf($13,$14,$args);
 $15 = $0;
 _vterm_push_output_sprintf_ctrl($15,-100,5238,$vararg_buffer4);
 $16 = $0;
 $17 = (_outbuffer_is_full($16)|0);
 $18 = ($17|0)!=(0);
 if (!($18)) {
  STACKTOP = sp;return;
 }
 $19 = $orig_cur;
 $20 = $0;
 $21 = ((($20)) + 52|0);
 HEAP32[$21>>2] = $19;
 STACKTOP = sp;return;
}
function _vterm_output_get_buffer_size($vt) {
 $vt = $vt|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $0;
 $2 = ((($1)) + 48|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _vterm_output_get_buffer_current($vt) {
 $vt = $vt|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $0;
 $2 = ((($1)) + 52|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _vterm_output_get_buffer_remaining($vt) {
 $vt = $vt|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $0;
 $2 = ((($1)) + 48|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = $0;
 $5 = ((($4)) + 52|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = (($3) - ($6))|0;
 STACKTOP = sp;return ($7|0);
}
function _vterm_output_read($vt,$buffer,$len) {
 $vt = $vt|0;
 $buffer = $buffer|0;
 $len = $len|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $buffer;
 $2 = $len;
 $3 = $2;
 $4 = $0;
 $5 = ((($4)) + 52|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($3>>>0)>($6>>>0);
 if ($7) {
  $8 = $0;
  $9 = ((($8)) + 52|0);
  $10 = HEAP32[$9>>2]|0;
  $2 = $10;
 }
 $11 = $1;
 $12 = $0;
 $13 = ((($12)) + 44|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = $2;
 _memcpy(($11|0),($14|0),($15|0))|0;
 $16 = $2;
 $17 = $0;
 $18 = ((($17)) + 52|0);
 $19 = HEAP32[$18>>2]|0;
 $20 = ($16>>>0)<($19>>>0);
 if (!($20)) {
  $34 = $2;
  $35 = $0;
  $36 = ((($35)) + 52|0);
  $37 = HEAP32[$36>>2]|0;
  $38 = (($37) - ($34))|0;
  HEAP32[$36>>2] = $38;
  $39 = $2;
  STACKTOP = sp;return ($39|0);
 }
 $21 = $0;
 $22 = ((($21)) + 44|0);
 $23 = HEAP32[$22>>2]|0;
 $24 = $0;
 $25 = ((($24)) + 44|0);
 $26 = HEAP32[$25>>2]|0;
 $27 = $2;
 $28 = (($26) + ($27)|0);
 $29 = $0;
 $30 = ((($29)) + 52|0);
 $31 = HEAP32[$30>>2]|0;
 $32 = $2;
 $33 = (($31) - ($32))|0;
 _memmove(($23|0),($28|0),($33|0))|0;
 $34 = $2;
 $35 = $0;
 $36 = ((($35)) + 52|0);
 $37 = HEAP32[$36>>2]|0;
 $38 = (($37) - ($34))|0;
 HEAP32[$36>>2] = $38;
 $39 = $2;
 STACKTOP = sp;return ($39|0);
}
function _vterm_parser_set_callbacks($vt,$callbacks,$user) {
 $vt = $vt|0;
 $callbacks = $callbacks|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $callbacks;
 $2 = $user;
 $3 = $1;
 $4 = $0;
 $5 = ((($4)) + 24|0);
 HEAP32[$5>>2] = $3;
 $6 = $2;
 $7 = $0;
 $8 = ((($7)) + 28|0);
 HEAP32[$8>>2] = $6;
 STACKTOP = sp;return;
}
function _vterm_parser_get_cbdata($vt) {
 $vt = $vt|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $0;
 $2 = ((($1)) + 28|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _vterm_get_attr_type($attr) {
 $attr = $attr|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $attr;
 $2 = $1;
 do {
  switch ($2|0) {
  case 1:  {
   $0 = 1;
   break;
  }
  case 2:  {
   $0 = 2;
   break;
  }
  case 3:  {
   $0 = 1;
   break;
  }
  case 4:  {
   $0 = 1;
   break;
  }
  case 5:  {
   $0 = 1;
   break;
  }
  case 6:  {
   $0 = 1;
   break;
  }
  case 7:  {
   $0 = 2;
   break;
  }
  case 8:  {
   $0 = 4;
   break;
  }
  case 9:  {
   $0 = 4;
   break;
  }
  default: {
   $0 = 0;
  }
  }
 } while(0);
 $3 = $0;
 STACKTOP = sp;return ($3|0);
}
function _vterm_get_prop_type($prop) {
 $prop = $prop|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $prop;
 $2 = $1;
 switch ($2|0) {
 case 1:  {
  $0 = 1;
  break;
 }
 case 2:  {
  $0 = 1;
  break;
 }
 case 3:  {
  $0 = 1;
  break;
 }
 case 4:  {
  $0 = 3;
  break;
 }
 case 5:  {
  $0 = 3;
  break;
 }
 case 6:  {
  $0 = 1;
  break;
 }
 case 7:  {
  $0 = 2;
  break;
 }
 case 8:  {
  $0 = 2;
  break;
 }
 default: {
  $0 = 0;
 }
 }
 $3 = $0;
 STACKTOP = sp;return ($3|0);
}
function _vterm_scroll_rect($rect,$downward,$rightward,$moverect,$eraserect,$user) {
 $rect = $rect|0;
 $downward = $downward|0;
 $rightward = $rightward|0;
 $moverect = $moverect|0;
 $eraserect = $eraserect|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0;
 var $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0;
 var $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $dest = 0, $dest$byval_copy = 0;
 var $leftward = 0, $rect$byval_copy = 0, $rect$byval_copy1 = 0, $src = 0, $src$byval_copy = 0, $upward = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $rect$byval_copy1 = sp + 112|0;
 $src$byval_copy = sp + 96|0;
 $dest$byval_copy = sp + 80|0;
 $rect$byval_copy = sp + 64|0;
 $src = sp + 24|0;
 $dest = sp + 8|0;
 $0 = $downward;
 $1 = $rightward;
 $2 = $moverect;
 $3 = $eraserect;
 $4 = $user;
 $5 = $0;
 $6 = (Math_abs(($5|0))|0);
 $7 = ((($rect)) + 4|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = HEAP32[$rect>>2]|0;
 $10 = (($8) - ($9))|0;
 $11 = ($6|0)>=($10|0);
 if (!($11)) {
  $12 = $1;
  $13 = (Math_abs(($12|0))|0);
  $14 = ((($rect)) + 12|0);
  $15 = HEAP32[$14>>2]|0;
  $16 = ((($rect)) + 8|0);
  $17 = HEAP32[$16>>2]|0;
  $18 = (($15) - ($17))|0;
  $19 = ($13|0)>=($18|0);
  if (!($19)) {
   $22 = $1;
   $23 = ($22|0)>=(0);
   if ($23) {
    $24 = ((($rect)) + 8|0);
    $25 = HEAP32[$24>>2]|0;
    $26 = ((($dest)) + 8|0);
    HEAP32[$26>>2] = $25;
    $27 = ((($rect)) + 12|0);
    $28 = HEAP32[$27>>2]|0;
    $29 = $1;
    $30 = (($28) - ($29))|0;
    $31 = ((($dest)) + 12|0);
    HEAP32[$31>>2] = $30;
    $32 = ((($rect)) + 8|0);
    $33 = HEAP32[$32>>2]|0;
    $34 = $1;
    $35 = (($33) + ($34))|0;
    $36 = ((($src)) + 8|0);
    HEAP32[$36>>2] = $35;
    $37 = ((($rect)) + 12|0);
    $38 = HEAP32[$37>>2]|0;
    $39 = ((($src)) + 12|0);
    HEAP32[$39>>2] = $38;
   } else {
    $40 = $1;
    $41 = (0 - ($40))|0;
    $leftward = $41;
    $42 = ((($rect)) + 8|0);
    $43 = HEAP32[$42>>2]|0;
    $44 = $leftward;
    $45 = (($43) + ($44))|0;
    $46 = ((($dest)) + 8|0);
    HEAP32[$46>>2] = $45;
    $47 = ((($rect)) + 12|0);
    $48 = HEAP32[$47>>2]|0;
    $49 = ((($dest)) + 12|0);
    HEAP32[$49>>2] = $48;
    $50 = ((($rect)) + 8|0);
    $51 = HEAP32[$50>>2]|0;
    $52 = ((($src)) + 8|0);
    HEAP32[$52>>2] = $51;
    $53 = ((($rect)) + 12|0);
    $54 = HEAP32[$53>>2]|0;
    $55 = $leftward;
    $56 = (($54) - ($55))|0;
    $57 = ((($src)) + 12|0);
    HEAP32[$57>>2] = $56;
   }
   $58 = $0;
   $59 = ($58|0)>=(0);
   if ($59) {
    $60 = HEAP32[$rect>>2]|0;
    HEAP32[$dest>>2] = $60;
    $61 = ((($rect)) + 4|0);
    $62 = HEAP32[$61>>2]|0;
    $63 = $0;
    $64 = (($62) - ($63))|0;
    $65 = ((($dest)) + 4|0);
    HEAP32[$65>>2] = $64;
    $66 = HEAP32[$rect>>2]|0;
    $67 = $0;
    $68 = (($66) + ($67))|0;
    HEAP32[$src>>2] = $68;
    $69 = ((($rect)) + 4|0);
    $70 = HEAP32[$69>>2]|0;
    $71 = ((($src)) + 4|0);
    HEAP32[$71>>2] = $70;
   } else {
    $72 = $0;
    $73 = (0 - ($72))|0;
    $upward = $73;
    $74 = HEAP32[$rect>>2]|0;
    $75 = $upward;
    $76 = (($74) + ($75))|0;
    HEAP32[$dest>>2] = $76;
    $77 = ((($rect)) + 4|0);
    $78 = HEAP32[$77>>2]|0;
    $79 = ((($dest)) + 4|0);
    HEAP32[$79>>2] = $78;
    $80 = HEAP32[$rect>>2]|0;
    HEAP32[$src>>2] = $80;
    $81 = ((($rect)) + 4|0);
    $82 = HEAP32[$81>>2]|0;
    $83 = $upward;
    $84 = (($82) - ($83))|0;
    $85 = ((($src)) + 4|0);
    HEAP32[$85>>2] = $84;
   }
   $86 = $2;
   $87 = ($86|0)!=(0|0);
   if ($87) {
    $88 = $2;
    $89 = $4;
    ;HEAP32[$dest$byval_copy>>2]=HEAP32[$dest>>2]|0;HEAP32[$dest$byval_copy+4>>2]=HEAP32[$dest+4>>2]|0;HEAP32[$dest$byval_copy+8>>2]=HEAP32[$dest+8>>2]|0;HEAP32[$dest$byval_copy+12>>2]=HEAP32[$dest+12>>2]|0;
    ;HEAP32[$src$byval_copy>>2]=HEAP32[$src>>2]|0;HEAP32[$src$byval_copy+4>>2]=HEAP32[$src+4>>2]|0;HEAP32[$src$byval_copy+8>>2]=HEAP32[$src+8>>2]|0;HEAP32[$src$byval_copy+12>>2]=HEAP32[$src+12>>2]|0;
    (FUNCTION_TABLE_iiii[$88 & 31]($dest$byval_copy,$src$byval_copy,$89)|0);
   }
   $90 = $0;
   $91 = ($90|0)>(0);
   if ($91) {
    $92 = ((($rect)) + 4|0);
    $93 = HEAP32[$92>>2]|0;
    $94 = $0;
    $95 = (($93) - ($94))|0;
    HEAP32[$rect>>2] = $95;
   } else {
    $96 = $0;
    $97 = ($96|0)<(0);
    if ($97) {
     $98 = HEAP32[$rect>>2]|0;
     $99 = $0;
     $100 = (($98) - ($99))|0;
     $101 = ((($rect)) + 4|0);
     HEAP32[$101>>2] = $100;
    }
   }
   $102 = $1;
   $103 = ($102|0)>(0);
   if ($103) {
    $104 = ((($rect)) + 12|0);
    $105 = HEAP32[$104>>2]|0;
    $106 = $1;
    $107 = (($105) - ($106))|0;
    $108 = ((($rect)) + 8|0);
    HEAP32[$108>>2] = $107;
   } else {
    $109 = $1;
    $110 = ($109|0)<(0);
    if ($110) {
     $111 = ((($rect)) + 8|0);
     $112 = HEAP32[$111>>2]|0;
     $113 = $1;
     $114 = (($112) - ($113))|0;
     $115 = ((($rect)) + 12|0);
     HEAP32[$115>>2] = $114;
    }
   }
   $116 = $3;
   $117 = $4;
   ;HEAP32[$rect$byval_copy1>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy1+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy1+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy1+12>>2]=HEAP32[$rect+12>>2]|0;
   (FUNCTION_TABLE_iiii[$116 & 31]($rect$byval_copy1,0,$117)|0);
   STACKTOP = sp;return;
  }
 }
 $20 = $3;
 $21 = $4;
 ;HEAP32[$rect$byval_copy>>2]=HEAP32[$rect>>2]|0;HEAP32[$rect$byval_copy+4>>2]=HEAP32[$rect+4>>2]|0;HEAP32[$rect$byval_copy+8>>2]=HEAP32[$rect+8>>2]|0;HEAP32[$rect$byval_copy+12>>2]=HEAP32[$rect+12>>2]|0;
 (FUNCTION_TABLE_iiii[$20 & 31]($rect$byval_copy,0,$21)|0);
 STACKTOP = sp;return;
}
function _vterm_copy_cells($dest,$src,$copycell,$user) {
 $dest = $dest|0;
 $src = $src|0;
 $copycell = $copycell|0;
 $user = $user|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $downward = 0;
 var $inc_col = 0, $inc_row = 0, $init_col = 0, $init_row = 0, $pos = 0, $pos$byval_copy = 0, $rightward = 0, $srcpos = 0, $srcpos$byval_copy = 0, $test_col = 0, $test_row = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $srcpos$byval_copy = sp + 64|0;
 $pos$byval_copy = sp + 56|0;
 $pos = sp + 8|0;
 $srcpos = sp;
 $0 = $copycell;
 $1 = $user;
 $2 = HEAP32[$src>>2]|0;
 $3 = HEAP32[$dest>>2]|0;
 $4 = (($2) - ($3))|0;
 $downward = $4;
 $5 = ((($src)) + 8|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ((($dest)) + 8|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = (($6) - ($8))|0;
 $rightward = $9;
 $10 = $downward;
 $11 = ($10|0)<(0);
 if ($11) {
  $12 = ((($dest)) + 4|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = (($13) - 1)|0;
  $init_row = $14;
  $15 = HEAP32[$dest>>2]|0;
  $16 = (($15) - 1)|0;
  $test_row = $16;
  $inc_row = -1;
 } else {
  $17 = HEAP32[$dest>>2]|0;
  $init_row = $17;
  $18 = ((($dest)) + 4|0);
  $19 = HEAP32[$18>>2]|0;
  $test_row = $19;
  $inc_row = 1;
 }
 $20 = $rightward;
 $21 = ($20|0)<(0);
 if ($21) {
  $22 = ((($dest)) + 12|0);
  $23 = HEAP32[$22>>2]|0;
  $24 = (($23) - 1)|0;
  $init_col = $24;
  $25 = ((($dest)) + 8|0);
  $26 = HEAP32[$25>>2]|0;
  $27 = (($26) - 1)|0;
  $test_col = $27;
  $inc_col = -1;
 } else {
  $28 = ((($dest)) + 8|0);
  $29 = HEAP32[$28>>2]|0;
  $init_col = $29;
  $30 = ((($dest)) + 12|0);
  $31 = HEAP32[$30>>2]|0;
  $test_col = $31;
  $inc_col = 1;
 }
 $32 = $init_row;
 HEAP32[$pos>>2] = $32;
 while(1) {
  $33 = HEAP32[$pos>>2]|0;
  $34 = $test_row;
  $35 = ($33|0)!=($34|0);
  if (!($35)) {
   break;
  }
  $36 = $init_col;
  $37 = ((($pos)) + 4|0);
  HEAP32[$37>>2] = $36;
  while(1) {
   $38 = ((($pos)) + 4|0);
   $39 = HEAP32[$38>>2]|0;
   $40 = $test_col;
   $41 = ($39|0)!=($40|0);
   if (!($41)) {
    break;
   }
   $42 = HEAP32[$pos>>2]|0;
   $43 = $downward;
   $44 = (($42) + ($43))|0;
   HEAP32[$srcpos>>2] = $44;
   $45 = ((($srcpos)) + 4|0);
   $46 = ((($pos)) + 4|0);
   $47 = HEAP32[$46>>2]|0;
   $48 = $rightward;
   $49 = (($47) + ($48))|0;
   HEAP32[$45>>2] = $49;
   $50 = $0;
   $51 = $1;
   ;HEAP32[$pos$byval_copy>>2]=HEAP32[$pos>>2]|0;HEAP32[$pos$byval_copy+4>>2]=HEAP32[$pos+4>>2]|0;
   ;HEAP32[$srcpos$byval_copy>>2]=HEAP32[$srcpos>>2]|0;HEAP32[$srcpos$byval_copy+4>>2]=HEAP32[$srcpos+4>>2]|0;
   FUNCTION_TABLE_viii[$50 & 0]($pos$byval_copy,$srcpos$byval_copy,$51);
   $52 = $inc_col;
   $53 = ((($pos)) + 4|0);
   $54 = HEAP32[$53>>2]|0;
   $55 = (($54) + ($52))|0;
   HEAP32[$53>>2] = $55;
  }
  $56 = $inc_row;
  $57 = HEAP32[$pos>>2]|0;
  $58 = (($57) + ($56))|0;
  HEAP32[$pos>>2] = $58;
 }
 STACKTOP = sp;return;
}
function _outbuffer_is_full($vt) {
 $vt = $vt|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $vt;
 $1 = $0;
 $2 = ((($1)) + 52|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = $0;
 $5 = ((($4)) + 48|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = (($6) - 1)|0;
 $8 = ($3>>>0)>=($7>>>0);
 $9 = $8&1;
 STACKTOP = sp;return ($9|0);
}
function _default_malloc($size,$allocdata) {
 $size = $size|0;
 $allocdata = $allocdata|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $ptr = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $size;
 $1 = $allocdata;
 $2 = $0;
 $3 = (_malloc($2)|0);
 $ptr = $3;
 $4 = $ptr;
 $5 = ($4|0)!=(0|0);
 if ($5) {
  $6 = $ptr;
  $7 = $0;
  _memset(($6|0),0,($7|0))|0;
 }
 $8 = $ptr;
 STACKTOP = sp;return ($8|0);
}
function _default_free($ptr,$allocdata) {
 $ptr = $ptr|0;
 $allocdata = $allocdata|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $ptr;
 $1 = $allocdata;
 $2 = $0;
 _free($2);
 STACKTOP = sp;return;
}
function _wcrtomb($s,$wc,$st) {
 $s = $s|0;
 $wc = $wc|0;
 $st = $st|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($s|0)==(0|0);
 do {
  if ($0) {
   $$0 = 1;
  } else {
   $1 = ($wc>>>0)<(128);
   if ($1) {
    $2 = $wc&255;
    HEAP8[$s>>0] = $2;
    $$0 = 1;
    break;
   }
   $3 = ($wc>>>0)<(2048);
   if ($3) {
    $4 = $wc >>> 6;
    $5 = $4 | 192;
    $6 = $5&255;
    $7 = ((($s)) + 1|0);
    HEAP8[$s>>0] = $6;
    $8 = $wc & 63;
    $9 = $8 | 128;
    $10 = $9&255;
    HEAP8[$7>>0] = $10;
    $$0 = 2;
    break;
   }
   $11 = ($wc>>>0)<(55296);
   $12 = $wc & -8192;
   $13 = ($12|0)==(57344);
   $or$cond = $11 | $13;
   if ($or$cond) {
    $14 = $wc >>> 12;
    $15 = $14 | 224;
    $16 = $15&255;
    $17 = ((($s)) + 1|0);
    HEAP8[$s>>0] = $16;
    $18 = $wc >>> 6;
    $19 = $18 & 63;
    $20 = $19 | 128;
    $21 = $20&255;
    $22 = ((($s)) + 2|0);
    HEAP8[$17>>0] = $21;
    $23 = $wc & 63;
    $24 = $23 | 128;
    $25 = $24&255;
    HEAP8[$22>>0] = $25;
    $$0 = 3;
    break;
   }
   $26 = (($wc) + -65536)|0;
   $27 = ($26>>>0)<(1048576);
   if ($27) {
    $28 = $wc >>> 18;
    $29 = $28 | 240;
    $30 = $29&255;
    $31 = ((($s)) + 1|0);
    HEAP8[$s>>0] = $30;
    $32 = $wc >>> 12;
    $33 = $32 & 63;
    $34 = $33 | 128;
    $35 = $34&255;
    $36 = ((($s)) + 2|0);
    HEAP8[$31>>0] = $35;
    $37 = $wc >>> 6;
    $38 = $37 & 63;
    $39 = $38 | 128;
    $40 = $39&255;
    $41 = ((($s)) + 3|0);
    HEAP8[$36>>0] = $40;
    $42 = $wc & 63;
    $43 = $42 | 128;
    $44 = $43&255;
    HEAP8[$41>>0] = $44;
    $$0 = 4;
    break;
   } else {
    $45 = (___errno_location()|0);
    HEAP32[$45>>2] = 84;
    $$0 = -1;
    break;
   }
  }
 } while(0);
 return ($$0|0);
}
function _wctomb($s,$wc) {
 $s = $s|0;
 $wc = $wc|0;
 var $$0 = 0, $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($s|0)==(0|0);
 if ($0) {
  $$0 = 0;
 } else {
  $1 = (_wcrtomb($s,$wc,0)|0);
  $$0 = $1;
 }
 return ($$0|0);
}
function _strncmp($_l,$_r,$n) {
 $_l = $_l|0;
 $_r = $_r|0;
 $n = $n|0;
 var $$03 = 0, $$08 = 0, $$08$in = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $l$06 = 0, $or$cond = 0, $or$cond4 = 0, $r$0$lcssa = 0, $r$07 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n|0)==(0);
 if ($0) {
  $$03 = 0;
 } else {
  $1 = HEAP8[$_l>>0]|0;
  $2 = ($1<<24>>24)==(0);
  L3: do {
   if ($2) {
    $13 = 0;$r$0$lcssa = $_r;
   } else {
    $$08$in = $n;$6 = $1;$l$06 = $_l;$r$07 = $_r;
    while(1) {
     $$08 = (($$08$in) + -1)|0;
     $3 = HEAP8[$r$07>>0]|0;
     $4 = ($3<<24>>24)!=(0);
     $5 = ($$08|0)!=(0);
     $or$cond = $5 & $4;
     $7 = ($6<<24>>24)==($3<<24>>24);
     $or$cond4 = $7 & $or$cond;
     if (!($or$cond4)) {
      $13 = $6;$r$0$lcssa = $r$07;
      break L3;
     }
     $8 = ((($l$06)) + 1|0);
     $9 = ((($r$07)) + 1|0);
     $10 = HEAP8[$8>>0]|0;
     $11 = ($10<<24>>24)==(0);
     if ($11) {
      $13 = 0;$r$0$lcssa = $9;
      break;
     } else {
      $$08$in = $$08;$6 = $10;$l$06 = $8;$r$07 = $9;
     }
    }
   }
  } while(0);
  $12 = $13&255;
  $14 = HEAP8[$r$0$lcssa>>0]|0;
  $15 = $14&255;
  $16 = (($12) - ($15))|0;
  $$03 = $16;
 }
 return ($$03|0);
}
function ___stpncpy($d,$s,$n) {
 $d = $d|0;
 $s = $s|0;
 $n = $n|0;
 var $$0$lcssa = 0, $$0$lcssa60 = 0, $$031 = 0, $$04$lcssa = 0, $$04$lcssa61 = 0, $$0430 = 0, $$06$lcssa = 0, $$06$lcssa62 = 0, $$0629 = 0, $$1$lcssa = 0, $$117 = 0, $$15$ph = 0, $$1511 = 0, $$17$ph = 0, $$1710 = 0, $$2$ph = 0, $$212 = 0, $$28 = 0, $$3 = 0, $$lcssa = 0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond28 = 0, $wd$0$lcssa = 0;
 var $wd$018 = 0, $ws$0$lcssa = 0, $ws$019 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $s;
 $1 = $d;
 $2 = $0 ^ $1;
 $3 = $2 & 3;
 $4 = ($3|0)==(0);
 do {
  if ($4) {
   $5 = $0 & 3;
   $6 = ($5|0)!=(0);
   $7 = ($n|0)!=(0);
   $or$cond28 = $7 & $6;
   L3: do {
    if ($or$cond28) {
     $$031 = $n;$$0430 = $s;$$0629 = $d;
     while(1) {
      $8 = HEAP8[$$0430>>0]|0;
      HEAP8[$$0629>>0] = $8;
      $9 = ($8<<24>>24)==(0);
      if ($9) {
       $$0$lcssa60 = $$031;$$04$lcssa61 = $$0430;$$06$lcssa62 = $$0629;
       break L3;
      }
      $10 = (($$031) + -1)|0;
      $11 = ((($$0430)) + 1|0);
      $12 = ((($$0629)) + 1|0);
      $13 = $11;
      $14 = $13 & 3;
      $15 = ($14|0)!=(0);
      $16 = ($10|0)!=(0);
      $or$cond = $16 & $15;
      if ($or$cond) {
       $$031 = $10;$$0430 = $11;$$0629 = $12;
      } else {
       $$0$lcssa = $10;$$04$lcssa = $11;$$06$lcssa = $12;$$lcssa = $16;
       label = 5;
       break;
      }
     }
    } else {
     $$0$lcssa = $n;$$04$lcssa = $s;$$06$lcssa = $d;$$lcssa = $7;
     label = 5;
    }
   } while(0);
   if ((label|0) == 5) {
    if ($$lcssa) {
     $$0$lcssa60 = $$0$lcssa;$$04$lcssa61 = $$04$lcssa;$$06$lcssa62 = $$06$lcssa;
    } else {
     $$28 = $$06$lcssa;$$3 = 0;
     break;
    }
   }
   $17 = HEAP8[$$04$lcssa61>>0]|0;
   $18 = ($17<<24>>24)==(0);
   if ($18) {
    $$28 = $$06$lcssa62;$$3 = $$0$lcssa60;
   } else {
    $19 = ($$0$lcssa60>>>0)>(3);
    L11: do {
     if ($19) {
      $$117 = $$0$lcssa60;$wd$018 = $$06$lcssa62;$ws$019 = $$04$lcssa61;
      while(1) {
       $20 = HEAP32[$ws$019>>2]|0;
       $21 = (($20) + -16843009)|0;
       $22 = $20 & -2139062144;
       $23 = $22 ^ -2139062144;
       $24 = $23 & $21;
       $25 = ($24|0)==(0);
       if (!($25)) {
        $$1$lcssa = $$117;$wd$0$lcssa = $wd$018;$ws$0$lcssa = $ws$019;
        break L11;
       }
       HEAP32[$wd$018>>2] = $20;
       $26 = (($$117) + -4)|0;
       $27 = ((($ws$019)) + 4|0);
       $28 = ((($wd$018)) + 4|0);
       $29 = ($26>>>0)>(3);
       if ($29) {
        $$117 = $26;$wd$018 = $28;$ws$019 = $27;
       } else {
        $$1$lcssa = $26;$wd$0$lcssa = $28;$ws$0$lcssa = $27;
        break;
       }
      }
     } else {
      $$1$lcssa = $$0$lcssa60;$wd$0$lcssa = $$06$lcssa62;$ws$0$lcssa = $$04$lcssa61;
     }
    } while(0);
    $$15$ph = $ws$0$lcssa;$$17$ph = $wd$0$lcssa;$$2$ph = $$1$lcssa;
    label = 11;
   }
  } else {
   $$15$ph = $s;$$17$ph = $d;$$2$ph = $n;
   label = 11;
  }
 } while(0);
 L16: do {
  if ((label|0) == 11) {
   $30 = ($$2$ph|0)==(0);
   if ($30) {
    $$28 = $$17$ph;$$3 = 0;
   } else {
    $$1511 = $$15$ph;$$1710 = $$17$ph;$$212 = $$2$ph;
    while(1) {
     $31 = HEAP8[$$1511>>0]|0;
     HEAP8[$$1710>>0] = $31;
     $32 = ($31<<24>>24)==(0);
     if ($32) {
      $$28 = $$1710;$$3 = $$212;
      break L16;
     }
     $33 = (($$212) + -1)|0;
     $34 = ((($$1511)) + 1|0);
     $35 = ((($$1710)) + 1|0);
     $36 = ($33|0)==(0);
     if ($36) {
      $$28 = $35;$$3 = 0;
      break;
     } else {
      $$1511 = $34;$$1710 = $35;$$212 = $33;
     }
    }
   }
  }
 } while(0);
 _memset(($$28|0),0,($$3|0))|0;
 return ($$28|0);
}
function _memchr($src,$c,$n) {
 $src = $src|0;
 $c = $c|0;
 $n = $n|0;
 var $$0$lcssa = 0, $$0$lcssa44 = 0, $$019 = 0, $$1$lcssa = 0, $$110 = 0, $$110$lcssa = 0, $$24 = 0, $$3 = 0, $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0;
 var $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond18 = 0, $s$0$lcssa = 0, $s$0$lcssa43 = 0, $s$020 = 0, $s$15 = 0, $s$2 = 0, $w$0$lcssa = 0, $w$011 = 0, $w$011$lcssa = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $c & 255;
 $1 = $src;
 $2 = $1 & 3;
 $3 = ($2|0)!=(0);
 $4 = ($n|0)!=(0);
 $or$cond18 = $4 & $3;
 L1: do {
  if ($or$cond18) {
   $5 = $c&255;
   $$019 = $n;$s$020 = $src;
   while(1) {
    $6 = HEAP8[$s$020>>0]|0;
    $7 = ($6<<24>>24)==($5<<24>>24);
    if ($7) {
     $$0$lcssa44 = $$019;$s$0$lcssa43 = $s$020;
     label = 6;
     break L1;
    }
    $8 = ((($s$020)) + 1|0);
    $9 = (($$019) + -1)|0;
    $10 = $8;
    $11 = $10 & 3;
    $12 = ($11|0)!=(0);
    $13 = ($9|0)!=(0);
    $or$cond = $13 & $12;
    if ($or$cond) {
     $$019 = $9;$s$020 = $8;
    } else {
     $$0$lcssa = $9;$$lcssa = $13;$s$0$lcssa = $8;
     label = 5;
     break;
    }
   }
  } else {
   $$0$lcssa = $n;$$lcssa = $4;$s$0$lcssa = $src;
   label = 5;
  }
 } while(0);
 if ((label|0) == 5) {
  if ($$lcssa) {
   $$0$lcssa44 = $$0$lcssa;$s$0$lcssa43 = $s$0$lcssa;
   label = 6;
  } else {
   $$3 = 0;$s$2 = $s$0$lcssa;
  }
 }
 L8: do {
  if ((label|0) == 6) {
   $14 = HEAP8[$s$0$lcssa43>>0]|0;
   $15 = $c&255;
   $16 = ($14<<24>>24)==($15<<24>>24);
   if ($16) {
    $$3 = $$0$lcssa44;$s$2 = $s$0$lcssa43;
   } else {
    $17 = Math_imul($0, 16843009)|0;
    $18 = ($$0$lcssa44>>>0)>(3);
    L11: do {
     if ($18) {
      $$110 = $$0$lcssa44;$w$011 = $s$0$lcssa43;
      while(1) {
       $19 = HEAP32[$w$011>>2]|0;
       $20 = $19 ^ $17;
       $21 = (($20) + -16843009)|0;
       $22 = $20 & -2139062144;
       $23 = $22 ^ -2139062144;
       $24 = $23 & $21;
       $25 = ($24|0)==(0);
       if (!($25)) {
        $$110$lcssa = $$110;$w$011$lcssa = $w$011;
        break;
       }
       $26 = ((($w$011)) + 4|0);
       $27 = (($$110) + -4)|0;
       $28 = ($27>>>0)>(3);
       if ($28) {
        $$110 = $27;$w$011 = $26;
       } else {
        $$1$lcssa = $27;$w$0$lcssa = $26;
        label = 11;
        break L11;
       }
      }
      $$24 = $$110$lcssa;$s$15 = $w$011$lcssa;
     } else {
      $$1$lcssa = $$0$lcssa44;$w$0$lcssa = $s$0$lcssa43;
      label = 11;
     }
    } while(0);
    if ((label|0) == 11) {
     $29 = ($$1$lcssa|0)==(0);
     if ($29) {
      $$3 = 0;$s$2 = $w$0$lcssa;
      break;
     } else {
      $$24 = $$1$lcssa;$s$15 = $w$0$lcssa;
     }
    }
    while(1) {
     $30 = HEAP8[$s$15>>0]|0;
     $31 = ($30<<24>>24)==($15<<24>>24);
     if ($31) {
      $$3 = $$24;$s$2 = $s$15;
      break L8;
     }
     $32 = ((($s$15)) + 1|0);
     $33 = (($$24) + -1)|0;
     $34 = ($33|0)==(0);
     if ($34) {
      $$3 = 0;$s$2 = $32;
      break;
     } else {
      $$24 = $33;$s$15 = $32;
     }
    }
   }
  }
 } while(0);
 $35 = ($$3|0)!=(0);
 $36 = $35 ? $s$2 : 0;
 return ($36|0);
}
function _strncpy($d,$s,$n) {
 $d = $d|0;
 $s = $s|0;
 $n = $n|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 (___stpncpy($d,$s,$n)|0);
 return ($d|0);
}
function _frexpl($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_frexp($x,$e));
 return (+$0);
}
function _frexp($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $$0 = 0.0, $$01 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, $storemerge = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $3 = tempRet0;
 $4 = $2 & 2047;
 switch ($4|0) {
 case 0:  {
  $5 = $x != 0.0;
  if ($5) {
   $6 = $x * 1.8446744073709552E+19;
   $7 = (+_frexp($6,$e));
   $8 = HEAP32[$e>>2]|0;
   $9 = (($8) + -64)|0;
   $$01 = $7;$storemerge = $9;
  } else {
   $$01 = $x;$storemerge = 0;
  }
  HEAP32[$e>>2] = $storemerge;
  $$0 = $$01;
  break;
 }
 case 2047:  {
  $$0 = $x;
  break;
 }
 default: {
  $10 = (($4) + -1022)|0;
  HEAP32[$e>>2] = $10;
  $11 = $1 & -2146435073;
  $12 = $11 | 1071644672;
  HEAP32[tempDoublePtr>>2] = $0;HEAP32[tempDoublePtr+4>>2] = $12;$13 = +HEAPF64[tempDoublePtr>>3];
  $$0 = $13;
 }
 }
 return (+$$0);
}
function ___errno_location() {
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[3020>>2]|0;
 $1 = ($0|0)==(0|0);
 if ($1) {
  $$0 = 3068;
 } else {
  $2 = (_pthread_self()|0);
  $3 = ((($2)) + 60|0);
  $4 = HEAP32[$3>>2]|0;
  $$0 = $4;
 }
 return ($$0|0);
}
function _strerror($e) {
 $e = $e|0;
 var $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$03 = 0, $i$03$lcssa = 0, $i$12 = 0, $s$0$lcssa = 0, $s$01 = 0, $s$1 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $i$03 = 0;
 while(1) {
  $1 = (5239 + ($i$03)|0);
  $2 = HEAP8[$1>>0]|0;
  $3 = $2&255;
  $4 = ($3|0)==($e|0);
  if ($4) {
   $i$03$lcssa = $i$03;
   label = 2;
   break;
  }
  $5 = (($i$03) + 1)|0;
  $6 = ($5|0)==(87);
  if ($6) {
   $i$12 = 87;$s$01 = 5327;
   label = 5;
   break;
  } else {
   $i$03 = $5;
  }
 }
 if ((label|0) == 2) {
  $0 = ($i$03$lcssa|0)==(0);
  if ($0) {
   $s$0$lcssa = 5327;
  } else {
   $i$12 = $i$03$lcssa;$s$01 = 5327;
   label = 5;
  }
 }
 if ((label|0) == 5) {
  while(1) {
   label = 0;
   $s$1 = $s$01;
   while(1) {
    $7 = HEAP8[$s$1>>0]|0;
    $8 = ($7<<24>>24)==(0);
    $9 = ((($s$1)) + 1|0);
    if ($8) {
     $$lcssa = $9;
     break;
    } else {
     $s$1 = $9;
    }
   }
   $10 = (($i$12) + -1)|0;
   $11 = ($10|0)==(0);
   if ($11) {
    $s$0$lcssa = $$lcssa;
    break;
   } else {
    $i$12 = $10;$s$01 = $$lcssa;
    label = 5;
   }
  }
 }
 return ($s$0$lcssa|0);
}
function ___syscall_ret($r) {
 $r = $r|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($r>>>0)>(4294963200);
 if ($0) {
  $1 = (0 - ($r))|0;
  $2 = (___errno_location()|0);
  HEAP32[$2>>2] = $1;
  $$0 = -1;
 } else {
  $$0 = $r;
 }
 return ($$0|0);
}
function ___stdio_seek($f,$off,$whence) {
 $f = $f|0;
 $off = $off|0;
 $whence = $whence|0;
 var $$pre = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $ret = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, $vararg_ptr3 = 0, $vararg_ptr4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $ret = sp + 20|0;
 $0 = ((($f)) + 60|0);
 $1 = HEAP32[$0>>2]|0;
 HEAP32[$vararg_buffer>>2] = $1;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = 0;
 $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
 HEAP32[$vararg_ptr2>>2] = $off;
 $vararg_ptr3 = ((($vararg_buffer)) + 12|0);
 HEAP32[$vararg_ptr3>>2] = $ret;
 $vararg_ptr4 = ((($vararg_buffer)) + 16|0);
 HEAP32[$vararg_ptr4>>2] = $whence;
 $2 = (___syscall140(140,($vararg_buffer|0))|0);
 $3 = (___syscall_ret($2)|0);
 $4 = ($3|0)<(0);
 if ($4) {
  HEAP32[$ret>>2] = -1;
  $5 = -1;
 } else {
  $$pre = HEAP32[$ret>>2]|0;
  $5 = $$pre;
 }
 STACKTOP = sp;return ($5|0);
}
function _vsnprintf($s,$n,$fmt,$ap) {
 $s = $s|0;
 $n = $n|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 var $$$02 = 0, $$0 = 0, $$01 = 0, $$02 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, $b = 0, $f = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $b = sp + 112|0;
 $f = sp;
 dest=$f; src=3072; stop=dest+112|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 $0 = (($n) + -1)|0;
 $1 = ($0>>>0)>(2147483646);
 if ($1) {
  $2 = ($n|0)==(0);
  if ($2) {
   $$01 = $b;$$02 = 1;
   label = 4;
  } else {
   $3 = (___errno_location()|0);
   HEAP32[$3>>2] = 75;
   $$0 = -1;
  }
 } else {
  $$01 = $s;$$02 = $n;
  label = 4;
 }
 if ((label|0) == 4) {
  $4 = $$01;
  $5 = (-2 - ($4))|0;
  $6 = ($$02>>>0)>($5>>>0);
  $$$02 = $6 ? $5 : $$02;
  $7 = ((($f)) + 48|0);
  HEAP32[$7>>2] = $$$02;
  $8 = ((($f)) + 20|0);
  HEAP32[$8>>2] = $$01;
  $9 = ((($f)) + 44|0);
  HEAP32[$9>>2] = $$01;
  $10 = (($$01) + ($$$02)|0);
  $11 = ((($f)) + 16|0);
  HEAP32[$11>>2] = $10;
  $12 = ((($f)) + 28|0);
  HEAP32[$12>>2] = $10;
  $13 = (_vfprintf($f,$fmt,$ap)|0);
  $14 = ($$$02|0)==(0);
  if ($14) {
   $$0 = $13;
  } else {
   $15 = HEAP32[$8>>2]|0;
   $16 = HEAP32[$11>>2]|0;
   $17 = ($15|0)==($16|0);
   $18 = $17 << 31 >> 31;
   $19 = (($15) + ($18)|0);
   HEAP8[$19>>0] = 0;
   $$0 = $13;
  }
 }
 STACKTOP = sp;return ($$0|0);
}
function _fprintf($f,$fmt,$varargs) {
 $f = $f|0;
 $fmt = $fmt|0;
 $varargs = $varargs|0;
 var $0 = 0, $ap = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ap = sp;
 HEAP32[$ap>>2] = $varargs;
 $0 = (_vfprintf($f,$fmt,$ap)|0);
 STACKTOP = sp;return ($0|0);
}
function ___stdio_write($f,$buf,$len) {
 $f = $f|0;
 $buf = $buf|0;
 $len = $len|0;
 var $$0 = 0, $$phi$trans$insert = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $cnt$0 = 0, $cnt$1 = 0, $iov$0 = 0, $iov$0$lcssa11 = 0, $iov$1 = 0, $iovcnt$0 = 0;
 var $iovcnt$0$lcssa12 = 0, $iovcnt$1 = 0, $iovs = 0, $rem$0 = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, $vararg_ptr6 = 0, $vararg_ptr7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer = sp;
 $iovs = sp + 32|0;
 $0 = ((($f)) + 28|0);
 $1 = HEAP32[$0>>2]|0;
 HEAP32[$iovs>>2] = $1;
 $2 = ((($iovs)) + 4|0);
 $3 = ((($f)) + 20|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = $4;
 $6 = (($5) - ($1))|0;
 HEAP32[$2>>2] = $6;
 $7 = ((($iovs)) + 8|0);
 HEAP32[$7>>2] = $buf;
 $8 = ((($iovs)) + 12|0);
 HEAP32[$8>>2] = $len;
 $9 = (($6) + ($len))|0;
 $10 = ((($f)) + 60|0);
 $11 = ((($f)) + 44|0);
 $iov$0 = $iovs;$iovcnt$0 = 2;$rem$0 = $9;
 while(1) {
  $12 = HEAP32[3020>>2]|0;
  $13 = ($12|0)==(0|0);
  if ($13) {
   $17 = HEAP32[$10>>2]|0;
   HEAP32[$vararg_buffer3>>2] = $17;
   $vararg_ptr6 = ((($vararg_buffer3)) + 4|0);
   HEAP32[$vararg_ptr6>>2] = $iov$0;
   $vararg_ptr7 = ((($vararg_buffer3)) + 8|0);
   HEAP32[$vararg_ptr7>>2] = $iovcnt$0;
   $18 = (___syscall146(146,($vararg_buffer3|0))|0);
   $19 = (___syscall_ret($18)|0);
   $cnt$0 = $19;
  } else {
   _pthread_cleanup_push((31|0),($f|0));
   $14 = HEAP32[$10>>2]|0;
   HEAP32[$vararg_buffer>>2] = $14;
   $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
   HEAP32[$vararg_ptr1>>2] = $iov$0;
   $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
   HEAP32[$vararg_ptr2>>2] = $iovcnt$0;
   $15 = (___syscall146(146,($vararg_buffer|0))|0);
   $16 = (___syscall_ret($15)|0);
   _pthread_cleanup_pop(0);
   $cnt$0 = $16;
  }
  $20 = ($rem$0|0)==($cnt$0|0);
  if ($20) {
   label = 6;
   break;
  }
  $27 = ($cnt$0|0)<(0);
  if ($27) {
   $iov$0$lcssa11 = $iov$0;$iovcnt$0$lcssa12 = $iovcnt$0;
   label = 8;
   break;
  }
  $35 = (($rem$0) - ($cnt$0))|0;
  $36 = ((($iov$0)) + 4|0);
  $37 = HEAP32[$36>>2]|0;
  $38 = ($cnt$0>>>0)>($37>>>0);
  if ($38) {
   $39 = HEAP32[$11>>2]|0;
   HEAP32[$0>>2] = $39;
   HEAP32[$3>>2] = $39;
   $40 = (($cnt$0) - ($37))|0;
   $41 = ((($iov$0)) + 8|0);
   $42 = (($iovcnt$0) + -1)|0;
   $$phi$trans$insert = ((($iov$0)) + 12|0);
   $$pre = HEAP32[$$phi$trans$insert>>2]|0;
   $50 = $$pre;$cnt$1 = $40;$iov$1 = $41;$iovcnt$1 = $42;
  } else {
   $43 = ($iovcnt$0|0)==(2);
   if ($43) {
    $44 = HEAP32[$0>>2]|0;
    $45 = (($44) + ($cnt$0)|0);
    HEAP32[$0>>2] = $45;
    $50 = $37;$cnt$1 = $cnt$0;$iov$1 = $iov$0;$iovcnt$1 = 2;
   } else {
    $50 = $37;$cnt$1 = $cnt$0;$iov$1 = $iov$0;$iovcnt$1 = $iovcnt$0;
   }
  }
  $46 = HEAP32[$iov$1>>2]|0;
  $47 = (($46) + ($cnt$1)|0);
  HEAP32[$iov$1>>2] = $47;
  $48 = ((($iov$1)) + 4|0);
  $49 = (($50) - ($cnt$1))|0;
  HEAP32[$48>>2] = $49;
  $iov$0 = $iov$1;$iovcnt$0 = $iovcnt$1;$rem$0 = $35;
 }
 if ((label|0) == 6) {
  $21 = HEAP32[$11>>2]|0;
  $22 = ((($f)) + 48|0);
  $23 = HEAP32[$22>>2]|0;
  $24 = (($21) + ($23)|0);
  $25 = ((($f)) + 16|0);
  HEAP32[$25>>2] = $24;
  $26 = $21;
  HEAP32[$0>>2] = $26;
  HEAP32[$3>>2] = $26;
  $$0 = $len;
 }
 else if ((label|0) == 8) {
  $28 = ((($f)) + 16|0);
  HEAP32[$28>>2] = 0;
  HEAP32[$0>>2] = 0;
  HEAP32[$3>>2] = 0;
  $29 = HEAP32[$f>>2]|0;
  $30 = $29 | 32;
  HEAP32[$f>>2] = $30;
  $31 = ($iovcnt$0$lcssa12|0)==(2);
  if ($31) {
   $$0 = 0;
  } else {
   $32 = ((($iov$0$lcssa11)) + 4|0);
   $33 = HEAP32[$32>>2]|0;
   $34 = (($len) - ($33))|0;
   $$0 = $34;
  }
 }
 STACKTOP = sp;return ($$0|0);
}
function ___stdio_close($f) {
 $f = $f|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer = sp;
 $0 = ((($f)) + 60|0);
 $1 = HEAP32[$0>>2]|0;
 HEAP32[$vararg_buffer>>2] = $1;
 $2 = (___syscall6(6,($vararg_buffer|0))|0);
 $3 = (___syscall_ret($2)|0);
 STACKTOP = sp;return ($3|0);
}
function _vfprintf($f,$fmt,$ap) {
 $f = $f|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 var $$ = 0, $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $ap2 = 0, $internal_buf = 0, $nl_arg = 0, $nl_type = 0;
 var $ret$1 = 0, $ret$1$ = 0, $vacopy_currentptr = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 224|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ap2 = sp + 120|0;
 $nl_type = sp + 80|0;
 $nl_arg = sp;
 $internal_buf = sp + 136|0;
 dest=$nl_type; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $vacopy_currentptr = HEAP32[$ap>>2]|0;
 HEAP32[$ap2>>2] = $vacopy_currentptr;
 $0 = (_printf_core(0,$fmt,$ap2,$nl_arg,$nl_type)|0);
 $1 = ($0|0)<(0);
 if ($1) {
  $$0 = -1;
 } else {
  $2 = ((($f)) + 76|0);
  $3 = HEAP32[$2>>2]|0;
  $4 = ($3|0)>(-1);
  if ($4) {
   $5 = (___lockfile($f)|0);
   $32 = $5;
  } else {
   $32 = 0;
  }
  $6 = HEAP32[$f>>2]|0;
  $7 = $6 & 32;
  $8 = ((($f)) + 74|0);
  $9 = HEAP8[$8>>0]|0;
  $10 = ($9<<24>>24)<(1);
  if ($10) {
   $11 = $6 & -33;
   HEAP32[$f>>2] = $11;
  }
  $12 = ((($f)) + 48|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = ($13|0)==(0);
  if ($14) {
   $16 = ((($f)) + 44|0);
   $17 = HEAP32[$16>>2]|0;
   HEAP32[$16>>2] = $internal_buf;
   $18 = ((($f)) + 28|0);
   HEAP32[$18>>2] = $internal_buf;
   $19 = ((($f)) + 20|0);
   HEAP32[$19>>2] = $internal_buf;
   HEAP32[$12>>2] = 80;
   $20 = ((($internal_buf)) + 80|0);
   $21 = ((($f)) + 16|0);
   HEAP32[$21>>2] = $20;
   $22 = (_printf_core($f,$fmt,$ap2,$nl_arg,$nl_type)|0);
   $23 = ($17|0)==(0|0);
   if ($23) {
    $ret$1 = $22;
   } else {
    $24 = ((($f)) + 36|0);
    $25 = HEAP32[$24>>2]|0;
    (FUNCTION_TABLE_iiii[$25 & 31]($f,0,0)|0);
    $26 = HEAP32[$19>>2]|0;
    $27 = ($26|0)==(0|0);
    $$ = $27 ? -1 : $22;
    HEAP32[$16>>2] = $17;
    HEAP32[$12>>2] = 0;
    HEAP32[$21>>2] = 0;
    HEAP32[$18>>2] = 0;
    HEAP32[$19>>2] = 0;
    $ret$1 = $$;
   }
  } else {
   $15 = (_printf_core($f,$fmt,$ap2,$nl_arg,$nl_type)|0);
   $ret$1 = $15;
  }
  $28 = HEAP32[$f>>2]|0;
  $29 = $28 & 32;
  $30 = ($29|0)==(0);
  $ret$1$ = $30 ? $ret$1 : -1;
  $31 = $28 | $7;
  HEAP32[$f>>2] = $31;
  $33 = ($32|0)==(0);
  if (!($33)) {
   ___unlockfile($f);
  }
  $$0 = $ret$1$;
 }
 STACKTOP = sp;return ($$0|0);
}
function ___towrite($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 74|0);
 $1 = HEAP8[$0>>0]|0;
 $2 = $1 << 24 >> 24;
 $3 = (($2) + 255)|0;
 $4 = $3 | $2;
 $5 = $4&255;
 HEAP8[$0>>0] = $5;
 $6 = HEAP32[$f>>2]|0;
 $7 = $6 & 8;
 $8 = ($7|0)==(0);
 if ($8) {
  $10 = ((($f)) + 8|0);
  HEAP32[$10>>2] = 0;
  $11 = ((($f)) + 4|0);
  HEAP32[$11>>2] = 0;
  $12 = ((($f)) + 44|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = ((($f)) + 28|0);
  HEAP32[$14>>2] = $13;
  $15 = ((($f)) + 20|0);
  HEAP32[$15>>2] = $13;
  $16 = $13;
  $17 = ((($f)) + 48|0);
  $18 = HEAP32[$17>>2]|0;
  $19 = (($16) + ($18)|0);
  $20 = ((($f)) + 16|0);
  HEAP32[$20>>2] = $19;
  $$0 = 0;
 } else {
  $9 = $6 | 32;
  HEAP32[$f>>2] = $9;
  $$0 = -1;
 }
 return ($$0|0);
}
function ___lockfile($f) {
 $f = $f|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function ___unlockfile($f) {
 $f = $f|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function ___fwritex($s,$l,$f) {
 $s = $s|0;
 $l = $l|0;
 $f = $f|0;
 var $$0 = 0, $$01 = 0, $$02 = 0, $$pre = 0, $$pre6 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$0 = 0, $i$0$lcssa10 = 0;
 var $i$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0|0);
 if ($2) {
  $3 = (___towrite($f)|0);
  $4 = ($3|0)==(0);
  if ($4) {
   $$pre = HEAP32[$0>>2]|0;
   $7 = $$pre;
   label = 4;
  } else {
   $$0 = 0;
  }
 } else {
  $7 = $1;
  label = 4;
 }
 L4: do {
  if ((label|0) == 4) {
   $5 = ((($f)) + 20|0);
   $6 = HEAP32[$5>>2]|0;
   $8 = $7;
   $9 = $6;
   $10 = (($8) - ($9))|0;
   $11 = ($10>>>0)<($l>>>0);
   if ($11) {
    $12 = ((($f)) + 36|0);
    $13 = HEAP32[$12>>2]|0;
    $14 = (FUNCTION_TABLE_iiii[$13 & 31]($f,$s,$l)|0);
    $$0 = $14;
    break;
   }
   $15 = ((($f)) + 75|0);
   $16 = HEAP8[$15>>0]|0;
   $17 = ($16<<24>>24)>(-1);
   L9: do {
    if ($17) {
     $i$0 = $l;
     while(1) {
      $18 = ($i$0|0)==(0);
      if ($18) {
       $$01 = $l;$$02 = $s;$29 = $6;$i$1 = 0;
       break L9;
      }
      $19 = (($i$0) + -1)|0;
      $20 = (($s) + ($19)|0);
      $21 = HEAP8[$20>>0]|0;
      $22 = ($21<<24>>24)==(10);
      if ($22) {
       $i$0$lcssa10 = $i$0;
       break;
      } else {
       $i$0 = $19;
      }
     }
     $23 = ((($f)) + 36|0);
     $24 = HEAP32[$23>>2]|0;
     $25 = (FUNCTION_TABLE_iiii[$24 & 31]($f,$s,$i$0$lcssa10)|0);
     $26 = ($25>>>0)<($i$0$lcssa10>>>0);
     if ($26) {
      $$0 = $i$0$lcssa10;
      break L4;
     }
     $27 = (($s) + ($i$0$lcssa10)|0);
     $28 = (($l) - ($i$0$lcssa10))|0;
     $$pre6 = HEAP32[$5>>2]|0;
     $$01 = $28;$$02 = $27;$29 = $$pre6;$i$1 = $i$0$lcssa10;
    } else {
     $$01 = $l;$$02 = $s;$29 = $6;$i$1 = 0;
    }
   } while(0);
   _memcpy(($29|0),($$02|0),($$01|0))|0;
   $30 = HEAP32[$5>>2]|0;
   $31 = (($30) + ($$01)|0);
   HEAP32[$5>>2] = $31;
   $32 = (($i$1) + ($$01))|0;
   $$0 = $32;
  }
 } while(0);
 return ($$0|0);
}
function _cleanup565($p) {
 $p = $p|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($p)) + 68|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0);
 if ($2) {
  ___unlockfile($p);
 }
 return;
}
function _printf_core($f,$fmt,$ap,$nl_arg,$nl_type) {
 $f = $f|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 $nl_arg = $nl_arg|0;
 $nl_type = $nl_type|0;
 var $$ = 0, $$$i = 0, $$0 = 0, $$0$i = 0, $$0$lcssa$i = 0, $$012$i = 0, $$013$i = 0, $$03$i33 = 0, $$07$i = 0.0, $$1$i = 0.0, $$114$i = 0, $$2$i = 0.0, $$20$i = 0.0, $$21$i = 0, $$210$$22$i = 0, $$210$$24$i = 0, $$210$i = 0, $$23$i = 0, $$3$i = 0.0, $$31$i = 0;
 var $$311$i = 0, $$4$i = 0.0, $$412$lcssa$i = 0, $$41276$i = 0, $$43 = 0, $$5$lcssa$i = 0, $$587$i = 0, $$a$3$i = 0, $$a$3185$i = 0, $$a$3186$i = 0, $$fl$4 = 0, $$l10n$0 = 0, $$lcssa159$i = 0, $$lcssa321 = 0, $$lcssa322 = 0, $$lcssa326 = 0, $$lcssa328 = 0, $$lcssa329 = 0, $$lcssa330 = 0, $$lcssa331 = 0;
 var $$lcssa332 = 0, $$lcssa334 = 0, $$lcssa344 = 0, $$lcssa347 = 0.0, $$lcssa349 = 0, $$lcssa52 = 0, $$neg52$i = 0, $$neg53$i = 0, $$p$$i = 0, $$p$0 = 0, $$p$5 = 0, $$p$i = 0, $$pn$i = 0, $$pr$i = 0, $$pr47$i = 0, $$pre = 0, $$pre$i = 0, $$pre$phi184$iZ2D = 0, $$pre179$i = 0, $$pre182$i = 0;
 var $$pre183$i = 0, $$pre190 = 0, $$sum$i = 0, $$sum15$i = 0, $$sum16$i = 0, $$z$3$i = 0, $$z$4$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0;
 var $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0;
 var $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0;
 var $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0;
 var $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0;
 var $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0;
 var $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0;
 var $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0;
 var $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0;
 var $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0;
 var $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0;
 var $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0;
 var $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0;
 var $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0;
 var $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0;
 var $362 = 0, $363 = 0, $364 = 0.0, $365 = 0, $366 = 0, $367 = 0, $368 = 0.0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0;
 var $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0.0, $397 = 0.0, $398 = 0;
 var $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0.0, $413 = 0, $414 = 0, $415 = 0;
 var $416 = 0.0, $417 = 0.0, $418 = 0.0, $419 = 0.0, $42 = 0, $420 = 0.0, $421 = 0.0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0;
 var $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0.0, $448 = 0.0, $449 = 0.0, $45 = 0, $450 = 0, $451 = 0;
 var $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0;
 var $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0.0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0;
 var $489 = 0, $49 = 0, $490 = 0.0, $491 = 0.0, $492 = 0.0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0;
 var $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0;
 var $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0;
 var $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0;
 var $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0;
 var $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0;
 var $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0.0, $602 = 0.0, $603 = 0, $604 = 0.0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0;
 var $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0;
 var $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0;
 var $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0;
 var $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0;
 var $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0;
 var $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0;
 var $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0;
 var $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0;
 var $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0;
 var $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0;
 var $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0;
 var $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $a$0 = 0, $a$1 = 0, $a$1$lcssa$i = 0, $a$1147$i = 0, $a$2 = 0, $a$2$ph$i = 0, $a$3$lcssa$i = 0, $a$3134$i = 0, $a$5$lcssa$i = 0, $a$5109$i = 0;
 var $a$6$i = 0, $a$7$i = 0, $a$8$ph$i = 0, $arg = 0, $arglist_current = 0, $arglist_current2 = 0, $arglist_next = 0, $arglist_next3 = 0, $argpos$0 = 0, $big$i = 0, $buf = 0, $buf$i = 0, $carry$0140$i = 0, $carry3$0128$i = 0, $cnt$0 = 0, $cnt$1 = 0, $cnt$1$lcssa = 0, $d$0$i = 0, $d$0139$i = 0, $d$0141$i = 0;
 var $d$1127$i = 0, $d$2$lcssa$i = 0, $d$2108$i = 0, $d$3$i = 0, $d$482$i = 0, $d$575$i = 0, $d$686$i = 0, $e$0123$i = 0, $e$1$i = 0, $e$2104$i = 0, $e$3$i = 0, $e$4$ph$i = 0, $e2$i = 0, $ebuf0$i = 0, $estr$0$i = 0, $estr$1$lcssa$i = 0, $estr$193$i = 0, $estr$2$i = 0, $exitcond$i = 0, $expanded = 0;
 var $expanded10 = 0, $expanded11 = 0, $expanded13 = 0, $expanded14 = 0, $expanded15 = 0, $expanded4 = 0, $expanded6 = 0, $expanded7 = 0, $expanded8 = 0, $fl$0103 = 0, $fl$056 = 0, $fl$1 = 0, $fl$1$ = 0, $fl$3 = 0, $fl$4 = 0, $fl$6 = 0, $i$0$lcssa = 0, $i$0$lcssa197 = 0, $i$0108 = 0, $i$0122$i = 0;
 var $i$03$i = 0, $i$03$i25 = 0, $i$1$lcssa$i = 0, $i$1116$i = 0, $i$1119 = 0, $i$2103$i = 0, $i$295 = 0, $i$295$lcssa = 0, $i$393 = 0, $i$399$i = 0, $isdigit = 0, $isdigit$i = 0, $isdigit$i27 = 0, $isdigit10 = 0, $isdigit12 = 0, $isdigit2$i = 0, $isdigit2$i23 = 0, $isdigittmp = 0, $isdigittmp$ = 0, $isdigittmp$i = 0;
 var $isdigittmp$i26 = 0, $isdigittmp1$i = 0, $isdigittmp1$i22 = 0, $isdigittmp11 = 0, $isdigittmp4$i = 0, $isdigittmp4$i24 = 0, $isdigittmp9 = 0, $j$0$i = 0, $j$0115$i = 0, $j$0117$i = 0, $j$1100$i = 0, $j$2$i = 0, $l$0 = 0, $l$0$i = 0, $l$1$i = 0, $l$1107 = 0, $l$2 = 0, $l10n$0 = 0, $l10n$0$lcssa = 0, $l10n$0$phi = 0;
 var $l10n$1 = 0, $l10n$2 = 0, $l10n$3 = 0, $mb = 0, $notlhs$i = 0, $notrhs$i = 0, $or$cond = 0, $or$cond$i = 0, $or$cond15 = 0, $or$cond17 = 0, $or$cond20 = 0, $or$cond239 = 0, $or$cond29$i = 0, $or$cond3$not$i = 0, $or$cond6$i = 0, $p$0 = 0, $p$1 = 0, $p$2 = 0, $p$2$ = 0, $p$3 = 0;
 var $p$4195 = 0, $p$5 = 0, $pl$0 = 0, $pl$0$i = 0, $pl$1 = 0, $pl$1$i = 0, $pl$2 = 0, $prefix$0 = 0, $prefix$0$$i = 0, $prefix$0$i = 0, $prefix$1 = 0, $prefix$2 = 0, $r$0$a$8$i = 0, $re$169$i = 0, $round$068$i = 0.0, $round6$1$i = 0.0, $s$0$i = 0, $s$1$i = 0, $s$1$i$lcssa = 0, $s1$0$i = 0;
 var $s7$079$i = 0, $s7$1$i = 0, $s8$0$lcssa$i = 0, $s8$070$i = 0, $s9$0$i = 0, $s9$183$i = 0, $s9$2$i = 0, $small$0$i = 0.0, $small$1$i = 0.0, $st$0 = 0, $st$0$lcssa327 = 0, $storemerge = 0, $storemerge13 = 0, $storemerge8102 = 0, $storemerge854 = 0, $sum = 0, $t$0 = 0, $t$1 = 0, $w$$i = 0, $w$0 = 0;
 var $w$1 = 0, $w$2 = 0, $w$30$i = 0, $wc = 0, $ws$0109 = 0, $ws$1120 = 0, $z$0$i = 0, $z$0$lcssa = 0, $z$096 = 0, $z$1 = 0, $z$1$lcssa$i = 0, $z$1146$i = 0, $z$2 = 0, $z$2$i = 0, $z$2$i$lcssa = 0, $z$3$lcssa$i = 0, $z$3133$i = 0, $z$4$i = 0, $z$6$$i = 0, $z$6$i = 0;
 var $z$6$i$lcssa = 0, $z$6$ph$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 624|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $big$i = sp + 24|0;
 $e2$i = sp + 16|0;
 $buf$i = sp + 588|0;
 $ebuf0$i = sp + 576|0;
 $arg = sp;
 $buf = sp + 536|0;
 $wc = sp + 8|0;
 $mb = sp + 528|0;
 $0 = ($f|0)!=(0|0);
 $1 = ((($buf)) + 40|0);
 $2 = $1;
 $3 = ((($buf)) + 39|0);
 $4 = ((($wc)) + 4|0);
 $5 = ((($ebuf0$i)) + 12|0);
 $6 = ((($ebuf0$i)) + 11|0);
 $7 = $buf$i;
 $8 = $5;
 $9 = (($8) - ($7))|0;
 $10 = (-2 - ($7))|0;
 $11 = (($8) + 2)|0;
 $12 = ((($big$i)) + 288|0);
 $13 = ((($buf$i)) + 9|0);
 $14 = $13;
 $15 = ((($buf$i)) + 8|0);
 $22 = $fmt;$cnt$0 = 0;$l$0 = 0;$l10n$0 = 0;
 L1: while(1) {
  $16 = ($cnt$0|0)>(-1);
  do {
   if ($16) {
    $17 = (2147483647 - ($cnt$0))|0;
    $18 = ($l$0|0)>($17|0);
    if ($18) {
     $19 = (___errno_location()|0);
     HEAP32[$19>>2] = 75;
     $cnt$1 = -1;
     break;
    } else {
     $20 = (($l$0) + ($cnt$0))|0;
     $cnt$1 = $20;
     break;
    }
   } else {
    $cnt$1 = $cnt$0;
   }
  } while(0);
  $21 = HEAP8[$22>>0]|0;
  $23 = ($21<<24>>24)==(0);
  if ($23) {
   $cnt$1$lcssa = $cnt$1;$l10n$0$lcssa = $l10n$0;
   label = 245;
   break;
  } else {
   $24 = $21;$26 = $22;
  }
  L9: while(1) {
   switch ($24<<24>>24) {
   case 37:  {
    $28 = $26;$z$096 = $26;
    label = 9;
    break L9;
    break;
   }
   case 0:  {
    $$lcssa52 = $26;$z$0$lcssa = $26;
    break L9;
    break;
   }
   default: {
   }
   }
   $25 = ((($26)) + 1|0);
   $$pre = HEAP8[$25>>0]|0;
   $24 = $$pre;$26 = $25;
  }
  L12: do {
   if ((label|0) == 9) {
    while(1) {
     label = 0;
     $27 = ((($28)) + 1|0);
     $29 = HEAP8[$27>>0]|0;
     $30 = ($29<<24>>24)==(37);
     if (!($30)) {
      $$lcssa52 = $28;$z$0$lcssa = $z$096;
      break L12;
     }
     $31 = ((($z$096)) + 1|0);
     $32 = ((($28)) + 2|0);
     $33 = HEAP8[$32>>0]|0;
     $34 = ($33<<24>>24)==(37);
     if ($34) {
      $28 = $32;$z$096 = $31;
      label = 9;
     } else {
      $$lcssa52 = $32;$z$0$lcssa = $31;
      break;
     }
    }
   }
  } while(0);
  $35 = $z$0$lcssa;
  $36 = $22;
  $37 = (($35) - ($36))|0;
  if ($0) {
   $38 = HEAP32[$f>>2]|0;
   $39 = $38 & 32;
   $40 = ($39|0)==(0);
   if ($40) {
    (___fwritex($22,$37,$f)|0);
   }
  }
  $41 = ($z$0$lcssa|0)==($22|0);
  if (!($41)) {
   $l10n$0$phi = $l10n$0;$22 = $$lcssa52;$cnt$0 = $cnt$1;$l$0 = $37;$l10n$0 = $l10n$0$phi;
   continue;
  }
  $42 = ((($$lcssa52)) + 1|0);
  $43 = HEAP8[$42>>0]|0;
  $44 = $43 << 24 >> 24;
  $isdigittmp = (($44) + -48)|0;
  $isdigit = ($isdigittmp>>>0)<(10);
  if ($isdigit) {
   $45 = ((($$lcssa52)) + 2|0);
   $46 = HEAP8[$45>>0]|0;
   $47 = ($46<<24>>24)==(36);
   $48 = ((($$lcssa52)) + 3|0);
   $$43 = $47 ? $48 : $42;
   $$l10n$0 = $47 ? 1 : $l10n$0;
   $isdigittmp$ = $47 ? $isdigittmp : -1;
   $$pre190 = HEAP8[$$43>>0]|0;
   $50 = $$pre190;$argpos$0 = $isdigittmp$;$l10n$1 = $$l10n$0;$storemerge = $$43;
  } else {
   $50 = $43;$argpos$0 = -1;$l10n$1 = $l10n$0;$storemerge = $42;
  }
  $49 = $50 << 24 >> 24;
  $51 = $49 & -32;
  $52 = ($51|0)==(32);
  L25: do {
   if ($52) {
    $54 = $49;$59 = $50;$fl$0103 = 0;$storemerge8102 = $storemerge;
    while(1) {
     $53 = (($54) + -32)|0;
     $55 = 1 << $53;
     $56 = $55 & 75913;
     $57 = ($56|0)==(0);
     if ($57) {
      $68 = $59;$fl$056 = $fl$0103;$storemerge854 = $storemerge8102;
      break L25;
     }
     $58 = $59 << 24 >> 24;
     $60 = (($58) + -32)|0;
     $61 = 1 << $60;
     $62 = $61 | $fl$0103;
     $63 = ((($storemerge8102)) + 1|0);
     $64 = HEAP8[$63>>0]|0;
     $65 = $64 << 24 >> 24;
     $66 = $65 & -32;
     $67 = ($66|0)==(32);
     if ($67) {
      $54 = $65;$59 = $64;$fl$0103 = $62;$storemerge8102 = $63;
     } else {
      $68 = $64;$fl$056 = $62;$storemerge854 = $63;
      break;
     }
    }
   } else {
    $68 = $50;$fl$056 = 0;$storemerge854 = $storemerge;
   }
  } while(0);
  $69 = ($68<<24>>24)==(42);
  do {
   if ($69) {
    $70 = ((($storemerge854)) + 1|0);
    $71 = HEAP8[$70>>0]|0;
    $72 = $71 << 24 >> 24;
    $isdigittmp11 = (($72) + -48)|0;
    $isdigit12 = ($isdigittmp11>>>0)<(10);
    if ($isdigit12) {
     $73 = ((($storemerge854)) + 2|0);
     $74 = HEAP8[$73>>0]|0;
     $75 = ($74<<24>>24)==(36);
     if ($75) {
      $76 = (($nl_type) + ($isdigittmp11<<2)|0);
      HEAP32[$76>>2] = 10;
      $77 = HEAP8[$70>>0]|0;
      $78 = $77 << 24 >> 24;
      $79 = (($78) + -48)|0;
      $80 = (($nl_arg) + ($79<<3)|0);
      $81 = $80;
      $82 = $81;
      $83 = HEAP32[$82>>2]|0;
      $84 = (($81) + 4)|0;
      $85 = $84;
      $86 = HEAP32[$85>>2]|0;
      $87 = ((($storemerge854)) + 3|0);
      $l10n$2 = 1;$storemerge13 = $87;$w$0 = $83;
     } else {
      label = 24;
     }
    } else {
     label = 24;
    }
    if ((label|0) == 24) {
     label = 0;
     $88 = ($l10n$1|0)==(0);
     if (!($88)) {
      $$0 = -1;
      break L1;
     }
     if (!($0)) {
      $108 = $70;$fl$1 = $fl$056;$l10n$3 = 0;$w$1 = 0;
      break;
     }
     $arglist_current = HEAP32[$ap>>2]|0;
     $89 = $arglist_current;
     $90 = ((0) + 4|0);
     $expanded4 = $90;
     $expanded = (($expanded4) - 1)|0;
     $91 = (($89) + ($expanded))|0;
     $92 = ((0) + 4|0);
     $expanded8 = $92;
     $expanded7 = (($expanded8) - 1)|0;
     $expanded6 = $expanded7 ^ -1;
     $93 = $91 & $expanded6;
     $94 = $93;
     $95 = HEAP32[$94>>2]|0;
     $arglist_next = ((($94)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next;
     $l10n$2 = 0;$storemerge13 = $70;$w$0 = $95;
    }
    $96 = ($w$0|0)<(0);
    if ($96) {
     $97 = $fl$056 | 8192;
     $98 = (0 - ($w$0))|0;
     $108 = $storemerge13;$fl$1 = $97;$l10n$3 = $l10n$2;$w$1 = $98;
    } else {
     $108 = $storemerge13;$fl$1 = $fl$056;$l10n$3 = $l10n$2;$w$1 = $w$0;
    }
   } else {
    $99 = $68 << 24 >> 24;
    $isdigittmp1$i = (($99) + -48)|0;
    $isdigit2$i = ($isdigittmp1$i>>>0)<(10);
    if ($isdigit2$i) {
     $103 = $storemerge854;$i$03$i = 0;$isdigittmp4$i = $isdigittmp1$i;
     while(1) {
      $100 = ($i$03$i*10)|0;
      $101 = (($100) + ($isdigittmp4$i))|0;
      $102 = ((($103)) + 1|0);
      $104 = HEAP8[$102>>0]|0;
      $105 = $104 << 24 >> 24;
      $isdigittmp$i = (($105) + -48)|0;
      $isdigit$i = ($isdigittmp$i>>>0)<(10);
      if ($isdigit$i) {
       $103 = $102;$i$03$i = $101;$isdigittmp4$i = $isdigittmp$i;
      } else {
       $$lcssa321 = $101;$$lcssa322 = $102;
       break;
      }
     }
     $106 = ($$lcssa321|0)<(0);
     if ($106) {
      $$0 = -1;
      break L1;
     } else {
      $108 = $$lcssa322;$fl$1 = $fl$056;$l10n$3 = $l10n$1;$w$1 = $$lcssa321;
     }
    } else {
     $108 = $storemerge854;$fl$1 = $fl$056;$l10n$3 = $l10n$1;$w$1 = 0;
    }
   }
  } while(0);
  $107 = HEAP8[$108>>0]|0;
  $109 = ($107<<24>>24)==(46);
  L46: do {
   if ($109) {
    $110 = ((($108)) + 1|0);
    $111 = HEAP8[$110>>0]|0;
    $112 = ($111<<24>>24)==(42);
    if (!($112)) {
     $139 = $111 << 24 >> 24;
     $isdigittmp1$i22 = (($139) + -48)|0;
     $isdigit2$i23 = ($isdigittmp1$i22>>>0)<(10);
     if ($isdigit2$i23) {
      $143 = $110;$i$03$i25 = 0;$isdigittmp4$i24 = $isdigittmp1$i22;
     } else {
      $802 = $110;$p$0 = 0;
      break;
     }
     while(1) {
      $140 = ($i$03$i25*10)|0;
      $141 = (($140) + ($isdigittmp4$i24))|0;
      $142 = ((($143)) + 1|0);
      $144 = HEAP8[$142>>0]|0;
      $145 = $144 << 24 >> 24;
      $isdigittmp$i26 = (($145) + -48)|0;
      $isdigit$i27 = ($isdigittmp$i26>>>0)<(10);
      if ($isdigit$i27) {
       $143 = $142;$i$03$i25 = $141;$isdigittmp4$i24 = $isdigittmp$i26;
      } else {
       $802 = $142;$p$0 = $141;
       break L46;
      }
     }
    }
    $113 = ((($108)) + 2|0);
    $114 = HEAP8[$113>>0]|0;
    $115 = $114 << 24 >> 24;
    $isdigittmp9 = (($115) + -48)|0;
    $isdigit10 = ($isdigittmp9>>>0)<(10);
    if ($isdigit10) {
     $116 = ((($108)) + 3|0);
     $117 = HEAP8[$116>>0]|0;
     $118 = ($117<<24>>24)==(36);
     if ($118) {
      $119 = (($nl_type) + ($isdigittmp9<<2)|0);
      HEAP32[$119>>2] = 10;
      $120 = HEAP8[$113>>0]|0;
      $121 = $120 << 24 >> 24;
      $122 = (($121) + -48)|0;
      $123 = (($nl_arg) + ($122<<3)|0);
      $124 = $123;
      $125 = $124;
      $126 = HEAP32[$125>>2]|0;
      $127 = (($124) + 4)|0;
      $128 = $127;
      $129 = HEAP32[$128>>2]|0;
      $130 = ((($108)) + 4|0);
      $802 = $130;$p$0 = $126;
      break;
     }
    }
    $131 = ($l10n$3|0)==(0);
    if (!($131)) {
     $$0 = -1;
     break L1;
    }
    if ($0) {
     $arglist_current2 = HEAP32[$ap>>2]|0;
     $132 = $arglist_current2;
     $133 = ((0) + 4|0);
     $expanded11 = $133;
     $expanded10 = (($expanded11) - 1)|0;
     $134 = (($132) + ($expanded10))|0;
     $135 = ((0) + 4|0);
     $expanded15 = $135;
     $expanded14 = (($expanded15) - 1)|0;
     $expanded13 = $expanded14 ^ -1;
     $136 = $134 & $expanded13;
     $137 = $136;
     $138 = HEAP32[$137>>2]|0;
     $arglist_next3 = ((($137)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next3;
     $802 = $113;$p$0 = $138;
    } else {
     $802 = $113;$p$0 = 0;
    }
   } else {
    $802 = $108;$p$0 = -1;
   }
  } while(0);
  $147 = $802;$st$0 = 0;
  while(1) {
   $146 = HEAP8[$147>>0]|0;
   $148 = $146 << 24 >> 24;
   $149 = (($148) + -65)|0;
   $150 = ($149>>>0)>(57);
   if ($150) {
    $$0 = -1;
    break L1;
   }
   $151 = ((($147)) + 1|0);
   $152 = ((7139 + (($st$0*58)|0)|0) + ($149)|0);
   $153 = HEAP8[$152>>0]|0;
   $154 = $153&255;
   $155 = (($154) + -1)|0;
   $156 = ($155>>>0)<(8);
   if ($156) {
    $147 = $151;$st$0 = $154;
   } else {
    $$lcssa326 = $147;$$lcssa328 = $151;$$lcssa329 = $153;$$lcssa330 = $154;$st$0$lcssa327 = $st$0;
    break;
   }
  }
  $157 = ($$lcssa329<<24>>24)==(0);
  if ($157) {
   $$0 = -1;
   break;
  }
  $158 = ($$lcssa329<<24>>24)==(19);
  $159 = ($argpos$0|0)>(-1);
  do {
   if ($158) {
    if ($159) {
     $$0 = -1;
     break L1;
    } else {
     label = 52;
    }
   } else {
    if ($159) {
     $160 = (($nl_type) + ($argpos$0<<2)|0);
     HEAP32[$160>>2] = $$lcssa330;
     $161 = (($nl_arg) + ($argpos$0<<3)|0);
     $162 = $161;
     $163 = $162;
     $164 = HEAP32[$163>>2]|0;
     $165 = (($162) + 4)|0;
     $166 = $165;
     $167 = HEAP32[$166>>2]|0;
     $168 = $arg;
     $169 = $168;
     HEAP32[$169>>2] = $164;
     $170 = (($168) + 4)|0;
     $171 = $170;
     HEAP32[$171>>2] = $167;
     label = 52;
     break;
    }
    if (!($0)) {
     $$0 = 0;
     break L1;
    }
    _pop_arg($arg,$$lcssa330,$ap);
   }
  } while(0);
  if ((label|0) == 52) {
   label = 0;
   if (!($0)) {
    $22 = $$lcssa328;$cnt$0 = $cnt$1;$l$0 = $37;$l10n$0 = $l10n$3;
    continue;
   }
  }
  $172 = HEAP8[$$lcssa326>>0]|0;
  $173 = $172 << 24 >> 24;
  $174 = ($st$0$lcssa327|0)!=(0);
  $175 = $173 & 15;
  $176 = ($175|0)==(3);
  $or$cond15 = $174 & $176;
  $177 = $173 & -33;
  $t$0 = $or$cond15 ? $177 : $173;
  $178 = $fl$1 & 8192;
  $179 = ($178|0)==(0);
  $180 = $fl$1 & -65537;
  $fl$1$ = $179 ? $fl$1 : $180;
  L75: do {
   switch ($t$0|0) {
   case 110:  {
    switch ($st$0$lcssa327|0) {
    case 0:  {
     $187 = HEAP32[$arg>>2]|0;
     HEAP32[$187>>2] = $cnt$1;
     $22 = $$lcssa328;$cnt$0 = $cnt$1;$l$0 = $37;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 1:  {
     $188 = HEAP32[$arg>>2]|0;
     HEAP32[$188>>2] = $cnt$1;
     $22 = $$lcssa328;$cnt$0 = $cnt$1;$l$0 = $37;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 2:  {
     $189 = ($cnt$1|0)<(0);
     $190 = $189 << 31 >> 31;
     $191 = HEAP32[$arg>>2]|0;
     $192 = $191;
     $193 = $192;
     HEAP32[$193>>2] = $cnt$1;
     $194 = (($192) + 4)|0;
     $195 = $194;
     HEAP32[$195>>2] = $190;
     $22 = $$lcssa328;$cnt$0 = $cnt$1;$l$0 = $37;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 3:  {
     $196 = $cnt$1&65535;
     $197 = HEAP32[$arg>>2]|0;
     HEAP16[$197>>1] = $196;
     $22 = $$lcssa328;$cnt$0 = $cnt$1;$l$0 = $37;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 4:  {
     $198 = $cnt$1&255;
     $199 = HEAP32[$arg>>2]|0;
     HEAP8[$199>>0] = $198;
     $22 = $$lcssa328;$cnt$0 = $cnt$1;$l$0 = $37;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 6:  {
     $200 = HEAP32[$arg>>2]|0;
     HEAP32[$200>>2] = $cnt$1;
     $22 = $$lcssa328;$cnt$0 = $cnt$1;$l$0 = $37;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 7:  {
     $201 = ($cnt$1|0)<(0);
     $202 = $201 << 31 >> 31;
     $203 = HEAP32[$arg>>2]|0;
     $204 = $203;
     $205 = $204;
     HEAP32[$205>>2] = $cnt$1;
     $206 = (($204) + 4)|0;
     $207 = $206;
     HEAP32[$207>>2] = $202;
     $22 = $$lcssa328;$cnt$0 = $cnt$1;$l$0 = $37;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    default: {
     $22 = $$lcssa328;$cnt$0 = $cnt$1;$l$0 = $37;$l10n$0 = $l10n$3;
     continue L1;
    }
    }
    break;
   }
   case 112:  {
    $208 = ($p$0>>>0)>(8);
    $209 = $208 ? $p$0 : 8;
    $210 = $fl$1$ | 8;
    $fl$3 = $210;$p$1 = $209;$t$1 = 120;
    label = 64;
    break;
   }
   case 88: case 120:  {
    $fl$3 = $fl$1$;$p$1 = $p$0;$t$1 = $t$0;
    label = 64;
    break;
   }
   case 111:  {
    $248 = $arg;
    $249 = $248;
    $250 = HEAP32[$249>>2]|0;
    $251 = (($248) + 4)|0;
    $252 = $251;
    $253 = HEAP32[$252>>2]|0;
    $254 = ($250|0)==(0);
    $255 = ($253|0)==(0);
    $256 = $254 & $255;
    if ($256) {
     $$0$lcssa$i = $1;
    } else {
     $$03$i33 = $1;$258 = $250;$262 = $253;
     while(1) {
      $257 = $258 & 7;
      $259 = $257 | 48;
      $260 = $259&255;
      $261 = ((($$03$i33)) + -1|0);
      HEAP8[$261>>0] = $260;
      $263 = (_bitshift64Lshr(($258|0),($262|0),3)|0);
      $264 = tempRet0;
      $265 = ($263|0)==(0);
      $266 = ($264|0)==(0);
      $267 = $265 & $266;
      if ($267) {
       $$0$lcssa$i = $261;
       break;
      } else {
       $$03$i33 = $261;$258 = $263;$262 = $264;
      }
     }
    }
    $268 = $fl$1$ & 8;
    $269 = ($268|0)==(0);
    if ($269) {
     $a$0 = $$0$lcssa$i;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = 0;$prefix$1 = 7619;
     label = 77;
    } else {
     $270 = $$0$lcssa$i;
     $271 = (($2) - ($270))|0;
     $272 = (($271) + 1)|0;
     $273 = ($p$0|0)<($272|0);
     $$p$0 = $273 ? $272 : $p$0;
     $a$0 = $$0$lcssa$i;$fl$4 = $fl$1$;$p$2 = $$p$0;$pl$1 = 0;$prefix$1 = 7619;
     label = 77;
    }
    break;
   }
   case 105: case 100:  {
    $274 = $arg;
    $275 = $274;
    $276 = HEAP32[$275>>2]|0;
    $277 = (($274) + 4)|0;
    $278 = $277;
    $279 = HEAP32[$278>>2]|0;
    $280 = ($279|0)<(0);
    if ($280) {
     $281 = (_i64Subtract(0,0,($276|0),($279|0))|0);
     $282 = tempRet0;
     $283 = $arg;
     $284 = $283;
     HEAP32[$284>>2] = $281;
     $285 = (($283) + 4)|0;
     $286 = $285;
     HEAP32[$286>>2] = $282;
     $291 = $281;$292 = $282;$pl$0 = 1;$prefix$0 = 7619;
     label = 76;
     break L75;
    }
    $287 = $fl$1$ & 2048;
    $288 = ($287|0)==(0);
    if ($288) {
     $289 = $fl$1$ & 1;
     $290 = ($289|0)==(0);
     $$ = $290 ? 7619 : (7621);
     $291 = $276;$292 = $279;$pl$0 = $289;$prefix$0 = $$;
     label = 76;
    } else {
     $291 = $276;$292 = $279;$pl$0 = 1;$prefix$0 = (7620);
     label = 76;
    }
    break;
   }
   case 117:  {
    $181 = $arg;
    $182 = $181;
    $183 = HEAP32[$182>>2]|0;
    $184 = (($181) + 4)|0;
    $185 = $184;
    $186 = HEAP32[$185>>2]|0;
    $291 = $183;$292 = $186;$pl$0 = 0;$prefix$0 = 7619;
    label = 76;
    break;
   }
   case 99:  {
    $312 = $arg;
    $313 = $312;
    $314 = HEAP32[$313>>2]|0;
    $315 = (($312) + 4)|0;
    $316 = $315;
    $317 = HEAP32[$316>>2]|0;
    $318 = $314&255;
    HEAP8[$3>>0] = $318;
    $a$2 = $3;$fl$6 = $180;$p$5 = 1;$pl$2 = 0;$prefix$2 = 7619;$z$2 = $1;
    break;
   }
   case 109:  {
    $319 = (___errno_location()|0);
    $320 = HEAP32[$319>>2]|0;
    $321 = (_strerror($320)|0);
    $a$1 = $321;
    label = 82;
    break;
   }
   case 115:  {
    $322 = HEAP32[$arg>>2]|0;
    $323 = ($322|0)!=(0|0);
    $324 = $323 ? $322 : 7629;
    $a$1 = $324;
    label = 82;
    break;
   }
   case 67:  {
    $331 = $arg;
    $332 = $331;
    $333 = HEAP32[$332>>2]|0;
    $334 = (($331) + 4)|0;
    $335 = $334;
    $336 = HEAP32[$335>>2]|0;
    HEAP32[$wc>>2] = $333;
    HEAP32[$4>>2] = 0;
    HEAP32[$arg>>2] = $wc;
    $p$4195 = -1;
    label = 86;
    break;
   }
   case 83:  {
    $337 = ($p$0|0)==(0);
    if ($337) {
     _pad($f,32,$w$1,0,$fl$1$);
     $i$0$lcssa197 = 0;
     label = 98;
    } else {
     $p$4195 = $p$0;
     label = 86;
    }
    break;
   }
   case 65: case 71: case 70: case 69: case 97: case 103: case 102: case 101:  {
    $364 = +HEAPF64[$arg>>3];
    HEAP32[$e2$i>>2] = 0;
    HEAPF64[tempDoublePtr>>3] = $364;$365 = HEAP32[tempDoublePtr>>2]|0;
    $366 = HEAP32[tempDoublePtr+4>>2]|0;
    $367 = ($366|0)<(0);
    if ($367) {
     $368 = -$364;
     $$07$i = $368;$pl$0$i = 1;$prefix$0$i = 7636;
    } else {
     $369 = $fl$1$ & 2048;
     $370 = ($369|0)==(0);
     if ($370) {
      $371 = $fl$1$ & 1;
      $372 = ($371|0)==(0);
      $$$i = $372 ? (7637) : (7642);
      $$07$i = $364;$pl$0$i = $371;$prefix$0$i = $$$i;
     } else {
      $$07$i = $364;$pl$0$i = 1;$prefix$0$i = (7639);
     }
    }
    HEAPF64[tempDoublePtr>>3] = $$07$i;$373 = HEAP32[tempDoublePtr>>2]|0;
    $374 = HEAP32[tempDoublePtr+4>>2]|0;
    $375 = $374 & 2146435072;
    $376 = ($375>>>0)<(2146435072);
    $377 = (0)<(0);
    $378 = ($375|0)==(2146435072);
    $379 = $378 & $377;
    $380 = $376 | $379;
    do {
     if ($380) {
      $396 = (+_frexpl($$07$i,$e2$i));
      $397 = $396 * 2.0;
      $398 = $397 != 0.0;
      if ($398) {
       $399 = HEAP32[$e2$i>>2]|0;
       $400 = (($399) + -1)|0;
       HEAP32[$e2$i>>2] = $400;
      }
      $401 = $t$0 | 32;
      $402 = ($401|0)==(97);
      if ($402) {
       $403 = $t$0 & 32;
       $404 = ($403|0)==(0);
       $405 = ((($prefix$0$i)) + 9|0);
       $prefix$0$$i = $404 ? $prefix$0$i : $405;
       $406 = $pl$0$i | 2;
       $407 = ($p$0>>>0)>(11);
       $408 = (12 - ($p$0))|0;
       $409 = ($408|0)==(0);
       $410 = $407 | $409;
       do {
        if ($410) {
         $$1$i = $397;
        } else {
         $re$169$i = $408;$round$068$i = 8.0;
         while(1) {
          $411 = (($re$169$i) + -1)|0;
          $412 = $round$068$i * 16.0;
          $413 = ($411|0)==(0);
          if ($413) {
           $$lcssa347 = $412;
           break;
          } else {
           $re$169$i = $411;$round$068$i = $412;
          }
         }
         $414 = HEAP8[$prefix$0$$i>>0]|0;
         $415 = ($414<<24>>24)==(45);
         if ($415) {
          $416 = -$397;
          $417 = $416 - $$lcssa347;
          $418 = $$lcssa347 + $417;
          $419 = -$418;
          $$1$i = $419;
          break;
         } else {
          $420 = $397 + $$lcssa347;
          $421 = $420 - $$lcssa347;
          $$1$i = $421;
          break;
         }
        }
       } while(0);
       $422 = HEAP32[$e2$i>>2]|0;
       $423 = ($422|0)<(0);
       $424 = (0 - ($422))|0;
       $425 = $423 ? $424 : $422;
       $426 = ($425|0)<(0);
       $427 = $426 << 31 >> 31;
       $428 = (_fmt_u($425,$427,$5)|0);
       $429 = ($428|0)==($5|0);
       if ($429) {
        HEAP8[$6>>0] = 48;
        $estr$0$i = $6;
       } else {
        $estr$0$i = $428;
       }
       $430 = $422 >> 31;
       $431 = $430 & 2;
       $432 = (($431) + 43)|0;
       $433 = $432&255;
       $434 = ((($estr$0$i)) + -1|0);
       HEAP8[$434>>0] = $433;
       $435 = (($t$0) + 15)|0;
       $436 = $435&255;
       $437 = ((($estr$0$i)) + -2|0);
       HEAP8[$437>>0] = $436;
       $notrhs$i = ($p$0|0)<(1);
       $438 = $fl$1$ & 8;
       $439 = ($438|0)==(0);
       $$2$i = $$1$i;$s$0$i = $buf$i;
       while(1) {
        $440 = (~~(($$2$i)));
        $441 = (7603 + ($440)|0);
        $442 = HEAP8[$441>>0]|0;
        $443 = $442&255;
        $444 = $443 | $403;
        $445 = $444&255;
        $446 = ((($s$0$i)) + 1|0);
        HEAP8[$s$0$i>>0] = $445;
        $447 = (+($440|0));
        $448 = $$2$i - $447;
        $449 = $448 * 16.0;
        $450 = $446;
        $451 = (($450) - ($7))|0;
        $452 = ($451|0)==(1);
        do {
         if ($452) {
          $notlhs$i = $449 == 0.0;
          $or$cond3$not$i = $notrhs$i & $notlhs$i;
          $or$cond$i = $439 & $or$cond3$not$i;
          if ($or$cond$i) {
           $s$1$i = $446;
           break;
          }
          $453 = ((($s$0$i)) + 2|0);
          HEAP8[$446>>0] = 46;
          $s$1$i = $453;
         } else {
          $s$1$i = $446;
         }
        } while(0);
        $454 = $449 != 0.0;
        if ($454) {
         $$2$i = $449;$s$0$i = $s$1$i;
        } else {
         $s$1$i$lcssa = $s$1$i;
         break;
        }
       }
       $455 = ($p$0|0)!=(0);
       $$pre182$i = $s$1$i$lcssa;
       $456 = (($10) + ($$pre182$i))|0;
       $457 = ($456|0)<($p$0|0);
       $or$cond239 = $455 & $457;
       $458 = $437;
       $459 = (($11) + ($p$0))|0;
       $460 = (($459) - ($458))|0;
       $461 = $437;
       $462 = (($9) - ($461))|0;
       $463 = (($462) + ($$pre182$i))|0;
       $l$0$i = $or$cond239 ? $460 : $463;
       $464 = (($l$0$i) + ($406))|0;
       _pad($f,32,$w$1,$464,$fl$1$);
       $465 = HEAP32[$f>>2]|0;
       $466 = $465 & 32;
       $467 = ($466|0)==(0);
       if ($467) {
        (___fwritex($prefix$0$$i,$406,$f)|0);
       }
       $468 = $fl$1$ ^ 65536;
       _pad($f,48,$w$1,$464,$468);
       $469 = (($$pre182$i) - ($7))|0;
       $470 = HEAP32[$f>>2]|0;
       $471 = $470 & 32;
       $472 = ($471|0)==(0);
       if ($472) {
        (___fwritex($buf$i,$469,$f)|0);
       }
       $473 = $437;
       $474 = (($8) - ($473))|0;
       $sum = (($469) + ($474))|0;
       $475 = (($l$0$i) - ($sum))|0;
       _pad($f,48,$475,0,0);
       $476 = HEAP32[$f>>2]|0;
       $477 = $476 & 32;
       $478 = ($477|0)==(0);
       if ($478) {
        (___fwritex($437,$474,$f)|0);
       }
       $479 = $fl$1$ ^ 8192;
       _pad($f,32,$w$1,$464,$479);
       $480 = ($464|0)<($w$1|0);
       $w$$i = $480 ? $w$1 : $464;
       $$0$i = $w$$i;
       break;
      }
      $481 = ($p$0|0)<(0);
      $$p$i = $481 ? 6 : $p$0;
      if ($398) {
       $482 = $397 * 268435456.0;
       $483 = HEAP32[$e2$i>>2]|0;
       $484 = (($483) + -28)|0;
       HEAP32[$e2$i>>2] = $484;
       $$3$i = $482;$485 = $484;
      } else {
       $$pre179$i = HEAP32[$e2$i>>2]|0;
       $$3$i = $397;$485 = $$pre179$i;
      }
      $486 = ($485|0)<(0);
      $$31$i = $486 ? $big$i : $12;
      $487 = $$31$i;
      $$4$i = $$3$i;$z$0$i = $$31$i;
      while(1) {
       $488 = (~~(($$4$i))>>>0);
       HEAP32[$z$0$i>>2] = $488;
       $489 = ((($z$0$i)) + 4|0);
       $490 = (+($488>>>0));
       $491 = $$4$i - $490;
       $492 = $491 * 1.0E+9;
       $493 = $492 != 0.0;
       if ($493) {
        $$4$i = $492;$z$0$i = $489;
       } else {
        $$lcssa331 = $489;
        break;
       }
      }
      $$pr$i = HEAP32[$e2$i>>2]|0;
      $494 = ($$pr$i|0)>(0);
      if ($494) {
       $495 = $$pr$i;$a$1147$i = $$31$i;$z$1146$i = $$lcssa331;
       while(1) {
        $496 = ($495|0)>(29);
        $497 = $496 ? 29 : $495;
        $d$0139$i = ((($z$1146$i)) + -4|0);
        $498 = ($d$0139$i>>>0)<($a$1147$i>>>0);
        do {
         if ($498) {
          $a$2$ph$i = $a$1147$i;
         } else {
          $carry$0140$i = 0;$d$0141$i = $d$0139$i;
          while(1) {
           $499 = HEAP32[$d$0141$i>>2]|0;
           $500 = (_bitshift64Shl(($499|0),0,($497|0))|0);
           $501 = tempRet0;
           $502 = (_i64Add(($500|0),($501|0),($carry$0140$i|0),0)|0);
           $503 = tempRet0;
           $504 = (___uremdi3(($502|0),($503|0),1000000000,0)|0);
           $505 = tempRet0;
           HEAP32[$d$0141$i>>2] = $504;
           $506 = (___udivdi3(($502|0),($503|0),1000000000,0)|0);
           $507 = tempRet0;
           $d$0$i = ((($d$0141$i)) + -4|0);
           $508 = ($d$0$i>>>0)<($a$1147$i>>>0);
           if ($508) {
            $$lcssa332 = $506;
            break;
           } else {
            $carry$0140$i = $506;$d$0141$i = $d$0$i;
           }
          }
          $509 = ($$lcssa332|0)==(0);
          if ($509) {
           $a$2$ph$i = $a$1147$i;
           break;
          }
          $510 = ((($a$1147$i)) + -4|0);
          HEAP32[$510>>2] = $$lcssa332;
          $a$2$ph$i = $510;
         }
        } while(0);
        $z$2$i = $z$1146$i;
        while(1) {
         $511 = ($z$2$i>>>0)>($a$2$ph$i>>>0);
         if (!($511)) {
          $z$2$i$lcssa = $z$2$i;
          break;
         }
         $512 = ((($z$2$i)) + -4|0);
         $513 = HEAP32[$512>>2]|0;
         $514 = ($513|0)==(0);
         if ($514) {
          $z$2$i = $512;
         } else {
          $z$2$i$lcssa = $z$2$i;
          break;
         }
        }
        $515 = HEAP32[$e2$i>>2]|0;
        $516 = (($515) - ($497))|0;
        HEAP32[$e2$i>>2] = $516;
        $517 = ($516|0)>(0);
        if ($517) {
         $495 = $516;$a$1147$i = $a$2$ph$i;$z$1146$i = $z$2$i$lcssa;
        } else {
         $$pr47$i = $516;$a$1$lcssa$i = $a$2$ph$i;$z$1$lcssa$i = $z$2$i$lcssa;
         break;
        }
       }
      } else {
       $$pr47$i = $$pr$i;$a$1$lcssa$i = $$31$i;$z$1$lcssa$i = $$lcssa331;
      }
      $518 = ($$pr47$i|0)<(0);
      if ($518) {
       $519 = (($$p$i) + 25)|0;
       $520 = (($519|0) / 9)&-1;
       $521 = (($520) + 1)|0;
       $522 = ($401|0)==(102);
       $524 = $$pr47$i;$a$3134$i = $a$1$lcssa$i;$z$3133$i = $z$1$lcssa$i;
       while(1) {
        $523 = (0 - ($524))|0;
        $525 = ($523|0)>(9);
        $526 = $525 ? 9 : $523;
        $527 = ($a$3134$i>>>0)<($z$3133$i>>>0);
        do {
         if ($527) {
          $531 = 1 << $526;
          $532 = (($531) + -1)|0;
          $533 = 1000000000 >>> $526;
          $carry3$0128$i = 0;$d$1127$i = $a$3134$i;
          while(1) {
           $534 = HEAP32[$d$1127$i>>2]|0;
           $535 = $534 & $532;
           $536 = $534 >>> $526;
           $537 = (($536) + ($carry3$0128$i))|0;
           HEAP32[$d$1127$i>>2] = $537;
           $538 = Math_imul($535, $533)|0;
           $539 = ((($d$1127$i)) + 4|0);
           $540 = ($539>>>0)<($z$3133$i>>>0);
           if ($540) {
            $carry3$0128$i = $538;$d$1127$i = $539;
           } else {
            $$lcssa334 = $538;
            break;
           }
          }
          $541 = HEAP32[$a$3134$i>>2]|0;
          $542 = ($541|0)==(0);
          $543 = ((($a$3134$i)) + 4|0);
          $$a$3$i = $542 ? $543 : $a$3134$i;
          $544 = ($$lcssa334|0)==(0);
          if ($544) {
           $$a$3186$i = $$a$3$i;$z$4$i = $z$3133$i;
           break;
          }
          $545 = ((($z$3133$i)) + 4|0);
          HEAP32[$z$3133$i>>2] = $$lcssa334;
          $$a$3186$i = $$a$3$i;$z$4$i = $545;
         } else {
          $528 = HEAP32[$a$3134$i>>2]|0;
          $529 = ($528|0)==(0);
          $530 = ((($a$3134$i)) + 4|0);
          $$a$3185$i = $529 ? $530 : $a$3134$i;
          $$a$3186$i = $$a$3185$i;$z$4$i = $z$3133$i;
         }
        } while(0);
        $546 = $522 ? $$31$i : $$a$3186$i;
        $547 = $z$4$i;
        $548 = $546;
        $549 = (($547) - ($548))|0;
        $550 = $549 >> 2;
        $551 = ($550|0)>($521|0);
        $552 = (($546) + ($521<<2)|0);
        $$z$4$i = $551 ? $552 : $z$4$i;
        $553 = HEAP32[$e2$i>>2]|0;
        $554 = (($553) + ($526))|0;
        HEAP32[$e2$i>>2] = $554;
        $555 = ($554|0)<(0);
        if ($555) {
         $524 = $554;$a$3134$i = $$a$3186$i;$z$3133$i = $$z$4$i;
        } else {
         $a$3$lcssa$i = $$a$3186$i;$z$3$lcssa$i = $$z$4$i;
         break;
        }
       }
      } else {
       $a$3$lcssa$i = $a$1$lcssa$i;$z$3$lcssa$i = $z$1$lcssa$i;
      }
      $556 = ($a$3$lcssa$i>>>0)<($z$3$lcssa$i>>>0);
      do {
       if ($556) {
        $557 = $a$3$lcssa$i;
        $558 = (($487) - ($557))|0;
        $559 = $558 >> 2;
        $560 = ($559*9)|0;
        $561 = HEAP32[$a$3$lcssa$i>>2]|0;
        $562 = ($561>>>0)<(10);
        if ($562) {
         $e$1$i = $560;
         break;
        } else {
         $e$0123$i = $560;$i$0122$i = 10;
        }
        while(1) {
         $563 = ($i$0122$i*10)|0;
         $564 = (($e$0123$i) + 1)|0;
         $565 = ($561>>>0)<($563>>>0);
         if ($565) {
          $e$1$i = $564;
          break;
         } else {
          $e$0123$i = $564;$i$0122$i = $563;
         }
        }
       } else {
        $e$1$i = 0;
       }
      } while(0);
      $566 = ($401|0)!=(102);
      $567 = $566 ? $e$1$i : 0;
      $568 = (($$p$i) - ($567))|0;
      $569 = ($401|0)==(103);
      $570 = ($$p$i|0)!=(0);
      $571 = $570 & $569;
      $$neg52$i = $571 << 31 >> 31;
      $572 = (($568) + ($$neg52$i))|0;
      $573 = $z$3$lcssa$i;
      $574 = (($573) - ($487))|0;
      $575 = $574 >> 2;
      $576 = ($575*9)|0;
      $577 = (($576) + -9)|0;
      $578 = ($572|0)<($577|0);
      if ($578) {
       $579 = (($572) + 9216)|0;
       $580 = (($579|0) / 9)&-1;
       $$sum$i = (($580) + -1023)|0;
       $581 = (($$31$i) + ($$sum$i<<2)|0);
       $582 = (($579|0) % 9)&-1;
       $j$0115$i = (($582) + 1)|0;
       $583 = ($j$0115$i|0)<(9);
       if ($583) {
        $i$1116$i = 10;$j$0117$i = $j$0115$i;
        while(1) {
         $584 = ($i$1116$i*10)|0;
         $j$0$i = (($j$0117$i) + 1)|0;
         $exitcond$i = ($j$0$i|0)==(9);
         if ($exitcond$i) {
          $i$1$lcssa$i = $584;
          break;
         } else {
          $i$1116$i = $584;$j$0117$i = $j$0$i;
         }
        }
       } else {
        $i$1$lcssa$i = 10;
       }
       $585 = HEAP32[$581>>2]|0;
       $586 = (($585>>>0) % ($i$1$lcssa$i>>>0))&-1;
       $587 = ($586|0)==(0);
       if ($587) {
        $$sum15$i = (($580) + -1022)|0;
        $588 = (($$31$i) + ($$sum15$i<<2)|0);
        $589 = ($588|0)==($z$3$lcssa$i|0);
        if ($589) {
         $a$7$i = $a$3$lcssa$i;$d$3$i = $581;$e$3$i = $e$1$i;
        } else {
         label = 163;
        }
       } else {
        label = 163;
       }
       do {
        if ((label|0) == 163) {
         label = 0;
         $590 = (($585>>>0) / ($i$1$lcssa$i>>>0))&-1;
         $591 = $590 & 1;
         $592 = ($591|0)==(0);
         $$20$i = $592 ? 9007199254740992.0 : 9007199254740994.0;
         $593 = (($i$1$lcssa$i|0) / 2)&-1;
         $594 = ($586>>>0)<($593>>>0);
         do {
          if ($594) {
           $small$0$i = 0.5;
          } else {
           $595 = ($586|0)==($593|0);
           if ($595) {
            $$sum16$i = (($580) + -1022)|0;
            $596 = (($$31$i) + ($$sum16$i<<2)|0);
            $597 = ($596|0)==($z$3$lcssa$i|0);
            if ($597) {
             $small$0$i = 1.0;
             break;
            }
           }
           $small$0$i = 1.5;
          }
         } while(0);
         $598 = ($pl$0$i|0)==(0);
         do {
          if ($598) {
           $round6$1$i = $$20$i;$small$1$i = $small$0$i;
          } else {
           $599 = HEAP8[$prefix$0$i>>0]|0;
           $600 = ($599<<24>>24)==(45);
           if (!($600)) {
            $round6$1$i = $$20$i;$small$1$i = $small$0$i;
            break;
           }
           $601 = -$$20$i;
           $602 = -$small$0$i;
           $round6$1$i = $601;$small$1$i = $602;
          }
         } while(0);
         $603 = (($585) - ($586))|0;
         HEAP32[$581>>2] = $603;
         $604 = $round6$1$i + $small$1$i;
         $605 = $604 != $round6$1$i;
         if (!($605)) {
          $a$7$i = $a$3$lcssa$i;$d$3$i = $581;$e$3$i = $e$1$i;
          break;
         }
         $606 = (($603) + ($i$1$lcssa$i))|0;
         HEAP32[$581>>2] = $606;
         $607 = ($606>>>0)>(999999999);
         if ($607) {
          $a$5109$i = $a$3$lcssa$i;$d$2108$i = $581;
          while(1) {
           $608 = ((($d$2108$i)) + -4|0);
           HEAP32[$d$2108$i>>2] = 0;
           $609 = ($608>>>0)<($a$5109$i>>>0);
           if ($609) {
            $610 = ((($a$5109$i)) + -4|0);
            HEAP32[$610>>2] = 0;
            $a$6$i = $610;
           } else {
            $a$6$i = $a$5109$i;
           }
           $611 = HEAP32[$608>>2]|0;
           $612 = (($611) + 1)|0;
           HEAP32[$608>>2] = $612;
           $613 = ($612>>>0)>(999999999);
           if ($613) {
            $a$5109$i = $a$6$i;$d$2108$i = $608;
           } else {
            $a$5$lcssa$i = $a$6$i;$d$2$lcssa$i = $608;
            break;
           }
          }
         } else {
          $a$5$lcssa$i = $a$3$lcssa$i;$d$2$lcssa$i = $581;
         }
         $614 = $a$5$lcssa$i;
         $615 = (($487) - ($614))|0;
         $616 = $615 >> 2;
         $617 = ($616*9)|0;
         $618 = HEAP32[$a$5$lcssa$i>>2]|0;
         $619 = ($618>>>0)<(10);
         if ($619) {
          $a$7$i = $a$5$lcssa$i;$d$3$i = $d$2$lcssa$i;$e$3$i = $617;
          break;
         } else {
          $e$2104$i = $617;$i$2103$i = 10;
         }
         while(1) {
          $620 = ($i$2103$i*10)|0;
          $621 = (($e$2104$i) + 1)|0;
          $622 = ($618>>>0)<($620>>>0);
          if ($622) {
           $a$7$i = $a$5$lcssa$i;$d$3$i = $d$2$lcssa$i;$e$3$i = $621;
           break;
          } else {
           $e$2104$i = $621;$i$2103$i = $620;
          }
         }
        }
       } while(0);
       $623 = ((($d$3$i)) + 4|0);
       $624 = ($z$3$lcssa$i>>>0)>($623>>>0);
       $$z$3$i = $624 ? $623 : $z$3$lcssa$i;
       $a$8$ph$i = $a$7$i;$e$4$ph$i = $e$3$i;$z$6$ph$i = $$z$3$i;
      } else {
       $a$8$ph$i = $a$3$lcssa$i;$e$4$ph$i = $e$1$i;$z$6$ph$i = $z$3$lcssa$i;
      }
      $625 = (0 - ($e$4$ph$i))|0;
      $z$6$i = $z$6$ph$i;
      while(1) {
       $626 = ($z$6$i>>>0)>($a$8$ph$i>>>0);
       if (!($626)) {
        $$lcssa159$i = 0;$z$6$i$lcssa = $z$6$i;
        break;
       }
       $627 = ((($z$6$i)) + -4|0);
       $628 = HEAP32[$627>>2]|0;
       $629 = ($628|0)==(0);
       if ($629) {
        $z$6$i = $627;
       } else {
        $$lcssa159$i = 1;$z$6$i$lcssa = $z$6$i;
        break;
       }
      }
      do {
       if ($569) {
        $630 = $570&1;
        $631 = $630 ^ 1;
        $$p$$i = (($631) + ($$p$i))|0;
        $632 = ($$p$$i|0)>($e$4$ph$i|0);
        $633 = ($e$4$ph$i|0)>(-5);
        $or$cond6$i = $632 & $633;
        if ($or$cond6$i) {
         $634 = (($t$0) + -1)|0;
         $$neg53$i = (($$p$$i) + -1)|0;
         $635 = (($$neg53$i) - ($e$4$ph$i))|0;
         $$013$i = $634;$$210$i = $635;
        } else {
         $636 = (($t$0) + -2)|0;
         $637 = (($$p$$i) + -1)|0;
         $$013$i = $636;$$210$i = $637;
        }
        $638 = $fl$1$ & 8;
        $639 = ($638|0)==(0);
        if (!($639)) {
         $$114$i = $$013$i;$$311$i = $$210$i;$$pre$phi184$iZ2D = $638;
         break;
        }
        do {
         if ($$lcssa159$i) {
          $640 = ((($z$6$i$lcssa)) + -4|0);
          $641 = HEAP32[$640>>2]|0;
          $642 = ($641|0)==(0);
          if ($642) {
           $j$2$i = 9;
           break;
          }
          $643 = (($641>>>0) % 10)&-1;
          $644 = ($643|0)==(0);
          if ($644) {
           $i$399$i = 10;$j$1100$i = 0;
          } else {
           $j$2$i = 0;
           break;
          }
          while(1) {
           $645 = ($i$399$i*10)|0;
           $646 = (($j$1100$i) + 1)|0;
           $647 = (($641>>>0) % ($645>>>0))&-1;
           $648 = ($647|0)==(0);
           if ($648) {
            $i$399$i = $645;$j$1100$i = $646;
           } else {
            $j$2$i = $646;
            break;
           }
          }
         } else {
          $j$2$i = 9;
         }
        } while(0);
        $649 = $$013$i | 32;
        $650 = ($649|0)==(102);
        $651 = $z$6$i$lcssa;
        $652 = (($651) - ($487))|0;
        $653 = $652 >> 2;
        $654 = ($653*9)|0;
        $655 = (($654) + -9)|0;
        if ($650) {
         $656 = (($655) - ($j$2$i))|0;
         $657 = ($656|0)<(0);
         $$21$i = $657 ? 0 : $656;
         $658 = ($$210$i|0)<($$21$i|0);
         $$210$$22$i = $658 ? $$210$i : $$21$i;
         $$114$i = $$013$i;$$311$i = $$210$$22$i;$$pre$phi184$iZ2D = 0;
         break;
        } else {
         $659 = (($655) + ($e$4$ph$i))|0;
         $660 = (($659) - ($j$2$i))|0;
         $661 = ($660|0)<(0);
         $$23$i = $661 ? 0 : $660;
         $662 = ($$210$i|0)<($$23$i|0);
         $$210$$24$i = $662 ? $$210$i : $$23$i;
         $$114$i = $$013$i;$$311$i = $$210$$24$i;$$pre$phi184$iZ2D = 0;
         break;
        }
       } else {
        $$pre183$i = $fl$1$ & 8;
        $$114$i = $t$0;$$311$i = $$p$i;$$pre$phi184$iZ2D = $$pre183$i;
       }
      } while(0);
      $663 = $$311$i | $$pre$phi184$iZ2D;
      $664 = ($663|0)!=(0);
      $665 = $664&1;
      $666 = $$114$i | 32;
      $667 = ($666|0)==(102);
      if ($667) {
       $668 = ($e$4$ph$i|0)>(0);
       $669 = $668 ? $e$4$ph$i : 0;
       $$pn$i = $669;$estr$2$i = 0;
      } else {
       $670 = ($e$4$ph$i|0)<(0);
       $671 = $670 ? $625 : $e$4$ph$i;
       $672 = ($671|0)<(0);
       $673 = $672 << 31 >> 31;
       $674 = (_fmt_u($671,$673,$5)|0);
       $675 = $674;
       $676 = (($8) - ($675))|0;
       $677 = ($676|0)<(2);
       if ($677) {
        $estr$193$i = $674;
        while(1) {
         $678 = ((($estr$193$i)) + -1|0);
         HEAP8[$678>>0] = 48;
         $679 = $678;
         $680 = (($8) - ($679))|0;
         $681 = ($680|0)<(2);
         if ($681) {
          $estr$193$i = $678;
         } else {
          $estr$1$lcssa$i = $678;
          break;
         }
        }
       } else {
        $estr$1$lcssa$i = $674;
       }
       $682 = $e$4$ph$i >> 31;
       $683 = $682 & 2;
       $684 = (($683) + 43)|0;
       $685 = $684&255;
       $686 = ((($estr$1$lcssa$i)) + -1|0);
       HEAP8[$686>>0] = $685;
       $687 = $$114$i&255;
       $688 = ((($estr$1$lcssa$i)) + -2|0);
       HEAP8[$688>>0] = $687;
       $689 = $688;
       $690 = (($8) - ($689))|0;
       $$pn$i = $690;$estr$2$i = $688;
      }
      $691 = (($pl$0$i) + 1)|0;
      $692 = (($691) + ($$311$i))|0;
      $l$1$i = (($692) + ($665))|0;
      $693 = (($l$1$i) + ($$pn$i))|0;
      _pad($f,32,$w$1,$693,$fl$1$);
      $694 = HEAP32[$f>>2]|0;
      $695 = $694 & 32;
      $696 = ($695|0)==(0);
      if ($696) {
       (___fwritex($prefix$0$i,$pl$0$i,$f)|0);
      }
      $697 = $fl$1$ ^ 65536;
      _pad($f,48,$w$1,$693,$697);
      do {
       if ($667) {
        $698 = ($a$8$ph$i>>>0)>($$31$i>>>0);
        $r$0$a$8$i = $698 ? $$31$i : $a$8$ph$i;
        $d$482$i = $r$0$a$8$i;
        while(1) {
         $699 = HEAP32[$d$482$i>>2]|0;
         $700 = (_fmt_u($699,0,$13)|0);
         $701 = ($d$482$i|0)==($r$0$a$8$i|0);
         do {
          if ($701) {
           $705 = ($700|0)==($13|0);
           if (!($705)) {
            $s7$1$i = $700;
            break;
           }
           HEAP8[$15>>0] = 48;
           $s7$1$i = $15;
          } else {
           $702 = ($700>>>0)>($buf$i>>>0);
           if ($702) {
            $s7$079$i = $700;
           } else {
            $s7$1$i = $700;
            break;
           }
           while(1) {
            $703 = ((($s7$079$i)) + -1|0);
            HEAP8[$703>>0] = 48;
            $704 = ($703>>>0)>($buf$i>>>0);
            if ($704) {
             $s7$079$i = $703;
            } else {
             $s7$1$i = $703;
             break;
            }
           }
          }
         } while(0);
         $706 = HEAP32[$f>>2]|0;
         $707 = $706 & 32;
         $708 = ($707|0)==(0);
         if ($708) {
          $709 = $s7$1$i;
          $710 = (($14) - ($709))|0;
          (___fwritex($s7$1$i,$710,$f)|0);
         }
         $711 = ((($d$482$i)) + 4|0);
         $712 = ($711>>>0)>($$31$i>>>0);
         if ($712) {
          $$lcssa344 = $711;
          break;
         } else {
          $d$482$i = $711;
         }
        }
        $713 = ($663|0)==(0);
        do {
         if (!($713)) {
          $714 = HEAP32[$f>>2]|0;
          $715 = $714 & 32;
          $716 = ($715|0)==(0);
          if (!($716)) {
           break;
          }
          (___fwritex(7671,1,$f)|0);
         }
        } while(0);
        $717 = ($$lcssa344>>>0)<($z$6$i$lcssa>>>0);
        $718 = ($$311$i|0)>(0);
        $719 = $718 & $717;
        if ($719) {
         $$41276$i = $$311$i;$d$575$i = $$lcssa344;
         while(1) {
          $720 = HEAP32[$d$575$i>>2]|0;
          $721 = (_fmt_u($720,0,$13)|0);
          $722 = ($721>>>0)>($buf$i>>>0);
          if ($722) {
           $s8$070$i = $721;
           while(1) {
            $723 = ((($s8$070$i)) + -1|0);
            HEAP8[$723>>0] = 48;
            $724 = ($723>>>0)>($buf$i>>>0);
            if ($724) {
             $s8$070$i = $723;
            } else {
             $s8$0$lcssa$i = $723;
             break;
            }
           }
          } else {
           $s8$0$lcssa$i = $721;
          }
          $725 = HEAP32[$f>>2]|0;
          $726 = $725 & 32;
          $727 = ($726|0)==(0);
          if ($727) {
           $728 = ($$41276$i|0)>(9);
           $729 = $728 ? 9 : $$41276$i;
           (___fwritex($s8$0$lcssa$i,$729,$f)|0);
          }
          $730 = ((($d$575$i)) + 4|0);
          $731 = (($$41276$i) + -9)|0;
          $732 = ($730>>>0)<($z$6$i$lcssa>>>0);
          $733 = ($$41276$i|0)>(9);
          $734 = $733 & $732;
          if ($734) {
           $$41276$i = $731;$d$575$i = $730;
          } else {
           $$412$lcssa$i = $731;
           break;
          }
         }
        } else {
         $$412$lcssa$i = $$311$i;
        }
        $735 = (($$412$lcssa$i) + 9)|0;
        _pad($f,48,$735,9,0);
       } else {
        $736 = ((($a$8$ph$i)) + 4|0);
        $z$6$$i = $$lcssa159$i ? $z$6$i$lcssa : $736;
        $737 = ($$311$i|0)>(-1);
        if ($737) {
         $738 = ($$pre$phi184$iZ2D|0)==(0);
         $$587$i = $$311$i;$d$686$i = $a$8$ph$i;
         while(1) {
          $739 = HEAP32[$d$686$i>>2]|0;
          $740 = (_fmt_u($739,0,$13)|0);
          $741 = ($740|0)==($13|0);
          if ($741) {
           HEAP8[$15>>0] = 48;
           $s9$0$i = $15;
          } else {
           $s9$0$i = $740;
          }
          $742 = ($d$686$i|0)==($a$8$ph$i|0);
          do {
           if ($742) {
            $746 = ((($s9$0$i)) + 1|0);
            $747 = HEAP32[$f>>2]|0;
            $748 = $747 & 32;
            $749 = ($748|0)==(0);
            if ($749) {
             (___fwritex($s9$0$i,1,$f)|0);
            }
            $750 = ($$587$i|0)<(1);
            $or$cond29$i = $738 & $750;
            if ($or$cond29$i) {
             $s9$2$i = $746;
             break;
            }
            $751 = HEAP32[$f>>2]|0;
            $752 = $751 & 32;
            $753 = ($752|0)==(0);
            if (!($753)) {
             $s9$2$i = $746;
             break;
            }
            (___fwritex(7671,1,$f)|0);
            $s9$2$i = $746;
           } else {
            $743 = ($s9$0$i>>>0)>($buf$i>>>0);
            if ($743) {
             $s9$183$i = $s9$0$i;
            } else {
             $s9$2$i = $s9$0$i;
             break;
            }
            while(1) {
             $744 = ((($s9$183$i)) + -1|0);
             HEAP8[$744>>0] = 48;
             $745 = ($744>>>0)>($buf$i>>>0);
             if ($745) {
              $s9$183$i = $744;
             } else {
              $s9$2$i = $744;
              break;
             }
            }
           }
          } while(0);
          $754 = $s9$2$i;
          $755 = (($14) - ($754))|0;
          $756 = HEAP32[$f>>2]|0;
          $757 = $756 & 32;
          $758 = ($757|0)==(0);
          if ($758) {
           $759 = ($$587$i|0)>($755|0);
           $760 = $759 ? $755 : $$587$i;
           (___fwritex($s9$2$i,$760,$f)|0);
          }
          $761 = (($$587$i) - ($755))|0;
          $762 = ((($d$686$i)) + 4|0);
          $763 = ($762>>>0)<($z$6$$i>>>0);
          $764 = ($761|0)>(-1);
          $765 = $763 & $764;
          if ($765) {
           $$587$i = $761;$d$686$i = $762;
          } else {
           $$5$lcssa$i = $761;
           break;
          }
         }
        } else {
         $$5$lcssa$i = $$311$i;
        }
        $766 = (($$5$lcssa$i) + 18)|0;
        _pad($f,48,$766,18,0);
        $767 = HEAP32[$f>>2]|0;
        $768 = $767 & 32;
        $769 = ($768|0)==(0);
        if (!($769)) {
         break;
        }
        $770 = $estr$2$i;
        $771 = (($8) - ($770))|0;
        (___fwritex($estr$2$i,$771,$f)|0);
       }
      } while(0);
      $772 = $fl$1$ ^ 8192;
      _pad($f,32,$w$1,$693,$772);
      $773 = ($693|0)<($w$1|0);
      $w$30$i = $773 ? $w$1 : $693;
      $$0$i = $w$30$i;
     } else {
      $381 = $t$0 & 32;
      $382 = ($381|0)!=(0);
      $383 = $382 ? 7655 : 7659;
      $384 = ($$07$i != $$07$i) | (0.0 != 0.0);
      $385 = $382 ? 7663 : 7667;
      $pl$1$i = $384 ? 0 : $pl$0$i;
      $s1$0$i = $384 ? $385 : $383;
      $386 = (($pl$1$i) + 3)|0;
      _pad($f,32,$w$1,$386,$180);
      $387 = HEAP32[$f>>2]|0;
      $388 = $387 & 32;
      $389 = ($388|0)==(0);
      if ($389) {
       (___fwritex($prefix$0$i,$pl$1$i,$f)|0);
       $$pre$i = HEAP32[$f>>2]|0;
       $391 = $$pre$i;
      } else {
       $391 = $387;
      }
      $390 = $391 & 32;
      $392 = ($390|0)==(0);
      if ($392) {
       (___fwritex($s1$0$i,3,$f)|0);
      }
      $393 = $fl$1$ ^ 8192;
      _pad($f,32,$w$1,$386,$393);
      $394 = ($386|0)<($w$1|0);
      $395 = $394 ? $w$1 : $386;
      $$0$i = $395;
     }
    } while(0);
    $22 = $$lcssa328;$cnt$0 = $cnt$1;$l$0 = $$0$i;$l10n$0 = $l10n$3;
    continue L1;
    break;
   }
   default: {
    $a$2 = $22;$fl$6 = $fl$1$;$p$5 = $p$0;$pl$2 = 0;$prefix$2 = 7619;$z$2 = $1;
   }
   }
  } while(0);
  L313: do {
   if ((label|0) == 64) {
    label = 0;
    $211 = $arg;
    $212 = $211;
    $213 = HEAP32[$212>>2]|0;
    $214 = (($211) + 4)|0;
    $215 = $214;
    $216 = HEAP32[$215>>2]|0;
    $217 = $t$1 & 32;
    $218 = ($213|0)==(0);
    $219 = ($216|0)==(0);
    $220 = $218 & $219;
    if ($220) {
     $a$0 = $1;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 0;$prefix$1 = 7619;
     label = 77;
    } else {
     $$012$i = $1;$222 = $213;$229 = $216;
     while(1) {
      $221 = $222 & 15;
      $223 = (7603 + ($221)|0);
      $224 = HEAP8[$223>>0]|0;
      $225 = $224&255;
      $226 = $225 | $217;
      $227 = $226&255;
      $228 = ((($$012$i)) + -1|0);
      HEAP8[$228>>0] = $227;
      $230 = (_bitshift64Lshr(($222|0),($229|0),4)|0);
      $231 = tempRet0;
      $232 = ($230|0)==(0);
      $233 = ($231|0)==(0);
      $234 = $232 & $233;
      if ($234) {
       $$lcssa349 = $228;
       break;
      } else {
       $$012$i = $228;$222 = $230;$229 = $231;
      }
     }
     $235 = $arg;
     $236 = $235;
     $237 = HEAP32[$236>>2]|0;
     $238 = (($235) + 4)|0;
     $239 = $238;
     $240 = HEAP32[$239>>2]|0;
     $241 = ($237|0)==(0);
     $242 = ($240|0)==(0);
     $243 = $241 & $242;
     $244 = $fl$3 & 8;
     $245 = ($244|0)==(0);
     $or$cond17 = $245 | $243;
     if ($or$cond17) {
      $a$0 = $$lcssa349;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 0;$prefix$1 = 7619;
      label = 77;
     } else {
      $246 = $t$1 >> 4;
      $247 = (7619 + ($246)|0);
      $a$0 = $$lcssa349;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 2;$prefix$1 = $247;
      label = 77;
     }
    }
   }
   else if ((label|0) == 76) {
    label = 0;
    $293 = (_fmt_u($291,$292,$1)|0);
    $a$0 = $293;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = $pl$0;$prefix$1 = $prefix$0;
    label = 77;
   }
   else if ((label|0) == 82) {
    label = 0;
    $325 = (_memchr($a$1,0,$p$0)|0);
    $326 = ($325|0)==(0|0);
    $327 = $325;
    $328 = $a$1;
    $329 = (($327) - ($328))|0;
    $330 = (($a$1) + ($p$0)|0);
    $z$1 = $326 ? $330 : $325;
    $p$3 = $326 ? $p$0 : $329;
    $a$2 = $a$1;$fl$6 = $180;$p$5 = $p$3;$pl$2 = 0;$prefix$2 = 7619;$z$2 = $z$1;
   }
   else if ((label|0) == 86) {
    label = 0;
    $338 = HEAP32[$arg>>2]|0;
    $i$0108 = 0;$l$1107 = 0;$ws$0109 = $338;
    while(1) {
     $339 = HEAP32[$ws$0109>>2]|0;
     $340 = ($339|0)==(0);
     if ($340) {
      $i$0$lcssa = $i$0108;$l$2 = $l$1107;
      break;
     }
     $341 = (_wctomb($mb,$339)|0);
     $342 = ($341|0)<(0);
     $343 = (($p$4195) - ($i$0108))|0;
     $344 = ($341>>>0)>($343>>>0);
     $or$cond20 = $342 | $344;
     if ($or$cond20) {
      $i$0$lcssa = $i$0108;$l$2 = $341;
      break;
     }
     $345 = ((($ws$0109)) + 4|0);
     $346 = (($341) + ($i$0108))|0;
     $347 = ($p$4195>>>0)>($346>>>0);
     if ($347) {
      $i$0108 = $346;$l$1107 = $341;$ws$0109 = $345;
     } else {
      $i$0$lcssa = $346;$l$2 = $341;
      break;
     }
    }
    $348 = ($l$2|0)<(0);
    if ($348) {
     $$0 = -1;
     break L1;
    }
    _pad($f,32,$w$1,$i$0$lcssa,$fl$1$);
    $349 = ($i$0$lcssa|0)==(0);
    if ($349) {
     $i$0$lcssa197 = 0;
     label = 98;
    } else {
     $350 = HEAP32[$arg>>2]|0;
     $i$1119 = 0;$ws$1120 = $350;
     while(1) {
      $351 = HEAP32[$ws$1120>>2]|0;
      $352 = ($351|0)==(0);
      if ($352) {
       $i$0$lcssa197 = $i$0$lcssa;
       label = 98;
       break L313;
      }
      $353 = ((($ws$1120)) + 4|0);
      $354 = (_wctomb($mb,$351)|0);
      $355 = (($354) + ($i$1119))|0;
      $356 = ($355|0)>($i$0$lcssa|0);
      if ($356) {
       $i$0$lcssa197 = $i$0$lcssa;
       label = 98;
       break L313;
      }
      $357 = HEAP32[$f>>2]|0;
      $358 = $357 & 32;
      $359 = ($358|0)==(0);
      if ($359) {
       (___fwritex($mb,$354,$f)|0);
      }
      $360 = ($355>>>0)<($i$0$lcssa>>>0);
      if ($360) {
       $i$1119 = $355;$ws$1120 = $353;
      } else {
       $i$0$lcssa197 = $i$0$lcssa;
       label = 98;
       break;
      }
     }
    }
   }
  } while(0);
  if ((label|0) == 98) {
   label = 0;
   $361 = $fl$1$ ^ 8192;
   _pad($f,32,$w$1,$i$0$lcssa197,$361);
   $362 = ($w$1|0)>($i$0$lcssa197|0);
   $363 = $362 ? $w$1 : $i$0$lcssa197;
   $22 = $$lcssa328;$cnt$0 = $cnt$1;$l$0 = $363;$l10n$0 = $l10n$3;
   continue;
  }
  if ((label|0) == 77) {
   label = 0;
   $294 = ($p$2|0)>(-1);
   $295 = $fl$4 & -65537;
   $$fl$4 = $294 ? $295 : $fl$4;
   $296 = $arg;
   $297 = $296;
   $298 = HEAP32[$297>>2]|0;
   $299 = (($296) + 4)|0;
   $300 = $299;
   $301 = HEAP32[$300>>2]|0;
   $302 = ($298|0)!=(0);
   $303 = ($301|0)!=(0);
   $304 = $302 | $303;
   $305 = ($p$2|0)!=(0);
   $or$cond = $305 | $304;
   if ($or$cond) {
    $306 = $a$0;
    $307 = (($2) - ($306))|0;
    $308 = $304&1;
    $309 = $308 ^ 1;
    $310 = (($309) + ($307))|0;
    $311 = ($p$2|0)>($310|0);
    $p$2$ = $311 ? $p$2 : $310;
    $a$2 = $a$0;$fl$6 = $$fl$4;$p$5 = $p$2$;$pl$2 = $pl$1;$prefix$2 = $prefix$1;$z$2 = $1;
   } else {
    $a$2 = $1;$fl$6 = $$fl$4;$p$5 = 0;$pl$2 = $pl$1;$prefix$2 = $prefix$1;$z$2 = $1;
   }
  }
  $774 = $z$2;
  $775 = $a$2;
  $776 = (($774) - ($775))|0;
  $777 = ($p$5|0)<($776|0);
  $$p$5 = $777 ? $776 : $p$5;
  $778 = (($pl$2) + ($$p$5))|0;
  $779 = ($w$1|0)<($778|0);
  $w$2 = $779 ? $778 : $w$1;
  _pad($f,32,$w$2,$778,$fl$6);
  $780 = HEAP32[$f>>2]|0;
  $781 = $780 & 32;
  $782 = ($781|0)==(0);
  if ($782) {
   (___fwritex($prefix$2,$pl$2,$f)|0);
  }
  $783 = $fl$6 ^ 65536;
  _pad($f,48,$w$2,$778,$783);
  _pad($f,48,$$p$5,$776,0);
  $784 = HEAP32[$f>>2]|0;
  $785 = $784 & 32;
  $786 = ($785|0)==(0);
  if ($786) {
   (___fwritex($a$2,$776,$f)|0);
  }
  $787 = $fl$6 ^ 8192;
  _pad($f,32,$w$2,$778,$787);
  $22 = $$lcssa328;$cnt$0 = $cnt$1;$l$0 = $w$2;$l10n$0 = $l10n$3;
 }
 L348: do {
  if ((label|0) == 245) {
   $788 = ($f|0)==(0|0);
   if ($788) {
    $789 = ($l10n$0$lcssa|0)==(0);
    if ($789) {
     $$0 = 0;
    } else {
     $i$295 = 1;
     while(1) {
      $790 = (($nl_type) + ($i$295<<2)|0);
      $791 = HEAP32[$790>>2]|0;
      $792 = ($791|0)==(0);
      if ($792) {
       $i$295$lcssa = $i$295;
       break;
      }
      $794 = (($nl_arg) + ($i$295<<3)|0);
      _pop_arg($794,$791,$ap);
      $795 = (($i$295) + 1)|0;
      $796 = ($795|0)<(10);
      if ($796) {
       $i$295 = $795;
      } else {
       $$0 = 1;
       break L348;
      }
     }
     $793 = ($i$295$lcssa|0)<(10);
     if ($793) {
      $i$393 = $i$295$lcssa;
      while(1) {
       $799 = (($nl_type) + ($i$393<<2)|0);
       $800 = HEAP32[$799>>2]|0;
       $801 = ($800|0)==(0);
       $797 = (($i$393) + 1)|0;
       if (!($801)) {
        $$0 = -1;
        break L348;
       }
       $798 = ($797|0)<(10);
       if ($798) {
        $i$393 = $797;
       } else {
        $$0 = 1;
        break;
       }
      }
     } else {
      $$0 = 1;
     }
    }
   } else {
    $$0 = $cnt$1$lcssa;
   }
  }
 } while(0);
 STACKTOP = sp;return ($$0|0);
}
function _pop_arg($arg,$type,$ap) {
 $arg = $arg|0;
 $type = $type|0;
 $ap = $ap|0;
 var $$mask = 0, $$mask1 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0.0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0.0;
 var $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0;
 var $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0;
 var $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $arglist_current = 0, $arglist_current11 = 0, $arglist_current14 = 0, $arglist_current17 = 0;
 var $arglist_current2 = 0, $arglist_current20 = 0, $arglist_current23 = 0, $arglist_current26 = 0, $arglist_current5 = 0, $arglist_current8 = 0, $arglist_next = 0, $arglist_next12 = 0, $arglist_next15 = 0, $arglist_next18 = 0, $arglist_next21 = 0, $arglist_next24 = 0, $arglist_next27 = 0, $arglist_next3 = 0, $arglist_next6 = 0, $arglist_next9 = 0, $expanded = 0, $expanded28 = 0, $expanded30 = 0, $expanded31 = 0;
 var $expanded32 = 0, $expanded34 = 0, $expanded35 = 0, $expanded37 = 0, $expanded38 = 0, $expanded39 = 0, $expanded41 = 0, $expanded42 = 0, $expanded44 = 0, $expanded45 = 0, $expanded46 = 0, $expanded48 = 0, $expanded49 = 0, $expanded51 = 0, $expanded52 = 0, $expanded53 = 0, $expanded55 = 0, $expanded56 = 0, $expanded58 = 0, $expanded59 = 0;
 var $expanded60 = 0, $expanded62 = 0, $expanded63 = 0, $expanded65 = 0, $expanded66 = 0, $expanded67 = 0, $expanded69 = 0, $expanded70 = 0, $expanded72 = 0, $expanded73 = 0, $expanded74 = 0, $expanded76 = 0, $expanded77 = 0, $expanded79 = 0, $expanded80 = 0, $expanded81 = 0, $expanded83 = 0, $expanded84 = 0, $expanded86 = 0, $expanded87 = 0;
 var $expanded88 = 0, $expanded90 = 0, $expanded91 = 0, $expanded93 = 0, $expanded94 = 0, $expanded95 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($type>>>0)>(20);
 L1: do {
  if (!($0)) {
   do {
    switch ($type|0) {
    case 9:  {
     $arglist_current = HEAP32[$ap>>2]|0;
     $1 = $arglist_current;
     $2 = ((0) + 4|0);
     $expanded28 = $2;
     $expanded = (($expanded28) - 1)|0;
     $3 = (($1) + ($expanded))|0;
     $4 = ((0) + 4|0);
     $expanded32 = $4;
     $expanded31 = (($expanded32) - 1)|0;
     $expanded30 = $expanded31 ^ -1;
     $5 = $3 & $expanded30;
     $6 = $5;
     $7 = HEAP32[$6>>2]|0;
     $arglist_next = ((($6)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next;
     HEAP32[$arg>>2] = $7;
     break L1;
     break;
    }
    case 10:  {
     $arglist_current2 = HEAP32[$ap>>2]|0;
     $8 = $arglist_current2;
     $9 = ((0) + 4|0);
     $expanded35 = $9;
     $expanded34 = (($expanded35) - 1)|0;
     $10 = (($8) + ($expanded34))|0;
     $11 = ((0) + 4|0);
     $expanded39 = $11;
     $expanded38 = (($expanded39) - 1)|0;
     $expanded37 = $expanded38 ^ -1;
     $12 = $10 & $expanded37;
     $13 = $12;
     $14 = HEAP32[$13>>2]|0;
     $arglist_next3 = ((($13)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next3;
     $15 = ($14|0)<(0);
     $16 = $15 << 31 >> 31;
     $17 = $arg;
     $18 = $17;
     HEAP32[$18>>2] = $14;
     $19 = (($17) + 4)|0;
     $20 = $19;
     HEAP32[$20>>2] = $16;
     break L1;
     break;
    }
    case 11:  {
     $arglist_current5 = HEAP32[$ap>>2]|0;
     $21 = $arglist_current5;
     $22 = ((0) + 4|0);
     $expanded42 = $22;
     $expanded41 = (($expanded42) - 1)|0;
     $23 = (($21) + ($expanded41))|0;
     $24 = ((0) + 4|0);
     $expanded46 = $24;
     $expanded45 = (($expanded46) - 1)|0;
     $expanded44 = $expanded45 ^ -1;
     $25 = $23 & $expanded44;
     $26 = $25;
     $27 = HEAP32[$26>>2]|0;
     $arglist_next6 = ((($26)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next6;
     $28 = $arg;
     $29 = $28;
     HEAP32[$29>>2] = $27;
     $30 = (($28) + 4)|0;
     $31 = $30;
     HEAP32[$31>>2] = 0;
     break L1;
     break;
    }
    case 12:  {
     $arglist_current8 = HEAP32[$ap>>2]|0;
     $32 = $arglist_current8;
     $33 = ((0) + 8|0);
     $expanded49 = $33;
     $expanded48 = (($expanded49) - 1)|0;
     $34 = (($32) + ($expanded48))|0;
     $35 = ((0) + 8|0);
     $expanded53 = $35;
     $expanded52 = (($expanded53) - 1)|0;
     $expanded51 = $expanded52 ^ -1;
     $36 = $34 & $expanded51;
     $37 = $36;
     $38 = $37;
     $39 = $38;
     $40 = HEAP32[$39>>2]|0;
     $41 = (($38) + 4)|0;
     $42 = $41;
     $43 = HEAP32[$42>>2]|0;
     $arglist_next9 = ((($37)) + 8|0);
     HEAP32[$ap>>2] = $arglist_next9;
     $44 = $arg;
     $45 = $44;
     HEAP32[$45>>2] = $40;
     $46 = (($44) + 4)|0;
     $47 = $46;
     HEAP32[$47>>2] = $43;
     break L1;
     break;
    }
    case 13:  {
     $arglist_current11 = HEAP32[$ap>>2]|0;
     $48 = $arglist_current11;
     $49 = ((0) + 4|0);
     $expanded56 = $49;
     $expanded55 = (($expanded56) - 1)|0;
     $50 = (($48) + ($expanded55))|0;
     $51 = ((0) + 4|0);
     $expanded60 = $51;
     $expanded59 = (($expanded60) - 1)|0;
     $expanded58 = $expanded59 ^ -1;
     $52 = $50 & $expanded58;
     $53 = $52;
     $54 = HEAP32[$53>>2]|0;
     $arglist_next12 = ((($53)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next12;
     $55 = $54&65535;
     $56 = $55 << 16 >> 16;
     $57 = ($56|0)<(0);
     $58 = $57 << 31 >> 31;
     $59 = $arg;
     $60 = $59;
     HEAP32[$60>>2] = $56;
     $61 = (($59) + 4)|0;
     $62 = $61;
     HEAP32[$62>>2] = $58;
     break L1;
     break;
    }
    case 14:  {
     $arglist_current14 = HEAP32[$ap>>2]|0;
     $63 = $arglist_current14;
     $64 = ((0) + 4|0);
     $expanded63 = $64;
     $expanded62 = (($expanded63) - 1)|0;
     $65 = (($63) + ($expanded62))|0;
     $66 = ((0) + 4|0);
     $expanded67 = $66;
     $expanded66 = (($expanded67) - 1)|0;
     $expanded65 = $expanded66 ^ -1;
     $67 = $65 & $expanded65;
     $68 = $67;
     $69 = HEAP32[$68>>2]|0;
     $arglist_next15 = ((($68)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next15;
     $$mask1 = $69 & 65535;
     $70 = $arg;
     $71 = $70;
     HEAP32[$71>>2] = $$mask1;
     $72 = (($70) + 4)|0;
     $73 = $72;
     HEAP32[$73>>2] = 0;
     break L1;
     break;
    }
    case 15:  {
     $arglist_current17 = HEAP32[$ap>>2]|0;
     $74 = $arglist_current17;
     $75 = ((0) + 4|0);
     $expanded70 = $75;
     $expanded69 = (($expanded70) - 1)|0;
     $76 = (($74) + ($expanded69))|0;
     $77 = ((0) + 4|0);
     $expanded74 = $77;
     $expanded73 = (($expanded74) - 1)|0;
     $expanded72 = $expanded73 ^ -1;
     $78 = $76 & $expanded72;
     $79 = $78;
     $80 = HEAP32[$79>>2]|0;
     $arglist_next18 = ((($79)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next18;
     $81 = $80&255;
     $82 = $81 << 24 >> 24;
     $83 = ($82|0)<(0);
     $84 = $83 << 31 >> 31;
     $85 = $arg;
     $86 = $85;
     HEAP32[$86>>2] = $82;
     $87 = (($85) + 4)|0;
     $88 = $87;
     HEAP32[$88>>2] = $84;
     break L1;
     break;
    }
    case 16:  {
     $arglist_current20 = HEAP32[$ap>>2]|0;
     $89 = $arglist_current20;
     $90 = ((0) + 4|0);
     $expanded77 = $90;
     $expanded76 = (($expanded77) - 1)|0;
     $91 = (($89) + ($expanded76))|0;
     $92 = ((0) + 4|0);
     $expanded81 = $92;
     $expanded80 = (($expanded81) - 1)|0;
     $expanded79 = $expanded80 ^ -1;
     $93 = $91 & $expanded79;
     $94 = $93;
     $95 = HEAP32[$94>>2]|0;
     $arglist_next21 = ((($94)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next21;
     $$mask = $95 & 255;
     $96 = $arg;
     $97 = $96;
     HEAP32[$97>>2] = $$mask;
     $98 = (($96) + 4)|0;
     $99 = $98;
     HEAP32[$99>>2] = 0;
     break L1;
     break;
    }
    case 17:  {
     $arglist_current23 = HEAP32[$ap>>2]|0;
     $100 = $arglist_current23;
     $101 = ((0) + 8|0);
     $expanded84 = $101;
     $expanded83 = (($expanded84) - 1)|0;
     $102 = (($100) + ($expanded83))|0;
     $103 = ((0) + 8|0);
     $expanded88 = $103;
     $expanded87 = (($expanded88) - 1)|0;
     $expanded86 = $expanded87 ^ -1;
     $104 = $102 & $expanded86;
     $105 = $104;
     $106 = +HEAPF64[$105>>3];
     $arglist_next24 = ((($105)) + 8|0);
     HEAP32[$ap>>2] = $arglist_next24;
     HEAPF64[$arg>>3] = $106;
     break L1;
     break;
    }
    case 18:  {
     $arglist_current26 = HEAP32[$ap>>2]|0;
     $107 = $arglist_current26;
     $108 = ((0) + 8|0);
     $expanded91 = $108;
     $expanded90 = (($expanded91) - 1)|0;
     $109 = (($107) + ($expanded90))|0;
     $110 = ((0) + 8|0);
     $expanded95 = $110;
     $expanded94 = (($expanded95) - 1)|0;
     $expanded93 = $expanded94 ^ -1;
     $111 = $109 & $expanded93;
     $112 = $111;
     $113 = +HEAPF64[$112>>3];
     $arglist_next27 = ((($112)) + 8|0);
     HEAP32[$ap>>2] = $arglist_next27;
     HEAPF64[$arg>>3] = $113;
     break L1;
     break;
    }
    default: {
     break L1;
    }
    }
   } while(0);
  }
 } while(0);
 return;
}
function _fmt_u($0,$1,$s) {
 $0 = $0|0;
 $1 = $1|0;
 $s = $s|0;
 var $$0$lcssa = 0, $$01$lcssa$off0 = 0, $$05 = 0, $$1$lcssa = 0, $$12 = 0, $$lcssa20 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $y$03 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ($1>>>0)>(0);
 $3 = ($0>>>0)>(4294967295);
 $4 = ($1|0)==(0);
 $5 = $4 & $3;
 $6 = $2 | $5;
 if ($6) {
  $$05 = $s;$7 = $0;$8 = $1;
  while(1) {
   $9 = (___uremdi3(($7|0),($8|0),10,0)|0);
   $10 = tempRet0;
   $11 = $9 | 48;
   $12 = $11&255;
   $13 = ((($$05)) + -1|0);
   HEAP8[$13>>0] = $12;
   $14 = (___udivdi3(($7|0),($8|0),10,0)|0);
   $15 = tempRet0;
   $16 = ($8>>>0)>(9);
   $17 = ($7>>>0)>(4294967295);
   $18 = ($8|0)==(9);
   $19 = $18 & $17;
   $20 = $16 | $19;
   if ($20) {
    $$05 = $13;$7 = $14;$8 = $15;
   } else {
    $$lcssa20 = $13;$28 = $14;$29 = $15;
    break;
   }
  }
  $$0$lcssa = $$lcssa20;$$01$lcssa$off0 = $28;
 } else {
  $$0$lcssa = $s;$$01$lcssa$off0 = $0;
 }
 $21 = ($$01$lcssa$off0|0)==(0);
 if ($21) {
  $$1$lcssa = $$0$lcssa;
 } else {
  $$12 = $$0$lcssa;$y$03 = $$01$lcssa$off0;
  while(1) {
   $22 = (($y$03>>>0) % 10)&-1;
   $23 = $22 | 48;
   $24 = $23&255;
   $25 = ((($$12)) + -1|0);
   HEAP8[$25>>0] = $24;
   $26 = (($y$03>>>0) / 10)&-1;
   $27 = ($y$03>>>0)<(10);
   if ($27) {
    $$1$lcssa = $25;
    break;
   } else {
    $$12 = $25;$y$03 = $26;
   }
  }
 }
 return ($$1$lcssa|0);
}
function _pad($f,$c,$w,$l,$fl) {
 $f = $f|0;
 $c = $c|0;
 $w = $w|0;
 $l = $l|0;
 $fl = $fl|0;
 var $$0$lcssa6 = 0, $$02 = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $or$cond = 0, $pad = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 256|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $pad = sp;
 $0 = $fl & 73728;
 $1 = ($0|0)==(0);
 $2 = ($w|0)>($l|0);
 $or$cond = $2 & $1;
 do {
  if ($or$cond) {
   $3 = (($w) - ($l))|0;
   $4 = ($3>>>0)>(256);
   $5 = $4 ? 256 : $3;
   _memset(($pad|0),($c|0),($5|0))|0;
   $6 = ($3>>>0)>(255);
   $7 = HEAP32[$f>>2]|0;
   $8 = $7 & 32;
   $9 = ($8|0)==(0);
   if ($6) {
    $10 = (($w) - ($l))|0;
    $$02 = $3;$17 = $7;$18 = $9;
    while(1) {
     if ($18) {
      (___fwritex($pad,256,$f)|0);
      $$pre = HEAP32[$f>>2]|0;
      $14 = $$pre;
     } else {
      $14 = $17;
     }
     $11 = (($$02) + -256)|0;
     $12 = ($11>>>0)>(255);
     $13 = $14 & 32;
     $15 = ($13|0)==(0);
     if ($12) {
      $$02 = $11;$17 = $14;$18 = $15;
     } else {
      break;
     }
    }
    $16 = $10 & 255;
    if ($15) {
     $$0$lcssa6 = $16;
    } else {
     break;
    }
   } else {
    if ($9) {
     $$0$lcssa6 = $3;
    } else {
     break;
    }
   }
   (___fwritex($pad,$$0$lcssa6,$f)|0);
  }
 } while(0);
 STACKTOP = sp;return;
}
function _sn_write($f,$s,$l) {
 $f = $f|0;
 $s = $s|0;
 $l = $l|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $l$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($f)) + 20|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = $1;
 $5 = $3;
 $6 = (($4) - ($5))|0;
 $7 = ($6>>>0)>($l>>>0);
 $l$ = $7 ? $l : $6;
 _memcpy(($3|0),($s|0),($l$|0))|0;
 $8 = HEAP32[$2>>2]|0;
 $9 = (($8) + ($l$)|0);
 HEAP32[$2>>2] = $9;
 return ($l|0);
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$3$i = 0, $$lcssa = 0, $$lcssa211 = 0, $$lcssa215 = 0, $$lcssa216 = 0, $$lcssa217 = 0, $$lcssa219 = 0, $$lcssa222 = 0, $$lcssa224 = 0, $$lcssa226 = 0, $$lcssa228 = 0, $$lcssa230 = 0, $$lcssa232 = 0, $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i22$i = 0, $$pre$i25 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i23$iZ2D = 0;
 var $$pre$phi$i26Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi58$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre105 = 0, $$pre106 = 0, $$pre14$i$i = 0, $$pre43$i = 0, $$pre56$i$i = 0, $$pre57$i$i = 0, $$pre8$i = 0, $$rsize$0$i = 0, $$rsize$3$i = 0, $$sum = 0, $$sum$i$i = 0, $$sum$i$i$i = 0, $$sum$i13$i = 0, $$sum$i14$i = 0, $$sum$i17$i = 0, $$sum$i19$i = 0;
 var $$sum$i2334 = 0, $$sum$i32 = 0, $$sum$i35 = 0, $$sum1 = 0, $$sum1$i = 0, $$sum1$i$i = 0, $$sum1$i15$i = 0, $$sum1$i20$i = 0, $$sum1$i24 = 0, $$sum10 = 0, $$sum10$i = 0, $$sum10$i$i = 0, $$sum11$i = 0, $$sum11$i$i = 0, $$sum1112 = 0, $$sum112$i = 0, $$sum113$i = 0, $$sum114$i = 0, $$sum115$i = 0, $$sum116$i = 0;
 var $$sum117$i = 0, $$sum118$i = 0, $$sum119$i = 0, $$sum12$i = 0, $$sum12$i$i = 0, $$sum120$i = 0, $$sum121$i = 0, $$sum122$i = 0, $$sum123$i = 0, $$sum124$i = 0, $$sum125$i = 0, $$sum13$i = 0, $$sum13$i$i = 0, $$sum14$i$i = 0, $$sum15$i = 0, $$sum15$i$i = 0, $$sum16$i = 0, $$sum16$i$i = 0, $$sum17$i = 0, $$sum17$i$i = 0;
 var $$sum18$i = 0, $$sum1819$i$i = 0, $$sum2 = 0, $$sum2$i = 0, $$sum2$i$i = 0, $$sum2$i$i$i = 0, $$sum2$i16$i = 0, $$sum2$i18$i = 0, $$sum2$i21$i = 0, $$sum20$i$i = 0, $$sum21$i$i = 0, $$sum22$i$i = 0, $$sum23$i$i = 0, $$sum24$i$i = 0, $$sum25$i$i = 0, $$sum27$i$i = 0, $$sum28$i$i = 0, $$sum29$i$i = 0, $$sum3$i = 0, $$sum3$i27 = 0;
 var $$sum30$i$i = 0, $$sum3132$i$i = 0, $$sum34$i$i = 0, $$sum3536$i$i = 0, $$sum3738$i$i = 0, $$sum39$i$i = 0, $$sum4 = 0, $$sum4$i = 0, $$sum4$i$i = 0, $$sum4$i28 = 0, $$sum40$i$i = 0, $$sum41$i$i = 0, $$sum42$i$i = 0, $$sum5$i = 0, $$sum5$i$i = 0, $$sum56 = 0, $$sum6$i = 0, $$sum67$i$i = 0, $$sum7$i = 0, $$sum8$i = 0;
 var $$sum9 = 0, $$sum9$i = 0, $$sum9$i$i = 0, $$tsize$1$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0;
 var $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0;
 var $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0;
 var $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0;
 var $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0;
 var $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0;
 var $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0;
 var $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0;
 var $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0;
 var $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0;
 var $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0;
 var $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0;
 var $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0;
 var $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0;
 var $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0;
 var $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0;
 var $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0;
 var $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0;
 var $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0;
 var $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0;
 var $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0;
 var $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0;
 var $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0;
 var $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0;
 var $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0;
 var $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0;
 var $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0;
 var $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0;
 var $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0;
 var $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0;
 var $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0;
 var $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0;
 var $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0;
 var $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0;
 var $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0;
 var $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0;
 var $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0;
 var $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0;
 var $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0;
 var $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0;
 var $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0;
 var $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0;
 var $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0;
 var $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0;
 var $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0;
 var $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0;
 var $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0;
 var $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0;
 var $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0;
 var $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0;
 var $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0;
 var $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0;
 var $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0;
 var $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0;
 var $F5$0$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$029$i = 0, $K2$07$i$i = 0, $K8$051$i$i = 0, $R$0$i = 0, $R$0$i$i = 0, $R$0$i$i$lcssa = 0, $R$0$i$lcssa = 0, $R$0$i18 = 0, $R$0$i18$lcssa = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$i = 0, $RP$0$i$i$lcssa = 0, $RP$0$i$lcssa = 0;
 var $RP$0$i17 = 0, $RP$0$i17$lcssa = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i25$i = 0, $T$028$i = 0, $T$028$i$lcssa = 0, $T$050$i$i = 0, $T$050$i$i$lcssa = 0, $T$06$i$i = 0, $T$06$i$i$lcssa = 0, $br$0$ph$i = 0, $cond$i = 0, $cond$i$i = 0, $cond$i21 = 0, $exitcond$i$i = 0, $i$02$i$i = 0, $idx$0$i = 0, $mem$0 = 0, $nb$0 = 0;
 var $not$$i = 0, $not$$i$i = 0, $not$$i26$i = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i30 = 0, $or$cond1$i = 0, $or$cond19$i = 0, $or$cond2$i = 0, $or$cond3$i = 0, $or$cond5$i = 0, $or$cond57$i = 0, $or$cond6$i = 0, $or$cond8$i = 0, $or$cond9$i = 0, $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i$lcssa = 0, $rsize$0$i15 = 0, $rsize$1$i = 0;
 var $rsize$2$i = 0, $rsize$3$lcssa$i = 0, $rsize$331$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$084$i = 0, $sp$084$i$lcssa = 0, $sp$183$i = 0, $sp$183$i$lcssa = 0, $ssize$0$$i = 0, $ssize$0$i = 0, $ssize$1$ph$i = 0, $ssize$2$i = 0, $t$0$i = 0, $t$0$i14 = 0, $t$1$i = 0, $t$2$ph$i = 0;
 var $t$2$v$3$i = 0, $t$230$i = 0, $tbase$255$i = 0, $tsize$0$ph$i = 0, $tsize$0323944$i = 0, $tsize$1$i = 0, $tsize$254$i = 0, $v$0$i = 0, $v$0$i$lcssa = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$3$lcssa$i = 0, $v$3$ph$i = 0, $v$332$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   $2 = (($bytes) + 11)|0;
   $3 = $2 & -8;
   $4 = $1 ? 16 : $3;
   $5 = $4 >>> 3;
   $6 = HEAP32[3296>>2]|0;
   $7 = $6 >>> $5;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($5))|0;
    $13 = $12 << 1;
    $14 = (3336 + ($13<<2)|0);
    $$sum10 = (($13) + 2)|0;
    $15 = (3336 + ($$sum10<<2)|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = ((($16)) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[3296>>2] = $22;
     } else {
      $23 = HEAP32[(3312)>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = ((($18)) + 12|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)==($16|0);
      if ($27) {
       HEAP32[$25>>2] = $14;
       HEAP32[$15>>2] = $18;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = ((($16)) + 4|0);
    HEAP32[$30>>2] = $29;
    $$sum1112 = $28 | 4;
    $31 = (($16) + ($$sum1112)|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $32 | 1;
    HEAP32[$31>>2] = $33;
    $mem$0 = $17;
    return ($mem$0|0);
   }
   $34 = HEAP32[(3304)>>2]|0;
   $35 = ($4>>>0)>($34>>>0);
   if ($35) {
    $36 = ($7|0)==(0);
    if (!($36)) {
     $37 = $7 << $5;
     $38 = 2 << $5;
     $39 = (0 - ($38))|0;
     $40 = $38 | $39;
     $41 = $37 & $40;
     $42 = (0 - ($41))|0;
     $43 = $41 & $42;
     $44 = (($43) + -1)|0;
     $45 = $44 >>> 12;
     $46 = $45 & 16;
     $47 = $44 >>> $46;
     $48 = $47 >>> 5;
     $49 = $48 & 8;
     $50 = $49 | $46;
     $51 = $47 >>> $49;
     $52 = $51 >>> 2;
     $53 = $52 & 4;
     $54 = $50 | $53;
     $55 = $51 >>> $53;
     $56 = $55 >>> 1;
     $57 = $56 & 2;
     $58 = $54 | $57;
     $59 = $55 >>> $57;
     $60 = $59 >>> 1;
     $61 = $60 & 1;
     $62 = $58 | $61;
     $63 = $59 >>> $61;
     $64 = (($62) + ($63))|0;
     $65 = $64 << 1;
     $66 = (3336 + ($65<<2)|0);
     $$sum4 = (($65) + 2)|0;
     $67 = (3336 + ($$sum4<<2)|0);
     $68 = HEAP32[$67>>2]|0;
     $69 = ((($68)) + 8|0);
     $70 = HEAP32[$69>>2]|0;
     $71 = ($66|0)==($70|0);
     do {
      if ($71) {
       $72 = 1 << $64;
       $73 = $72 ^ -1;
       $74 = $6 & $73;
       HEAP32[3296>>2] = $74;
       $88 = $34;
      } else {
       $75 = HEAP32[(3312)>>2]|0;
       $76 = ($70>>>0)<($75>>>0);
       if ($76) {
        _abort();
        // unreachable;
       }
       $77 = ((($70)) + 12|0);
       $78 = HEAP32[$77>>2]|0;
       $79 = ($78|0)==($68|0);
       if ($79) {
        HEAP32[$77>>2] = $66;
        HEAP32[$67>>2] = $70;
        $$pre = HEAP32[(3304)>>2]|0;
        $88 = $$pre;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $80 = $64 << 3;
     $81 = (($80) - ($4))|0;
     $82 = $4 | 3;
     $83 = ((($68)) + 4|0);
     HEAP32[$83>>2] = $82;
     $84 = (($68) + ($4)|0);
     $85 = $81 | 1;
     $$sum56 = $4 | 4;
     $86 = (($68) + ($$sum56)|0);
     HEAP32[$86>>2] = $85;
     $87 = (($68) + ($80)|0);
     HEAP32[$87>>2] = $81;
     $89 = ($88|0)==(0);
     if (!($89)) {
      $90 = HEAP32[(3316)>>2]|0;
      $91 = $88 >>> 3;
      $92 = $91 << 1;
      $93 = (3336 + ($92<<2)|0);
      $94 = HEAP32[3296>>2]|0;
      $95 = 1 << $91;
      $96 = $94 & $95;
      $97 = ($96|0)==(0);
      if ($97) {
       $98 = $94 | $95;
       HEAP32[3296>>2] = $98;
       $$pre105 = (($92) + 2)|0;
       $$pre106 = (3336 + ($$pre105<<2)|0);
       $$pre$phiZ2D = $$pre106;$F4$0 = $93;
      } else {
       $$sum9 = (($92) + 2)|0;
       $99 = (3336 + ($$sum9<<2)|0);
       $100 = HEAP32[$99>>2]|0;
       $101 = HEAP32[(3312)>>2]|0;
       $102 = ($100>>>0)<($101>>>0);
       if ($102) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $99;$F4$0 = $100;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $90;
      $103 = ((($F4$0)) + 12|0);
      HEAP32[$103>>2] = $90;
      $104 = ((($90)) + 8|0);
      HEAP32[$104>>2] = $F4$0;
      $105 = ((($90)) + 12|0);
      HEAP32[$105>>2] = $93;
     }
     HEAP32[(3304)>>2] = $81;
     HEAP32[(3316)>>2] = $84;
     $mem$0 = $69;
     return ($mem$0|0);
    }
    $106 = HEAP32[(3300)>>2]|0;
    $107 = ($106|0)==(0);
    if ($107) {
     $nb$0 = $4;
    } else {
     $108 = (0 - ($106))|0;
     $109 = $106 & $108;
     $110 = (($109) + -1)|0;
     $111 = $110 >>> 12;
     $112 = $111 & 16;
     $113 = $110 >>> $112;
     $114 = $113 >>> 5;
     $115 = $114 & 8;
     $116 = $115 | $112;
     $117 = $113 >>> $115;
     $118 = $117 >>> 2;
     $119 = $118 & 4;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = $121 >>> 1;
     $123 = $122 & 2;
     $124 = $120 | $123;
     $125 = $121 >>> $123;
     $126 = $125 >>> 1;
     $127 = $126 & 1;
     $128 = $124 | $127;
     $129 = $125 >>> $127;
     $130 = (($128) + ($129))|0;
     $131 = (3600 + ($130<<2)|0);
     $132 = HEAP32[$131>>2]|0;
     $133 = ((($132)) + 4|0);
     $134 = HEAP32[$133>>2]|0;
     $135 = $134 & -8;
     $136 = (($135) - ($4))|0;
     $rsize$0$i = $136;$t$0$i = $132;$v$0$i = $132;
     while(1) {
      $137 = ((($t$0$i)) + 16|0);
      $138 = HEAP32[$137>>2]|0;
      $139 = ($138|0)==(0|0);
      if ($139) {
       $140 = ((($t$0$i)) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if ($142) {
        $rsize$0$i$lcssa = $rsize$0$i;$v$0$i$lcssa = $v$0$i;
        break;
       } else {
        $144 = $141;
       }
      } else {
       $144 = $138;
      }
      $143 = ((($144)) + 4|0);
      $145 = HEAP32[$143>>2]|0;
      $146 = $145 & -8;
      $147 = (($146) - ($4))|0;
      $148 = ($147>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $148 ? $147 : $rsize$0$i;
      $$v$0$i = $148 ? $144 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $144;$v$0$i = $$v$0$i;
     }
     $149 = HEAP32[(3312)>>2]|0;
     $150 = ($v$0$i$lcssa>>>0)<($149>>>0);
     if ($150) {
      _abort();
      // unreachable;
     }
     $151 = (($v$0$i$lcssa) + ($4)|0);
     $152 = ($v$0$i$lcssa>>>0)<($151>>>0);
     if (!($152)) {
      _abort();
      // unreachable;
     }
     $153 = ((($v$0$i$lcssa)) + 24|0);
     $154 = HEAP32[$153>>2]|0;
     $155 = ((($v$0$i$lcssa)) + 12|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = ($156|0)==($v$0$i$lcssa|0);
     do {
      if ($157) {
       $167 = ((($v$0$i$lcssa)) + 20|0);
       $168 = HEAP32[$167>>2]|0;
       $169 = ($168|0)==(0|0);
       if ($169) {
        $170 = ((($v$0$i$lcssa)) + 16|0);
        $171 = HEAP32[$170>>2]|0;
        $172 = ($171|0)==(0|0);
        if ($172) {
         $R$1$i = 0;
         break;
        } else {
         $R$0$i = $171;$RP$0$i = $170;
        }
       } else {
        $R$0$i = $168;$RP$0$i = $167;
       }
       while(1) {
        $173 = ((($R$0$i)) + 20|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($174|0)==(0|0);
        if (!($175)) {
         $R$0$i = $174;$RP$0$i = $173;
         continue;
        }
        $176 = ((($R$0$i)) + 16|0);
        $177 = HEAP32[$176>>2]|0;
        $178 = ($177|0)==(0|0);
        if ($178) {
         $R$0$i$lcssa = $R$0$i;$RP$0$i$lcssa = $RP$0$i;
         break;
        } else {
         $R$0$i = $177;$RP$0$i = $176;
        }
       }
       $179 = ($RP$0$i$lcssa>>>0)<($149>>>0);
       if ($179) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$0$i$lcssa>>2] = 0;
        $R$1$i = $R$0$i$lcssa;
        break;
       }
      } else {
       $158 = ((($v$0$i$lcssa)) + 8|0);
       $159 = HEAP32[$158>>2]|0;
       $160 = ($159>>>0)<($149>>>0);
       if ($160) {
        _abort();
        // unreachable;
       }
       $161 = ((($159)) + 12|0);
       $162 = HEAP32[$161>>2]|0;
       $163 = ($162|0)==($v$0$i$lcssa|0);
       if (!($163)) {
        _abort();
        // unreachable;
       }
       $164 = ((($156)) + 8|0);
       $165 = HEAP32[$164>>2]|0;
       $166 = ($165|0)==($v$0$i$lcssa|0);
       if ($166) {
        HEAP32[$161>>2] = $156;
        HEAP32[$164>>2] = $159;
        $R$1$i = $156;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $180 = ($154|0)==(0|0);
     do {
      if (!($180)) {
       $181 = ((($v$0$i$lcssa)) + 28|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = (3600 + ($182<<2)|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($v$0$i$lcssa|0)==($184|0);
       if ($185) {
        HEAP32[$183>>2] = $R$1$i;
        $cond$i = ($R$1$i|0)==(0|0);
        if ($cond$i) {
         $186 = 1 << $182;
         $187 = $186 ^ -1;
         $188 = HEAP32[(3300)>>2]|0;
         $189 = $188 & $187;
         HEAP32[(3300)>>2] = $189;
         break;
        }
       } else {
        $190 = HEAP32[(3312)>>2]|0;
        $191 = ($154>>>0)<($190>>>0);
        if ($191) {
         _abort();
         // unreachable;
        }
        $192 = ((($154)) + 16|0);
        $193 = HEAP32[$192>>2]|0;
        $194 = ($193|0)==($v$0$i$lcssa|0);
        if ($194) {
         HEAP32[$192>>2] = $R$1$i;
        } else {
         $195 = ((($154)) + 20|0);
         HEAP32[$195>>2] = $R$1$i;
        }
        $196 = ($R$1$i|0)==(0|0);
        if ($196) {
         break;
        }
       }
       $197 = HEAP32[(3312)>>2]|0;
       $198 = ($R$1$i>>>0)<($197>>>0);
       if ($198) {
        _abort();
        // unreachable;
       }
       $199 = ((($R$1$i)) + 24|0);
       HEAP32[$199>>2] = $154;
       $200 = ((($v$0$i$lcssa)) + 16|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = ($201|0)==(0|0);
       do {
        if (!($202)) {
         $203 = ($201>>>0)<($197>>>0);
         if ($203) {
          _abort();
          // unreachable;
         } else {
          $204 = ((($R$1$i)) + 16|0);
          HEAP32[$204>>2] = $201;
          $205 = ((($201)) + 24|0);
          HEAP32[$205>>2] = $R$1$i;
          break;
         }
        }
       } while(0);
       $206 = ((($v$0$i$lcssa)) + 20|0);
       $207 = HEAP32[$206>>2]|0;
       $208 = ($207|0)==(0|0);
       if (!($208)) {
        $209 = HEAP32[(3312)>>2]|0;
        $210 = ($207>>>0)<($209>>>0);
        if ($210) {
         _abort();
         // unreachable;
        } else {
         $211 = ((($R$1$i)) + 20|0);
         HEAP32[$211>>2] = $207;
         $212 = ((($207)) + 24|0);
         HEAP32[$212>>2] = $R$1$i;
         break;
        }
       }
      }
     } while(0);
     $213 = ($rsize$0$i$lcssa>>>0)<(16);
     if ($213) {
      $214 = (($rsize$0$i$lcssa) + ($4))|0;
      $215 = $214 | 3;
      $216 = ((($v$0$i$lcssa)) + 4|0);
      HEAP32[$216>>2] = $215;
      $$sum4$i = (($214) + 4)|0;
      $217 = (($v$0$i$lcssa) + ($$sum4$i)|0);
      $218 = HEAP32[$217>>2]|0;
      $219 = $218 | 1;
      HEAP32[$217>>2] = $219;
     } else {
      $220 = $4 | 3;
      $221 = ((($v$0$i$lcssa)) + 4|0);
      HEAP32[$221>>2] = $220;
      $222 = $rsize$0$i$lcssa | 1;
      $$sum$i35 = $4 | 4;
      $223 = (($v$0$i$lcssa) + ($$sum$i35)|0);
      HEAP32[$223>>2] = $222;
      $$sum1$i = (($rsize$0$i$lcssa) + ($4))|0;
      $224 = (($v$0$i$lcssa) + ($$sum1$i)|0);
      HEAP32[$224>>2] = $rsize$0$i$lcssa;
      $225 = HEAP32[(3304)>>2]|0;
      $226 = ($225|0)==(0);
      if (!($226)) {
       $227 = HEAP32[(3316)>>2]|0;
       $228 = $225 >>> 3;
       $229 = $228 << 1;
       $230 = (3336 + ($229<<2)|0);
       $231 = HEAP32[3296>>2]|0;
       $232 = 1 << $228;
       $233 = $231 & $232;
       $234 = ($233|0)==(0);
       if ($234) {
        $235 = $231 | $232;
        HEAP32[3296>>2] = $235;
        $$pre$i = (($229) + 2)|0;
        $$pre8$i = (3336 + ($$pre$i<<2)|0);
        $$pre$phi$iZ2D = $$pre8$i;$F1$0$i = $230;
       } else {
        $$sum3$i = (($229) + 2)|0;
        $236 = (3336 + ($$sum3$i<<2)|0);
        $237 = HEAP32[$236>>2]|0;
        $238 = HEAP32[(3312)>>2]|0;
        $239 = ($237>>>0)<($238>>>0);
        if ($239) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $236;$F1$0$i = $237;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $227;
       $240 = ((($F1$0$i)) + 12|0);
       HEAP32[$240>>2] = $227;
       $241 = ((($227)) + 8|0);
       HEAP32[$241>>2] = $F1$0$i;
       $242 = ((($227)) + 12|0);
       HEAP32[$242>>2] = $230;
      }
      HEAP32[(3304)>>2] = $rsize$0$i$lcssa;
      HEAP32[(3316)>>2] = $151;
     }
     $243 = ((($v$0$i$lcssa)) + 8|0);
     $mem$0 = $243;
     return ($mem$0|0);
    }
   } else {
    $nb$0 = $4;
   }
  } else {
   $244 = ($bytes>>>0)>(4294967231);
   if ($244) {
    $nb$0 = -1;
   } else {
    $245 = (($bytes) + 11)|0;
    $246 = $245 & -8;
    $247 = HEAP32[(3300)>>2]|0;
    $248 = ($247|0)==(0);
    if ($248) {
     $nb$0 = $246;
    } else {
     $249 = (0 - ($246))|0;
     $250 = $245 >>> 8;
     $251 = ($250|0)==(0);
     if ($251) {
      $idx$0$i = 0;
     } else {
      $252 = ($246>>>0)>(16777215);
      if ($252) {
       $idx$0$i = 31;
      } else {
       $253 = (($250) + 1048320)|0;
       $254 = $253 >>> 16;
       $255 = $254 & 8;
       $256 = $250 << $255;
       $257 = (($256) + 520192)|0;
       $258 = $257 >>> 16;
       $259 = $258 & 4;
       $260 = $259 | $255;
       $261 = $256 << $259;
       $262 = (($261) + 245760)|0;
       $263 = $262 >>> 16;
       $264 = $263 & 2;
       $265 = $260 | $264;
       $266 = (14 - ($265))|0;
       $267 = $261 << $264;
       $268 = $267 >>> 15;
       $269 = (($266) + ($268))|0;
       $270 = $269 << 1;
       $271 = (($269) + 7)|0;
       $272 = $246 >>> $271;
       $273 = $272 & 1;
       $274 = $273 | $270;
       $idx$0$i = $274;
      }
     }
     $275 = (3600 + ($idx$0$i<<2)|0);
     $276 = HEAP32[$275>>2]|0;
     $277 = ($276|0)==(0|0);
     L123: do {
      if ($277) {
       $rsize$2$i = $249;$t$1$i = 0;$v$2$i = 0;
       label = 86;
      } else {
       $278 = ($idx$0$i|0)==(31);
       $279 = $idx$0$i >>> 1;
       $280 = (25 - ($279))|0;
       $281 = $278 ? 0 : $280;
       $282 = $246 << $281;
       $rsize$0$i15 = $249;$rst$0$i = 0;$sizebits$0$i = $282;$t$0$i14 = $276;$v$0$i16 = 0;
       while(1) {
        $283 = ((($t$0$i14)) + 4|0);
        $284 = HEAP32[$283>>2]|0;
        $285 = $284 & -8;
        $286 = (($285) - ($246))|0;
        $287 = ($286>>>0)<($rsize$0$i15>>>0);
        if ($287) {
         $288 = ($285|0)==($246|0);
         if ($288) {
          $rsize$331$i = $286;$t$230$i = $t$0$i14;$v$332$i = $t$0$i14;
          label = 90;
          break L123;
         } else {
          $rsize$1$i = $286;$v$1$i = $t$0$i14;
         }
        } else {
         $rsize$1$i = $rsize$0$i15;$v$1$i = $v$0$i16;
        }
        $289 = ((($t$0$i14)) + 20|0);
        $290 = HEAP32[$289>>2]|0;
        $291 = $sizebits$0$i >>> 31;
        $292 = (((($t$0$i14)) + 16|0) + ($291<<2)|0);
        $293 = HEAP32[$292>>2]|0;
        $294 = ($290|0)==(0|0);
        $295 = ($290|0)==($293|0);
        $or$cond19$i = $294 | $295;
        $rst$1$i = $or$cond19$i ? $rst$0$i : $290;
        $296 = ($293|0)==(0|0);
        $297 = $sizebits$0$i << 1;
        if ($296) {
         $rsize$2$i = $rsize$1$i;$t$1$i = $rst$1$i;$v$2$i = $v$1$i;
         label = 86;
         break;
        } else {
         $rsize$0$i15 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $297;$t$0$i14 = $293;$v$0$i16 = $v$1$i;
        }
       }
      }
     } while(0);
     if ((label|0) == 86) {
      $298 = ($t$1$i|0)==(0|0);
      $299 = ($v$2$i|0)==(0|0);
      $or$cond$i = $298 & $299;
      if ($or$cond$i) {
       $300 = 2 << $idx$0$i;
       $301 = (0 - ($300))|0;
       $302 = $300 | $301;
       $303 = $247 & $302;
       $304 = ($303|0)==(0);
       if ($304) {
        $nb$0 = $246;
        break;
       }
       $305 = (0 - ($303))|0;
       $306 = $303 & $305;
       $307 = (($306) + -1)|0;
       $308 = $307 >>> 12;
       $309 = $308 & 16;
       $310 = $307 >>> $309;
       $311 = $310 >>> 5;
       $312 = $311 & 8;
       $313 = $312 | $309;
       $314 = $310 >>> $312;
       $315 = $314 >>> 2;
       $316 = $315 & 4;
       $317 = $313 | $316;
       $318 = $314 >>> $316;
       $319 = $318 >>> 1;
       $320 = $319 & 2;
       $321 = $317 | $320;
       $322 = $318 >>> $320;
       $323 = $322 >>> 1;
       $324 = $323 & 1;
       $325 = $321 | $324;
       $326 = $322 >>> $324;
       $327 = (($325) + ($326))|0;
       $328 = (3600 + ($327<<2)|0);
       $329 = HEAP32[$328>>2]|0;
       $t$2$ph$i = $329;$v$3$ph$i = 0;
      } else {
       $t$2$ph$i = $t$1$i;$v$3$ph$i = $v$2$i;
      }
      $330 = ($t$2$ph$i|0)==(0|0);
      if ($330) {
       $rsize$3$lcssa$i = $rsize$2$i;$v$3$lcssa$i = $v$3$ph$i;
      } else {
       $rsize$331$i = $rsize$2$i;$t$230$i = $t$2$ph$i;$v$332$i = $v$3$ph$i;
       label = 90;
      }
     }
     if ((label|0) == 90) {
      while(1) {
       label = 0;
       $331 = ((($t$230$i)) + 4|0);
       $332 = HEAP32[$331>>2]|0;
       $333 = $332 & -8;
       $334 = (($333) - ($246))|0;
       $335 = ($334>>>0)<($rsize$331$i>>>0);
       $$rsize$3$i = $335 ? $334 : $rsize$331$i;
       $t$2$v$3$i = $335 ? $t$230$i : $v$332$i;
       $336 = ((($t$230$i)) + 16|0);
       $337 = HEAP32[$336>>2]|0;
       $338 = ($337|0)==(0|0);
       if (!($338)) {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $337;$v$332$i = $t$2$v$3$i;
        label = 90;
        continue;
       }
       $339 = ((($t$230$i)) + 20|0);
       $340 = HEAP32[$339>>2]|0;
       $341 = ($340|0)==(0|0);
       if ($341) {
        $rsize$3$lcssa$i = $$rsize$3$i;$v$3$lcssa$i = $t$2$v$3$i;
        break;
       } else {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $340;$v$332$i = $t$2$v$3$i;
        label = 90;
       }
      }
     }
     $342 = ($v$3$lcssa$i|0)==(0|0);
     if ($342) {
      $nb$0 = $246;
     } else {
      $343 = HEAP32[(3304)>>2]|0;
      $344 = (($343) - ($246))|0;
      $345 = ($rsize$3$lcssa$i>>>0)<($344>>>0);
      if ($345) {
       $346 = HEAP32[(3312)>>2]|0;
       $347 = ($v$3$lcssa$i>>>0)<($346>>>0);
       if ($347) {
        _abort();
        // unreachable;
       }
       $348 = (($v$3$lcssa$i) + ($246)|0);
       $349 = ($v$3$lcssa$i>>>0)<($348>>>0);
       if (!($349)) {
        _abort();
        // unreachable;
       }
       $350 = ((($v$3$lcssa$i)) + 24|0);
       $351 = HEAP32[$350>>2]|0;
       $352 = ((($v$3$lcssa$i)) + 12|0);
       $353 = HEAP32[$352>>2]|0;
       $354 = ($353|0)==($v$3$lcssa$i|0);
       do {
        if ($354) {
         $364 = ((($v$3$lcssa$i)) + 20|0);
         $365 = HEAP32[$364>>2]|0;
         $366 = ($365|0)==(0|0);
         if ($366) {
          $367 = ((($v$3$lcssa$i)) + 16|0);
          $368 = HEAP32[$367>>2]|0;
          $369 = ($368|0)==(0|0);
          if ($369) {
           $R$1$i20 = 0;
           break;
          } else {
           $R$0$i18 = $368;$RP$0$i17 = $367;
          }
         } else {
          $R$0$i18 = $365;$RP$0$i17 = $364;
         }
         while(1) {
          $370 = ((($R$0$i18)) + 20|0);
          $371 = HEAP32[$370>>2]|0;
          $372 = ($371|0)==(0|0);
          if (!($372)) {
           $R$0$i18 = $371;$RP$0$i17 = $370;
           continue;
          }
          $373 = ((($R$0$i18)) + 16|0);
          $374 = HEAP32[$373>>2]|0;
          $375 = ($374|0)==(0|0);
          if ($375) {
           $R$0$i18$lcssa = $R$0$i18;$RP$0$i17$lcssa = $RP$0$i17;
           break;
          } else {
           $R$0$i18 = $374;$RP$0$i17 = $373;
          }
         }
         $376 = ($RP$0$i17$lcssa>>>0)<($346>>>0);
         if ($376) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$0$i17$lcssa>>2] = 0;
          $R$1$i20 = $R$0$i18$lcssa;
          break;
         }
        } else {
         $355 = ((($v$3$lcssa$i)) + 8|0);
         $356 = HEAP32[$355>>2]|0;
         $357 = ($356>>>0)<($346>>>0);
         if ($357) {
          _abort();
          // unreachable;
         }
         $358 = ((($356)) + 12|0);
         $359 = HEAP32[$358>>2]|0;
         $360 = ($359|0)==($v$3$lcssa$i|0);
         if (!($360)) {
          _abort();
          // unreachable;
         }
         $361 = ((($353)) + 8|0);
         $362 = HEAP32[$361>>2]|0;
         $363 = ($362|0)==($v$3$lcssa$i|0);
         if ($363) {
          HEAP32[$358>>2] = $353;
          HEAP32[$361>>2] = $356;
          $R$1$i20 = $353;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $377 = ($351|0)==(0|0);
       do {
        if (!($377)) {
         $378 = ((($v$3$lcssa$i)) + 28|0);
         $379 = HEAP32[$378>>2]|0;
         $380 = (3600 + ($379<<2)|0);
         $381 = HEAP32[$380>>2]|0;
         $382 = ($v$3$lcssa$i|0)==($381|0);
         if ($382) {
          HEAP32[$380>>2] = $R$1$i20;
          $cond$i21 = ($R$1$i20|0)==(0|0);
          if ($cond$i21) {
           $383 = 1 << $379;
           $384 = $383 ^ -1;
           $385 = HEAP32[(3300)>>2]|0;
           $386 = $385 & $384;
           HEAP32[(3300)>>2] = $386;
           break;
          }
         } else {
          $387 = HEAP32[(3312)>>2]|0;
          $388 = ($351>>>0)<($387>>>0);
          if ($388) {
           _abort();
           // unreachable;
          }
          $389 = ((($351)) + 16|0);
          $390 = HEAP32[$389>>2]|0;
          $391 = ($390|0)==($v$3$lcssa$i|0);
          if ($391) {
           HEAP32[$389>>2] = $R$1$i20;
          } else {
           $392 = ((($351)) + 20|0);
           HEAP32[$392>>2] = $R$1$i20;
          }
          $393 = ($R$1$i20|0)==(0|0);
          if ($393) {
           break;
          }
         }
         $394 = HEAP32[(3312)>>2]|0;
         $395 = ($R$1$i20>>>0)<($394>>>0);
         if ($395) {
          _abort();
          // unreachable;
         }
         $396 = ((($R$1$i20)) + 24|0);
         HEAP32[$396>>2] = $351;
         $397 = ((($v$3$lcssa$i)) + 16|0);
         $398 = HEAP32[$397>>2]|0;
         $399 = ($398|0)==(0|0);
         do {
          if (!($399)) {
           $400 = ($398>>>0)<($394>>>0);
           if ($400) {
            _abort();
            // unreachable;
           } else {
            $401 = ((($R$1$i20)) + 16|0);
            HEAP32[$401>>2] = $398;
            $402 = ((($398)) + 24|0);
            HEAP32[$402>>2] = $R$1$i20;
            break;
           }
          }
         } while(0);
         $403 = ((($v$3$lcssa$i)) + 20|0);
         $404 = HEAP32[$403>>2]|0;
         $405 = ($404|0)==(0|0);
         if (!($405)) {
          $406 = HEAP32[(3312)>>2]|0;
          $407 = ($404>>>0)<($406>>>0);
          if ($407) {
           _abort();
           // unreachable;
          } else {
           $408 = ((($R$1$i20)) + 20|0);
           HEAP32[$408>>2] = $404;
           $409 = ((($404)) + 24|0);
           HEAP32[$409>>2] = $R$1$i20;
           break;
          }
         }
        }
       } while(0);
       $410 = ($rsize$3$lcssa$i>>>0)<(16);
       L199: do {
        if ($410) {
         $411 = (($rsize$3$lcssa$i) + ($246))|0;
         $412 = $411 | 3;
         $413 = ((($v$3$lcssa$i)) + 4|0);
         HEAP32[$413>>2] = $412;
         $$sum18$i = (($411) + 4)|0;
         $414 = (($v$3$lcssa$i) + ($$sum18$i)|0);
         $415 = HEAP32[$414>>2]|0;
         $416 = $415 | 1;
         HEAP32[$414>>2] = $416;
        } else {
         $417 = $246 | 3;
         $418 = ((($v$3$lcssa$i)) + 4|0);
         HEAP32[$418>>2] = $417;
         $419 = $rsize$3$lcssa$i | 1;
         $$sum$i2334 = $246 | 4;
         $420 = (($v$3$lcssa$i) + ($$sum$i2334)|0);
         HEAP32[$420>>2] = $419;
         $$sum1$i24 = (($rsize$3$lcssa$i) + ($246))|0;
         $421 = (($v$3$lcssa$i) + ($$sum1$i24)|0);
         HEAP32[$421>>2] = $rsize$3$lcssa$i;
         $422 = $rsize$3$lcssa$i >>> 3;
         $423 = ($rsize$3$lcssa$i>>>0)<(256);
         if ($423) {
          $424 = $422 << 1;
          $425 = (3336 + ($424<<2)|0);
          $426 = HEAP32[3296>>2]|0;
          $427 = 1 << $422;
          $428 = $426 & $427;
          $429 = ($428|0)==(0);
          if ($429) {
           $430 = $426 | $427;
           HEAP32[3296>>2] = $430;
           $$pre$i25 = (($424) + 2)|0;
           $$pre43$i = (3336 + ($$pre$i25<<2)|0);
           $$pre$phi$i26Z2D = $$pre43$i;$F5$0$i = $425;
          } else {
           $$sum17$i = (($424) + 2)|0;
           $431 = (3336 + ($$sum17$i<<2)|0);
           $432 = HEAP32[$431>>2]|0;
           $433 = HEAP32[(3312)>>2]|0;
           $434 = ($432>>>0)<($433>>>0);
           if ($434) {
            _abort();
            // unreachable;
           } else {
            $$pre$phi$i26Z2D = $431;$F5$0$i = $432;
           }
          }
          HEAP32[$$pre$phi$i26Z2D>>2] = $348;
          $435 = ((($F5$0$i)) + 12|0);
          HEAP32[$435>>2] = $348;
          $$sum15$i = (($246) + 8)|0;
          $436 = (($v$3$lcssa$i) + ($$sum15$i)|0);
          HEAP32[$436>>2] = $F5$0$i;
          $$sum16$i = (($246) + 12)|0;
          $437 = (($v$3$lcssa$i) + ($$sum16$i)|0);
          HEAP32[$437>>2] = $425;
          break;
         }
         $438 = $rsize$3$lcssa$i >>> 8;
         $439 = ($438|0)==(0);
         if ($439) {
          $I7$0$i = 0;
         } else {
          $440 = ($rsize$3$lcssa$i>>>0)>(16777215);
          if ($440) {
           $I7$0$i = 31;
          } else {
           $441 = (($438) + 1048320)|0;
           $442 = $441 >>> 16;
           $443 = $442 & 8;
           $444 = $438 << $443;
           $445 = (($444) + 520192)|0;
           $446 = $445 >>> 16;
           $447 = $446 & 4;
           $448 = $447 | $443;
           $449 = $444 << $447;
           $450 = (($449) + 245760)|0;
           $451 = $450 >>> 16;
           $452 = $451 & 2;
           $453 = $448 | $452;
           $454 = (14 - ($453))|0;
           $455 = $449 << $452;
           $456 = $455 >>> 15;
           $457 = (($454) + ($456))|0;
           $458 = $457 << 1;
           $459 = (($457) + 7)|0;
           $460 = $rsize$3$lcssa$i >>> $459;
           $461 = $460 & 1;
           $462 = $461 | $458;
           $I7$0$i = $462;
          }
         }
         $463 = (3600 + ($I7$0$i<<2)|0);
         $$sum2$i = (($246) + 28)|0;
         $464 = (($v$3$lcssa$i) + ($$sum2$i)|0);
         HEAP32[$464>>2] = $I7$0$i;
         $$sum3$i27 = (($246) + 16)|0;
         $465 = (($v$3$lcssa$i) + ($$sum3$i27)|0);
         $$sum4$i28 = (($246) + 20)|0;
         $466 = (($v$3$lcssa$i) + ($$sum4$i28)|0);
         HEAP32[$466>>2] = 0;
         HEAP32[$465>>2] = 0;
         $467 = HEAP32[(3300)>>2]|0;
         $468 = 1 << $I7$0$i;
         $469 = $467 & $468;
         $470 = ($469|0)==(0);
         if ($470) {
          $471 = $467 | $468;
          HEAP32[(3300)>>2] = $471;
          HEAP32[$463>>2] = $348;
          $$sum5$i = (($246) + 24)|0;
          $472 = (($v$3$lcssa$i) + ($$sum5$i)|0);
          HEAP32[$472>>2] = $463;
          $$sum6$i = (($246) + 12)|0;
          $473 = (($v$3$lcssa$i) + ($$sum6$i)|0);
          HEAP32[$473>>2] = $348;
          $$sum7$i = (($246) + 8)|0;
          $474 = (($v$3$lcssa$i) + ($$sum7$i)|0);
          HEAP32[$474>>2] = $348;
          break;
         }
         $475 = HEAP32[$463>>2]|0;
         $476 = ((($475)) + 4|0);
         $477 = HEAP32[$476>>2]|0;
         $478 = $477 & -8;
         $479 = ($478|0)==($rsize$3$lcssa$i|0);
         L217: do {
          if ($479) {
           $T$0$lcssa$i = $475;
          } else {
           $480 = ($I7$0$i|0)==(31);
           $481 = $I7$0$i >>> 1;
           $482 = (25 - ($481))|0;
           $483 = $480 ? 0 : $482;
           $484 = $rsize$3$lcssa$i << $483;
           $K12$029$i = $484;$T$028$i = $475;
           while(1) {
            $491 = $K12$029$i >>> 31;
            $492 = (((($T$028$i)) + 16|0) + ($491<<2)|0);
            $487 = HEAP32[$492>>2]|0;
            $493 = ($487|0)==(0|0);
            if ($493) {
             $$lcssa232 = $492;$T$028$i$lcssa = $T$028$i;
             break;
            }
            $485 = $K12$029$i << 1;
            $486 = ((($487)) + 4|0);
            $488 = HEAP32[$486>>2]|0;
            $489 = $488 & -8;
            $490 = ($489|0)==($rsize$3$lcssa$i|0);
            if ($490) {
             $T$0$lcssa$i = $487;
             break L217;
            } else {
             $K12$029$i = $485;$T$028$i = $487;
            }
           }
           $494 = HEAP32[(3312)>>2]|0;
           $495 = ($$lcssa232>>>0)<($494>>>0);
           if ($495) {
            _abort();
            // unreachable;
           } else {
            HEAP32[$$lcssa232>>2] = $348;
            $$sum11$i = (($246) + 24)|0;
            $496 = (($v$3$lcssa$i) + ($$sum11$i)|0);
            HEAP32[$496>>2] = $T$028$i$lcssa;
            $$sum12$i = (($246) + 12)|0;
            $497 = (($v$3$lcssa$i) + ($$sum12$i)|0);
            HEAP32[$497>>2] = $348;
            $$sum13$i = (($246) + 8)|0;
            $498 = (($v$3$lcssa$i) + ($$sum13$i)|0);
            HEAP32[$498>>2] = $348;
            break L199;
           }
          }
         } while(0);
         $499 = ((($T$0$lcssa$i)) + 8|0);
         $500 = HEAP32[$499>>2]|0;
         $501 = HEAP32[(3312)>>2]|0;
         $502 = ($500>>>0)>=($501>>>0);
         $not$$i = ($T$0$lcssa$i>>>0)>=($501>>>0);
         $503 = $502 & $not$$i;
         if ($503) {
          $504 = ((($500)) + 12|0);
          HEAP32[$504>>2] = $348;
          HEAP32[$499>>2] = $348;
          $$sum8$i = (($246) + 8)|0;
          $505 = (($v$3$lcssa$i) + ($$sum8$i)|0);
          HEAP32[$505>>2] = $500;
          $$sum9$i = (($246) + 12)|0;
          $506 = (($v$3$lcssa$i) + ($$sum9$i)|0);
          HEAP32[$506>>2] = $T$0$lcssa$i;
          $$sum10$i = (($246) + 24)|0;
          $507 = (($v$3$lcssa$i) + ($$sum10$i)|0);
          HEAP32[$507>>2] = 0;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $508 = ((($v$3$lcssa$i)) + 8|0);
       $mem$0 = $508;
       return ($mem$0|0);
      } else {
       $nb$0 = $246;
      }
     }
    }
   }
  }
 } while(0);
 $509 = HEAP32[(3304)>>2]|0;
 $510 = ($509>>>0)<($nb$0>>>0);
 if (!($510)) {
  $511 = (($509) - ($nb$0))|0;
  $512 = HEAP32[(3316)>>2]|0;
  $513 = ($511>>>0)>(15);
  if ($513) {
   $514 = (($512) + ($nb$0)|0);
   HEAP32[(3316)>>2] = $514;
   HEAP32[(3304)>>2] = $511;
   $515 = $511 | 1;
   $$sum2 = (($nb$0) + 4)|0;
   $516 = (($512) + ($$sum2)|0);
   HEAP32[$516>>2] = $515;
   $517 = (($512) + ($509)|0);
   HEAP32[$517>>2] = $511;
   $518 = $nb$0 | 3;
   $519 = ((($512)) + 4|0);
   HEAP32[$519>>2] = $518;
  } else {
   HEAP32[(3304)>>2] = 0;
   HEAP32[(3316)>>2] = 0;
   $520 = $509 | 3;
   $521 = ((($512)) + 4|0);
   HEAP32[$521>>2] = $520;
   $$sum1 = (($509) + 4)|0;
   $522 = (($512) + ($$sum1)|0);
   $523 = HEAP32[$522>>2]|0;
   $524 = $523 | 1;
   HEAP32[$522>>2] = $524;
  }
  $525 = ((($512)) + 8|0);
  $mem$0 = $525;
  return ($mem$0|0);
 }
 $526 = HEAP32[(3308)>>2]|0;
 $527 = ($526>>>0)>($nb$0>>>0);
 if ($527) {
  $528 = (($526) - ($nb$0))|0;
  HEAP32[(3308)>>2] = $528;
  $529 = HEAP32[(3320)>>2]|0;
  $530 = (($529) + ($nb$0)|0);
  HEAP32[(3320)>>2] = $530;
  $531 = $528 | 1;
  $$sum = (($nb$0) + 4)|0;
  $532 = (($529) + ($$sum)|0);
  HEAP32[$532>>2] = $531;
  $533 = $nb$0 | 3;
  $534 = ((($529)) + 4|0);
  HEAP32[$534>>2] = $533;
  $535 = ((($529)) + 8|0);
  $mem$0 = $535;
  return ($mem$0|0);
 }
 $536 = HEAP32[3768>>2]|0;
 $537 = ($536|0)==(0);
 do {
  if ($537) {
   $538 = (_sysconf(30)|0);
   $539 = (($538) + -1)|0;
   $540 = $539 & $538;
   $541 = ($540|0)==(0);
   if ($541) {
    HEAP32[(3776)>>2] = $538;
    HEAP32[(3772)>>2] = $538;
    HEAP32[(3780)>>2] = -1;
    HEAP32[(3784)>>2] = -1;
    HEAP32[(3788)>>2] = 0;
    HEAP32[(3740)>>2] = 0;
    $542 = (_time((0|0))|0);
    $543 = $542 & -16;
    $544 = $543 ^ 1431655768;
    HEAP32[3768>>2] = $544;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $545 = (($nb$0) + 48)|0;
 $546 = HEAP32[(3776)>>2]|0;
 $547 = (($nb$0) + 47)|0;
 $548 = (($546) + ($547))|0;
 $549 = (0 - ($546))|0;
 $550 = $548 & $549;
 $551 = ($550>>>0)>($nb$0>>>0);
 if (!($551)) {
  $mem$0 = 0;
  return ($mem$0|0);
 }
 $552 = HEAP32[(3736)>>2]|0;
 $553 = ($552|0)==(0);
 if (!($553)) {
  $554 = HEAP32[(3728)>>2]|0;
  $555 = (($554) + ($550))|0;
  $556 = ($555>>>0)<=($554>>>0);
  $557 = ($555>>>0)>($552>>>0);
  $or$cond1$i = $556 | $557;
  if ($or$cond1$i) {
   $mem$0 = 0;
   return ($mem$0|0);
  }
 }
 $558 = HEAP32[(3740)>>2]|0;
 $559 = $558 & 4;
 $560 = ($559|0)==(0);
 L258: do {
  if ($560) {
   $561 = HEAP32[(3320)>>2]|0;
   $562 = ($561|0)==(0|0);
   L260: do {
    if ($562) {
     label = 174;
    } else {
     $sp$0$i$i = (3744);
     while(1) {
      $563 = HEAP32[$sp$0$i$i>>2]|0;
      $564 = ($563>>>0)>($561>>>0);
      if (!($564)) {
       $565 = ((($sp$0$i$i)) + 4|0);
       $566 = HEAP32[$565>>2]|0;
       $567 = (($563) + ($566)|0);
       $568 = ($567>>>0)>($561>>>0);
       if ($568) {
        $$lcssa228 = $sp$0$i$i;$$lcssa230 = $565;
        break;
       }
      }
      $569 = ((($sp$0$i$i)) + 8|0);
      $570 = HEAP32[$569>>2]|0;
      $571 = ($570|0)==(0|0);
      if ($571) {
       label = 174;
       break L260;
      } else {
       $sp$0$i$i = $570;
      }
     }
     $594 = HEAP32[(3308)>>2]|0;
     $595 = (($548) - ($594))|0;
     $596 = $595 & $549;
     $597 = ($596>>>0)<(2147483647);
     if ($597) {
      $598 = (_sbrk(($596|0))|0);
      $599 = HEAP32[$$lcssa228>>2]|0;
      $600 = HEAP32[$$lcssa230>>2]|0;
      $601 = (($599) + ($600)|0);
      $602 = ($598|0)==($601|0);
      $$3$i = $602 ? $596 : 0;
      if ($602) {
       $603 = ($598|0)==((-1)|0);
       if ($603) {
        $tsize$0323944$i = $$3$i;
       } else {
        $tbase$255$i = $598;$tsize$254$i = $$3$i;
        label = 194;
        break L258;
       }
      } else {
       $br$0$ph$i = $598;$ssize$1$ph$i = $596;$tsize$0$ph$i = $$3$i;
       label = 184;
      }
     } else {
      $tsize$0323944$i = 0;
     }
    }
   } while(0);
   do {
    if ((label|0) == 174) {
     $572 = (_sbrk(0)|0);
     $573 = ($572|0)==((-1)|0);
     if ($573) {
      $tsize$0323944$i = 0;
     } else {
      $574 = $572;
      $575 = HEAP32[(3772)>>2]|0;
      $576 = (($575) + -1)|0;
      $577 = $576 & $574;
      $578 = ($577|0)==(0);
      if ($578) {
       $ssize$0$i = $550;
      } else {
       $579 = (($576) + ($574))|0;
       $580 = (0 - ($575))|0;
       $581 = $579 & $580;
       $582 = (($550) - ($574))|0;
       $583 = (($582) + ($581))|0;
       $ssize$0$i = $583;
      }
      $584 = HEAP32[(3728)>>2]|0;
      $585 = (($584) + ($ssize$0$i))|0;
      $586 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $587 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i30 = $586 & $587;
      if ($or$cond$i30) {
       $588 = HEAP32[(3736)>>2]|0;
       $589 = ($588|0)==(0);
       if (!($589)) {
        $590 = ($585>>>0)<=($584>>>0);
        $591 = ($585>>>0)>($588>>>0);
        $or$cond2$i = $590 | $591;
        if ($or$cond2$i) {
         $tsize$0323944$i = 0;
         break;
        }
       }
       $592 = (_sbrk(($ssize$0$i|0))|0);
       $593 = ($592|0)==($572|0);
       $ssize$0$$i = $593 ? $ssize$0$i : 0;
       if ($593) {
        $tbase$255$i = $572;$tsize$254$i = $ssize$0$$i;
        label = 194;
        break L258;
       } else {
        $br$0$ph$i = $592;$ssize$1$ph$i = $ssize$0$i;$tsize$0$ph$i = $ssize$0$$i;
        label = 184;
       }
      } else {
       $tsize$0323944$i = 0;
      }
     }
    }
   } while(0);
   L280: do {
    if ((label|0) == 184) {
     $604 = (0 - ($ssize$1$ph$i))|0;
     $605 = ($br$0$ph$i|0)!=((-1)|0);
     $606 = ($ssize$1$ph$i>>>0)<(2147483647);
     $or$cond5$i = $606 & $605;
     $607 = ($545>>>0)>($ssize$1$ph$i>>>0);
     $or$cond6$i = $607 & $or$cond5$i;
     do {
      if ($or$cond6$i) {
       $608 = HEAP32[(3776)>>2]|0;
       $609 = (($547) - ($ssize$1$ph$i))|0;
       $610 = (($609) + ($608))|0;
       $611 = (0 - ($608))|0;
       $612 = $610 & $611;
       $613 = ($612>>>0)<(2147483647);
       if ($613) {
        $614 = (_sbrk(($612|0))|0);
        $615 = ($614|0)==((-1)|0);
        if ($615) {
         (_sbrk(($604|0))|0);
         $tsize$0323944$i = $tsize$0$ph$i;
         break L280;
        } else {
         $616 = (($612) + ($ssize$1$ph$i))|0;
         $ssize$2$i = $616;
         break;
        }
       } else {
        $ssize$2$i = $ssize$1$ph$i;
       }
      } else {
       $ssize$2$i = $ssize$1$ph$i;
      }
     } while(0);
     $617 = ($br$0$ph$i|0)==((-1)|0);
     if ($617) {
      $tsize$0323944$i = $tsize$0$ph$i;
     } else {
      $tbase$255$i = $br$0$ph$i;$tsize$254$i = $ssize$2$i;
      label = 194;
      break L258;
     }
    }
   } while(0);
   $618 = HEAP32[(3740)>>2]|0;
   $619 = $618 | 4;
   HEAP32[(3740)>>2] = $619;
   $tsize$1$i = $tsize$0323944$i;
   label = 191;
  } else {
   $tsize$1$i = 0;
   label = 191;
  }
 } while(0);
 if ((label|0) == 191) {
  $620 = ($550>>>0)<(2147483647);
  if ($620) {
   $621 = (_sbrk(($550|0))|0);
   $622 = (_sbrk(0)|0);
   $623 = ($621|0)!=((-1)|0);
   $624 = ($622|0)!=((-1)|0);
   $or$cond3$i = $623 & $624;
   $625 = ($621>>>0)<($622>>>0);
   $or$cond8$i = $625 & $or$cond3$i;
   if ($or$cond8$i) {
    $626 = $622;
    $627 = $621;
    $628 = (($626) - ($627))|0;
    $629 = (($nb$0) + 40)|0;
    $630 = ($628>>>0)>($629>>>0);
    $$tsize$1$i = $630 ? $628 : $tsize$1$i;
    if ($630) {
     $tbase$255$i = $621;$tsize$254$i = $$tsize$1$i;
     label = 194;
    }
   }
  }
 }
 if ((label|0) == 194) {
  $631 = HEAP32[(3728)>>2]|0;
  $632 = (($631) + ($tsize$254$i))|0;
  HEAP32[(3728)>>2] = $632;
  $633 = HEAP32[(3732)>>2]|0;
  $634 = ($632>>>0)>($633>>>0);
  if ($634) {
   HEAP32[(3732)>>2] = $632;
  }
  $635 = HEAP32[(3320)>>2]|0;
  $636 = ($635|0)==(0|0);
  L299: do {
   if ($636) {
    $637 = HEAP32[(3312)>>2]|0;
    $638 = ($637|0)==(0|0);
    $639 = ($tbase$255$i>>>0)<($637>>>0);
    $or$cond9$i = $638 | $639;
    if ($or$cond9$i) {
     HEAP32[(3312)>>2] = $tbase$255$i;
    }
    HEAP32[(3744)>>2] = $tbase$255$i;
    HEAP32[(3748)>>2] = $tsize$254$i;
    HEAP32[(3756)>>2] = 0;
    $640 = HEAP32[3768>>2]|0;
    HEAP32[(3332)>>2] = $640;
    HEAP32[(3328)>>2] = -1;
    $i$02$i$i = 0;
    while(1) {
     $641 = $i$02$i$i << 1;
     $642 = (3336 + ($641<<2)|0);
     $$sum$i$i = (($641) + 3)|0;
     $643 = (3336 + ($$sum$i$i<<2)|0);
     HEAP32[$643>>2] = $642;
     $$sum1$i$i = (($641) + 2)|0;
     $644 = (3336 + ($$sum1$i$i<<2)|0);
     HEAP32[$644>>2] = $642;
     $645 = (($i$02$i$i) + 1)|0;
     $exitcond$i$i = ($645|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$02$i$i = $645;
     }
    }
    $646 = (($tsize$254$i) + -40)|0;
    $647 = ((($tbase$255$i)) + 8|0);
    $648 = $647;
    $649 = $648 & 7;
    $650 = ($649|0)==(0);
    $651 = (0 - ($648))|0;
    $652 = $651 & 7;
    $653 = $650 ? 0 : $652;
    $654 = (($tbase$255$i) + ($653)|0);
    $655 = (($646) - ($653))|0;
    HEAP32[(3320)>>2] = $654;
    HEAP32[(3308)>>2] = $655;
    $656 = $655 | 1;
    $$sum$i13$i = (($653) + 4)|0;
    $657 = (($tbase$255$i) + ($$sum$i13$i)|0);
    HEAP32[$657>>2] = $656;
    $$sum2$i$i = (($tsize$254$i) + -36)|0;
    $658 = (($tbase$255$i) + ($$sum2$i$i)|0);
    HEAP32[$658>>2] = 40;
    $659 = HEAP32[(3784)>>2]|0;
    HEAP32[(3324)>>2] = $659;
   } else {
    $sp$084$i = (3744);
    while(1) {
     $660 = HEAP32[$sp$084$i>>2]|0;
     $661 = ((($sp$084$i)) + 4|0);
     $662 = HEAP32[$661>>2]|0;
     $663 = (($660) + ($662)|0);
     $664 = ($tbase$255$i|0)==($663|0);
     if ($664) {
      $$lcssa222 = $660;$$lcssa224 = $661;$$lcssa226 = $662;$sp$084$i$lcssa = $sp$084$i;
      label = 204;
      break;
     }
     $665 = ((($sp$084$i)) + 8|0);
     $666 = HEAP32[$665>>2]|0;
     $667 = ($666|0)==(0|0);
     if ($667) {
      break;
     } else {
      $sp$084$i = $666;
     }
    }
    if ((label|0) == 204) {
     $668 = ((($sp$084$i$lcssa)) + 12|0);
     $669 = HEAP32[$668>>2]|0;
     $670 = $669 & 8;
     $671 = ($670|0)==(0);
     if ($671) {
      $672 = ($635>>>0)>=($$lcssa222>>>0);
      $673 = ($635>>>0)<($tbase$255$i>>>0);
      $or$cond57$i = $673 & $672;
      if ($or$cond57$i) {
       $674 = (($$lcssa226) + ($tsize$254$i))|0;
       HEAP32[$$lcssa224>>2] = $674;
       $675 = HEAP32[(3308)>>2]|0;
       $676 = (($675) + ($tsize$254$i))|0;
       $677 = ((($635)) + 8|0);
       $678 = $677;
       $679 = $678 & 7;
       $680 = ($679|0)==(0);
       $681 = (0 - ($678))|0;
       $682 = $681 & 7;
       $683 = $680 ? 0 : $682;
       $684 = (($635) + ($683)|0);
       $685 = (($676) - ($683))|0;
       HEAP32[(3320)>>2] = $684;
       HEAP32[(3308)>>2] = $685;
       $686 = $685 | 1;
       $$sum$i17$i = (($683) + 4)|0;
       $687 = (($635) + ($$sum$i17$i)|0);
       HEAP32[$687>>2] = $686;
       $$sum2$i18$i = (($676) + 4)|0;
       $688 = (($635) + ($$sum2$i18$i)|0);
       HEAP32[$688>>2] = 40;
       $689 = HEAP32[(3784)>>2]|0;
       HEAP32[(3324)>>2] = $689;
       break;
      }
     }
    }
    $690 = HEAP32[(3312)>>2]|0;
    $691 = ($tbase$255$i>>>0)<($690>>>0);
    if ($691) {
     HEAP32[(3312)>>2] = $tbase$255$i;
     $755 = $tbase$255$i;
    } else {
     $755 = $690;
    }
    $692 = (($tbase$255$i) + ($tsize$254$i)|0);
    $sp$183$i = (3744);
    while(1) {
     $693 = HEAP32[$sp$183$i>>2]|0;
     $694 = ($693|0)==($692|0);
     if ($694) {
      $$lcssa219 = $sp$183$i;$sp$183$i$lcssa = $sp$183$i;
      label = 212;
      break;
     }
     $695 = ((($sp$183$i)) + 8|0);
     $696 = HEAP32[$695>>2]|0;
     $697 = ($696|0)==(0|0);
     if ($697) {
      $sp$0$i$i$i = (3744);
      break;
     } else {
      $sp$183$i = $696;
     }
    }
    if ((label|0) == 212) {
     $698 = ((($sp$183$i$lcssa)) + 12|0);
     $699 = HEAP32[$698>>2]|0;
     $700 = $699 & 8;
     $701 = ($700|0)==(0);
     if ($701) {
      HEAP32[$$lcssa219>>2] = $tbase$255$i;
      $702 = ((($sp$183$i$lcssa)) + 4|0);
      $703 = HEAP32[$702>>2]|0;
      $704 = (($703) + ($tsize$254$i))|0;
      HEAP32[$702>>2] = $704;
      $705 = ((($tbase$255$i)) + 8|0);
      $706 = $705;
      $707 = $706 & 7;
      $708 = ($707|0)==(0);
      $709 = (0 - ($706))|0;
      $710 = $709 & 7;
      $711 = $708 ? 0 : $710;
      $712 = (($tbase$255$i) + ($711)|0);
      $$sum112$i = (($tsize$254$i) + 8)|0;
      $713 = (($tbase$255$i) + ($$sum112$i)|0);
      $714 = $713;
      $715 = $714 & 7;
      $716 = ($715|0)==(0);
      $717 = (0 - ($714))|0;
      $718 = $717 & 7;
      $719 = $716 ? 0 : $718;
      $$sum113$i = (($719) + ($tsize$254$i))|0;
      $720 = (($tbase$255$i) + ($$sum113$i)|0);
      $721 = $720;
      $722 = $712;
      $723 = (($721) - ($722))|0;
      $$sum$i19$i = (($711) + ($nb$0))|0;
      $724 = (($tbase$255$i) + ($$sum$i19$i)|0);
      $725 = (($723) - ($nb$0))|0;
      $726 = $nb$0 | 3;
      $$sum1$i20$i = (($711) + 4)|0;
      $727 = (($tbase$255$i) + ($$sum1$i20$i)|0);
      HEAP32[$727>>2] = $726;
      $728 = ($720|0)==($635|0);
      L324: do {
       if ($728) {
        $729 = HEAP32[(3308)>>2]|0;
        $730 = (($729) + ($725))|0;
        HEAP32[(3308)>>2] = $730;
        HEAP32[(3320)>>2] = $724;
        $731 = $730 | 1;
        $$sum42$i$i = (($$sum$i19$i) + 4)|0;
        $732 = (($tbase$255$i) + ($$sum42$i$i)|0);
        HEAP32[$732>>2] = $731;
       } else {
        $733 = HEAP32[(3316)>>2]|0;
        $734 = ($720|0)==($733|0);
        if ($734) {
         $735 = HEAP32[(3304)>>2]|0;
         $736 = (($735) + ($725))|0;
         HEAP32[(3304)>>2] = $736;
         HEAP32[(3316)>>2] = $724;
         $737 = $736 | 1;
         $$sum40$i$i = (($$sum$i19$i) + 4)|0;
         $738 = (($tbase$255$i) + ($$sum40$i$i)|0);
         HEAP32[$738>>2] = $737;
         $$sum41$i$i = (($736) + ($$sum$i19$i))|0;
         $739 = (($tbase$255$i) + ($$sum41$i$i)|0);
         HEAP32[$739>>2] = $736;
         break;
        }
        $$sum2$i21$i = (($tsize$254$i) + 4)|0;
        $$sum114$i = (($$sum2$i21$i) + ($719))|0;
        $740 = (($tbase$255$i) + ($$sum114$i)|0);
        $741 = HEAP32[$740>>2]|0;
        $742 = $741 & 3;
        $743 = ($742|0)==(1);
        if ($743) {
         $744 = $741 & -8;
         $745 = $741 >>> 3;
         $746 = ($741>>>0)<(256);
         L332: do {
          if ($746) {
           $$sum3738$i$i = $719 | 8;
           $$sum124$i = (($$sum3738$i$i) + ($tsize$254$i))|0;
           $747 = (($tbase$255$i) + ($$sum124$i)|0);
           $748 = HEAP32[$747>>2]|0;
           $$sum39$i$i = (($tsize$254$i) + 12)|0;
           $$sum125$i = (($$sum39$i$i) + ($719))|0;
           $749 = (($tbase$255$i) + ($$sum125$i)|0);
           $750 = HEAP32[$749>>2]|0;
           $751 = $745 << 1;
           $752 = (3336 + ($751<<2)|0);
           $753 = ($748|0)==($752|0);
           do {
            if (!($753)) {
             $754 = ($748>>>0)<($755>>>0);
             if ($754) {
              _abort();
              // unreachable;
             }
             $756 = ((($748)) + 12|0);
             $757 = HEAP32[$756>>2]|0;
             $758 = ($757|0)==($720|0);
             if ($758) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $759 = ($750|0)==($748|0);
           if ($759) {
            $760 = 1 << $745;
            $761 = $760 ^ -1;
            $762 = HEAP32[3296>>2]|0;
            $763 = $762 & $761;
            HEAP32[3296>>2] = $763;
            break;
           }
           $764 = ($750|0)==($752|0);
           do {
            if ($764) {
             $$pre57$i$i = ((($750)) + 8|0);
             $$pre$phi58$i$iZ2D = $$pre57$i$i;
            } else {
             $765 = ($750>>>0)<($755>>>0);
             if ($765) {
              _abort();
              // unreachable;
             }
             $766 = ((($750)) + 8|0);
             $767 = HEAP32[$766>>2]|0;
             $768 = ($767|0)==($720|0);
             if ($768) {
              $$pre$phi58$i$iZ2D = $766;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $769 = ((($748)) + 12|0);
           HEAP32[$769>>2] = $750;
           HEAP32[$$pre$phi58$i$iZ2D>>2] = $748;
          } else {
           $$sum34$i$i = $719 | 24;
           $$sum115$i = (($$sum34$i$i) + ($tsize$254$i))|0;
           $770 = (($tbase$255$i) + ($$sum115$i)|0);
           $771 = HEAP32[$770>>2]|0;
           $$sum5$i$i = (($tsize$254$i) + 12)|0;
           $$sum116$i = (($$sum5$i$i) + ($719))|0;
           $772 = (($tbase$255$i) + ($$sum116$i)|0);
           $773 = HEAP32[$772>>2]|0;
           $774 = ($773|0)==($720|0);
           do {
            if ($774) {
             $$sum67$i$i = $719 | 16;
             $$sum122$i = (($$sum2$i21$i) + ($$sum67$i$i))|0;
             $784 = (($tbase$255$i) + ($$sum122$i)|0);
             $785 = HEAP32[$784>>2]|0;
             $786 = ($785|0)==(0|0);
             if ($786) {
              $$sum123$i = (($$sum67$i$i) + ($tsize$254$i))|0;
              $787 = (($tbase$255$i) + ($$sum123$i)|0);
              $788 = HEAP32[$787>>2]|0;
              $789 = ($788|0)==(0|0);
              if ($789) {
               $R$1$i$i = 0;
               break;
              } else {
               $R$0$i$i = $788;$RP$0$i$i = $787;
              }
             } else {
              $R$0$i$i = $785;$RP$0$i$i = $784;
             }
             while(1) {
              $790 = ((($R$0$i$i)) + 20|0);
              $791 = HEAP32[$790>>2]|0;
              $792 = ($791|0)==(0|0);
              if (!($792)) {
               $R$0$i$i = $791;$RP$0$i$i = $790;
               continue;
              }
              $793 = ((($R$0$i$i)) + 16|0);
              $794 = HEAP32[$793>>2]|0;
              $795 = ($794|0)==(0|0);
              if ($795) {
               $R$0$i$i$lcssa = $R$0$i$i;$RP$0$i$i$lcssa = $RP$0$i$i;
               break;
              } else {
               $R$0$i$i = $794;$RP$0$i$i = $793;
              }
             }
             $796 = ($RP$0$i$i$lcssa>>>0)<($755>>>0);
             if ($796) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$0$i$i$lcssa>>2] = 0;
              $R$1$i$i = $R$0$i$i$lcssa;
              break;
             }
            } else {
             $$sum3536$i$i = $719 | 8;
             $$sum117$i = (($$sum3536$i$i) + ($tsize$254$i))|0;
             $775 = (($tbase$255$i) + ($$sum117$i)|0);
             $776 = HEAP32[$775>>2]|0;
             $777 = ($776>>>0)<($755>>>0);
             if ($777) {
              _abort();
              // unreachable;
             }
             $778 = ((($776)) + 12|0);
             $779 = HEAP32[$778>>2]|0;
             $780 = ($779|0)==($720|0);
             if (!($780)) {
              _abort();
              // unreachable;
             }
             $781 = ((($773)) + 8|0);
             $782 = HEAP32[$781>>2]|0;
             $783 = ($782|0)==($720|0);
             if ($783) {
              HEAP32[$778>>2] = $773;
              HEAP32[$781>>2] = $776;
              $R$1$i$i = $773;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $797 = ($771|0)==(0|0);
           if ($797) {
            break;
           }
           $$sum30$i$i = (($tsize$254$i) + 28)|0;
           $$sum118$i = (($$sum30$i$i) + ($719))|0;
           $798 = (($tbase$255$i) + ($$sum118$i)|0);
           $799 = HEAP32[$798>>2]|0;
           $800 = (3600 + ($799<<2)|0);
           $801 = HEAP32[$800>>2]|0;
           $802 = ($720|0)==($801|0);
           do {
            if ($802) {
             HEAP32[$800>>2] = $R$1$i$i;
             $cond$i$i = ($R$1$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $803 = 1 << $799;
             $804 = $803 ^ -1;
             $805 = HEAP32[(3300)>>2]|0;
             $806 = $805 & $804;
             HEAP32[(3300)>>2] = $806;
             break L332;
            } else {
             $807 = HEAP32[(3312)>>2]|0;
             $808 = ($771>>>0)<($807>>>0);
             if ($808) {
              _abort();
              // unreachable;
             }
             $809 = ((($771)) + 16|0);
             $810 = HEAP32[$809>>2]|0;
             $811 = ($810|0)==($720|0);
             if ($811) {
              HEAP32[$809>>2] = $R$1$i$i;
             } else {
              $812 = ((($771)) + 20|0);
              HEAP32[$812>>2] = $R$1$i$i;
             }
             $813 = ($R$1$i$i|0)==(0|0);
             if ($813) {
              break L332;
             }
            }
           } while(0);
           $814 = HEAP32[(3312)>>2]|0;
           $815 = ($R$1$i$i>>>0)<($814>>>0);
           if ($815) {
            _abort();
            // unreachable;
           }
           $816 = ((($R$1$i$i)) + 24|0);
           HEAP32[$816>>2] = $771;
           $$sum3132$i$i = $719 | 16;
           $$sum119$i = (($$sum3132$i$i) + ($tsize$254$i))|0;
           $817 = (($tbase$255$i) + ($$sum119$i)|0);
           $818 = HEAP32[$817>>2]|0;
           $819 = ($818|0)==(0|0);
           do {
            if (!($819)) {
             $820 = ($818>>>0)<($814>>>0);
             if ($820) {
              _abort();
              // unreachable;
             } else {
              $821 = ((($R$1$i$i)) + 16|0);
              HEAP32[$821>>2] = $818;
              $822 = ((($818)) + 24|0);
              HEAP32[$822>>2] = $R$1$i$i;
              break;
             }
            }
           } while(0);
           $$sum120$i = (($$sum2$i21$i) + ($$sum3132$i$i))|0;
           $823 = (($tbase$255$i) + ($$sum120$i)|0);
           $824 = HEAP32[$823>>2]|0;
           $825 = ($824|0)==(0|0);
           if ($825) {
            break;
           }
           $826 = HEAP32[(3312)>>2]|0;
           $827 = ($824>>>0)<($826>>>0);
           if ($827) {
            _abort();
            // unreachable;
           } else {
            $828 = ((($R$1$i$i)) + 20|0);
            HEAP32[$828>>2] = $824;
            $829 = ((($824)) + 24|0);
            HEAP32[$829>>2] = $R$1$i$i;
            break;
           }
          }
         } while(0);
         $$sum9$i$i = $744 | $719;
         $$sum121$i = (($$sum9$i$i) + ($tsize$254$i))|0;
         $830 = (($tbase$255$i) + ($$sum121$i)|0);
         $831 = (($744) + ($725))|0;
         $oldfirst$0$i$i = $830;$qsize$0$i$i = $831;
        } else {
         $oldfirst$0$i$i = $720;$qsize$0$i$i = $725;
        }
        $832 = ((($oldfirst$0$i$i)) + 4|0);
        $833 = HEAP32[$832>>2]|0;
        $834 = $833 & -2;
        HEAP32[$832>>2] = $834;
        $835 = $qsize$0$i$i | 1;
        $$sum10$i$i = (($$sum$i19$i) + 4)|0;
        $836 = (($tbase$255$i) + ($$sum10$i$i)|0);
        HEAP32[$836>>2] = $835;
        $$sum11$i$i = (($qsize$0$i$i) + ($$sum$i19$i))|0;
        $837 = (($tbase$255$i) + ($$sum11$i$i)|0);
        HEAP32[$837>>2] = $qsize$0$i$i;
        $838 = $qsize$0$i$i >>> 3;
        $839 = ($qsize$0$i$i>>>0)<(256);
        if ($839) {
         $840 = $838 << 1;
         $841 = (3336 + ($840<<2)|0);
         $842 = HEAP32[3296>>2]|0;
         $843 = 1 << $838;
         $844 = $842 & $843;
         $845 = ($844|0)==(0);
         do {
          if ($845) {
           $846 = $842 | $843;
           HEAP32[3296>>2] = $846;
           $$pre$i22$i = (($840) + 2)|0;
           $$pre56$i$i = (3336 + ($$pre$i22$i<<2)|0);
           $$pre$phi$i23$iZ2D = $$pre56$i$i;$F4$0$i$i = $841;
          } else {
           $$sum29$i$i = (($840) + 2)|0;
           $847 = (3336 + ($$sum29$i$i<<2)|0);
           $848 = HEAP32[$847>>2]|0;
           $849 = HEAP32[(3312)>>2]|0;
           $850 = ($848>>>0)<($849>>>0);
           if (!($850)) {
            $$pre$phi$i23$iZ2D = $847;$F4$0$i$i = $848;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i23$iZ2D>>2] = $724;
         $851 = ((($F4$0$i$i)) + 12|0);
         HEAP32[$851>>2] = $724;
         $$sum27$i$i = (($$sum$i19$i) + 8)|0;
         $852 = (($tbase$255$i) + ($$sum27$i$i)|0);
         HEAP32[$852>>2] = $F4$0$i$i;
         $$sum28$i$i = (($$sum$i19$i) + 12)|0;
         $853 = (($tbase$255$i) + ($$sum28$i$i)|0);
         HEAP32[$853>>2] = $841;
         break;
        }
        $854 = $qsize$0$i$i >>> 8;
        $855 = ($854|0)==(0);
        do {
         if ($855) {
          $I7$0$i$i = 0;
         } else {
          $856 = ($qsize$0$i$i>>>0)>(16777215);
          if ($856) {
           $I7$0$i$i = 31;
           break;
          }
          $857 = (($854) + 1048320)|0;
          $858 = $857 >>> 16;
          $859 = $858 & 8;
          $860 = $854 << $859;
          $861 = (($860) + 520192)|0;
          $862 = $861 >>> 16;
          $863 = $862 & 4;
          $864 = $863 | $859;
          $865 = $860 << $863;
          $866 = (($865) + 245760)|0;
          $867 = $866 >>> 16;
          $868 = $867 & 2;
          $869 = $864 | $868;
          $870 = (14 - ($869))|0;
          $871 = $865 << $868;
          $872 = $871 >>> 15;
          $873 = (($870) + ($872))|0;
          $874 = $873 << 1;
          $875 = (($873) + 7)|0;
          $876 = $qsize$0$i$i >>> $875;
          $877 = $876 & 1;
          $878 = $877 | $874;
          $I7$0$i$i = $878;
         }
        } while(0);
        $879 = (3600 + ($I7$0$i$i<<2)|0);
        $$sum12$i$i = (($$sum$i19$i) + 28)|0;
        $880 = (($tbase$255$i) + ($$sum12$i$i)|0);
        HEAP32[$880>>2] = $I7$0$i$i;
        $$sum13$i$i = (($$sum$i19$i) + 16)|0;
        $881 = (($tbase$255$i) + ($$sum13$i$i)|0);
        $$sum14$i$i = (($$sum$i19$i) + 20)|0;
        $882 = (($tbase$255$i) + ($$sum14$i$i)|0);
        HEAP32[$882>>2] = 0;
        HEAP32[$881>>2] = 0;
        $883 = HEAP32[(3300)>>2]|0;
        $884 = 1 << $I7$0$i$i;
        $885 = $883 & $884;
        $886 = ($885|0)==(0);
        if ($886) {
         $887 = $883 | $884;
         HEAP32[(3300)>>2] = $887;
         HEAP32[$879>>2] = $724;
         $$sum15$i$i = (($$sum$i19$i) + 24)|0;
         $888 = (($tbase$255$i) + ($$sum15$i$i)|0);
         HEAP32[$888>>2] = $879;
         $$sum16$i$i = (($$sum$i19$i) + 12)|0;
         $889 = (($tbase$255$i) + ($$sum16$i$i)|0);
         HEAP32[$889>>2] = $724;
         $$sum17$i$i = (($$sum$i19$i) + 8)|0;
         $890 = (($tbase$255$i) + ($$sum17$i$i)|0);
         HEAP32[$890>>2] = $724;
         break;
        }
        $891 = HEAP32[$879>>2]|0;
        $892 = ((($891)) + 4|0);
        $893 = HEAP32[$892>>2]|0;
        $894 = $893 & -8;
        $895 = ($894|0)==($qsize$0$i$i|0);
        L418: do {
         if ($895) {
          $T$0$lcssa$i25$i = $891;
         } else {
          $896 = ($I7$0$i$i|0)==(31);
          $897 = $I7$0$i$i >>> 1;
          $898 = (25 - ($897))|0;
          $899 = $896 ? 0 : $898;
          $900 = $qsize$0$i$i << $899;
          $K8$051$i$i = $900;$T$050$i$i = $891;
          while(1) {
           $907 = $K8$051$i$i >>> 31;
           $908 = (((($T$050$i$i)) + 16|0) + ($907<<2)|0);
           $903 = HEAP32[$908>>2]|0;
           $909 = ($903|0)==(0|0);
           if ($909) {
            $$lcssa = $908;$T$050$i$i$lcssa = $T$050$i$i;
            break;
           }
           $901 = $K8$051$i$i << 1;
           $902 = ((($903)) + 4|0);
           $904 = HEAP32[$902>>2]|0;
           $905 = $904 & -8;
           $906 = ($905|0)==($qsize$0$i$i|0);
           if ($906) {
            $T$0$lcssa$i25$i = $903;
            break L418;
           } else {
            $K8$051$i$i = $901;$T$050$i$i = $903;
           }
          }
          $910 = HEAP32[(3312)>>2]|0;
          $911 = ($$lcssa>>>0)<($910>>>0);
          if ($911) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$$lcssa>>2] = $724;
           $$sum23$i$i = (($$sum$i19$i) + 24)|0;
           $912 = (($tbase$255$i) + ($$sum23$i$i)|0);
           HEAP32[$912>>2] = $T$050$i$i$lcssa;
           $$sum24$i$i = (($$sum$i19$i) + 12)|0;
           $913 = (($tbase$255$i) + ($$sum24$i$i)|0);
           HEAP32[$913>>2] = $724;
           $$sum25$i$i = (($$sum$i19$i) + 8)|0;
           $914 = (($tbase$255$i) + ($$sum25$i$i)|0);
           HEAP32[$914>>2] = $724;
           break L324;
          }
         }
        } while(0);
        $915 = ((($T$0$lcssa$i25$i)) + 8|0);
        $916 = HEAP32[$915>>2]|0;
        $917 = HEAP32[(3312)>>2]|0;
        $918 = ($916>>>0)>=($917>>>0);
        $not$$i26$i = ($T$0$lcssa$i25$i>>>0)>=($917>>>0);
        $919 = $918 & $not$$i26$i;
        if ($919) {
         $920 = ((($916)) + 12|0);
         HEAP32[$920>>2] = $724;
         HEAP32[$915>>2] = $724;
         $$sum20$i$i = (($$sum$i19$i) + 8)|0;
         $921 = (($tbase$255$i) + ($$sum20$i$i)|0);
         HEAP32[$921>>2] = $916;
         $$sum21$i$i = (($$sum$i19$i) + 12)|0;
         $922 = (($tbase$255$i) + ($$sum21$i$i)|0);
         HEAP32[$922>>2] = $T$0$lcssa$i25$i;
         $$sum22$i$i = (($$sum$i19$i) + 24)|0;
         $923 = (($tbase$255$i) + ($$sum22$i$i)|0);
         HEAP32[$923>>2] = 0;
         break;
        } else {
         _abort();
         // unreachable;
        }
       }
      } while(0);
      $$sum1819$i$i = $711 | 8;
      $924 = (($tbase$255$i) + ($$sum1819$i$i)|0);
      $mem$0 = $924;
      return ($mem$0|0);
     } else {
      $sp$0$i$i$i = (3744);
     }
    }
    while(1) {
     $925 = HEAP32[$sp$0$i$i$i>>2]|0;
     $926 = ($925>>>0)>($635>>>0);
     if (!($926)) {
      $927 = ((($sp$0$i$i$i)) + 4|0);
      $928 = HEAP32[$927>>2]|0;
      $929 = (($925) + ($928)|0);
      $930 = ($929>>>0)>($635>>>0);
      if ($930) {
       $$lcssa215 = $925;$$lcssa216 = $928;$$lcssa217 = $929;
       break;
      }
     }
     $931 = ((($sp$0$i$i$i)) + 8|0);
     $932 = HEAP32[$931>>2]|0;
     $sp$0$i$i$i = $932;
    }
    $$sum$i14$i = (($$lcssa216) + -47)|0;
    $$sum1$i15$i = (($$lcssa216) + -39)|0;
    $933 = (($$lcssa215) + ($$sum1$i15$i)|0);
    $934 = $933;
    $935 = $934 & 7;
    $936 = ($935|0)==(0);
    $937 = (0 - ($934))|0;
    $938 = $937 & 7;
    $939 = $936 ? 0 : $938;
    $$sum2$i16$i = (($$sum$i14$i) + ($939))|0;
    $940 = (($$lcssa215) + ($$sum2$i16$i)|0);
    $941 = ((($635)) + 16|0);
    $942 = ($940>>>0)<($941>>>0);
    $943 = $942 ? $635 : $940;
    $944 = ((($943)) + 8|0);
    $945 = (($tsize$254$i) + -40)|0;
    $946 = ((($tbase$255$i)) + 8|0);
    $947 = $946;
    $948 = $947 & 7;
    $949 = ($948|0)==(0);
    $950 = (0 - ($947))|0;
    $951 = $950 & 7;
    $952 = $949 ? 0 : $951;
    $953 = (($tbase$255$i) + ($952)|0);
    $954 = (($945) - ($952))|0;
    HEAP32[(3320)>>2] = $953;
    HEAP32[(3308)>>2] = $954;
    $955 = $954 | 1;
    $$sum$i$i$i = (($952) + 4)|0;
    $956 = (($tbase$255$i) + ($$sum$i$i$i)|0);
    HEAP32[$956>>2] = $955;
    $$sum2$i$i$i = (($tsize$254$i) + -36)|0;
    $957 = (($tbase$255$i) + ($$sum2$i$i$i)|0);
    HEAP32[$957>>2] = 40;
    $958 = HEAP32[(3784)>>2]|0;
    HEAP32[(3324)>>2] = $958;
    $959 = ((($943)) + 4|0);
    HEAP32[$959>>2] = 27;
    ;HEAP32[$944>>2]=HEAP32[(3744)>>2]|0;HEAP32[$944+4>>2]=HEAP32[(3744)+4>>2]|0;HEAP32[$944+8>>2]=HEAP32[(3744)+8>>2]|0;HEAP32[$944+12>>2]=HEAP32[(3744)+12>>2]|0;
    HEAP32[(3744)>>2] = $tbase$255$i;
    HEAP32[(3748)>>2] = $tsize$254$i;
    HEAP32[(3756)>>2] = 0;
    HEAP32[(3752)>>2] = $944;
    $960 = ((($943)) + 28|0);
    HEAP32[$960>>2] = 7;
    $961 = ((($943)) + 32|0);
    $962 = ($961>>>0)<($$lcssa217>>>0);
    if ($962) {
     $964 = $960;
     while(1) {
      $963 = ((($964)) + 4|0);
      HEAP32[$963>>2] = 7;
      $965 = ((($964)) + 8|0);
      $966 = ($965>>>0)<($$lcssa217>>>0);
      if ($966) {
       $964 = $963;
      } else {
       break;
      }
     }
    }
    $967 = ($943|0)==($635|0);
    if (!($967)) {
     $968 = $943;
     $969 = $635;
     $970 = (($968) - ($969))|0;
     $971 = HEAP32[$959>>2]|0;
     $972 = $971 & -2;
     HEAP32[$959>>2] = $972;
     $973 = $970 | 1;
     $974 = ((($635)) + 4|0);
     HEAP32[$974>>2] = $973;
     HEAP32[$943>>2] = $970;
     $975 = $970 >>> 3;
     $976 = ($970>>>0)<(256);
     if ($976) {
      $977 = $975 << 1;
      $978 = (3336 + ($977<<2)|0);
      $979 = HEAP32[3296>>2]|0;
      $980 = 1 << $975;
      $981 = $979 & $980;
      $982 = ($981|0)==(0);
      if ($982) {
       $983 = $979 | $980;
       HEAP32[3296>>2] = $983;
       $$pre$i$i = (($977) + 2)|0;
       $$pre14$i$i = (3336 + ($$pre$i$i<<2)|0);
       $$pre$phi$i$iZ2D = $$pre14$i$i;$F$0$i$i = $978;
      } else {
       $$sum4$i$i = (($977) + 2)|0;
       $984 = (3336 + ($$sum4$i$i<<2)|0);
       $985 = HEAP32[$984>>2]|0;
       $986 = HEAP32[(3312)>>2]|0;
       $987 = ($985>>>0)<($986>>>0);
       if ($987) {
        _abort();
        // unreachable;
       } else {
        $$pre$phi$i$iZ2D = $984;$F$0$i$i = $985;
       }
      }
      HEAP32[$$pre$phi$i$iZ2D>>2] = $635;
      $988 = ((($F$0$i$i)) + 12|0);
      HEAP32[$988>>2] = $635;
      $989 = ((($635)) + 8|0);
      HEAP32[$989>>2] = $F$0$i$i;
      $990 = ((($635)) + 12|0);
      HEAP32[$990>>2] = $978;
      break;
     }
     $991 = $970 >>> 8;
     $992 = ($991|0)==(0);
     if ($992) {
      $I1$0$i$i = 0;
     } else {
      $993 = ($970>>>0)>(16777215);
      if ($993) {
       $I1$0$i$i = 31;
      } else {
       $994 = (($991) + 1048320)|0;
       $995 = $994 >>> 16;
       $996 = $995 & 8;
       $997 = $991 << $996;
       $998 = (($997) + 520192)|0;
       $999 = $998 >>> 16;
       $1000 = $999 & 4;
       $1001 = $1000 | $996;
       $1002 = $997 << $1000;
       $1003 = (($1002) + 245760)|0;
       $1004 = $1003 >>> 16;
       $1005 = $1004 & 2;
       $1006 = $1001 | $1005;
       $1007 = (14 - ($1006))|0;
       $1008 = $1002 << $1005;
       $1009 = $1008 >>> 15;
       $1010 = (($1007) + ($1009))|0;
       $1011 = $1010 << 1;
       $1012 = (($1010) + 7)|0;
       $1013 = $970 >>> $1012;
       $1014 = $1013 & 1;
       $1015 = $1014 | $1011;
       $I1$0$i$i = $1015;
      }
     }
     $1016 = (3600 + ($I1$0$i$i<<2)|0);
     $1017 = ((($635)) + 28|0);
     HEAP32[$1017>>2] = $I1$0$i$i;
     $1018 = ((($635)) + 20|0);
     HEAP32[$1018>>2] = 0;
     HEAP32[$941>>2] = 0;
     $1019 = HEAP32[(3300)>>2]|0;
     $1020 = 1 << $I1$0$i$i;
     $1021 = $1019 & $1020;
     $1022 = ($1021|0)==(0);
     if ($1022) {
      $1023 = $1019 | $1020;
      HEAP32[(3300)>>2] = $1023;
      HEAP32[$1016>>2] = $635;
      $1024 = ((($635)) + 24|0);
      HEAP32[$1024>>2] = $1016;
      $1025 = ((($635)) + 12|0);
      HEAP32[$1025>>2] = $635;
      $1026 = ((($635)) + 8|0);
      HEAP32[$1026>>2] = $635;
      break;
     }
     $1027 = HEAP32[$1016>>2]|0;
     $1028 = ((($1027)) + 4|0);
     $1029 = HEAP32[$1028>>2]|0;
     $1030 = $1029 & -8;
     $1031 = ($1030|0)==($970|0);
     L459: do {
      if ($1031) {
       $T$0$lcssa$i$i = $1027;
      } else {
       $1032 = ($I1$0$i$i|0)==(31);
       $1033 = $I1$0$i$i >>> 1;
       $1034 = (25 - ($1033))|0;
       $1035 = $1032 ? 0 : $1034;
       $1036 = $970 << $1035;
       $K2$07$i$i = $1036;$T$06$i$i = $1027;
       while(1) {
        $1043 = $K2$07$i$i >>> 31;
        $1044 = (((($T$06$i$i)) + 16|0) + ($1043<<2)|0);
        $1039 = HEAP32[$1044>>2]|0;
        $1045 = ($1039|0)==(0|0);
        if ($1045) {
         $$lcssa211 = $1044;$T$06$i$i$lcssa = $T$06$i$i;
         break;
        }
        $1037 = $K2$07$i$i << 1;
        $1038 = ((($1039)) + 4|0);
        $1040 = HEAP32[$1038>>2]|0;
        $1041 = $1040 & -8;
        $1042 = ($1041|0)==($970|0);
        if ($1042) {
         $T$0$lcssa$i$i = $1039;
         break L459;
        } else {
         $K2$07$i$i = $1037;$T$06$i$i = $1039;
        }
       }
       $1046 = HEAP32[(3312)>>2]|0;
       $1047 = ($$lcssa211>>>0)<($1046>>>0);
       if ($1047) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$$lcssa211>>2] = $635;
        $1048 = ((($635)) + 24|0);
        HEAP32[$1048>>2] = $T$06$i$i$lcssa;
        $1049 = ((($635)) + 12|0);
        HEAP32[$1049>>2] = $635;
        $1050 = ((($635)) + 8|0);
        HEAP32[$1050>>2] = $635;
        break L299;
       }
      }
     } while(0);
     $1051 = ((($T$0$lcssa$i$i)) + 8|0);
     $1052 = HEAP32[$1051>>2]|0;
     $1053 = HEAP32[(3312)>>2]|0;
     $1054 = ($1052>>>0)>=($1053>>>0);
     $not$$i$i = ($T$0$lcssa$i$i>>>0)>=($1053>>>0);
     $1055 = $1054 & $not$$i$i;
     if ($1055) {
      $1056 = ((($1052)) + 12|0);
      HEAP32[$1056>>2] = $635;
      HEAP32[$1051>>2] = $635;
      $1057 = ((($635)) + 8|0);
      HEAP32[$1057>>2] = $1052;
      $1058 = ((($635)) + 12|0);
      HEAP32[$1058>>2] = $T$0$lcssa$i$i;
      $1059 = ((($635)) + 24|0);
      HEAP32[$1059>>2] = 0;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   }
  } while(0);
  $1060 = HEAP32[(3308)>>2]|0;
  $1061 = ($1060>>>0)>($nb$0>>>0);
  if ($1061) {
   $1062 = (($1060) - ($nb$0))|0;
   HEAP32[(3308)>>2] = $1062;
   $1063 = HEAP32[(3320)>>2]|0;
   $1064 = (($1063) + ($nb$0)|0);
   HEAP32[(3320)>>2] = $1064;
   $1065 = $1062 | 1;
   $$sum$i32 = (($nb$0) + 4)|0;
   $1066 = (($1063) + ($$sum$i32)|0);
   HEAP32[$1066>>2] = $1065;
   $1067 = $nb$0 | 3;
   $1068 = ((($1063)) + 4|0);
   HEAP32[$1068>>2] = $1067;
   $1069 = ((($1063)) + 8|0);
   $mem$0 = $1069;
   return ($mem$0|0);
  }
 }
 $1070 = (___errno_location()|0);
 HEAP32[$1070>>2] = 12;
 $mem$0 = 0;
 return ($mem$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$lcssa = 0, $$pre = 0, $$pre$phi59Z2D = 0, $$pre$phi61Z2D = 0, $$pre$phiZ2D = 0, $$pre57 = 0, $$pre58 = 0, $$pre60 = 0, $$sum = 0, $$sum11 = 0, $$sum12 = 0, $$sum13 = 0, $$sum14 = 0, $$sum1718 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum22 = 0, $$sum23 = 0, $$sum24 = 0;
 var $$sum25 = 0, $$sum26 = 0, $$sum27 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0, $$sum31 = 0, $$sum5 = 0, $$sum67 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0;
 var $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0;
 var $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0;
 var $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0;
 var $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0;
 var $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0;
 var $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0;
 var $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0;
 var $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0;
 var $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0;
 var $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0;
 var $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0;
 var $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0;
 var $321 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0;
 var $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0;
 var $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0;
 var $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I18$0 = 0, $K19$052 = 0, $R$0 = 0, $R$0$lcssa = 0, $R$1 = 0;
 var $R7$0 = 0, $R7$0$lcssa = 0, $R7$1 = 0, $RP$0 = 0, $RP$0$lcssa = 0, $RP9$0 = 0, $RP9$0$lcssa = 0, $T$0$lcssa = 0, $T$051 = 0, $T$051$lcssa = 0, $cond = 0, $cond47 = 0, $not$ = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  return;
 }
 $1 = ((($mem)) + -8|0);
 $2 = HEAP32[(3312)>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = ((($mem)) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & 3;
 $7 = ($6|0)==(1);
 if ($7) {
  _abort();
  // unreachable;
 }
 $8 = $5 & -8;
 $$sum = (($8) + -8)|0;
 $9 = (($mem) + ($$sum)|0);
 $10 = $5 & 1;
 $11 = ($10|0)==(0);
 do {
  if ($11) {
   $12 = HEAP32[$1>>2]|0;
   $13 = ($6|0)==(0);
   if ($13) {
    return;
   }
   $$sum2 = (-8 - ($12))|0;
   $14 = (($mem) + ($$sum2)|0);
   $15 = (($12) + ($8))|0;
   $16 = ($14>>>0)<($2>>>0);
   if ($16) {
    _abort();
    // unreachable;
   }
   $17 = HEAP32[(3316)>>2]|0;
   $18 = ($14|0)==($17|0);
   if ($18) {
    $$sum3 = (($8) + -4)|0;
    $103 = (($mem) + ($$sum3)|0);
    $104 = HEAP32[$103>>2]|0;
    $105 = $104 & 3;
    $106 = ($105|0)==(3);
    if (!($106)) {
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    HEAP32[(3304)>>2] = $15;
    $107 = $104 & -2;
    HEAP32[$103>>2] = $107;
    $108 = $15 | 1;
    $$sum20 = (($$sum2) + 4)|0;
    $109 = (($mem) + ($$sum20)|0);
    HEAP32[$109>>2] = $108;
    HEAP32[$9>>2] = $15;
    return;
   }
   $19 = $12 >>> 3;
   $20 = ($12>>>0)<(256);
   if ($20) {
    $$sum30 = (($$sum2) + 8)|0;
    $21 = (($mem) + ($$sum30)|0);
    $22 = HEAP32[$21>>2]|0;
    $$sum31 = (($$sum2) + 12)|0;
    $23 = (($mem) + ($$sum31)|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = $19 << 1;
    $26 = (3336 + ($25<<2)|0);
    $27 = ($22|0)==($26|0);
    if (!($27)) {
     $28 = ($22>>>0)<($2>>>0);
     if ($28) {
      _abort();
      // unreachable;
     }
     $29 = ((($22)) + 12|0);
     $30 = HEAP32[$29>>2]|0;
     $31 = ($30|0)==($14|0);
     if (!($31)) {
      _abort();
      // unreachable;
     }
    }
    $32 = ($24|0)==($22|0);
    if ($32) {
     $33 = 1 << $19;
     $34 = $33 ^ -1;
     $35 = HEAP32[3296>>2]|0;
     $36 = $35 & $34;
     HEAP32[3296>>2] = $36;
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    $37 = ($24|0)==($26|0);
    if ($37) {
     $$pre60 = ((($24)) + 8|0);
     $$pre$phi61Z2D = $$pre60;
    } else {
     $38 = ($24>>>0)<($2>>>0);
     if ($38) {
      _abort();
      // unreachable;
     }
     $39 = ((($24)) + 8|0);
     $40 = HEAP32[$39>>2]|0;
     $41 = ($40|0)==($14|0);
     if ($41) {
      $$pre$phi61Z2D = $39;
     } else {
      _abort();
      // unreachable;
     }
    }
    $42 = ((($22)) + 12|0);
    HEAP32[$42>>2] = $24;
    HEAP32[$$pre$phi61Z2D>>2] = $22;
    $p$0 = $14;$psize$0 = $15;
    break;
   }
   $$sum22 = (($$sum2) + 24)|0;
   $43 = (($mem) + ($$sum22)|0);
   $44 = HEAP32[$43>>2]|0;
   $$sum23 = (($$sum2) + 12)|0;
   $45 = (($mem) + ($$sum23)|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ($46|0)==($14|0);
   do {
    if ($47) {
     $$sum25 = (($$sum2) + 20)|0;
     $57 = (($mem) + ($$sum25)|0);
     $58 = HEAP32[$57>>2]|0;
     $59 = ($58|0)==(0|0);
     if ($59) {
      $$sum24 = (($$sum2) + 16)|0;
      $60 = (($mem) + ($$sum24)|0);
      $61 = HEAP32[$60>>2]|0;
      $62 = ($61|0)==(0|0);
      if ($62) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $61;$RP$0 = $60;
      }
     } else {
      $R$0 = $58;$RP$0 = $57;
     }
     while(1) {
      $63 = ((($R$0)) + 20|0);
      $64 = HEAP32[$63>>2]|0;
      $65 = ($64|0)==(0|0);
      if (!($65)) {
       $R$0 = $64;$RP$0 = $63;
       continue;
      }
      $66 = ((($R$0)) + 16|0);
      $67 = HEAP32[$66>>2]|0;
      $68 = ($67|0)==(0|0);
      if ($68) {
       $R$0$lcssa = $R$0;$RP$0$lcssa = $RP$0;
       break;
      } else {
       $R$0 = $67;$RP$0 = $66;
      }
     }
     $69 = ($RP$0$lcssa>>>0)<($2>>>0);
     if ($69) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0$lcssa>>2] = 0;
      $R$1 = $R$0$lcssa;
      break;
     }
    } else {
     $$sum29 = (($$sum2) + 8)|0;
     $48 = (($mem) + ($$sum29)|0);
     $49 = HEAP32[$48>>2]|0;
     $50 = ($49>>>0)<($2>>>0);
     if ($50) {
      _abort();
      // unreachable;
     }
     $51 = ((($49)) + 12|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = ($52|0)==($14|0);
     if (!($53)) {
      _abort();
      // unreachable;
     }
     $54 = ((($46)) + 8|0);
     $55 = HEAP32[$54>>2]|0;
     $56 = ($55|0)==($14|0);
     if ($56) {
      HEAP32[$51>>2] = $46;
      HEAP32[$54>>2] = $49;
      $R$1 = $46;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $70 = ($44|0)==(0|0);
   if ($70) {
    $p$0 = $14;$psize$0 = $15;
   } else {
    $$sum26 = (($$sum2) + 28)|0;
    $71 = (($mem) + ($$sum26)|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = (3600 + ($72<<2)|0);
    $74 = HEAP32[$73>>2]|0;
    $75 = ($14|0)==($74|0);
    if ($75) {
     HEAP32[$73>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $76 = 1 << $72;
      $77 = $76 ^ -1;
      $78 = HEAP32[(3300)>>2]|0;
      $79 = $78 & $77;
      HEAP32[(3300)>>2] = $79;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    } else {
     $80 = HEAP32[(3312)>>2]|0;
     $81 = ($44>>>0)<($80>>>0);
     if ($81) {
      _abort();
      // unreachable;
     }
     $82 = ((($44)) + 16|0);
     $83 = HEAP32[$82>>2]|0;
     $84 = ($83|0)==($14|0);
     if ($84) {
      HEAP32[$82>>2] = $R$1;
     } else {
      $85 = ((($44)) + 20|0);
      HEAP32[$85>>2] = $R$1;
     }
     $86 = ($R$1|0)==(0|0);
     if ($86) {
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
    $87 = HEAP32[(3312)>>2]|0;
    $88 = ($R$1>>>0)<($87>>>0);
    if ($88) {
     _abort();
     // unreachable;
    }
    $89 = ((($R$1)) + 24|0);
    HEAP32[$89>>2] = $44;
    $$sum27 = (($$sum2) + 16)|0;
    $90 = (($mem) + ($$sum27)|0);
    $91 = HEAP32[$90>>2]|0;
    $92 = ($91|0)==(0|0);
    do {
     if (!($92)) {
      $93 = ($91>>>0)<($87>>>0);
      if ($93) {
       _abort();
       // unreachable;
      } else {
       $94 = ((($R$1)) + 16|0);
       HEAP32[$94>>2] = $91;
       $95 = ((($91)) + 24|0);
       HEAP32[$95>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum28 = (($$sum2) + 20)|0;
    $96 = (($mem) + ($$sum28)|0);
    $97 = HEAP32[$96>>2]|0;
    $98 = ($97|0)==(0|0);
    if ($98) {
     $p$0 = $14;$psize$0 = $15;
    } else {
     $99 = HEAP32[(3312)>>2]|0;
     $100 = ($97>>>0)<($99>>>0);
     if ($100) {
      _abort();
      // unreachable;
     } else {
      $101 = ((($R$1)) + 20|0);
      HEAP32[$101>>2] = $97;
      $102 = ((($97)) + 24|0);
      HEAP32[$102>>2] = $R$1;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
   }
  } else {
   $p$0 = $1;$psize$0 = $8;
  }
 } while(0);
 $110 = ($p$0>>>0)<($9>>>0);
 if (!($110)) {
  _abort();
  // unreachable;
 }
 $$sum19 = (($8) + -4)|0;
 $111 = (($mem) + ($$sum19)|0);
 $112 = HEAP32[$111>>2]|0;
 $113 = $112 & 1;
 $114 = ($113|0)==(0);
 if ($114) {
  _abort();
  // unreachable;
 }
 $115 = $112 & 2;
 $116 = ($115|0)==(0);
 if ($116) {
  $117 = HEAP32[(3320)>>2]|0;
  $118 = ($9|0)==($117|0);
  if ($118) {
   $119 = HEAP32[(3308)>>2]|0;
   $120 = (($119) + ($psize$0))|0;
   HEAP32[(3308)>>2] = $120;
   HEAP32[(3320)>>2] = $p$0;
   $121 = $120 | 1;
   $122 = ((($p$0)) + 4|0);
   HEAP32[$122>>2] = $121;
   $123 = HEAP32[(3316)>>2]|0;
   $124 = ($p$0|0)==($123|0);
   if (!($124)) {
    return;
   }
   HEAP32[(3316)>>2] = 0;
   HEAP32[(3304)>>2] = 0;
   return;
  }
  $125 = HEAP32[(3316)>>2]|0;
  $126 = ($9|0)==($125|0);
  if ($126) {
   $127 = HEAP32[(3304)>>2]|0;
   $128 = (($127) + ($psize$0))|0;
   HEAP32[(3304)>>2] = $128;
   HEAP32[(3316)>>2] = $p$0;
   $129 = $128 | 1;
   $130 = ((($p$0)) + 4|0);
   HEAP32[$130>>2] = $129;
   $131 = (($p$0) + ($128)|0);
   HEAP32[$131>>2] = $128;
   return;
  }
  $132 = $112 & -8;
  $133 = (($132) + ($psize$0))|0;
  $134 = $112 >>> 3;
  $135 = ($112>>>0)<(256);
  do {
   if ($135) {
    $136 = (($mem) + ($8)|0);
    $137 = HEAP32[$136>>2]|0;
    $$sum1718 = $8 | 4;
    $138 = (($mem) + ($$sum1718)|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = $134 << 1;
    $141 = (3336 + ($140<<2)|0);
    $142 = ($137|0)==($141|0);
    if (!($142)) {
     $143 = HEAP32[(3312)>>2]|0;
     $144 = ($137>>>0)<($143>>>0);
     if ($144) {
      _abort();
      // unreachable;
     }
     $145 = ((($137)) + 12|0);
     $146 = HEAP32[$145>>2]|0;
     $147 = ($146|0)==($9|0);
     if (!($147)) {
      _abort();
      // unreachable;
     }
    }
    $148 = ($139|0)==($137|0);
    if ($148) {
     $149 = 1 << $134;
     $150 = $149 ^ -1;
     $151 = HEAP32[3296>>2]|0;
     $152 = $151 & $150;
     HEAP32[3296>>2] = $152;
     break;
    }
    $153 = ($139|0)==($141|0);
    if ($153) {
     $$pre58 = ((($139)) + 8|0);
     $$pre$phi59Z2D = $$pre58;
    } else {
     $154 = HEAP32[(3312)>>2]|0;
     $155 = ($139>>>0)<($154>>>0);
     if ($155) {
      _abort();
      // unreachable;
     }
     $156 = ((($139)) + 8|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = ($157|0)==($9|0);
     if ($158) {
      $$pre$phi59Z2D = $156;
     } else {
      _abort();
      // unreachable;
     }
    }
    $159 = ((($137)) + 12|0);
    HEAP32[$159>>2] = $139;
    HEAP32[$$pre$phi59Z2D>>2] = $137;
   } else {
    $$sum5 = (($8) + 16)|0;
    $160 = (($mem) + ($$sum5)|0);
    $161 = HEAP32[$160>>2]|0;
    $$sum67 = $8 | 4;
    $162 = (($mem) + ($$sum67)|0);
    $163 = HEAP32[$162>>2]|0;
    $164 = ($163|0)==($9|0);
    do {
     if ($164) {
      $$sum9 = (($8) + 12)|0;
      $175 = (($mem) + ($$sum9)|0);
      $176 = HEAP32[$175>>2]|0;
      $177 = ($176|0)==(0|0);
      if ($177) {
       $$sum8 = (($8) + 8)|0;
       $178 = (($mem) + ($$sum8)|0);
       $179 = HEAP32[$178>>2]|0;
       $180 = ($179|0)==(0|0);
       if ($180) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $179;$RP9$0 = $178;
       }
      } else {
       $R7$0 = $176;$RP9$0 = $175;
      }
      while(1) {
       $181 = ((($R7$0)) + 20|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ($182|0)==(0|0);
       if (!($183)) {
        $R7$0 = $182;$RP9$0 = $181;
        continue;
       }
       $184 = ((($R7$0)) + 16|0);
       $185 = HEAP32[$184>>2]|0;
       $186 = ($185|0)==(0|0);
       if ($186) {
        $R7$0$lcssa = $R7$0;$RP9$0$lcssa = $RP9$0;
        break;
       } else {
        $R7$0 = $185;$RP9$0 = $184;
       }
      }
      $187 = HEAP32[(3312)>>2]|0;
      $188 = ($RP9$0$lcssa>>>0)<($187>>>0);
      if ($188) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0$lcssa>>2] = 0;
       $R7$1 = $R7$0$lcssa;
       break;
      }
     } else {
      $165 = (($mem) + ($8)|0);
      $166 = HEAP32[$165>>2]|0;
      $167 = HEAP32[(3312)>>2]|0;
      $168 = ($166>>>0)<($167>>>0);
      if ($168) {
       _abort();
       // unreachable;
      }
      $169 = ((($166)) + 12|0);
      $170 = HEAP32[$169>>2]|0;
      $171 = ($170|0)==($9|0);
      if (!($171)) {
       _abort();
       // unreachable;
      }
      $172 = ((($163)) + 8|0);
      $173 = HEAP32[$172>>2]|0;
      $174 = ($173|0)==($9|0);
      if ($174) {
       HEAP32[$169>>2] = $163;
       HEAP32[$172>>2] = $166;
       $R7$1 = $163;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $189 = ($161|0)==(0|0);
    if (!($189)) {
     $$sum12 = (($8) + 20)|0;
     $190 = (($mem) + ($$sum12)|0);
     $191 = HEAP32[$190>>2]|0;
     $192 = (3600 + ($191<<2)|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = ($9|0)==($193|0);
     if ($194) {
      HEAP32[$192>>2] = $R7$1;
      $cond47 = ($R7$1|0)==(0|0);
      if ($cond47) {
       $195 = 1 << $191;
       $196 = $195 ^ -1;
       $197 = HEAP32[(3300)>>2]|0;
       $198 = $197 & $196;
       HEAP32[(3300)>>2] = $198;
       break;
      }
     } else {
      $199 = HEAP32[(3312)>>2]|0;
      $200 = ($161>>>0)<($199>>>0);
      if ($200) {
       _abort();
       // unreachable;
      }
      $201 = ((($161)) + 16|0);
      $202 = HEAP32[$201>>2]|0;
      $203 = ($202|0)==($9|0);
      if ($203) {
       HEAP32[$201>>2] = $R7$1;
      } else {
       $204 = ((($161)) + 20|0);
       HEAP32[$204>>2] = $R7$1;
      }
      $205 = ($R7$1|0)==(0|0);
      if ($205) {
       break;
      }
     }
     $206 = HEAP32[(3312)>>2]|0;
     $207 = ($R7$1>>>0)<($206>>>0);
     if ($207) {
      _abort();
      // unreachable;
     }
     $208 = ((($R7$1)) + 24|0);
     HEAP32[$208>>2] = $161;
     $$sum13 = (($8) + 8)|0;
     $209 = (($mem) + ($$sum13)|0);
     $210 = HEAP32[$209>>2]|0;
     $211 = ($210|0)==(0|0);
     do {
      if (!($211)) {
       $212 = ($210>>>0)<($206>>>0);
       if ($212) {
        _abort();
        // unreachable;
       } else {
        $213 = ((($R7$1)) + 16|0);
        HEAP32[$213>>2] = $210;
        $214 = ((($210)) + 24|0);
        HEAP32[$214>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum14 = (($8) + 12)|0;
     $215 = (($mem) + ($$sum14)|0);
     $216 = HEAP32[$215>>2]|0;
     $217 = ($216|0)==(0|0);
     if (!($217)) {
      $218 = HEAP32[(3312)>>2]|0;
      $219 = ($216>>>0)<($218>>>0);
      if ($219) {
       _abort();
       // unreachable;
      } else {
       $220 = ((($R7$1)) + 20|0);
       HEAP32[$220>>2] = $216;
       $221 = ((($216)) + 24|0);
       HEAP32[$221>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $222 = $133 | 1;
  $223 = ((($p$0)) + 4|0);
  HEAP32[$223>>2] = $222;
  $224 = (($p$0) + ($133)|0);
  HEAP32[$224>>2] = $133;
  $225 = HEAP32[(3316)>>2]|0;
  $226 = ($p$0|0)==($225|0);
  if ($226) {
   HEAP32[(3304)>>2] = $133;
   return;
  } else {
   $psize$1 = $133;
  }
 } else {
  $227 = $112 & -2;
  HEAP32[$111>>2] = $227;
  $228 = $psize$0 | 1;
  $229 = ((($p$0)) + 4|0);
  HEAP32[$229>>2] = $228;
  $230 = (($p$0) + ($psize$0)|0);
  HEAP32[$230>>2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $231 = $psize$1 >>> 3;
 $232 = ($psize$1>>>0)<(256);
 if ($232) {
  $233 = $231 << 1;
  $234 = (3336 + ($233<<2)|0);
  $235 = HEAP32[3296>>2]|0;
  $236 = 1 << $231;
  $237 = $235 & $236;
  $238 = ($237|0)==(0);
  if ($238) {
   $239 = $235 | $236;
   HEAP32[3296>>2] = $239;
   $$pre = (($233) + 2)|0;
   $$pre57 = (3336 + ($$pre<<2)|0);
   $$pre$phiZ2D = $$pre57;$F16$0 = $234;
  } else {
   $$sum11 = (($233) + 2)|0;
   $240 = (3336 + ($$sum11<<2)|0);
   $241 = HEAP32[$240>>2]|0;
   $242 = HEAP32[(3312)>>2]|0;
   $243 = ($241>>>0)<($242>>>0);
   if ($243) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $240;$F16$0 = $241;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$0;
  $244 = ((($F16$0)) + 12|0);
  HEAP32[$244>>2] = $p$0;
  $245 = ((($p$0)) + 8|0);
  HEAP32[$245>>2] = $F16$0;
  $246 = ((($p$0)) + 12|0);
  HEAP32[$246>>2] = $234;
  return;
 }
 $247 = $psize$1 >>> 8;
 $248 = ($247|0)==(0);
 if ($248) {
  $I18$0 = 0;
 } else {
  $249 = ($psize$1>>>0)>(16777215);
  if ($249) {
   $I18$0 = 31;
  } else {
   $250 = (($247) + 1048320)|0;
   $251 = $250 >>> 16;
   $252 = $251 & 8;
   $253 = $247 << $252;
   $254 = (($253) + 520192)|0;
   $255 = $254 >>> 16;
   $256 = $255 & 4;
   $257 = $256 | $252;
   $258 = $253 << $256;
   $259 = (($258) + 245760)|0;
   $260 = $259 >>> 16;
   $261 = $260 & 2;
   $262 = $257 | $261;
   $263 = (14 - ($262))|0;
   $264 = $258 << $261;
   $265 = $264 >>> 15;
   $266 = (($263) + ($265))|0;
   $267 = $266 << 1;
   $268 = (($266) + 7)|0;
   $269 = $psize$1 >>> $268;
   $270 = $269 & 1;
   $271 = $270 | $267;
   $I18$0 = $271;
  }
 }
 $272 = (3600 + ($I18$0<<2)|0);
 $273 = ((($p$0)) + 28|0);
 HEAP32[$273>>2] = $I18$0;
 $274 = ((($p$0)) + 16|0);
 $275 = ((($p$0)) + 20|0);
 HEAP32[$275>>2] = 0;
 HEAP32[$274>>2] = 0;
 $276 = HEAP32[(3300)>>2]|0;
 $277 = 1 << $I18$0;
 $278 = $276 & $277;
 $279 = ($278|0)==(0);
 L199: do {
  if ($279) {
   $280 = $276 | $277;
   HEAP32[(3300)>>2] = $280;
   HEAP32[$272>>2] = $p$0;
   $281 = ((($p$0)) + 24|0);
   HEAP32[$281>>2] = $272;
   $282 = ((($p$0)) + 12|0);
   HEAP32[$282>>2] = $p$0;
   $283 = ((($p$0)) + 8|0);
   HEAP32[$283>>2] = $p$0;
  } else {
   $284 = HEAP32[$272>>2]|0;
   $285 = ((($284)) + 4|0);
   $286 = HEAP32[$285>>2]|0;
   $287 = $286 & -8;
   $288 = ($287|0)==($psize$1|0);
   L202: do {
    if ($288) {
     $T$0$lcssa = $284;
    } else {
     $289 = ($I18$0|0)==(31);
     $290 = $I18$0 >>> 1;
     $291 = (25 - ($290))|0;
     $292 = $289 ? 0 : $291;
     $293 = $psize$1 << $292;
     $K19$052 = $293;$T$051 = $284;
     while(1) {
      $300 = $K19$052 >>> 31;
      $301 = (((($T$051)) + 16|0) + ($300<<2)|0);
      $296 = HEAP32[$301>>2]|0;
      $302 = ($296|0)==(0|0);
      if ($302) {
       $$lcssa = $301;$T$051$lcssa = $T$051;
       break;
      }
      $294 = $K19$052 << 1;
      $295 = ((($296)) + 4|0);
      $297 = HEAP32[$295>>2]|0;
      $298 = $297 & -8;
      $299 = ($298|0)==($psize$1|0);
      if ($299) {
       $T$0$lcssa = $296;
       break L202;
      } else {
       $K19$052 = $294;$T$051 = $296;
      }
     }
     $303 = HEAP32[(3312)>>2]|0;
     $304 = ($$lcssa>>>0)<($303>>>0);
     if ($304) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$$lcssa>>2] = $p$0;
      $305 = ((($p$0)) + 24|0);
      HEAP32[$305>>2] = $T$051$lcssa;
      $306 = ((($p$0)) + 12|0);
      HEAP32[$306>>2] = $p$0;
      $307 = ((($p$0)) + 8|0);
      HEAP32[$307>>2] = $p$0;
      break L199;
     }
    }
   } while(0);
   $308 = ((($T$0$lcssa)) + 8|0);
   $309 = HEAP32[$308>>2]|0;
   $310 = HEAP32[(3312)>>2]|0;
   $311 = ($309>>>0)>=($310>>>0);
   $not$ = ($T$0$lcssa>>>0)>=($310>>>0);
   $312 = $311 & $not$;
   if ($312) {
    $313 = ((($309)) + 12|0);
    HEAP32[$313>>2] = $p$0;
    HEAP32[$308>>2] = $p$0;
    $314 = ((($p$0)) + 8|0);
    HEAP32[$314>>2] = $309;
    $315 = ((($p$0)) + 12|0);
    HEAP32[$315>>2] = $T$0$lcssa;
    $316 = ((($p$0)) + 24|0);
    HEAP32[$316>>2] = 0;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $317 = HEAP32[(3328)>>2]|0;
 $318 = (($317) + -1)|0;
 HEAP32[(3328)>>2] = $318;
 $319 = ($318|0)==(0);
 if ($319) {
  $sp$0$in$i = (3752);
 } else {
  return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $320 = ($sp$0$i|0)==(0|0);
  $321 = ((($sp$0$i)) + 8|0);
  if ($320) {
   break;
  } else {
   $sp$0$in$i = $321;
  }
 }
 HEAP32[(3328)>>2] = -1;
 return;
}
function runPostSets() {
}
function _i64Subtract(a, b, c, d) {
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a - c)>>>0;
    h = (b - d)>>>0;
    h = (b - d - (((c>>>0) > (a>>>0))|0))>>>0; // Borrow one from high word to low word on underflow.
    return ((tempRet0 = h,l|0)|0);
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _bitshift64Lshr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >>> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = 0;
    return (high >>> (bits - 32))|0;
}
function _bitshift64Shl(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = (high << bits) | ((low&(ander << (32 - bits))) >>> (32 - bits));
      return low << bits;
    }
    tempRet0 = low << (bits - 32);
    return 0;
}
function _memcpy(dest, src, num) {
    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if ((num|0) >= 4096) return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}
function _i64Add(a, b, c, d) {
    /*
      x = a + b*2^32
      y = c + d*2^32
      result = l + h*2^32
    */
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a + c)>>>0;
    h = (b + d + (((l>>>0) < (a>>>0))|0))>>>0; // Add carry from low word to high word on overflow.
    return ((tempRet0 = h,l|0)|0);
}
function _memmove(dest, src, num) {
    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if (((src|0) < (dest|0)) & ((dest|0) < ((src + num)|0))) {
      // Unlikely case: Copy backwards in a safe manner
      ret = dest;
      src = (src + num)|0;
      dest = (dest + num)|0;
      while ((num|0) > 0) {
        dest = (dest - 1)|0;
        src = (src - 1)|0;
        num = (num - 1)|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      }
      dest = ret;
    } else {
      _memcpy(dest, src, num) | 0;
    }
    return dest | 0;
}
function _bitshift64Ashr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = (high|0) < 0 ? -1 : 0;
    return (high >> (bits - 32))|0;
  }
function _llvm_cttz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((cttz_i8)+(x & 0xff))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((cttz_i8)+(x >>> 24))>>0)])|0) + 24)|0;
  }

// ======== compiled code from system/lib/compiler-rt , see readme therein
function ___muldsi3($a, $b) {
  $a = $a | 0;
  $b = $b | 0;
  var $1 = 0, $2 = 0, $3 = 0, $6 = 0, $8 = 0, $11 = 0, $12 = 0;
  $1 = $a & 65535;
  $2 = $b & 65535;
  $3 = Math_imul($2, $1) | 0;
  $6 = $a >>> 16;
  $8 = ($3 >>> 16) + (Math_imul($2, $6) | 0) | 0;
  $11 = $b >>> 16;
  $12 = Math_imul($11, $1) | 0;
  return (tempRet0 = (($8 >>> 16) + (Math_imul($11, $6) | 0) | 0) + ((($8 & 65535) + $12 | 0) >>> 16) | 0, 0 | ($8 + $12 << 16 | $3 & 65535)) | 0;
}
function ___divdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $7$0 = 0, $7$1 = 0, $8$0 = 0, $10$0 = 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  $7$0 = $2$0 ^ $1$0;
  $7$1 = $2$1 ^ $1$1;
  $8$0 = ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, 0) | 0;
  $10$0 = _i64Subtract($8$0 ^ $7$0, tempRet0 ^ $7$1, $7$0, $7$1) | 0;
  return $10$0 | 0;
}
function ___remdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $10$0 = 0, $10$1 = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 16 | 0;
  $rem = __stackBase__ | 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, $rem) | 0;
  $10$0 = _i64Subtract(HEAP32[$rem >> 2] ^ $1$0, HEAP32[$rem + 4 >> 2] ^ $1$1, $1$0, $1$1) | 0;
  $10$1 = tempRet0;
  STACKTOP = __stackBase__;
  return (tempRet0 = $10$1, $10$0) | 0;
}
function ___muldi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $x_sroa_0_0_extract_trunc = 0, $y_sroa_0_0_extract_trunc = 0, $1$0 = 0, $1$1 = 0, $2 = 0;
  $x_sroa_0_0_extract_trunc = $a$0;
  $y_sroa_0_0_extract_trunc = $b$0;
  $1$0 = ___muldsi3($x_sroa_0_0_extract_trunc, $y_sroa_0_0_extract_trunc) | 0;
  $1$1 = tempRet0;
  $2 = Math_imul($a$1, $y_sroa_0_0_extract_trunc) | 0;
  return (tempRet0 = ((Math_imul($b$1, $x_sroa_0_0_extract_trunc) | 0) + $2 | 0) + $1$1 | $1$1 & 0, 0 | $1$0 & -1) | 0;
}
function ___udivdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0;
  $1$0 = ___udivmoddi4($a$0, $a$1, $b$0, $b$1, 0) | 0;
  return $1$0 | 0;
}
function ___uremdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 16 | 0;
  $rem = __stackBase__ | 0;
  ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) | 0;
  STACKTOP = __stackBase__;
  return (tempRet0 = HEAP32[$rem + 4 >> 2] | 0, HEAP32[$rem >> 2] | 0) | 0;
}
function ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  $rem = $rem | 0;
  var $n_sroa_0_0_extract_trunc = 0, $n_sroa_1_4_extract_shift$0 = 0, $n_sroa_1_4_extract_trunc = 0, $d_sroa_0_0_extract_trunc = 0, $d_sroa_1_4_extract_shift$0 = 0, $d_sroa_1_4_extract_trunc = 0, $4 = 0, $17 = 0, $37 = 0, $49 = 0, $51 = 0, $57 = 0, $58 = 0, $66 = 0, $78 = 0, $86 = 0, $88 = 0, $89 = 0, $91 = 0, $92 = 0, $95 = 0, $105 = 0, $117 = 0, $119 = 0, $125 = 0, $126 = 0, $130 = 0, $q_sroa_1_1_ph = 0, $q_sroa_0_1_ph = 0, $r_sroa_1_1_ph = 0, $r_sroa_0_1_ph = 0, $sr_1_ph = 0, $d_sroa_0_0_insert_insert99$0 = 0, $d_sroa_0_0_insert_insert99$1 = 0, $137$0 = 0, $137$1 = 0, $carry_0203 = 0, $sr_1202 = 0, $r_sroa_0_1201 = 0, $r_sroa_1_1200 = 0, $q_sroa_0_1199 = 0, $q_sroa_1_1198 = 0, $147 = 0, $149 = 0, $r_sroa_0_0_insert_insert42$0 = 0, $r_sroa_0_0_insert_insert42$1 = 0, $150$1 = 0, $151$0 = 0, $152 = 0, $154$0 = 0, $r_sroa_0_0_extract_trunc = 0, $r_sroa_1_4_extract_trunc = 0, $155 = 0, $carry_0_lcssa$0 = 0, $carry_0_lcssa$1 = 0, $r_sroa_0_1_lcssa = 0, $r_sroa_1_1_lcssa = 0, $q_sroa_0_1_lcssa = 0, $q_sroa_1_1_lcssa = 0, $q_sroa_0_0_insert_ext75$0 = 0, $q_sroa_0_0_insert_ext75$1 = 0, $q_sroa_0_0_insert_insert77$1 = 0, $_0$0 = 0, $_0$1 = 0;
  $n_sroa_0_0_extract_trunc = $a$0;
  $n_sroa_1_4_extract_shift$0 = $a$1;
  $n_sroa_1_4_extract_trunc = $n_sroa_1_4_extract_shift$0;
  $d_sroa_0_0_extract_trunc = $b$0;
  $d_sroa_1_4_extract_shift$0 = $b$1;
  $d_sroa_1_4_extract_trunc = $d_sroa_1_4_extract_shift$0;
  if (($n_sroa_1_4_extract_trunc | 0) == 0) {
    $4 = ($rem | 0) != 0;
    if (($d_sroa_1_4_extract_trunc | 0) == 0) {
      if ($4) {
        HEAP32[$rem >> 2] = ($n_sroa_0_0_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
        HEAP32[$rem + 4 >> 2] = 0;
      }
      $_0$1 = 0;
      $_0$0 = ($n_sroa_0_0_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$4) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    }
  }
  $17 = ($d_sroa_1_4_extract_trunc | 0) == 0;
  do {
    if (($d_sroa_0_0_extract_trunc | 0) == 0) {
      if ($17) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
          HEAP32[$rem + 4 >> 2] = 0;
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      if (($n_sroa_0_0_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0;
          HEAP32[$rem + 4 >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_1_4_extract_trunc >>> 0);
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_1_4_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $37 = $d_sroa_1_4_extract_trunc - 1 | 0;
      if (($37 & $d_sroa_1_4_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0 | $a$0 & -1;
          HEAP32[$rem + 4 >> 2] = $37 & $n_sroa_1_4_extract_trunc | $a$1 & 0;
        }
        $_0$1 = 0;
        $_0$0 = $n_sroa_1_4_extract_trunc >>> ((_llvm_cttz_i32($d_sroa_1_4_extract_trunc | 0) | 0) >>> 0);
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $49 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
      $51 = $49 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
      if ($51 >>> 0 <= 30) {
        $57 = $51 + 1 | 0;
        $58 = 31 - $51 | 0;
        $sr_1_ph = $57;
        $r_sroa_0_1_ph = $n_sroa_1_4_extract_trunc << $58 | $n_sroa_0_0_extract_trunc >>> ($57 >>> 0);
        $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($57 >>> 0);
        $q_sroa_0_1_ph = 0;
        $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $58;
        break;
      }
      if (($rem | 0) == 0) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = 0 | $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$17) {
        $117 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
        $119 = $117 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        if ($119 >>> 0 <= 31) {
          $125 = $119 + 1 | 0;
          $126 = 31 - $119 | 0;
          $130 = $119 - 31 >> 31;
          $sr_1_ph = $125;
          $r_sroa_0_1_ph = $n_sroa_0_0_extract_trunc >>> ($125 >>> 0) & $130 | $n_sroa_1_4_extract_trunc << $126;
          $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($125 >>> 0) & $130;
          $q_sroa_0_1_ph = 0;
          $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $126;
          break;
        }
        if (($rem | 0) == 0) {
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        HEAP32[$rem >> 2] = 0 | $a$0 & -1;
        HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $66 = $d_sroa_0_0_extract_trunc - 1 | 0;
      if (($66 & $d_sroa_0_0_extract_trunc | 0) != 0) {
        $86 = (Math_clz32($d_sroa_0_0_extract_trunc | 0) | 0) + 33 | 0;
        $88 = $86 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        $89 = 64 - $88 | 0;
        $91 = 32 - $88 | 0;
        $92 = $91 >> 31;
        $95 = $88 - 32 | 0;
        $105 = $95 >> 31;
        $sr_1_ph = $88;
        $r_sroa_0_1_ph = $91 - 1 >> 31 & $n_sroa_1_4_extract_trunc >>> ($95 >>> 0) | ($n_sroa_1_4_extract_trunc << $91 | $n_sroa_0_0_extract_trunc >>> ($88 >>> 0)) & $105;
        $r_sroa_1_1_ph = $105 & $n_sroa_1_4_extract_trunc >>> ($88 >>> 0);
        $q_sroa_0_1_ph = $n_sroa_0_0_extract_trunc << $89 & $92;
        $q_sroa_1_1_ph = ($n_sroa_1_4_extract_trunc << $89 | $n_sroa_0_0_extract_trunc >>> ($95 >>> 0)) & $92 | $n_sroa_0_0_extract_trunc << $91 & $88 - 33 >> 31;
        break;
      }
      if (($rem | 0) != 0) {
        HEAP32[$rem >> 2] = $66 & $n_sroa_0_0_extract_trunc;
        HEAP32[$rem + 4 >> 2] = 0;
      }
      if (($d_sroa_0_0_extract_trunc | 0) == 1) {
        $_0$1 = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$0 = 0 | $a$0 & -1;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      } else {
        $78 = _llvm_cttz_i32($d_sroa_0_0_extract_trunc | 0) | 0;
        $_0$1 = 0 | $n_sroa_1_4_extract_trunc >>> ($78 >>> 0);
        $_0$0 = $n_sroa_1_4_extract_trunc << 32 - $78 | $n_sroa_0_0_extract_trunc >>> ($78 >>> 0) | 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
    }
  } while (0);
  if (($sr_1_ph | 0) == 0) {
    $q_sroa_1_1_lcssa = $q_sroa_1_1_ph;
    $q_sroa_0_1_lcssa = $q_sroa_0_1_ph;
    $r_sroa_1_1_lcssa = $r_sroa_1_1_ph;
    $r_sroa_0_1_lcssa = $r_sroa_0_1_ph;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = 0;
  } else {
    $d_sroa_0_0_insert_insert99$0 = 0 | $b$0 & -1;
    $d_sroa_0_0_insert_insert99$1 = $d_sroa_1_4_extract_shift$0 | $b$1 & 0;
    $137$0 = _i64Add($d_sroa_0_0_insert_insert99$0 | 0, $d_sroa_0_0_insert_insert99$1 | 0, -1, -1) | 0;
    $137$1 = tempRet0;
    $q_sroa_1_1198 = $q_sroa_1_1_ph;
    $q_sroa_0_1199 = $q_sroa_0_1_ph;
    $r_sroa_1_1200 = $r_sroa_1_1_ph;
    $r_sroa_0_1201 = $r_sroa_0_1_ph;
    $sr_1202 = $sr_1_ph;
    $carry_0203 = 0;
    while (1) {
      $147 = $q_sroa_0_1199 >>> 31 | $q_sroa_1_1198 << 1;
      $149 = $carry_0203 | $q_sroa_0_1199 << 1;
      $r_sroa_0_0_insert_insert42$0 = 0 | ($r_sroa_0_1201 << 1 | $q_sroa_1_1198 >>> 31);
      $r_sroa_0_0_insert_insert42$1 = $r_sroa_0_1201 >>> 31 | $r_sroa_1_1200 << 1 | 0;
      _i64Subtract($137$0, $137$1, $r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1) | 0;
      $150$1 = tempRet0;
      $151$0 = $150$1 >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1;
      $152 = $151$0 & 1;
      $154$0 = _i64Subtract($r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1, $151$0 & $d_sroa_0_0_insert_insert99$0, ((($150$1 | 0) < 0 ? -1 : 0) >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1) & $d_sroa_0_0_insert_insert99$1) | 0;
      $r_sroa_0_0_extract_trunc = $154$0;
      $r_sroa_1_4_extract_trunc = tempRet0;
      $155 = $sr_1202 - 1 | 0;
      if (($155 | 0) == 0) {
        break;
      } else {
        $q_sroa_1_1198 = $147;
        $q_sroa_0_1199 = $149;
        $r_sroa_1_1200 = $r_sroa_1_4_extract_trunc;
        $r_sroa_0_1201 = $r_sroa_0_0_extract_trunc;
        $sr_1202 = $155;
        $carry_0203 = $152;
      }
    }
    $q_sroa_1_1_lcssa = $147;
    $q_sroa_0_1_lcssa = $149;
    $r_sroa_1_1_lcssa = $r_sroa_1_4_extract_trunc;
    $r_sroa_0_1_lcssa = $r_sroa_0_0_extract_trunc;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = $152;
  }
  $q_sroa_0_0_insert_ext75$0 = $q_sroa_0_1_lcssa;
  $q_sroa_0_0_insert_ext75$1 = 0;
  $q_sroa_0_0_insert_insert77$1 = $q_sroa_1_1_lcssa | $q_sroa_0_0_insert_ext75$1;
  if (($rem | 0) != 0) {
    HEAP32[$rem >> 2] = 0 | $r_sroa_0_1_lcssa;
    HEAP32[$rem + 4 >> 2] = $r_sroa_1_1_lcssa | 0;
  }
  $_0$1 = (0 | $q_sroa_0_0_insert_ext75$0) >>> 31 | $q_sroa_0_0_insert_insert77$1 << 1 | ($q_sroa_0_0_insert_ext75$1 << 1 | $q_sroa_0_0_insert_ext75$0 >>> 31) & 0 | $carry_0_lcssa$1;
  $_0$0 = ($q_sroa_0_0_insert_ext75$0 << 1 | 0 >>> 31) & -2 | $carry_0_lcssa$0;
  return (tempRet0 = $_0$1, $_0$0) | 0;
}
// =======================================================================



  
function dynCall_iiii(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0;
  return FUNCTION_TABLE_iiii[index&31](a1|0,a2|0,a3|0)|0;
}


function dynCall_vi(index,a1) {
  index = index|0;
  a1=a1|0;
  FUNCTION_TABLE_vi[index&31](a1|0);
}


function dynCall_vii(index,a1,a2) {
  index = index|0;
  a1=a1|0; a2=a2|0;
  FUNCTION_TABLE_vii[index&31](a1|0,a2|0);
}


function dynCall_iiiiiii(index,a1,a2,a3,a4,a5,a6) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0; a5=a5|0; a6=a6|0;
  return FUNCTION_TABLE_iiiiiii[index&31](a1|0,a2|0,a3|0,a4|0,a5|0,a6|0)|0;
}


function dynCall_ii(index,a1) {
  index = index|0;
  a1=a1|0;
  return FUNCTION_TABLE_ii[index&31](a1|0)|0;
}


function dynCall_viii(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0;
  FUNCTION_TABLE_viii[index&0](a1|0,a2|0,a3|0);
}


function dynCall_viiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0; a5=a5|0; a6=a6|0; a7=a7|0; a8=a8|0;
  FUNCTION_TABLE_viiiiiiii[index&7](a1|0,a2|0,a3|0,a4|0,a5|0,a6|0,a7|0,a8|0);
}


function dynCall_iiiii(index,a1,a2,a3,a4) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  return FUNCTION_TABLE_iiiii[index&15](a1|0,a2|0,a3|0,a4|0)|0;
}


function dynCall_iii(index,a1,a2) {
  index = index|0;
  a1=a1|0; a2=a2|0;
  return FUNCTION_TABLE_iii[index&31](a1|0,a2|0)|0;
}

function b1(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(0);return 0;
}
function b2(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(1);return 0;
}
function b3(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(2);return 0;
}
function b4(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(3);return 0;
}
function b5(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(4);return 0;
}
function b6(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(6);return 0;
}
function b7(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(7);return 0;
}
function b8(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(11);return 0;
}
function b9(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(12);return 0;
}
function b10(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(13);return 0;
}
function b11(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(15);return 0;
}
function b12(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(17);return 0;
}
function b13(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(21);return 0;
}
function b14(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(22);return 0;
}
function b15(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(24);return 0;
}
function b16(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(31);return 0;
}
function b18(p0) {
 p0 = p0|0; nullFunc_vi(0);
}
function b19(p0) {
 p0 = p0|0; nullFunc_vi(1);
}
function b20(p0) {
 p0 = p0|0; nullFunc_vi(2);
}
function b21(p0) {
 p0 = p0|0; nullFunc_vi(3);
}
function b22(p0) {
 p0 = p0|0; nullFunc_vi(4);
}
function b23(p0) {
 p0 = p0|0; nullFunc_vi(5);
}
function b24(p0) {
 p0 = p0|0; nullFunc_vi(6);
}
function b25(p0) {
 p0 = p0|0; nullFunc_vi(7);
}
function b26(p0) {
 p0 = p0|0; nullFunc_vi(8);
}
function b27(p0) {
 p0 = p0|0; nullFunc_vi(9);
}
function b28(p0) {
 p0 = p0|0; nullFunc_vi(10);
}
function b29(p0) {
 p0 = p0|0; nullFunc_vi(11);
}
function b30(p0) {
 p0 = p0|0; nullFunc_vi(12);
}
function b31(p0) {
 p0 = p0|0; nullFunc_vi(13);
}
function b32(p0) {
 p0 = p0|0; nullFunc_vi(14);
}
function b33(p0) {
 p0 = p0|0; nullFunc_vi(15);
}
function b34(p0) {
 p0 = p0|0; nullFunc_vi(16);
}
function b35(p0) {
 p0 = p0|0; nullFunc_vi(17);
}
function b36(p0) {
 p0 = p0|0; nullFunc_vi(18);
}
function b37(p0) {
 p0 = p0|0; nullFunc_vi(19);
}
function b38(p0) {
 p0 = p0|0; nullFunc_vi(20);
}
function b39(p0) {
 p0 = p0|0; nullFunc_vi(21);
}
function b40(p0) {
 p0 = p0|0; nullFunc_vi(22);
}
function b41(p0) {
 p0 = p0|0; nullFunc_vi(23);
}
function b42(p0) {
 p0 = p0|0; nullFunc_vi(24);
}
function b43(p0) {
 p0 = p0|0; nullFunc_vi(25);
}
function b44(p0) {
 p0 = p0|0; nullFunc_vi(26);
}
function b45(p0) {
 p0 = p0|0; nullFunc_vi(27);
}
function b46(p0) {
 p0 = p0|0; nullFunc_vi(28);
}
function b47(p0) {
 p0 = p0|0; nullFunc_vi(29);
}
function b48(p0) {
 p0 = p0|0; nullFunc_vi(30);
}
function b50(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(0);
}
function b51(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(2);
}
function b52(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(3);
}
function b53(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(4);
}
function b54(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(5);
}
function b55(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(6);
}
function b56(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(7);
}
function b57(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(8);
}
function b58(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(9);
}
function b59(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(10);
}
function b60(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(11);
}
function b61(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(12);
}
function b62(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(13);
}
function b63(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(14);
}
function b64(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(15);
}
function b65(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(16);
}
function b66(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(17);
}
function b67(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(18);
}
function b68(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(19);
}
function b69(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(20);
}
function b70(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(21);
}
function b71(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(23);
}
function b72(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(24);
}
function b73(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(25);
}
function b74(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(26);
}
function b75(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(27);
}
function b76(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(28);
}
function b77(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(29);
}
function b78(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(30);
}
function b79(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_vii(31);
}
function b81(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(0);return 0;
}
function b82(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(1);return 0;
}
function b83(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(2);return 0;
}
function b84(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(3);return 0;
}
function b85(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(4);return 0;
}
function b86(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(5);return 0;
}
function b87(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(6);return 0;
}
function b88(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(7);return 0;
}
function b89(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(8);return 0;
}
function b90(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(9);return 0;
}
function b91(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(10);return 0;
}
function b92(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(11);return 0;
}
function b93(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(12);return 0;
}
function b94(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(13);return 0;
}
function b95(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(14);return 0;
}
function b96(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(15);return 0;
}
function b97(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(16);return 0;
}
function b98(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(18);return 0;
}
function b99(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(19);return 0;
}
function b100(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(20);return 0;
}
function b101(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(21);return 0;
}
function b102(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(22);return 0;
}
function b103(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(23);return 0;
}
function b104(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(24);return 0;
}
function b105(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(25);return 0;
}
function b106(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(26);return 0;
}
function b107(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(27);return 0;
}
function b108(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(28);return 0;
}
function b109(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(29);return 0;
}
function b110(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(30);return 0;
}
function b111(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_iiiiiii(31);return 0;
}
function b113(p0) {
 p0 = p0|0; nullFunc_ii(0);return 0;
}
function b114(p0) {
 p0 = p0|0; nullFunc_ii(1);return 0;
}
function b115(p0) {
 p0 = p0|0; nullFunc_ii(2);return 0;
}
function b116(p0) {
 p0 = p0|0; nullFunc_ii(3);return 0;
}
function b117(p0) {
 p0 = p0|0; nullFunc_ii(4);return 0;
}
function b118(p0) {
 p0 = p0|0; nullFunc_ii(5);return 0;
}
function b119(p0) {
 p0 = p0|0; nullFunc_ii(6);return 0;
}
function b120(p0) {
 p0 = p0|0; nullFunc_ii(7);return 0;
}
function b121(p0) {
 p0 = p0|0; nullFunc_ii(8);return 0;
}
function b122(p0) {
 p0 = p0|0; nullFunc_ii(9);return 0;
}
function b123(p0) {
 p0 = p0|0; nullFunc_ii(10);return 0;
}
function b124(p0) {
 p0 = p0|0; nullFunc_ii(12);return 0;
}
function b125(p0) {
 p0 = p0|0; nullFunc_ii(13);return 0;
}
function b126(p0) {
 p0 = p0|0; nullFunc_ii(14);return 0;
}
function b127(p0) {
 p0 = p0|0; nullFunc_ii(15);return 0;
}
function b128(p0) {
 p0 = p0|0; nullFunc_ii(16);return 0;
}
function b129(p0) {
 p0 = p0|0; nullFunc_ii(17);return 0;
}
function b130(p0) {
 p0 = p0|0; nullFunc_ii(18);return 0;
}
function b131(p0) {
 p0 = p0|0; nullFunc_ii(19);return 0;
}
function b132(p0) {
 p0 = p0|0; nullFunc_ii(20);return 0;
}
function b133(p0) {
 p0 = p0|0; nullFunc_ii(21);return 0;
}
function b134(p0) {
 p0 = p0|0; nullFunc_ii(22);return 0;
}
function b135(p0) {
 p0 = p0|0; nullFunc_ii(23);return 0;
}
function b136(p0) {
 p0 = p0|0; nullFunc_ii(25);return 0;
}
function b137(p0) {
 p0 = p0|0; nullFunc_ii(26);return 0;
}
function b138(p0) {
 p0 = p0|0; nullFunc_ii(27);return 0;
}
function b139(p0) {
 p0 = p0|0; nullFunc_ii(28);return 0;
}
function b140(p0) {
 p0 = p0|0; nullFunc_ii(29);return 0;
}
function b141(p0) {
 p0 = p0|0; nullFunc_ii(30);return 0;
}
function b142(p0) {
 p0 = p0|0; nullFunc_ii(31);return 0;
}
function b144(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_viii(0);
}
function b146(p0,p1,p2,p3,p4,p5,p6,p7) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0;p6 = p6|0;p7 = p7|0; nullFunc_viiiiiiii(0);
}
function b147(p0,p1,p2,p3,p4,p5,p6,p7) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0;p6 = p6|0;p7 = p7|0; nullFunc_viiiiiiii(1);
}
function b148(p0,p1,p2,p3,p4,p5,p6,p7) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0;p6 = p6|0;p7 = p7|0; nullFunc_viiiiiiii(5);
}
function b149(p0,p1,p2,p3,p4,p5,p6,p7) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0;p6 = p6|0;p7 = p7|0; nullFunc_viiiiiiii(6);
}
function b150(p0,p1,p2,p3,p4,p5,p6,p7) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0;p6 = p6|0;p7 = p7|0; nullFunc_viiiiiiii(7);
}
function b152(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(0);return 0;
}
function b153(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(1);return 0;
}
function b154(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(2);return 0;
}
function b155(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(3);return 0;
}
function b156(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(4);return 0;
}
function b157(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(5);return 0;
}
function b158(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(8);return 0;
}
function b159(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(9);return 0;
}
function b160(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(10);return 0;
}
function b161(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(11);return 0;
}
function b162(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(14);return 0;
}
function b163(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(15);return 0;
}
function b165(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(0);return 0;
}
function b166(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(1);return 0;
}
function b167(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(2);return 0;
}
function b168(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(3);return 0;
}
function b169(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(4);return 0;
}
function b170(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(5);return 0;
}
function b171(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(6);return 0;
}
function b172(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(7);return 0;
}
function b173(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(8);return 0;
}
function b174(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(9);return 0;
}
function b175(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(10);return 0;
}
function b176(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(11);return 0;
}
function b177(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(12);return 0;
}
function b178(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(13);return 0;
}
function b179(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(14);return 0;
}
function b180(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(16);return 0;
}
function b181(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(17);return 0;
}
function b182(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(18);return 0;
}
function b183(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(19);return 0;
}
function b184(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(20);return 0;
}
function b185(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(22);return 0;
}
function b186(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(23);return 0;
}
function b187(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(24);return 0;
}
function b188(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(25);return 0;
}
function b189(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(26);return 0;
}
function b190(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(27);return 0;
}
function b191(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(28);return 0;
}
function b192(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(29);return 0;
}
function b193(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(30);return 0;
}
function b194(p0,p1) {
 p0 = p0|0;p1 = p1|0; nullFunc_iii(31);return 0;
}

// EMSCRIPTEN_END_FUNCS
var FUNCTION_TABLE_iiii = [b1,b2,b3,b4,b5,_putglyph,b6,b7,_erase,_setpenattr34,_settermprop,b8,b9,b10,_on_text,b11,_on_escape,b12,_on_osc,_on_dcs,_on_resize,b13,b14,_sn_write,b15,___stdio_write,___stdio_seek,_moverect_user,_erase_user
,_moverect_internal,_erase_internal,b16];
var FUNCTION_TABLE_vi = [b18,b19,b20,b21,b22,b23,b24,b25,b26,b27,b28,b29,b30,b31,b32,b33,b34,b35,b36,b37,b38,b39,b40,b41,b42,b43,b44,b45,b46
,b47,b48,_cleanup565];
var FUNCTION_TABLE_vii = [b50,_init_utf8,b51,b52,b53,b54,b55,b56,b57,b58,b59,b60,b61,b62,b63,b64,b65,b66,b67,b68,b69,b70,_default_free,b71,b72,b73,b74,b75,b76
,b77,b78,b79];
var FUNCTION_TABLE_iiiiiii = [b81,b82,b83,b84,b85,b86,b87,b88,b89,b90,b91,b92,b93,b94,b95,b96,b97,_on_csi,b98,b99,b100,b101,b102,b103,b104,b105,b106,b107,b108
,b109,b110,b111];
var FUNCTION_TABLE_ii = [b113,b114,b115,b116,b117,b118,b119,b120,b121,b122,b123,_bell,b124,b125,b126,b127,b128,b129,b130,b131,b132,b133,b134,b135,___stdio_close,b136,b137,b138,b139
,b140,b141,b142];
var FUNCTION_TABLE_viii = [b144];
var FUNCTION_TABLE_viiiiiiii = [b146,b147,_decode_utf8,_decode_table,_decode_usascii,b148,b149,b150];
var FUNCTION_TABLE_iiiii = [b152,b153,b154,b155,b156,b157,_movecursor,_scrollrect,b158,b159,b160,b161,_resize,_setlineinfo,b162,b163];
var FUNCTION_TABLE_iii = [b165,b166,b167,b168,b169,b170,b171,b172,b173,b174,b175,b176,b177,b178,b179,_on_control,b180,b181,b182,b183,b184,_default_malloc,b185,b186,b187,b188,b189,b190,b191
,b192,b193,b194];

  return { _vterm_get_size: _vterm_get_size, _bitshift64Shl: _bitshift64Shl, _vterm_parser_get_cbdata: _vterm_parser_get_cbdata, _vterm_screen_enable_altscreen: _vterm_screen_enable_altscreen, _vterm_state_get_lineinfo: _vterm_state_get_lineinfo, _vterm_state_set_unrecognised_fallbacks: _vterm_state_set_unrecognised_fallbacks, _vterm_state_reset: _vterm_state_reset, _vterm_push_output_sprintf_ctrl: _vterm_push_output_sprintf_ctrl, _vterm_set_size: _vterm_set_size, _vterm_state_get_default_colors: _vterm_state_get_default_colors, _free: _free, _vterm_screen_get_unrecognised_fbdata: _vterm_screen_get_unrecognised_fbdata, _vterm_screen_reset: _vterm_screen_reset, _vterm_unicode_is_combining: _vterm_unicode_is_combining, _vterm_keyboard_start_paste: _vterm_keyboard_start_paste, _vterm_screen_set_callbacks: _vterm_screen_set_callbacks, _bitshift64Lshr: _bitshift64Lshr, _i64Subtract: _i64Subtract, _vterm_screen_get_attrs_extent: _vterm_screen_get_attrs_extent, _vterm_mouse_move: _vterm_mouse_move, _vterm_state_set_bold_highbright: _vterm_state_set_bold_highbright, _i64Add: _i64Add, _vterm_screen_get_chars: _vterm_screen_get_chars, _vterm_obtain_state: _vterm_obtain_state, _vterm_screen_get_text: _vterm_screen_get_text, _vterm_state_get_unrecognised_fbdata: _vterm_state_get_unrecognised_fbdata, _vterm_scroll_rect: _vterm_scroll_rect, _vterm_get_attr_type: _vterm_get_attr_type, _vterm_keyboard_end_paste: _vterm_keyboard_end_paste, _vterm_state_savepen: _vterm_state_savepen, _memset: _memset, _vterm_unicode_width: _vterm_unicode_width, _vterm_set_utf8: _vterm_set_utf8, _vterm_push_output_vsprintf: _vterm_push_output_vsprintf, _memcpy: _memcpy, _vterm_output_read: _vterm_output_read, _vterm_allocator_malloc: _vterm_allocator_malloc, _vterm_state_newpen: _vterm_state_newpen, _vterm_state_getpen: _vterm_state_getpen, _vterm_get_utf8: _vterm_get_utf8, _vterm_parser_set_callbacks: _vterm_parser_set_callbacks, _vterm_screen_flush_damage: _vterm_screen_flush_damage, _vterm_allocator_free: _vterm_allocator_free, _vterm_push_output_bytes: _vterm_push_output_bytes, _vterm_state_free: _vterm_state_free, _vterm_screen_is_eol: _vterm_screen_is_eol, _vterm_keyboard_unichar: _vterm_keyboard_unichar, _vterm_lookup_encoding: _vterm_lookup_encoding, _vterm_state_set_termprop: _vterm_state_set_termprop, _vterm_keyboard_key: _vterm_keyboard_key, _vterm_output_get_buffer_size: _vterm_output_get_buffer_size, _vterm_state_setpen: _vterm_state_setpen, _vterm_state_get_penattr: _vterm_state_get_penattr, _vterm_screen_set_damage_merge: _vterm_screen_set_damage_merge, _vterm_new_with_allocator: _vterm_new_with_allocator, _vterm_copy_cells: _vterm_copy_cells, _vterm_new: _vterm_new, _vterm_screen_get_cell: _vterm_screen_get_cell, _vterm_get_prop_type: _vterm_get_prop_type, _vterm_output_get_buffer_remaining: _vterm_output_get_buffer_remaining, _vterm_state_resetpen: _vterm_state_resetpen, _vterm_state_set_callbacks: _vterm_state_set_callbacks, _vterm_state_set_default_colors: _vterm_state_set_default_colors, _vterm_state_get_cursorpos: _vterm_state_get_cursorpos, _memmove: _memmove, _vterm_screen_get_cbdata: _vterm_screen_get_cbdata, _vterm_push_output_sprintf: _vterm_push_output_sprintf, _vterm_input_write: _vterm_input_write, _vterm_free: _vterm_free, _vterm_state_set_palette_color: _vterm_state_set_palette_color, _malloc: _malloc, _vterm_obtain_screen: _vterm_obtain_screen, _vterm_screen_set_unrecognised_fallbacks: _vterm_screen_set_unrecognised_fallbacks, _vterm_output_get_buffer_current: _vterm_output_get_buffer_current, _vterm_push_output_sprintf_dcs: _vterm_push_output_sprintf_dcs, _vterm_screen_free: _vterm_screen_free, _vterm_state_get_palette_color: _vterm_state_get_palette_color, _vterm_state_get_cbdata: _vterm_state_get_cbdata, _vterm_mouse_button: _vterm_mouse_button, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, establishStackSpace: establishStackSpace, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_iiii: dynCall_iiii, dynCall_vi: dynCall_vi, dynCall_vii: dynCall_vii, dynCall_iiiiiii: dynCall_iiiiiii, dynCall_ii: dynCall_ii, dynCall_viii: dynCall_viii, dynCall_viiiiiiii: dynCall_viiiiiiii, dynCall_iiiii: dynCall_iiiii, dynCall_iii: dynCall_iii };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var real__vterm_screen_get_cbdata = asm["_vterm_screen_get_cbdata"]; asm["_vterm_screen_get_cbdata"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_screen_get_cbdata.apply(null, arguments);
};

var real__vterm_input_write = asm["_vterm_input_write"]; asm["_vterm_input_write"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_input_write.apply(null, arguments);
};

var real__vterm_screen_enable_altscreen = asm["_vterm_screen_enable_altscreen"]; asm["_vterm_screen_enable_altscreen"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_screen_enable_altscreen.apply(null, arguments);
};

var real__vterm_state_get_lineinfo = asm["_vterm_state_get_lineinfo"]; asm["_vterm_state_get_lineinfo"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_get_lineinfo.apply(null, arguments);
};

var real__vterm_output_get_buffer_size = asm["_vterm_output_get_buffer_size"]; asm["_vterm_output_get_buffer_size"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_output_get_buffer_size.apply(null, arguments);
};

var real__vterm_state_reset = asm["_vterm_state_reset"]; asm["_vterm_state_reset"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_reset.apply(null, arguments);
};

var real__vterm_set_size = asm["_vterm_set_size"]; asm["_vterm_set_size"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_set_size.apply(null, arguments);
};

var real__vterm_state_get_default_colors = asm["_vterm_state_get_default_colors"]; asm["_vterm_state_get_default_colors"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_get_default_colors.apply(null, arguments);
};

var real__vterm_screen_get_unrecognised_fbdata = asm["_vterm_screen_get_unrecognised_fbdata"]; asm["_vterm_screen_get_unrecognised_fbdata"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_screen_get_unrecognised_fbdata.apply(null, arguments);
};

var real__vterm_keyboard_unichar = asm["_vterm_keyboard_unichar"]; asm["_vterm_keyboard_unichar"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_keyboard_unichar.apply(null, arguments);
};

var real__vterm_unicode_is_combining = asm["_vterm_unicode_is_combining"]; asm["_vterm_unicode_is_combining"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_unicode_is_combining.apply(null, arguments);
};

var real__vterm_keyboard_start_paste = asm["_vterm_keyboard_start_paste"]; asm["_vterm_keyboard_start_paste"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_keyboard_start_paste.apply(null, arguments);
};

var real__vterm_screen_set_callbacks = asm["_vterm_screen_set_callbacks"]; asm["_vterm_screen_set_callbacks"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_screen_set_callbacks.apply(null, arguments);
};

var real__bitshift64Lshr = asm["_bitshift64Lshr"]; asm["_bitshift64Lshr"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__bitshift64Lshr.apply(null, arguments);
};

var real__vterm_get_prop_type = asm["_vterm_get_prop_type"]; asm["_vterm_get_prop_type"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_get_prop_type.apply(null, arguments);
};

var real__vterm_screen_get_attrs_extent = asm["_vterm_screen_get_attrs_extent"]; asm["_vterm_screen_get_attrs_extent"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_screen_get_attrs_extent.apply(null, arguments);
};

var real__vterm_mouse_move = asm["_vterm_mouse_move"]; asm["_vterm_mouse_move"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_mouse_move.apply(null, arguments);
};

var real__vterm_state_set_bold_highbright = asm["_vterm_state_set_bold_highbright"]; asm["_vterm_state_set_bold_highbright"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_set_bold_highbright.apply(null, arguments);
};

var real__vterm_screen_get_chars = asm["_vterm_screen_get_chars"]; asm["_vterm_screen_get_chars"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_screen_get_chars.apply(null, arguments);
};

var real__vterm_obtain_state = asm["_vterm_obtain_state"]; asm["_vterm_obtain_state"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_obtain_state.apply(null, arguments);
};

var real__vterm_screen_get_text = asm["_vterm_screen_get_text"]; asm["_vterm_screen_get_text"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_screen_get_text.apply(null, arguments);
};

var real__vterm_state_get_unrecognised_fbdata = asm["_vterm_state_get_unrecognised_fbdata"]; asm["_vterm_state_get_unrecognised_fbdata"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_get_unrecognised_fbdata.apply(null, arguments);
};

var real__vterm_scroll_rect = asm["_vterm_scroll_rect"]; asm["_vterm_scroll_rect"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_scroll_rect.apply(null, arguments);
};

var real__vterm_keyboard_end_paste = asm["_vterm_keyboard_end_paste"]; asm["_vterm_keyboard_end_paste"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_keyboard_end_paste.apply(null, arguments);
};

var real__vterm_state_savepen = asm["_vterm_state_savepen"]; asm["_vterm_state_savepen"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_savepen.apply(null, arguments);
};

var real__vterm_screen_free = asm["_vterm_screen_free"]; asm["_vterm_screen_free"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_screen_free.apply(null, arguments);
};

var real__vterm_screen_is_eol = asm["_vterm_screen_is_eol"]; asm["_vterm_screen_is_eol"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_screen_is_eol.apply(null, arguments);
};

var real__vterm_state_set_palette_color = asm["_vterm_state_set_palette_color"]; asm["_vterm_state_set_palette_color"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_set_palette_color.apply(null, arguments);
};

var real__vterm_state_resetpen = asm["_vterm_state_resetpen"]; asm["_vterm_state_resetpen"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_resetpen.apply(null, arguments);
};

var real__vterm_get_attr_type = asm["_vterm_get_attr_type"]; asm["_vterm_get_attr_type"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_get_attr_type.apply(null, arguments);
};

var real__vterm_output_read = asm["_vterm_output_read"]; asm["_vterm_output_read"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_output_read.apply(null, arguments);
};

var real__vterm_allocator_malloc = asm["_vterm_allocator_malloc"]; asm["_vterm_allocator_malloc"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_allocator_malloc.apply(null, arguments);
};

var real__vterm_state_newpen = asm["_vterm_state_newpen"]; asm["_vterm_state_newpen"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_newpen.apply(null, arguments);
};

var real__vterm_state_getpen = asm["_vterm_state_getpen"]; asm["_vterm_state_getpen"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_getpen.apply(null, arguments);
};

var real__vterm_get_utf8 = asm["_vterm_get_utf8"]; asm["_vterm_get_utf8"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_get_utf8.apply(null, arguments);
};

var real__vterm_parser_set_callbacks = asm["_vterm_parser_set_callbacks"]; asm["_vterm_parser_set_callbacks"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_parser_set_callbacks.apply(null, arguments);
};

var real__bitshift64Shl = asm["_bitshift64Shl"]; asm["_bitshift64Shl"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__bitshift64Shl.apply(null, arguments);
};

var real__vterm_allocator_free = asm["_vterm_allocator_free"]; asm["_vterm_allocator_free"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_allocator_free.apply(null, arguments);
};

var real__vterm_push_output_bytes = asm["_vterm_push_output_bytes"]; asm["_vterm_push_output_bytes"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_push_output_bytes.apply(null, arguments);
};

var real__vterm_state_free = asm["_vterm_state_free"]; asm["_vterm_state_free"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_free.apply(null, arguments);
};

var real__i64Subtract = asm["_i64Subtract"]; asm["_i64Subtract"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__i64Subtract.apply(null, arguments);
};

var real__vterm_screen_reset = asm["_vterm_screen_reset"]; asm["_vterm_screen_reset"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_screen_reset.apply(null, arguments);
};

var real__vterm_lookup_encoding = asm["_vterm_lookup_encoding"]; asm["_vterm_lookup_encoding"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_lookup_encoding.apply(null, arguments);
};

var real__vterm_state_set_termprop = asm["_vterm_state_set_termprop"]; asm["_vterm_state_set_termprop"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_set_termprop.apply(null, arguments);
};

var real__i64Add = asm["_i64Add"]; asm["_i64Add"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__i64Add.apply(null, arguments);
};

var real__vterm_state_setpen = asm["_vterm_state_setpen"]; asm["_vterm_state_setpen"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_setpen.apply(null, arguments);
};

var real__vterm_keyboard_key = asm["_vterm_keyboard_key"]; asm["_vterm_keyboard_key"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_keyboard_key.apply(null, arguments);
};

var real__vterm_screen_set_damage_merge = asm["_vterm_screen_set_damage_merge"]; asm["_vterm_screen_set_damage_merge"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_screen_set_damage_merge.apply(null, arguments);
};

var real__vterm_state_set_callbacks = asm["_vterm_state_set_callbacks"]; asm["_vterm_state_set_callbacks"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_set_callbacks.apply(null, arguments);
};

var real__vterm_new_with_allocator = asm["_vterm_new_with_allocator"]; asm["_vterm_new_with_allocator"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_new_with_allocator.apply(null, arguments);
};

var real__vterm_copy_cells = asm["_vterm_copy_cells"]; asm["_vterm_copy_cells"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_copy_cells.apply(null, arguments);
};

var real__vterm_new = asm["_vterm_new"]; asm["_vterm_new"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_new.apply(null, arguments);
};

var real__vterm_screen_get_cell = asm["_vterm_screen_get_cell"]; asm["_vterm_screen_get_cell"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_screen_get_cell.apply(null, arguments);
};

var real__vterm_state_get_penattr = asm["_vterm_state_get_penattr"]; asm["_vterm_state_get_penattr"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_get_penattr.apply(null, arguments);
};

var real__vterm_output_get_buffer_remaining = asm["_vterm_output_get_buffer_remaining"]; asm["_vterm_output_get_buffer_remaining"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_output_get_buffer_remaining.apply(null, arguments);
};

var real__vterm_set_utf8 = asm["_vterm_set_utf8"]; asm["_vterm_set_utf8"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_set_utf8.apply(null, arguments);
};

var real__vterm_unicode_width = asm["_vterm_unicode_width"]; asm["_vterm_unicode_width"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_unicode_width.apply(null, arguments);
};

var real__vterm_push_output_vsprintf = asm["_vterm_push_output_vsprintf"]; asm["_vterm_push_output_vsprintf"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_push_output_vsprintf.apply(null, arguments);
};

var real__vterm_screen_flush_damage = asm["_vterm_screen_flush_damage"]; asm["_vterm_screen_flush_damage"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_screen_flush_damage.apply(null, arguments);
};

var real__free = asm["_free"]; asm["_free"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__free.apply(null, arguments);
};

var real__vterm_state_get_cursorpos = asm["_vterm_state_get_cursorpos"]; asm["_vterm_state_get_cursorpos"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_get_cursorpos.apply(null, arguments);
};

var real__vterm_state_set_default_colors = asm["_vterm_state_set_default_colors"]; asm["_vterm_state_set_default_colors"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_set_default_colors.apply(null, arguments);
};

var real__vterm_get_size = asm["_vterm_get_size"]; asm["_vterm_get_size"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_get_size.apply(null, arguments);
};

var real__vterm_push_output_sprintf_ctrl = asm["_vterm_push_output_sprintf_ctrl"]; asm["_vterm_push_output_sprintf_ctrl"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_push_output_sprintf_ctrl.apply(null, arguments);
};

var real__vterm_state_set_unrecognised_fallbacks = asm["_vterm_state_set_unrecognised_fallbacks"]; asm["_vterm_state_set_unrecognised_fallbacks"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_set_unrecognised_fallbacks.apply(null, arguments);
};

var real__vterm_state_get_cbdata = asm["_vterm_state_get_cbdata"]; asm["_vterm_state_get_cbdata"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_get_cbdata.apply(null, arguments);
};

var real__vterm_parser_get_cbdata = asm["_vterm_parser_get_cbdata"]; asm["_vterm_parser_get_cbdata"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_parser_get_cbdata.apply(null, arguments);
};

var real__malloc = asm["_malloc"]; asm["_malloc"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__malloc.apply(null, arguments);
};

var real__vterm_obtain_screen = asm["_vterm_obtain_screen"]; asm["_vterm_obtain_screen"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_obtain_screen.apply(null, arguments);
};

var real__memmove = asm["_memmove"]; asm["_memmove"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__memmove.apply(null, arguments);
};

var real__vterm_screen_set_unrecognised_fallbacks = asm["_vterm_screen_set_unrecognised_fallbacks"]; asm["_vterm_screen_set_unrecognised_fallbacks"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_screen_set_unrecognised_fallbacks.apply(null, arguments);
};

var real__vterm_output_get_buffer_current = asm["_vterm_output_get_buffer_current"]; asm["_vterm_output_get_buffer_current"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_output_get_buffer_current.apply(null, arguments);
};

var real__vterm_push_output_sprintf_dcs = asm["_vterm_push_output_sprintf_dcs"]; asm["_vterm_push_output_sprintf_dcs"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_push_output_sprintf_dcs.apply(null, arguments);
};

var real__vterm_push_output_sprintf = asm["_vterm_push_output_sprintf"]; asm["_vterm_push_output_sprintf"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_push_output_sprintf.apply(null, arguments);
};

var real__vterm_state_get_palette_color = asm["_vterm_state_get_palette_color"]; asm["_vterm_state_get_palette_color"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_state_get_palette_color.apply(null, arguments);
};

var real__vterm_free = asm["_vterm_free"]; asm["_vterm_free"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_free.apply(null, arguments);
};

var real__vterm_mouse_button = asm["_vterm_mouse_button"]; asm["_vterm_mouse_button"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__vterm_mouse_button.apply(null, arguments);
};
var _vterm_screen_get_cbdata = Module["_vterm_screen_get_cbdata"] = asm["_vterm_screen_get_cbdata"];
var _vterm_input_write = Module["_vterm_input_write"] = asm["_vterm_input_write"];
var _vterm_screen_enable_altscreen = Module["_vterm_screen_enable_altscreen"] = asm["_vterm_screen_enable_altscreen"];
var _vterm_state_get_lineinfo = Module["_vterm_state_get_lineinfo"] = asm["_vterm_state_get_lineinfo"];
var _vterm_output_get_buffer_size = Module["_vterm_output_get_buffer_size"] = asm["_vterm_output_get_buffer_size"];
var _vterm_state_reset = Module["_vterm_state_reset"] = asm["_vterm_state_reset"];
var _vterm_set_size = Module["_vterm_set_size"] = asm["_vterm_set_size"];
var _vterm_state_get_default_colors = Module["_vterm_state_get_default_colors"] = asm["_vterm_state_get_default_colors"];
var _vterm_screen_get_unrecognised_fbdata = Module["_vterm_screen_get_unrecognised_fbdata"] = asm["_vterm_screen_get_unrecognised_fbdata"];
var _vterm_keyboard_unichar = Module["_vterm_keyboard_unichar"] = asm["_vterm_keyboard_unichar"];
var _vterm_unicode_is_combining = Module["_vterm_unicode_is_combining"] = asm["_vterm_unicode_is_combining"];
var _vterm_keyboard_start_paste = Module["_vterm_keyboard_start_paste"] = asm["_vterm_keyboard_start_paste"];
var _vterm_screen_set_callbacks = Module["_vterm_screen_set_callbacks"] = asm["_vterm_screen_set_callbacks"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _vterm_get_prop_type = Module["_vterm_get_prop_type"] = asm["_vterm_get_prop_type"];
var _vterm_screen_get_attrs_extent = Module["_vterm_screen_get_attrs_extent"] = asm["_vterm_screen_get_attrs_extent"];
var _vterm_mouse_move = Module["_vterm_mouse_move"] = asm["_vterm_mouse_move"];
var _vterm_state_set_bold_highbright = Module["_vterm_state_set_bold_highbright"] = asm["_vterm_state_set_bold_highbright"];
var _vterm_screen_get_chars = Module["_vterm_screen_get_chars"] = asm["_vterm_screen_get_chars"];
var _vterm_obtain_state = Module["_vterm_obtain_state"] = asm["_vterm_obtain_state"];
var _vterm_screen_get_text = Module["_vterm_screen_get_text"] = asm["_vterm_screen_get_text"];
var _vterm_state_get_unrecognised_fbdata = Module["_vterm_state_get_unrecognised_fbdata"] = asm["_vterm_state_get_unrecognised_fbdata"];
var _vterm_scroll_rect = Module["_vterm_scroll_rect"] = asm["_vterm_scroll_rect"];
var _vterm_keyboard_end_paste = Module["_vterm_keyboard_end_paste"] = asm["_vterm_keyboard_end_paste"];
var _vterm_state_savepen = Module["_vterm_state_savepen"] = asm["_vterm_state_savepen"];
var _vterm_screen_free = Module["_vterm_screen_free"] = asm["_vterm_screen_free"];
var _vterm_screen_is_eol = Module["_vterm_screen_is_eol"] = asm["_vterm_screen_is_eol"];
var _memset = Module["_memset"] = asm["_memset"];
var _vterm_state_set_palette_color = Module["_vterm_state_set_palette_color"] = asm["_vterm_state_set_palette_color"];
var _vterm_state_resetpen = Module["_vterm_state_resetpen"] = asm["_vterm_state_resetpen"];
var _vterm_get_attr_type = Module["_vterm_get_attr_type"] = asm["_vterm_get_attr_type"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _vterm_output_read = Module["_vterm_output_read"] = asm["_vterm_output_read"];
var _vterm_allocator_malloc = Module["_vterm_allocator_malloc"] = asm["_vterm_allocator_malloc"];
var _vterm_state_newpen = Module["_vterm_state_newpen"] = asm["_vterm_state_newpen"];
var _vterm_state_getpen = Module["_vterm_state_getpen"] = asm["_vterm_state_getpen"];
var _vterm_get_utf8 = Module["_vterm_get_utf8"] = asm["_vterm_get_utf8"];
var _vterm_parser_set_callbacks = Module["_vterm_parser_set_callbacks"] = asm["_vterm_parser_set_callbacks"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var _vterm_allocator_free = Module["_vterm_allocator_free"] = asm["_vterm_allocator_free"];
var _vterm_push_output_bytes = Module["_vterm_push_output_bytes"] = asm["_vterm_push_output_bytes"];
var _vterm_state_free = Module["_vterm_state_free"] = asm["_vterm_state_free"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _vterm_screen_reset = Module["_vterm_screen_reset"] = asm["_vterm_screen_reset"];
var _vterm_lookup_encoding = Module["_vterm_lookup_encoding"] = asm["_vterm_lookup_encoding"];
var _vterm_state_set_termprop = Module["_vterm_state_set_termprop"] = asm["_vterm_state_set_termprop"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _vterm_state_setpen = Module["_vterm_state_setpen"] = asm["_vterm_state_setpen"];
var _vterm_keyboard_key = Module["_vterm_keyboard_key"] = asm["_vterm_keyboard_key"];
var _vterm_screen_set_damage_merge = Module["_vterm_screen_set_damage_merge"] = asm["_vterm_screen_set_damage_merge"];
var _vterm_state_set_callbacks = Module["_vterm_state_set_callbacks"] = asm["_vterm_state_set_callbacks"];
var _vterm_new_with_allocator = Module["_vterm_new_with_allocator"] = asm["_vterm_new_with_allocator"];
var _vterm_copy_cells = Module["_vterm_copy_cells"] = asm["_vterm_copy_cells"];
var _vterm_new = Module["_vterm_new"] = asm["_vterm_new"];
var _vterm_screen_get_cell = Module["_vterm_screen_get_cell"] = asm["_vterm_screen_get_cell"];
var _vterm_state_get_penattr = Module["_vterm_state_get_penattr"] = asm["_vterm_state_get_penattr"];
var _vterm_output_get_buffer_remaining = Module["_vterm_output_get_buffer_remaining"] = asm["_vterm_output_get_buffer_remaining"];
var _vterm_set_utf8 = Module["_vterm_set_utf8"] = asm["_vterm_set_utf8"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var _vterm_unicode_width = Module["_vterm_unicode_width"] = asm["_vterm_unicode_width"];
var _vterm_push_output_vsprintf = Module["_vterm_push_output_vsprintf"] = asm["_vterm_push_output_vsprintf"];
var _vterm_screen_flush_damage = Module["_vterm_screen_flush_damage"] = asm["_vterm_screen_flush_damage"];
var _free = Module["_free"] = asm["_free"];
var _vterm_state_get_cursorpos = Module["_vterm_state_get_cursorpos"] = asm["_vterm_state_get_cursorpos"];
var _vterm_state_set_default_colors = Module["_vterm_state_set_default_colors"] = asm["_vterm_state_set_default_colors"];
var _vterm_get_size = Module["_vterm_get_size"] = asm["_vterm_get_size"];
var _vterm_push_output_sprintf_ctrl = Module["_vterm_push_output_sprintf_ctrl"] = asm["_vterm_push_output_sprintf_ctrl"];
var _vterm_state_set_unrecognised_fallbacks = Module["_vterm_state_set_unrecognised_fallbacks"] = asm["_vterm_state_set_unrecognised_fallbacks"];
var _vterm_state_get_cbdata = Module["_vterm_state_get_cbdata"] = asm["_vterm_state_get_cbdata"];
var _vterm_parser_get_cbdata = Module["_vterm_parser_get_cbdata"] = asm["_vterm_parser_get_cbdata"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _vterm_obtain_screen = Module["_vterm_obtain_screen"] = asm["_vterm_obtain_screen"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _vterm_screen_set_unrecognised_fallbacks = Module["_vterm_screen_set_unrecognised_fallbacks"] = asm["_vterm_screen_set_unrecognised_fallbacks"];
var _vterm_output_get_buffer_current = Module["_vterm_output_get_buffer_current"] = asm["_vterm_output_get_buffer_current"];
var _vterm_push_output_sprintf_dcs = Module["_vterm_push_output_sprintf_dcs"] = asm["_vterm_push_output_sprintf_dcs"];
var _vterm_push_output_sprintf = Module["_vterm_push_output_sprintf"] = asm["_vterm_push_output_sprintf"];
var _vterm_state_get_palette_color = Module["_vterm_state_get_palette_color"] = asm["_vterm_state_get_palette_color"];
var _vterm_free = Module["_vterm_free"] = asm["_vterm_free"];
var _vterm_mouse_button = Module["_vterm_mouse_button"] = asm["_vterm_mouse_button"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
var dynCall_iiiiiii = Module["dynCall_iiiiiii"] = asm["dynCall_iiiiiii"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_viiiiiiii = Module["dynCall_viiiiiiii"] = asm["dynCall_viiiiiiii"];
var dynCall_iiiii = Module["dynCall_iiiii"] = asm["dynCall_iiiii"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
;

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.establishStackSpace = asm['establishStackSpace'];

Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];



// === Auto-generated postamble setup entry stuff ===


function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);


  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret, /* implicit = */ true);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status, implicit) {
  if (implicit && Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') implicitly called by end of main(), but noExitRuntime, so not exiting the runtime (you can use emscripten_force_exit, if you want to force a true shutdown)');
    return;
  }

  if (Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') called, but noExitRuntime, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)');
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

var abortDecorators = [];

function abort(what) {
  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';

  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}



/**
 * This is class abstraction of low level VTerm routines
 *
 * @class
 */
function VTerm(rows, cols) {
  this.term = Module._vterm_new(rows, cols);
}

VTerm.prototype.close = function() {
  if (!this.term) {
    return;
  }
  Module._vterm_free(this.term);
  delete this.term;
}

/**
 * Write data to the virtual terminal input.
 *
 * Calls "vterm_input_write" low-level API internally.
 *
 * @param {string} Data to write
 * @return {number} Bytes written
 */
VTerm.prototype.write = function(data) {
  if (typeof data !== 'string') {
    return 0;
  }
  return Module._vterm_input_write(this.term, data, data.length);
}

// exports.js
this['VTerm'] = VTerm;

// post.js
return this['VTerm'];
})();
if (typeof module !== 'undefined') module.exports = VTerm;
if (typeof define === 'function') define(VTerm);
