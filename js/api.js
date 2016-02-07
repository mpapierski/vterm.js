/**
 * Abstraction for parser callbacks
 *
 * @class
 */
function VTermParserCallbacks(callbacks) {
  this.callbacks = callbacks;
  this.fn_text = Module.Runtime.addFunction(function(data, size, user) {
    var text = Pointer_stringify(data, size);
    callbacks.text(text);
    return 1;
  });
  this.fn_control = Module.Runtime.addFunction(function(control, user) {
    callbacks.control(control);
    return 1;
  });
  this.fn_escape = Module.Runtime.addFunction(function(bytes, len, user) {
    var text = Pointer_stringify(bytes, len);
    callbacks.escape(text);
    return 1;
  });
  this.fn_csi = Module.Runtime.addFunction(function(leader, args, argcount, intermed, command, user) {
    var leader = Pointer_stringify(leader);
    var new_args = [];
    for (var i = 0; i < argcount; i++) {
      new_args.push(Module.getValue(args + (i * 4), 'i32'));
    }
    var intermed = Pointer_stringify(intermed);
    callbacks.csi(leader, new_args, intermed, command);
    return 1;
  });
  this.fn_osc = Module.Runtime.addFunction(function(command, cmdlen, user) {
    var command = Pointer_stringify(command, cmdlen);
    callbacks.osc(command)
    return 1;
  });
  this.fn_dcs = Module.Runtime.addFunction(function(command, cmdlen, user) {
    var command = Pointer_stringify(command, cmdlen);
    callbacks.dcs(command);
    return 1;
  });
  this.fn_resize = Module.Runtime.addFunction(function(rows, cols, user) {
    callbacks.resize(rows, cols);
    return 1;
  });
  this.pointer = Module._vterm_wrapper_parser_create_callbacks(
    this.fn_text,
    this.fn_control,
    this.fn_escape,
    this.fn_csi,
    this.fn_osc,
    this.fn_dcs,
    this.fn_resize);
}

VTermParserCallbacks.prototype.cleanup = function() {
  Runtime.removeFunction(this.fn_text);
  Runtime.removeFunction(this.fn_control);
  Runtime.removeFunction(this.fn_escape);
  Runtime.removeFunction(this.fn_csi);
  Runtime.removeFunction(this.fn_osc);
  Runtime.removeFunction(this.fn_dcs);
  Runtime.removeFunction(this.fn_resize);
  Module._free(this.pointer);
  delete this.pointer;
}

function VTermScreenCallbacks(callbacks) {
  this.fn_damage = Module.Runtime.addFunction(function(rect, user) {
    callbacks.damage(new VTermRect(rect));
    return 1;
  });
  this.fn_moverect = Module.Runtime.addFunction(function(dest, src) {
    callbacks.moverect(new VTermRect(dest), new VTermRect(src));
    return 1;
  });
  this.fn_movecursor = Module.Runtime.addFunction(callbacks.movecursor);
  this.fn_settermprop = Module.Runtime.addFunction(callbacks.settermprop);
  this.fn_bell = Module.Runtime.addFunction(callbacks.bell);
  this.fn_resize = Module.Runtime.addFunction(callbacks.resize);
  this.fn_sb_pushline = Module.Runtime.addFunction(callbacks.sb_pushline);
  this.fn_sb_popline = Module.Runtime.addFunction(callbacks.sb_popline);
  this.pointer = Module._vterm_wrapper_screen_create_callbacks(
    this.fn_damage,
    this.fn_moverect,
    this.fn_movecursor,
    this.fn_settermprop,
    this.fn_bell,
    this.fn_resize,
    this.fn_sb_pushline,
    this.fn_sb_popline);
}

VTermScreenCallbacks.prototype.cleanup = function() {
  Runtime.removeFunction(this.fn_damage);
  Runtime.removeFunction(this.fn_moverect);
  Runtime.removeFunction(this.fn_movecursor);
  Runtime.removeFunction(this.fn_settermprop);
  Runtime.removeFunction(this.fn_bell);
  Runtime.removeFunction(this.fn_resize);
  Runtime.removeFunction(this.fn_sb_pushline);
  Runtime.removeFunction(this.fn_sb_popline);
  Module._free(this.pointer);
  delete this.pointer;
};

/**
 * Wrapper for VTermRect structure
 *
 * @class
 */
function VTermRect(pointer) {
  this.start_row = Module._vterm_wrapper_rect_get_start_row(pointer);
  this.end_row = Module._vterm_wrapper_rect_get_end_row(pointer);
  this.start_col = Module._vterm_wrapper_rect_get_start_col(pointer);
  this.end_col = Module._vterm_wrapper_rect_get_end_col(pointer);
}

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
  if (!(callbacks instanceof VTermParserCallbacks)) {
    throw new Error('callbacks is not instance of VTermParserCallbacks');
  }
  Module._vterm_parser_set_callbacks(this.term, callbacks.pointer, null);
};

VTerm.prototype.obtain_screen = function() {
  return Module._vterm_obtain_screen(this.term);
}

VTerm.prototype.screen_set_callbacks = function(screen, callbacks) {
  if (!(callbacks instanceof VTermScreenCallbacks)) {
    throw new Error('callbacks is not instance of VTermScreenCallbacks');
  }
  Module._vterm_screen_set_callbacks(screen, callbacks.pointer, null);
}

VTerm.prototype.screen_reset = function(screen, hard) {
  Module._vterm_screen_reset(screen, hard);
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
