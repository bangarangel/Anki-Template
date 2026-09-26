# Anki Japanese sentence card

Front / back templates and styling for a Japanese sentence note type
(fields: `Word`, `Sentence`, `Pitch`, `Audio`, `Sentence Translation`,
`Jlab-Remarks`, `Image`, `Source`, `References`, `Other-Back`).

| File | Paste into (Tools → Manage Note Types → Cards…) |
|---|---|
| `front.html` | Front Template |
| `back.html` | Back Template |
| `styling.css` | Styling |

## Furigana

**Front:** hover over a word (tap it on a phone) to see its reading. The
**ふりがな** button shows every reading. To go back to "hover anywhere on the
card to show all", set `data-reveal="card"` at the top of `front.html`.
**Back:** readings are always shown.

### Why readings used to drift off the kanji

Anki's `{{furigana:}}` filter puts a reading over everything back to the
previous **space**. So `今日は良い天気[てんき]` gets てんき centred over the
whole of 今日は良い天気. The `<script>` at the bottom of both templates
(source: `furigana.js`) splits each reading again so it sits over its own kanji:

| Field text | Before | After |
|---|---|---|
| `今日は良い天気[てんき]` | reading over 今日は良い天気 | 今日は良い 天気(てんき) |
| `食べる[たべる]` | over 食べる | 食(た)べる |
| `引き出し[ひきだし]` | over 引き出し | 引(ひ)き出(だ)し |
| `。お茶[おちゃ]` | over 。お茶 | 。お 茶(ちゃ) |

**What it can't fix:** a run of kanji with no kana between them, e.g.
`昨日駅前[えきまえ]`. From the text alone there's no telling that the reading
belongs to 駅前 and not to 昨日駅前. Put a space before the word in the
field: `昨日 駅前[えきまえ]`. (The space doesn't show on the card.)

If your `Sentence` field already holds `<ruby>` HTML, change
`{{furigana:Sentence}}` to `{{Sentence}}` in both templates. The script fixes
those rubies too.

## Other notes
- Bold the target word in `Sentence` to highlight it in coral.
- Audio is hidden but still autoplays. To show the replay button, set
  `.audio { display: block; }` in `styling.css`.
- Night mode is supported (desktop, AnkiMobile, AnkiDroid).

## Development
- `furigana.js` is the source of the script. After editing it, run `tools/build.sh`
  to copy it back into both templates.
- `python3 tools/preview.py [--night]` writes sample cards to `preview/` so
  you can open them in a browser.
