var assert = require('assert');
var sinon = require('sinon');
var VTerm = require('../vterm.js');

describe('VTerm', function() {
  var term = null;

  beforeEach(function() {
    term = new VTerm(25, 80);
  });

  afterEach(function() {
    term.close();
  });

  describe('close', function () {
    it('should not fail when called twice', function () {
      term.close();
      term.close();
    });
  });

  describe.skip('write', function() {
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
  describe('parser', function() {
    var text_callback = sinon.spy();
    var control_callback = sinon.stub().returns(1);
    var escape_callback = sinon.stub().returns(1);
    var csi_callback = sinon.stub().returns(1);
    var osc_callback = sinon.stub().returns(1);
    var dcs_callback = sinon.stub().returns(1);
    var resize_callback = sinon.stub().returns(1);

    beforeEach(function() {
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
    });

    it('calls text callback', function() {
      text_callback.reset();
      term.write("Hello world!");
      sinon.assert.calledWith(text_callback, "Hello world!");
      sinon.assert.calledWith(text_callback, "ello world!");
      sinon.assert.calledWith(text_callback, "llo world!");
      sinon.assert.calledWith(text_callback, "lo world!");
      sinon.assert.calledWith(text_callback, "o world!");
      sinon.assert.calledWith(text_callback, " world!");
      sinon.assert.calledWith(text_callback, "world!");
      sinon.assert.calledWith(text_callback, "orld!");
      sinon.assert.calledWith(text_callback, "rld!");
      sinon.assert.calledWith(text_callback, "ld!");
      sinon.assert.calledWith(text_callback, "d!");
      sinon.assert.calledWith(text_callback, "!");
    });
  });

  describe.skip('screen', function() {
    var screen = null;

    before(function() {
      screen = term.obtain_screen();
    })

    it('is valid', function() {
      assert.notEqual(0, screen);
    });

    describe('callbacks', function() {
      var damage = sinon.stub().returns(1);
      var moverect = sinon.stub().returns(1);
      var movecursor = sinon.stub().returns(1);
      var settermprop = sinon.stub().returns(1);
      var bell = sinon.stub().returns(1);
      var resize = sinon.stub().returns(1);
      var sb_pushline = sinon.stub().returns(1);
      var sb_popline = sinon.stub().returns(1);

      before(function() {
	term.screen_set_callbacks(screen, {
	  damage: damage,
	  moverect: moverect,
	  movecursor: movecursor,
	  settermprop: settermprop,
	  bell: bell,
	  resize: resize,
	  sb_pushline: sb_pushline,
	  sb_popline: sb_popline
	});
      });

      it('works', function() {
	term.write('Hello world!');
      });
    });
  });
});
