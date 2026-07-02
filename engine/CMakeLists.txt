cmake_minimum_required(VERSION 3.16)
project(TradingEngine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ── Dependencies via FetchContent ─────────────────────────────────────────────

include(FetchContent)

# libzmq
FetchContent_Declare(
    libzmq
    GIT_REPOSITORY https://github.com/zeromq/libzmq.git
    GIT_TAG        v4.3.5
)
set(BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(BUILD_SHARED OFF CACHE BOOL "" FORCE)
set(BUILD_STATIC ON CACHE BOOL "" FORCE)
set(WITH_DOCS OFF CACHE BOOL "" FORCE)
set(CMAKE_POLICY_VERSION_MINIMUM 3.5 CACHE STRING "" FORCE)
FetchContent_MakeAvailable(libzmq)

# Alias libzmq -> libzmq-static so cppzmq's internal target reference resolves
if(TARGET libzmq-static AND NOT TARGET libzmq)
    add_library(libzmq ALIAS libzmq-static)
endif()

# cppzmq (header-only C++ bindings)
FetchContent_Declare(
    cppzmq
    GIT_REPOSITORY https://github.com/zeromq/cppzmq.git
    GIT_TAG        v4.10.0
)
set(CPPZMQ_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(CPPZMQ_BUILD_STATIC OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(cppzmq)

# FlatBuffers
FetchContent_Declare(
    flatbuffers
    GIT_REPOSITORY https://github.com/google/flatbuffers.git
    GIT_TAG        v24.3.25
)
set(FLATBUFFERS_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(FLATBUFFERS_BUILD_FLATLIB ON CACHE BOOL "" FORCE)
set(FLATBUFFERS_BUILD_FLATC ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(flatbuffers)

# ── Generate FlatBuffers headers ──────────────────────────────────────────────

set(FBS_GENERATED_DIR ${CMAKE_SOURCE_DIR}/src/generated)
set(FBS_GENERATED_HEADERS "")

foreach(schema_name market_data orders)
    set(schema_file ${CMAKE_SOURCE_DIR}/schema/${schema_name}.fbs)
    set(generated_header ${FBS_GENERATED_DIR}/${schema_name}_generated.h)
    add_custom_command(
        OUTPUT ${generated_header}
        COMMAND ${CMAKE_COMMAND} -E make_directory ${FBS_GENERATED_DIR}
        COMMAND flatc --cpp -o ${FBS_GENERATED_DIR} ${schema_file}
        DEPENDS ${schema_file} flatc
        COMMENT "Generating FlatBuffers C++ header for ${schema_name}"
    )
    list(APPEND FBS_GENERATED_HEADERS ${generated_header})
endforeach()

add_custom_target(generate_flatbuffers DEPENDS ${FBS_GENERATED_HEADERS})

# ── Engine executable ─────────────────────────────────────────────────────────

add_executable(trading-engine
    src/main.cpp
    src/orderbook/order_book.cpp
    src/feed/mock_feed.cpp
    src/publisher/zmq_publisher.cpp
    src/orders/paper_matcher.cpp
    src/orders/order_gateway.cpp
)

add_dependencies(trading-engine generate_flatbuffers)

target_include_directories(trading-engine PRIVATE
    ${CMAKE_SOURCE_DIR}/src
    ${FBS_GENERATED_DIR}
    ${flatbuffers_SOURCE_DIR}/include
    ${libzmq_SOURCE_DIR}/include
    ${cppzmq_SOURCE_DIR}
)

target_link_libraries(trading-engine PRIVATE
    libzmq-static
    flatbuffers
)

if(WIN32)
    target_link_libraries(trading-engine PRIVATE winmm)
endif()
