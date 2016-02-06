#if !defined(VTERM_WRAPPER_H_)
#define VTERM_WRAPPER_H_

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

#endif
