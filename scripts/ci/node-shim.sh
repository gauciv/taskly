#!/usr/bin/env bash
set -uo pipefail

real_node="$(command -v node || true)"
if [[ -z "$real_node" ]]; then
  echo "node executable not found" >&2
  exit 1
fi

workspace="${GITHUB_WORKSPACE:-$PWD}"
diagnostics="$workspace/diagnostics"
temp_root="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
shim_dir="$temp_root/node-shim"
mkdir -p "$shim_dir" "$diagnostics"
log_path="$diagnostics/node-calls.log"
printf -v quoted_node '%q' "$real_node"
printf -v quoted_log '%q' "$log_path"

cat > "$shim_dir/node" <<EOF
#!/usr/bin/env bash
set -uo pipefail
real_node=$quoted_node
log_path=$quoted_log
timestamp=\$(date -u +%Y-%m-%dT%H:%M:%SZ)
cwd=\$PWD
args=()
for arg in "\$@"; do
  printf -v quoted_arg '%q' "\$arg"
  args+=("\$quoted_arg")
done
stderr_file=\$(mktemp "\${TMPDIR:-/tmp}/taskly-node-stderr.XXXXXX")
"\$real_node" "\$@" 2>"\$stderr_file"
status=\$?
cat "\$stderr_file" >&2
{
  printf '%s cwd=%q argv=' "\$timestamp" "\$cwd"
  printf '%s ' "\${args[@]}"
  printf 'exit=%s\\n' "\$status"
  if [[ "\$status" -ne 0 ]]; then
    printf 'stderr:\\n'
    head -c 4000 "\$stderr_file"
    printf '\\n'
  fi
} >> "\$log_path"
rm -f "\$stderr_file"
exit "\$status"
EOF
chmod +x "$shim_dir/node"
printf '%s\n' "$shim_dir"
