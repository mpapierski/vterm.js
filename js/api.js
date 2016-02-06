/**
 * This is class abstraction of low level VTerm routines
 *
 * @class
 */
function VTerm(rows, cols) {
  this.term = Module._vterm_new(rows, cols);
  // This should be freed
  this._parser_callbacks = null;
}

VTerm.prototype.set_utf8 = function(flag) {
  Module._vterm_set_utf8(this.term, flag);
}

VTerm.prototype.get_utf8 = function() {
  return Module._vterm_get_utf8(this.term) === -1;
}

/**
 * Sets parser callbacks for virtual terminal.
 *
 * @param {object} Callbacks object
 */
VTerm.prototype.parser_set_callbacks = function(callbacks) {

  // Decorator for converting bytes into string
  var text_wrapper = function(callback) {
    return function(data, size, user) {
      if (!callback) {
	return 1;
      }
      var text = Pointer_stringify(data, size);
      callback(text);
      return 1;
    };
  };

  var callbacks = Module._vterm_wrapper_parser_create_callbacks(
    Module.Runtime.addFunction(text_wrapper(callbacks.text)),
    Module.Runtime.addFunction(callbacks.control),
    Module.Runtime.addFunction(callbacks.escape),
    Module.Runtime.addFunction(callbacks.csi),
    Module.Runtime.addFunction(callbacks.osc),
    Module.Runtime.addFunction(callbacks.dcs),
    Module.Runtime.addFunction(callbacks.resize)
  );
  Module._vterm_parser_set_callbacks(this.term, callbacks, null);
};

VTerm.prototype.obtain_screen = function() {
  return Module._vterm_obtain_screen(this.term);
}

VTerm.prototype.screen_set_callbacks = function(screen, callbacks) {
  /// XXX: sizoef(VTermScreenCallbacks)
  var cbs = Module.allocate(1024, 'i32', Module.ALLOC_STACK);
  if (callbacks.damage) {
    Module.setValue(cbs + (0 * 4), Module.Runtime.addFunction(callbacks.damage), 'i32*');
  }
  if (callbacks.moverect) {
    Module.setValue(cbs + (1 * 4), Module.Runtime.addFunction(callbacks.moverect), 'i32*');
  }
  if (callbacks.movecursor) {
    Module.setValue(cbs + (2 * 4), Module.Runtime.addFunction(callbacks.movecursor), 'i32*');
  }
  if (callbacks.settermprop) {
    Module.setValue(cbs + (3 * 4), Module.Runtime.addFunction(callbacks.settermprop), 'i32*');
  }
  if (callbacks.bell) {
    Module.setValue(cbs + (4 * 4), Module.Runtime.addFunction(callbacks.bell), 'i32*');
  }
  if (callbacks.resize) {
    Module.setValue(cbs + (5 * 4), Module.Runtime.addFunction(callbacks.resize), 'i32*');
  }
  if (callbacks.sb_pushline) {
    Module.setValue(cbs + (6 * 4), Module.Runtime.addFunction(callbacks.sb_pushline), 'i32*');
  }
  if (callbacks.sb_popline) {
    Module.setValue(cbs + (7 * 4), Module.Runtime.addFunction(callbacks.sb_popline), 'i32*');
  }
  Module._vterm_screen_set_callbacks(screen, cbs, null);
}

VTerm.prototype.close = function() {
  if (!this.term) {
    return;
  }
  Module._vterm_free(this.term);
  delete this.term;
  if (!this._parser_callbacks) {
    return;
  }
  Module._free(this._parser_callbacks);
  if (!this._screen_callbacks) {
    return;
  }
  Module._free(this._screen_callbacks);
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
  var buf = Module.allocate(Module.intArrayFromString(data), 'i8', Module.ALLOC_STACK);
  return Module._vterm_input_write(this.term, buf, data.length);
}
