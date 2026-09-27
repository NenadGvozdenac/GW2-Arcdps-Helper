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
  src/http.cpp
  src/settings.cpp
  src/ui.cpp
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
target_link_libraries(gw2-arcdps-helper PRIVATE winhttp crypt32 shell32 ole32)

if(MSVC)
  target_compile_options(gw2-arcdps-helper PRIVATE /W3 /utf-8 /EHsc)
endif()
