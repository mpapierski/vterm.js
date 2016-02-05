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
  describe('parser callbacks', function() {
    it('set works with an object', function() {
      term.parser_set_callbacks({
        text: function() {},
        control: function() {},
        escape: function() {},
        csi: function() {},
        osc: function() {},
        dcs: function() {},
        resize: function() {}
      });
    });
  });
});
