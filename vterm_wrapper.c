#include "vterm_wrapper.h"

VTermParserCallbacks * vterm_wrapper_parser_create_callbacks(
    int (*text)(const char *bytes, size_t len, void *user),
    int (*control)(unsigned char control, void *user),
    int (*escape)(const char *bytes, size_t len, void *user),
    int (*csi)(const char *leader, const long args[], int argcount, const char *intermed, char command, void *user),
    int (*osc)(const char *command, size_t cmdlen, void *user),
    int (*dcs)(const char *command, size_t cmdlen, void *user),
    int (*resize)(int rows, int cols, void *user))
{
    VTermParserCallbacks * callbacks = (VTermParserCallbacks *)malloc(sizeof(VTermParserCallbacks));
    callbacks->text = text;
    callbacks->control = control;
    callbacks->escape = escape;
    callbacks->csi = csi;
    callbacks->osc = osc;
    callbacks->dcs = dcs;
    callbacks->resize = resize;
    return callbacks;
}

VTermScreenCallbacks * vterm_wrapper_screen_create_callbacks(
    int (*damage)(VTermRect rect, void *user),
    int (*moverect)(VTermRect dest, VTermRect src, void *user),
    int (*movecursor)(VTermPos pos, VTermPos oldpos, int visible, void *user),
    int (*settermprop)(VTermProp prop, VTermValue *val, void *user),
    int (*bell)(void *user),
    int (*resize)(int rows, int cols, void *user),
    int (*sb_pushline)(int cols, const VTermScreenCell *cells, void *user),
    int (*sb_popline)(int cols, VTermScreenCell *cells, void *user))
{
    VTermScreenCallbacks * callbacks = (VTermScreenCallbacks *)malloc(sizeof(VTermScreenCallbacks));
    callbacks->damage = damage;
    callbacks->moverect = moverect;
    callbacks->movecursor = movecursor;
    callbacks->settermprop = settermprop;
    callbacks->bell = bell;
    callbacks->resize = resize;
    callbacks->sb_pushline = sb_pushline;
    callbacks->sb_popline = sb_popline;
    return callbacks;
}

int vterm_wrapper_rect_get_start_row(VTermRect * rect)
{
    assert(rect != NULL);
    return rect->start_row;
}

int vterm_wrapper_rect_get_end_row(VTermRect * rect)
{
    assert(rect != NULL);
    return rect->end_row;
}

int vterm_wrapper_rect_get_start_col(VTermRect * rect)
{
    assert(rect != NULL);
    return rect->start_col;
}

int vterm_wrapper_rect_get_end_col(VTermRect * rect)
{
    assert(rect != NULL);
    return rect->end_col;
}

int vterm_wrapper_pos_get_row(VTermPos * pos)
{
    return pos->row;
}

int vterm_wrapper_pos_get_col(VTermPos * pos)
{
    return pos->col;
}

bool vterm_wrapper_value_get_bool(VTermValue * value)
{
  assert(value != NULL);
  return value->boolean;
}

int vterm_wrapper_value_get_number(VTermValue * value)
{
  assert(value != NULL);
  return value->number;
}

char * vterm_wrapper_value_get_string(VTermValue * value)
{
  assert(value != NULL);
  return value->string;
}

uint32_t * vterm_wrapper_screen_cell_get_chars(VTermScreenCell * cell)
{
    assert(cell != NULL);
    return cell->chars;
}

int vterm_wrapper_screen_cell_get_width(VTermScreenCell * cell)
{
    assert(cell != NULL);
    return cell->width;
}

unsigned int vterm_wrapper_screen_cell_get_attrs_bold(VTermScreenCell * cell)
{
    assert(cell != NULL);
    return cell->attrs.bold;
}

unsigned int vterm_wrapper_screen_cell_get_attrs_underline(VTermScreenCell * cell)
{
    assert(cell != NULL);
    return cell->attrs.underline;
}

unsigned int vterm_wrapper_screen_cell_get_attrs_italic(VTermScreenCell * cell)
{
    assert(cell != NULL);
    return cell->attrs.italic;
}

unsigned int vterm_wrapper_screen_cell_get_attrs_blink(VTermScreenCell * cell)
{
    assert(cell != NULL);
    return cell->attrs.blink;
}

unsigned int vterm_wrapper_screen_cell_get_attrs_reverse(VTermScreenCell * cell)
{
    assert(cell != NULL);
    return cell->attrs.reverse;
}

unsigned int vterm_wrapper_screen_cell_get_attrs_strike(VTermScreenCell * cell)
{
    assert(cell != NULL);
    return cell->attrs.strike;
}

unsigned int vterm_wrapper_screen_cell_get_attrs_font(VTermScreenCell * cell)
{
    assert(cell != NULL);
    return cell->attrs.font;
}

unsigned int vterm_wrapper_screen_cell_get_attrs_dwl(VTermScreenCell * cell)
{
    assert(cell != NULL);
    return cell->attrs.dwl;
}

unsigned int vterm_wrapper_screen_cell_get_attrs_dhl(VTermScreenCell * cell)
{
    assert(cell != NULL);
    return cell->attrs.dhl;
}

VTermColor vterm_wrapper_screen_cell_get_fg(VTermScreenCell * cell)
{
    assert(cell != NULL);
    return cell->fg;
}

VTermColor vterm_wrapper_screen_cell_get_bg(VTermScreenCell * cell)
{
    assert(cell != NULL);
    return cell->bg;
}
