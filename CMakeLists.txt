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

# Order matters
set (PRE_SOURCES
    js/pre.js
    )

set (POST_SOURCES
    js/api.js
    js/exports.js
    js/post.js
    )

# Collect all --pre-js and --post-js files
set (emcc_ARGS)

foreach (src ${PRE_SOURCES})
    list (APPEND emcc_ARGS
        --pre-js ${src}
        )
endforeach ()

foreach (src ${POST_SOURCES})
    list (APPEND emcc_ARGS
        --post-js ${src}
        )
endforeach ()

add_custom_command (OUTPUT vterm.js
    COMMAND ${EMCC} $<TARGET_FILE:vterm>
    -o ${CMAKE_CURRENT_BINARY_DIR}/vterm.js
    -O0
    -s EXPORTED_FUNCTIONS=@exported_functions
    -s ASSERTIONS=2
    -s NO_FILESYSTEM=1
    ${emcc_ARGS}
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
    DEPENDS vterm ${PRE_SOURCES} ${POST_SOURCES}
    )

add_custom_target(js ALL
    DEPENDS vterm.js)
