cmake_minimum_required (VERSION 2.6)
project (vtermjs C)

find_program (EMCC emcc)
if (NOT EMCC)
    message (FATAL_ERROR "emcc not found")
endif ()

set(CMAKE_AR "emcc")
set(CMAKE_STATIC_LIBRARY_SUFFIX ".bc")
set(CMAKE_C_CREATE_STATIC_LIBRARY "<CMAKE_AR> -o <TARGET> <LINK_FLAGS> <OBJECTS>")
set(CMAKE_CXX_CREATE_STATIC_LIBRARY "<CMAKE_AR> -o <TARGET> <LINK_FLAGS> <OBJECTS>")

add_subdirectory (libvterm)

add_custom_target (js
    COMMAND ${EMCC} $<TARGET_FILE:vterm>
    -o vterm.js
    -s EXPORTED_FUNCTIONS=@"${CMAKE_CURRENT_SOURCE_DIR}/exported_functions"
    )
