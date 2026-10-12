#!/usr/bin/env bash
set -uo pipefail

logfile="${1:-}"
if [[ -z "$logfile" || ! -f "$logfile" ]]; then
  echo "Usage: bash scripts/ci/analyze-failure.sh <logfile>" >&2
  exit 2
fi

matched=0
network_matched=0
emit_hint() {
  local code="$1" regex="$2" explanation="$3"
  if [[ "$code" == DEP_RESOLVE && "$network_matched" -eq 1 ]]; then return; fi
  if grep -Eq "$regex" "$logfile"; then
    matched=1
    if [[ "$code" == NETWORK ]]; then network_matched=1; fi
    printf 'HINT %s: %s\n' "$code" "$explanation"
    grep -E "$regex" "$logfile" | sed -n '1,3{s/^/EVIDENCE /;p;}'
  fi
}

emit_hint NETWORK 'Temporary failure in name resolution|UnknownHostException|Connection reset|Read timed out|Could not GET|Connect timed out|50[234] ' 'transient network/download failure; the build wrapper retries'
emit_hint NODE_CMD "Process 'command 'node'' finished with non-zero exit value" "a node command run by Gradle exited non-zero; see diagnostics/node-calls.log for argv, cwd and stderr; likely Node/engines mismatch, autolinking problem, broken dependency config, or Metro bundling error"
emit_hint BUNDLE "Execution failed for task ':app:createBundleReleaseJsAndAssets'" 'Metro/Babel bundling failed; see the expo export probe in preflight'
emit_hint LINT 'lintVitalRelease|Lint found errors' 'Android lint blocked the release build'
emit_hint MEMORY 'OutOfMemoryError|Java heap space|GC overhead limit|Metaspace' 'Gradle/JVM out of memory; raise org.gradle.jvmargs'
emit_hint DISK 'No space left on device' 'runner disk full'
emit_hint SDK 'SDK location not found|ANDROID_HOME is not set|ANDROID_SDK_ROOT' 'Android SDK path problem'
emit_hint NATIVE_BUILD 'error:.*(clang|ld\.lld|ninja|CMake)|CMake Error|ninja: build stopped' 'C++ compile/link error in a native module (check reanimated, worklets, svg, gesture-handler, or sqlite)'
emit_hint JDK 'Unsupported class file major version|requires Java|Unsupported Java|JVM target' 'JDK version mismatch'
emit_hint DEP_RESOLVE 'Could not resolve (all files|all artifacts)|Could not find [A-Za-z0-9_.-]+:|No matching variant' 'dependency resolution failure that is not a plain network error'
emit_hint MERGE 'Duplicate class|Duplicate resources|Manifest merger failed|Attribute .* redefined' 'duplicate classes/resources or manifest merge conflict'
emit_hint RESOURCES 'AAPT: error|invalid resource|resource .* not found' 'bad Android resource (icon/splash images)'
emit_hint SIGNING 'Keystore|Failed to read key|signing' 'signing configuration problem'
emit_hint NODE_MODULE 'Cannot find module|MODULE_NOT_FOUND|ERR_REQUIRE_ESM|ERR_UNKNOWN_FILE_EXTENSION|SyntaxError: Unexpected token' 'a node module is missing or ESM/CJS incompatible with this Node version; compare Node version with engines.node'
emit_hint METRO_RESOLVE 'Unable to resolve module|Unable to resolve "' 'bad import in app code (Linux paths are case-sensitive)'
emit_hint AUTOLINKING 'autolinking.*(error|failed)|expo-modules-autolinking.*(error|failed)' 'Expo/React Native autolinking failed'

if [[ "$matched" -eq 0 ]]; then
  echo 'HINT UNKNOWN: no known signature matched; read the last 80 lines of the log'
fi
