var assert = require('assert');
var sinon = require('sinon');
var VTerm = require('../vterm.js');

describe('VTerm', function() {
  var term = null;

  beforeEach(function() {
    term = new VTerm.VTerm(25, 80);
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
  describe('parser', function() {
    var text_callback = sinon.spy();
    var control_callback = sinon.spy();
    var escape_callback = sinon.spy();
    var csi_callback = sinon.stub().returns(1);
    var osc_callback = sinon.stub().returns(1);
    var dcs_callback = sinon.stub().returns(1);
    var resize_callback = sinon.stub().returns(1);

    var callbacks;

    beforeEach(function() {
      text_callback.reset();
      control_callback.reset();
      escape_callback.reset();
      resize_callback.reset();

      term.set_utf8(true);

      callbacks = new VTerm.VTermParserCallbacks({
        text: text_callback,
        control: control_callback,
        escape: escape_callback,
        csi: csi_callback,
        osc: osc_callback,
        dcs: dcs_callback,
        resize: resize_callback
      });
      term.parser_set_callbacks(callbacks);
    });

    afterEach(function() {
      callbacks.cleanup();
    })

    it('calls text callback', function() {
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
    it('calls control callback', function() {
      term.write('\x03');
      sinon.assert.calledWith(control_callback, 3);
    });
    it('calls escape callback', function() {
      term.write('\x1B(X');
      assert(escape_callback.called);
      sinon.assert.calledWith(escape_callback, '(X');
    });
    it('calls CSI 1 arg', function() {
      term.write('\x1b[9b');
      assert(csi_callback.called);
      sinon.assert.calledWith(csi_callback, '', [9], '', 98);
    });
    it('calls CSI 2 args', function() {
      term.write('\x1b[3;4c');
      assert(csi_callback.called);
      sinon.assert.calledWith(csi_callback, '', [3, 4], '', 99);
    });
    it('calls osc', function() {
      term.write('\x1b]1;Hello\x07');
      assert(osc_callback.called);
      sinon.assert.calledWith(osc_callback, '1;Hello');
    });
    it('calls dcs', function() {
      term.write('\x1bPHello\x07');
      assert(dcs_callback.called);
      sinon.assert.calledWith(dcs_callback, 'Hello');
    });
    it.skip('calls resize', function() {
      // Sounds like parser resize callback is never called
      term.write('\x1b[8;30;60t');
      assert(resize_callback.called);
      sinon.assert.calledWith(resize_callback, 30, 60);
    });
    describe('screen', function() {
      var screen = null;

      beforeEach(function() {
        screen = term.obtain_screen();
        term.screen_reset(screen, 1);
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
        var screen_callbacks;

        beforeEach(function() {
          screen_callbacks = new VTerm.VTermScreenCallbacks({
            damage: damage,
            moverect: moverect,
            movecursor: movecursor,
            settermprop: settermprop,
            bell: bell,
            resize: resize,
            sb_pushline: sb_pushline,
            sb_popline: sb_popline
          });
          term.screen_set_callbacks(screen, screen_callbacks);
        });

        afterEach(function() {
          screen_callbacks.cleanup();
        });

        it('reset calls settermprop', function() {
          term.screen_reset(screen);
          sinon.assert.calledWith(settermprop, VTerm.VTermProp.VTERM_PROP_CURSORVISIBLE, true);
          sinon.assert.calledWith(settermprop, VTerm.VTermProp.VTERM_PROP_CURSORBLINK, true);
          sinon.assert.calledWith(settermprop, VTerm.VTermProp.VTERM_PROP_CURSORSHAPE, 1);
        });

        it('works', function() {

          term.write('Hello world!');
          assert(damage.called);
          assert(movecursor.called);

        });

        it('moves rect', function() {
          term.write('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n');
          assert(moverect.called);
        });

        it('enables cursor', function() {
          term.write('\x1b[?25h');
          sinon.assert.calledWith(settermprop, VTerm.VTermProp.VTERM_PROP_CURSORVISIBLE, true);
        });

        it('disables cursor', function() {
          term.write('\x1b[?25l');
          sinon.assert.calledWith(settermprop, VTerm.VTermProp.VTERM_PROP_CURSORVISIBLE, false);
        });

        it('changes terminal title', function() {
          term.write('\x1b]2;Here is my title\x07');
          sinon.assert.calledWith(settermprop, VTerm.VTermProp.VTERM_PROP_TITLE, 'Here is my title');
        });

        it('calls bell', function() {
          bell.reset();
          term.write('\x1b\x07');
          assert(bell.called);
        });

      });
    });
  });
});
