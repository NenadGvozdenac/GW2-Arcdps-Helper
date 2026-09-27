cmake_minimum_required(VERSION 3.20)
project(gw2-arcdps-helper-nexus LANGUAGES CXX RC)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
# Static CRT: the DLL must not depend on a VC++ redistributable being installed.
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

if(NOT CMAKE_SIZEOF_VOID_P EQUAL 8)
  message(FATAL_ERROR "Guild Wars 2 is 64-bit: configure with -A x64")
endif()

add_library(gw2-arcdps-helper SHARED
  src/entry.cpp
  src/account.cpp
  src/api.cpp
  src/desktopUploader.cpp
  src/http.cpp
  src/settings.cpp
  src/ui.cpp
  src/updater.cpp
  src/uploads.cpp
  src/util.cpp
  src/watcher.cpp
  src/resources.rc
  # ImGui 1.80, the version Nexus runs (the context comes from Nexus)
  third_party/imgui/imgui.cpp
  third_party/imgui/imgui_draw.cpp
  third_party/imgui/imgui_tables.cpp
  third_party/imgui/imgui_widgets.cpp
)

target_include_directories(gw2-arcdps-helper PRIVATE third_party src)
target_compile_definitions(gw2-arcdps-helper PRIVATE WIN32_LEAN_AND_MEAN NOMINMAX UNICODE _UNICODE)

# Version shown in Nexus; CI passes the addon-vX.Y.Z tag (-DADDON_VERSION=X.Y.Z).
set(ADDON_VERSION "0.0.0" CACHE STRING "Addon version X.Y.Z")
if(NOT ADDON_VERSION MATCHES "^([0-9]+)\\.([0-9]+)\\.([0-9]+)$")
  message(FATAL_ERROR "ADDON_VERSION must look like 1.2.3, got '${ADDON_VERSION}'")
endif()
target_compile_definitions(gw2-arcdps-helper PRIVATE
  ADDON_VERSION_MAJOR=${CMAKE_MATCH_1} ADDON_VERSION_MINOR=${CMAKE_MATCH_2} ADDON_VERSION_PATCH=${CMAKE_MATCH_3})
target_link_libraries(gw2-arcdps-helper PRIVATE winhttp crypt32 shell32 ole32)

if(MSVC)
  target_compile_options(gw2-arcdps-helper PRIVATE /W3 /utf-8 /EHsc)
endif()
