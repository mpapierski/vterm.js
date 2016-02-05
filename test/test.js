var assert = require('assert');
var VTerm = require('../vterm.js');

describe('VTerm', function() {
  var term = new VTerm(25, 80);
  describe('close', function () {
    it('should not fail when called twice', function () {
      term.close();
      term.close();
    });
  });
});
