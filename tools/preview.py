#!/usr/bin/env python3
"""Render front.html/back.html + styling.css with sample notes into
preview/*.html, emulating Anki's field substitution and {{furigana:}} filter.
Usage: python3 tools/preview.py [--night]"""
import html, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
NOTES = {
    "sentence": {
        "Word": "天気[てんき]",
        "Sentence": "今日は良い<b>天気[てんき]</b>ですね。昨日駅前[えきまえ]で美味しい料理[りょうり]を食べました[たべました]。お茶[おちゃ]と引き出し[ひきだし]、3月[さんがつ]。",
        "Pitch": "てんき ＼ 1",
        "Sentence Translation": "Nice <b>weather</b> today, isn't it? I carried the drawer to the station.",
        "Jlab-Remarks": "天気 = weather. ね softens the statement and seeks agreement.",
        "Source": "Jlab beginner course",
        "References": "",
        "Audio": "",
    },
    "word": {"Word": "食べ物[たべもの]", "Sentence": "", "Pitch": "たべもの ￣ 0"},
}


def furigana(text):
    # Same regex Anki uses (rslib/src/template_filters.rs)
    return re.sub(r" ?([^ >]+?)\[(.+?)\]", r"<ruby><rb>\1</rb><rt>\2</rt></ruby>", text)


def render(tpl, fields):
    def section(m):
        neg, name, body = m.group(1) == "^", m.group(2), m.group(3)
        filled = bool(fields.get(name, "").strip())
        return body if filled != neg else ""
    prev = None
    while prev != tpl:
        prev = tpl
        tpl = re.sub(r"\{\{([#^])([^}]+)\}\}((?:(?!\{\{[#^]).)*?)\{\{/\2\}\}", section, tpl, flags=re.S)
    tpl = re.sub(r"\{\{furigana:([^}]+)\}\}", lambda m: furigana(fields.get(m.group(1), "")), tpl)
    return re.sub(r"\{\{([^}#^/]+)\}\}", lambda m: fields.get(m.group(1), ""), tpl)


def main():
    night = "--night" in sys.argv
    css = (ROOT / "styling.css").read_text()
    out = ROOT / "preview"
    out.mkdir(exist_ok=True)
    for name, fields in NOTES.items():
        for side in ("front", "back"):
            body = render((ROOT / f"{side}.html").read_text(), fields)
            cls = "card nightMode" if night else "card"
            page = (f'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
                    f"<style>{css}</style><body class=\"{cls}\"><div id=\"qa\">{body}</div></body>")
            (out / f"{name}-{side}{'-night' if night else ''}.html").write_text(page)
    print("wrote", out)


if __name__ == "__main__":
    main()
