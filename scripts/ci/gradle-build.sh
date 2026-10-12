#!/usr/bin/env bash
set -uo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"
mkdir -p diagnostics
log="$root/diagnostics/gradle-build.log"
: > "$log"
attempt=1
max_attempts=3
build_code=1

if [[ "${CI_DEBUG:-false}" == true ]]; then
  set -x
  export EXPO_DEBUG=1
fi

while [[ "$attempt" -le "$max_attempts" ]]; do
  printf '\n===== ATTEMPT %s =====\n' "$attempt" | tee -a "$log"
  if [[ "${CI_DEBUG:-false}" == true ]]; then
    (cd android && ./gradlew assembleRelease --no-daemon --stacktrace --info -PreactNativeArchitectures=arm64-v8a,x86_64) 2>&1 | tee -a "$log"
  else
    (cd android && ./gradlew assembleRelease --no-daemon --stacktrace -PreactNativeArchitectures=arm64-v8a,x86_64) 2>&1 | tee -a "$log"
  fi
  build_code=${PIPESTATUS[0]}
  if [[ "$build_code" -eq 0 ]]; then break; fi
  failure_hints="$(bash scripts/ci/analyze-failure.sh "$log")"
  if [[ "$attempt" -lt "$max_attempts" ]] && grep -q '^HINT NETWORK:' <<< "$failure_hints"; then
    wait_seconds=$((attempt * 20))
    printf 'Retrying network failure in %s seconds (attempt %s/%s).\n' "$wait_seconds" "$((attempt + 1))" "$max_attempts" | tee -a "$log"
    sleep "$wait_seconds"
    attempt=$((attempt + 1))
    continue
  fi
  break
done

report="$root/diagnostics/REPORT.md"
if [[ "$build_code" -eq 0 ]]; then
  {
    printf '# Android release build report\n\n## Verdict\n\nBuild **OK** after %s attempt(s).\n\n' "$attempt"
    printf '## Preflight findings\n\n'
    if [[ -f diagnostics/preflight.md ]] && grep -Eq '\*\*(WARN|FAIL)\*\*' diagnostics/preflight.md; then
      grep -n -B 2 -A 8 -E '\*\*(WARN|FAIL)\*\*' diagnostics/preflight.md
    else
      printf 'No preflight warnings or failures.\n'
    fi
    printf '\n## Environment\n\n- Node: %s\n- Java: %s\n- Runner: %s %s\n' \
      "$(node -v 2>&1)" "$(java -version 2>&1 | sed -n '1p')" "${ImageOS:-unknown image}" "${ImageVersion:-}"
  } > "$report"
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then head -c 750000 "$report" >> "$GITHUB_STEP_SUMMARY"; fi
  exit 0
fi

bash scripts/ci/analyze-failure.sh "$log" > diagnostics/hints-main.txt 2>&1 || true

shim_dir="$(bash scripts/ci/node-shim.sh 2>/dev/null || true)"
if [[ -n "$shim_dir" ]]; then export PATH="$shim_dir:$PATH"; fi

config_code=127
printf '===== CONFIG-ONLY RERUN =====\n' > diagnostics/gradle-config-rerun.log
(cd android && ./gradlew help --no-daemon --stacktrace --info) 2>&1 | tee -a diagnostics/gradle-config-rerun.log
config_code=${PIPESTATUS[0]}
printf '%s\n' "$config_code" > diagnostics/gradle-config-rerun.exit

task_code=125
task_name='not identified in the main log'
task_match="$(grep -Eo "Execution failed for task '[^']+'" "$log" | head -n 1 || true)"
if [[ -n "$task_match" ]]; then
  task_name="$(awk -F "'" '{print $2}' <<< "$task_match")"
fi
if [[ "$task_name" =~ ^:[A-Za-z0-9_:-]+$ ]]; then
  printf '===== TASK RERUN: %s =====\n' "$task_name" > diagnostics/gradle-task-rerun.log
  (cd android && ./gradlew "$task_name" --no-daemon --stacktrace --info) 2>&1 | tee -a diagnostics/gradle-task-rerun.log
  task_code=${PIPESTATUS[0]}
  printf '%s\n' "$task_code" > diagnostics/gradle-task-rerun.exit
else
  task_name='not identified or invalid in the main log; no task-only rerun'
  printf '%s\n' "$task_name" > diagnostics/gradle-task-rerun.log
  printf '125\n' > diagnostics/gradle-task-rerun.exit
fi

for rerun_log in diagnostics/gradle-config-rerun.log diagnostics/gradle-task-rerun.log diagnostics/node-calls.log; do
  if [[ -f "$rerun_log" ]]; then
    bash scripts/ci/analyze-failure.sh "$rerun_log" >> diagnostics/hints-reruns.txt 2>&1 || true
  fi
done

for file in android/settings.gradle android/build.gradle android/app/build.gradle android/gradle.properties app.json; do
  [[ -f "$file" ]] && cp --parents "$file" diagnostics/config-snapshot/ 2>/dev/null || true
done
if [[ -f android/build/reports/problems/problems-report.html ]]; then
  mkdir -p diagnostics/config-snapshot/android/build/reports/problems
  cp android/build/reports/problems/problems-report.html diagnostics/config-snapshot/android/build/reports/problems/
fi
npm ls --depth=0 > diagnostics/npm-ls-depth-0.txt 2>&1 || true

{
  printf '# Android release build report\n\n'
  printf '## Verdict\n\nBuild **FAILED** after %s attempt(s), exit code %s. Failing step: `assembleRelease`; task: `%s`.\n\n' "$attempt" "$build_code" "$task_name"
  printf '## Likely causes\n\n'
  cat diagnostics/hints-main.txt 2>/dev/null || true
  cat diagnostics/hints-reruns.txt 2>/dev/null || true
  printf '\n## Failing node commands\n\n'
  if [[ -f diagnostics/node-calls.log ]]; then
    awk '/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T/ { if (block ~ /exit=[1-9][0-9]*/) print block "\n"; block=$0; next } { block=block "\n" $0 } END { if (block ~ /exit=[1-9][0-9]*/) print block }' diagnostics/node-calls.log
  else printf 'No shim log was created.\n'; fi
  printf '\n## Preflight findings\n\n'
  if [[ -f diagnostics/preflight.md ]] && grep -Eq '\*\*(WARN|FAIL)\*\*' diagnostics/preflight.md; then
    grep -n -B 2 -A 65 -E '\*\*(WARN|FAIL)\*\*' diagnostics/preflight.md
  else printf 'No preflight warnings or failures.\n'; fi
  printf '\n## Config-only rerun result\n\n%s (exit %s). Last 40 lines:\n\n```text\n' "$([[ "$config_code" -eq 0 ]] && echo Passed || echo Failed)" "$config_code"
  tail -n 40 diagnostics/gradle-config-rerun.log
  printf '\n```\n\n## Task rerun result\n\n%s (exit %s). Last 40 lines:\n\n```text\n' "$([[ "$task_code" -eq 0 ]] && echo Passed || ([[ "$task_code" -eq 125 ]] && echo Skipped || echo Failed))" "$task_code"
  tail -n 40 diagnostics/gradle-task-rerun.log
  printf '\n```\n\n## Last 80 lines of the main Gradle log\n\n```text\n'
  tail -n 80 "$log"
  printf '\n```\n\n## Environment\n\n- Node: %s\n- Java: %s\n- Gradle: see P10 in `preflight.md`\n- Runner: %s %s\n' \
    "$(node -v 2>&1)" "$(java -version 2>&1 | sed -n '1p')" "${ImageOS:-unknown image}" "${ImageVersion:-}"
} > "$report"

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  awk '/^## Config-only rerun result/{exit} {print}' "$report" | head -c 750000 >> "$GITHUB_STEP_SUMMARY"
fi

exit "$build_code"
