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

/**
 * Sets parser callbacks for virtual terminal.
 *
 * @param {object} Callbacks object
 */
VTerm.prototype.parser_set_callbacks = function(callbacks) {
  // XXX: sizeof(VTermParserCallbacks) right?
  this._parser_callbacks = Module._malloc(7 * 4);
  // text
  if (callbacks.text) {
    Module.setValue(this._parser_callbacks + (0 * 4), Module.Runtime.addFunction(callbacks.text), 'i32');
  }
  if (callbacks.control) {
    Module.setValue(this._parser_callbacks + (1 * 4), Module.Runtime.addFunction(callbacks.control), 'i32');
  }
  if (callbacks.escape) {
    Module.setValue(this._parser_callbacks + (2 * 4), Module.Runtime.addFunction(callbacks.escape), 'i32');
  }
  if (callbacks.csi) {
    Module.setValue(this._parser_callbacks + (3 * 4), Module.Runtime.addFunction(callbacks.csi), 'i32');
  }
  if (callbacks.osc) {
    Module.setValue(this._parser_callbacks + (4 * 4), Module.Runtime.addFunction(callbacks.osc), 'i32');
  }
  if (callbacks.dcs) {
    Module.setValue(this._parser_callbacks + (5 * 4), Module.Runtime.addFunction(callbacks.dcs), 'i32');
  }
  if (callbacks.resize) {
    Module.setValue(this._parser_callbacks + (6 * 4), Module.Runtime.addFunction(callbacks.resize), 'i32');
  }

  Module._vterm_parser_set_callbacks(this.term, callbacks, null);
};

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
