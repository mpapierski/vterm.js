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
