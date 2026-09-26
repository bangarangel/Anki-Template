#!/bin/sh
# Re-inline furigana.js into front.html / back.html after editing it.
cd "$(dirname "$0")/.." || exit 1
for f in front back; do
  python3 - "$f.html" <<'PY'
import sys, re
p = sys.argv[1]
s = open(p, encoding="utf8").read()
js = open("furigana.js", encoding="utf8").read()
s = re.sub(r"<script>.*</script>", lambda m: "<script>\n" + js + "</script>", s, flags=re.S)
open(p, "w", encoding="utf8").write(s)
PY
done
