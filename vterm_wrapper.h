#if !defined(VTERM_WRAPPER_H_)
#define VTERM_WRAPPER_H_

#include <assert.h>
#include "vterm.h"

VTermParserCallbacks * vterm_wrapper_parser_create_callbacks(
    int (*text)(const char *bytes, size_t len, void *user),
    int (*control)(unsigned char control, void *user),
    int (*escape)(const char *bytes, size_t len, void *user),
    int (*csi)(const char *leader, const long args[], int argcount, const char *intermed, char command, void *user),
    int (*osc)(const char *command, size_t cmdlen, void *user),
    int (*dcs)(const char *command, size_t cmdlen, void *user),
    int (*resize)(int rows, int cols, void *user));

VTermScreenCallbacks * vterm_wrapper_screen_create_callbacks(
    int (*damage)(VTermRect rect, void *user),
    int (*moverect)(VTermRect dest, VTermRect src, void *user),
    int (*movecursor)(VTermPos pos, VTermPos oldpos, int visible, void *user),
    int (*settermprop)(VTermProp prop, VTermValue *val, void *user),
    int (*bell)(void *user),
    int (*resize)(int rows, int cols, void *user),
    int (*sb_pushline)(int cols, const VTermScreenCell *cells, void *user),
    int (*sb_popline)(int cols, VTermScreenCell *cells, void *user));

int vterm_wrapper_rect_get_start_row(VTermRect * rect);
int vterm_wrapper_rect_get_end_row(VTermRect * rect);
int vterm_wrapper_rect_get_start_col(VTermRect * rect);
int vterm_wrapper_rect_get_end_col(VTermRect * rect);

int vterm_wrapper_pos_get_row(VTermPos * pos);
int vterm_wrapper_pos_get_col(VTermPos * pos);

bool vterm_wrapper_value_get_bool(VTermValue * value);
int vterm_wrapper_value_get_number(VTermValue * value);
char * vterm_wrapper_value_get_string(VTermValue * value);

uint32_t * vterm_wrapper_screen_cell_get_chars(VTermScreenCell * cell);
int vterm_wrapper_screen_cell_get_width(VTermScreenCell * cell);
unsigned int vterm_wrapper_screen_cell_get_attrs_bold(VTermScreenCell * cell);
unsigned int vterm_wrapper_screen_cell_get_attrs_underline(VTermScreenCell * cell);
unsigned int vterm_wrapper_screen_cell_get_attrs_italic(VTermScreenCell * cell);
unsigned int vterm_wrapper_screen_cell_get_attrs_blink(VTermScreenCell * cell);
unsigned int vterm_wrapper_screen_cell_get_attrs_reverse(VTermScreenCell * cell);
unsigned int vterm_wrapper_screen_cell_get_attrs_strike(VTermScreenCell * cell);
unsigned int vterm_wrapper_screen_cell_get_attrs_font(VTermScreenCell * cell);
unsigned int vterm_wrapper_screen_cell_get_attrs_dwl(VTermScreenCell * cell);
unsigned int vterm_wrapper_screen_cell_get_attrs_dhl(VTermScreenCell * cell);
VTermColor vterm_wrapper_screen_cell_get_fg(VTermScreenCell * cell);
VTermColor vterm_wrapper_screen_cell_get_bg(VTermScreenCell * cell);

#endif
