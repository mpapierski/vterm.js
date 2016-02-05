// api.js
function VTerm(rows, cols) {
    this.term = Module._vterm_new(rows, cols);
}

VTerm.prototype.close = function() {
    Module._vterm_free(this.term);
}
