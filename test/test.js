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
  describe('write', function() {
    it('should return amount of data', function() {
      assert.equal(12, term.write('Hello world!'));
    });
    it('empty write works', function() {
      assert.equal(0, term.write(''));
    });
    it('invalid type fails gracefully', function() {
      assert.equal(0, term.write(null));
    });
  });
});
