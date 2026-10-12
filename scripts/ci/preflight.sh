#!/usr/bin/env bash
set -uo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"
mkdir -p diagnostics
report="$root/diagnostics/preflight.md"
summary_file="${GITHUB_STEP_SUMMARY:-}"
failures=0
warnings=0
rows="$(mktemp)"
dry="${PREFLIGHT_DRY:-0}"

printf '# Preflight findings\n\n' > "$report"

record_probe() {
  local id="$1" title="$2" command_text="$3" failure_status="${4:-WARN}" output_file code status
  output_file="$(mktemp)"
  if [[ "$dry" == 1 ]]; then
    printf 'SKIP: PREFLIGHT_DRY=1 (would run: %s)\n' "$command_text" > "$output_file"
    code=0
    status=SKIP
  else
    bash -o pipefail -c "$command_text" > "$output_file" 2>&1
    code=$?
    status=OK
    if [[ "$code" -ne 0 ]]; then status="$failure_status"; fi
  fi

  case "$status" in
    FAIL) failures=$((failures + 1));;
    WARN) warnings=$((warnings + 1));;
  esac
  printf '| %s | %s | %s | %s |\n' "$id" "$title" "$status" "$code" >> "$rows"
  {
    printf '## %s — %s\n\n- Status: **%s**\n- Command: `%s`\n- Exit code: `%s`\n\n```text\n' "$id" "$title" "$status" "$command_text" "$code"
    if [[ "$id" == P8 ]]; then tail -n 80 "$output_file"; else sed -n '1,60p' "$output_file"; fi
    printf '\n```\n\n'
  } >> "$report"
  rm -f "$output_file"
}

record_probe P1 'Toolchain' 'ok=1; node -v || ok=0; npm -v || ok=0; java -version || ok=0; printf "ANDROID_HOME=%s\\n" "${ANDROID_HOME:-}"; if [[ -n "${ANDROID_HOME:-}" ]]; then ls -1 "$ANDROID_HOME/ndk" || ok=0; else echo "ANDROID_HOME is unset"; ok=0; fi; df -h . || ok=0; free -m || ok=0; nproc || ok=0; (( ok == 1 ))'
record_probe P2 'Node vs package engines' 'node <<'\''NODE'\''
const fs = require("node:fs");
let semver;
try { semver = require("semver"); } catch (firstError) {
  try { semver = require(require.resolve("semver", { paths: [process.cwd()] })); } catch (secondError) {
    console.log(`semver unavailable: ${firstError.message}; ${secondError.message}`);
  }
}
const names = ["expo", "react-native", "@expo/cli", "expo-modules-autolinking", "@react-native/gradle-plugin"];
let mismatch = false;
for (const name of names) {
  try {
    const pkgPath = require.resolve(`${name}/package.json`);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const range = pkg.engines?.node;
    if (!range) { console.log(`${name}: no engines.node`); continue; }
    const ok = semver ? semver.satisfies(process.versions.node, range) : null;
    console.log(`${name}: node ${process.versions.node}, engines.node ${range}${ok === null ? " (raw range only; semver unavailable)" : ok ? " (OK)" : " (MISMATCH)"}`);
    if (ok === false) mismatch = true;
  } catch (error) { console.log(`${name}: SKIP (${error.message})`); }
}
process.exitCode = mismatch ? 1 : 0;
NODE'
record_probe P3 'Expo config' 'jq empty app.json && npx expo config --type public && jq -r "[.expo.version, (.expo.android.versionCode // \"unset\"), .expo.android.package] | @tsv" app.json' FAIL
record_probe P4 'Expo version alignment' 'npx expo install --check; install_code=$?; npx expo-doctor; doctor_code=$?; (( install_code == 0 && doctor_code == 0 ))'
record_probe P5 'Duplicate/mismatched packages' 'npm ls react react-native react-native-reanimated react-native-worklets expo --all 2>&1 | sed -n "1,80p"; tree_code=$?; react_versions=$(npm ls react --all 2>/dev/null | grep -Eo "react@[0-9][^ ]*" | sort -u | wc -l); native_versions=$(npm ls react-native --all 2>/dev/null | grep -Eo "react-native@[0-9][^ ]*" | sort -u | wc -l); echo "npm ls exit: $tree_code"; echo "Distinct react versions: $react_versions"; echo "Distinct react-native versions: $native_versions"; [[ "$tree_code" -eq 0 && "$react_versions" -le 1 && "$native_versions" -le 1 ]]'

if [[ "$dry" == 1 ]]; then
  for id in P6 P7 P8 P9 P10 P11 P12; do record_probe "$id" 'Dry mode' 'CI probes intentionally skipped locally' SKIP; done
else
  record_probe P6 'Gradle-run Node commands' 'ok=1; printf "Gradle node/npx references:\\n"; grep -nEi "node|npx" android/settings.gradle android/build.gradle android/app/build.gradle || true; for dir in android "$PWD"; do echo "--- cwd=$dir ---"; (cd "$dir" && node --print "require.resolve('\''react-native/package.json'\'')" && node --print "require.resolve('\''@react-native/gradle-plugin/package.json'\'', { paths: [require.resolve('\''react-native/package.json'\'')] })" && node --print "require.resolve('\''@react-native/codegen/package.json'\'', { paths: [require.resolve('\''react-native/package.json'\'')] })" && node --print "require.resolve('\''@expo/cli'\'', { paths: [require.resolve('\''expo/package.json'\'')] })" && node --print "require.resolve('\''expo-modules-autolinking/package.json'\'', { paths: [require.resolve('\''expo/package.json'\'')] })") || ok=0; done; node -e "require('\''expo/scripts/resolveAppEntry'\'')" "$PWD" android absolute || ok=0; (( ok == 1 ))' FAIL
  record_probe P7 'Expo autolinking commands' 'ok=1; npx expo-modules-autolinking --help 2>&1 | sed -n "1,30p" || ok=0; for command in "resolve --platform android --json" "react-native-config --json --platform android"; do echo "--- $command ---"; output=$(mktemp); npx expo-modules-autolinking $command >"$output" 2>&1; rc=$?; head -c 3000 "$output"; echo; echo "exit=$rc"; rm -f "$output"; [[ "$rc" -eq 0 ]] || ok=0; done; (( ok == 1 ))' FAIL
  probe_export="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/export-probe"
  record_probe P8 'Production JS bundle' 'timeout 600 npx expo export --platform android --output-dir "'"$probe_export"'"' FAIL
  record_probe P9 'Network reachability' 'ok=1; for url in https://plugins.gradle.org/m2/ https://plugins-artifacts.gradle.org/ https://services.gradle.org/ https://dl.google.com/dl/android/maven2/com/android/tools/build/gradle/maven-metadata.xml https://repo.maven.apache.org/maven2/ https://jitpack.io/; do code=$(curl --max-time 10 -sS -o /dev/null -w "%{http_code}" "$url"); rc=$?; echo "$url -> HTTP ${code:-000}, curl exit $rc"; [[ "$rc" -eq 0 && "$code" =~ ^[23] ]] || ok=0; done; (( ok == 1 ))'
  record_probe P10 'Gradle project files' 'for file in android/gradle.properties android/gradle/wrapper/gradle-wrapper.properties; do echo "--- $file ---"; sed -n "1,100p" "$file"; done; cd android && bash ./gradlew --version' FAIL
  record_probe P11 'Case-sensitive source imports' 'bash scripts/ci/check-import-case.sh'
  record_probe P12 'Git state' 'git status --short | head; git describe --tags --always; git rev-parse HEAD'
fi

printf '# Preflight summary\n\n| Probe | Name | Status | Exit |\n|---|---|---:|---:|\n' >> "$report"
cat "$rows" >> "$report"
printf '\nPREFLIGHT: %d FAIL, %d WARN\n' "$failures" "$warnings" | tee -a "$report"
if [[ -n "$summary_file" ]]; then
  { printf '### Android build preflight\n\n'; cat "$rows"; printf '\nPREFLIGHT: %d FAIL, %d WARN\n' "$failures" "$warnings"; } | head -c 750000 >> "$summary_file"
fi
rm -f "$rows"
exit 0
