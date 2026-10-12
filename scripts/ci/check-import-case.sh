#!/usr/bin/env bash
set -uo pipefail

python3 - <<'PY'
import os
import re
import subprocess
import sys

files = subprocess.check_output(["git", "ls-files"], text=True).splitlines()
tracked = set(files)
source_files = [p for p in files if p.startswith("src/") and p.endswith((".ts", ".tsx", ".js", ".jsx"))]
pattern = re.compile(r"(?:from\s*|import\s*(?:\(\s*)?)[\"']([^\"']+)[\"']")
extensions = ["", ".ts", ".tsx", ".js", ".jsx", ".json", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"]
issues = 0

for source in source_files:
    try:
        content = open(source, encoding="utf8").read()
    except OSError:
        continue
    for specifier in pattern.findall(content):
        if specifier.startswith(("./", "../")):
            base = os.path.normpath(os.path.join(os.path.dirname(source), specifier))
        elif specifier.startswith("@/"):
            base = os.path.normpath(os.path.join("src", specifier[2:]))
        else:
            continue
        candidates = [base + extension for extension in extensions]
        if any(candidate in tracked for candidate in candidates):
            continue
        folded = [path for path in tracked if path.lower() in {candidate.lower() for candidate in candidates}]
        if folded:
            print(f"{source}: {specifier} differs in case from tracked path {folded[0]}")
            issues += 1

print(f"Case mismatches: {issues}")
sys.exit(1 if issues else 0)
PY
