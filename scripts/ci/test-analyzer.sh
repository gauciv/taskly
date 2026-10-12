#!/usr/bin/env bash
set -uo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
analyzer="$root/scripts/ci/analyze-failure.sh"
fixtures="$root/scripts/ci/fixtures"
passed=0
failed=0

for fixture in "$fixtures"/*.log; do
  [[ -f "$fixture" ]] || continue
  code="$(basename "$fixture" .log)"
  output="$(bash "$analyzer" "$fixture")"
  if grep -q "^HINT ${code}:" <<< "$output"; then
    printf 'PASS %s\n' "$code"
    passed=$((passed + 1))
  else
    printf 'FAIL %s\n' "$code"
    failed=$((failed + 1))
  fi
done

printf 'Analyzer fixtures: %d passed, %d failed\n' "$passed" "$failed"
[[ "$failed" -eq 0 && "$passed" -gt 0 ]]
