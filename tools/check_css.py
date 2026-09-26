#!/usr/bin/env python3
"""Fail if styling.css has unbalanced braces (a stray } silently drops the next rule)."""
import pathlib, re, sys
css = re.sub(r"/\*.*?\*/", "", (pathlib.Path(__file__).resolve().parent.parent / "styling.css").read_text(encoding="utf8"), flags=re.S)
depth = 0
for n, line in enumerate(css.split("\n"), 1):
    depth += line.count("{") - line.count("}")
    if depth < 0:
        sys.exit(f"styling.css: stray '}}' around line {n}")
if depth:
    sys.exit("styling.css: unclosed '{'")
print("styling.css braces OK")
