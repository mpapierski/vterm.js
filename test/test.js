var assert = require('assert');
var sinon = require('sinon');
var VTerm = require('../vterm.js');

describe('VTerm', function() {
  var term = new VTerm(25, 80);
  after(function() {
    term.close();
  });

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
  describe('utf8', function() {
    it('by default is not set', function() {
      assert.equal(false, term.get_utf8());
    });
    it('set flag', function() {
      term.set_utf8(true);
      assert.equal(true, term.get_utf8());
    });
    it('unset flag', function() {
      term.set_utf8(false);
      assert.equal(false, term.get_utf8());
    });
  });
  describe.skip('parser', function() {
    var text_callback = sinon.stub().throws("Error");
    var control_callback = sinon.stub().throws("Error");
    var escape_callback = sinon.stub().throws("Error");
    var csi_callback = sinon.stub().throws("Error");
    var osc_callback = sinon.stub().throws("Error");
    var dcs_callback = sinon.stub().throws("Error");
    var resize_callback = sinon.stub().throws("Error");

    term.set_utf8(true);
    term.parser_set_callbacks({
      text: text_callback,
      control: control_callback,
      escape: escape_callback,
      csi: csi_callback,
      osc: osc_callback,
      dcs: dcs_callback,
      resize: resize_callback
    });
    it('calls text callback', function() {
      assert.equal(5, term.write('hello'));
      assert(
	text_callback.called ||
	control_callback.called ||
	escape_callback.called ||
	csi_callback.called ||
	osc_callback.called ||
	dcs_callback.called ||
	resize_callback.called
      );
    });
  });
});
