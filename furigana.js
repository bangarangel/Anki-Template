/* ============================================================
   FURIGANA ALIGNER
   Paste this <script> block at the bottom of BOTH Front and Back
   templates (the copies in front.html / back.html are identical).

   Why: Anki's {{furigana:}} filter puts a reading over EVERYTHING
   back to the previous space. 「今日は良い天気[てんき]」 becomes one
   <ruby> whose base is 今日は良い天気, so てんき floats over the
   middle of the phrase instead of over 天気. This script re-splits
   every ruby so each reading sits over its own kanji:
     今日は良い天気[てんき]  ->  今日は良い 天気(てんき)
     食べる[たべる]         ->  食(た)べる
     引き出し[ひきだし]      ->  引(ひ)き出(だ)し
   ============================================================ */
(function () {
  var KANJI = /^(?:[㐀-䶿一-鿿豈-﫿々-〇ヵヶ0-9０-９]|[\ud840-\ud87f][\udc00-\udfff])$/;

  function toHira(s) {
    return s.replace(/[ァ-ヶ]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0x60);
    });
  }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  // Characters, keeping surrogate pairs (rare kanji) together.
  function chars_(text) { return text.match(/[\ud800-\udbff][\udc00-\udfff]|[\s\S]/g) || []; }

  // Split text into alternating runs of kanji / non-kanji.
  function segments(text) {
    var out = [], cur = null;
    chars_(text).forEach(function (ch) {
      var k = KANJI.test(ch);
      if (!cur || cur.k !== k) { cur = { k: k, t: "" }; out.push(cur); }
      cur.t += ch;
    });
    return out;
  }

  // Match reading against segs (kana runs must appear literally).
  // Returns one reading per kanji run, sliced from the original reading
  // so katakana readings are preserved, or null if it doesn't fit.
  function align(segs, reading) {
    var re = "^";
    segs.forEach(function (s) { re += s.k ? "(.+?)" : escRe(toHira(s.t)); });
    var m = new RegExp(re + "$").exec(toHira(reading));
    if (!m) return null;
    var parts = [], pos = 0, g = 1;
    segs.forEach(function (s) {
      if (s.k) { parts.push(reading.substr(pos, m[g].length)); pos += m[g++].length; }
      else pos += s.t.length;
    });
    return parts;
  }

  // Readings are rebuilt as plain spans instead of <ruby>/<rt>:
  //   <span class="jfg-rb"><span class="jfg-rt">かんじ</span>漢字</span>
  // .jfg-rb is an inline-block with the reading stacked on top as a block, so
  // layout uses only basic CSS and is the same in every Anki webview
  // (native ruby, and absolute positioning, rendered wrongly in some).
  function span(cls) {
    var e = document.createElement("span");
    e.className = cls;
    return e;
  }
  function rubyEl(base, reading) {
    var rb = span("jfg-rb"), rt = span("jfg-rt");
    rt.textContent = reading;
    rb.appendChild(rt);
    rb.appendChild(document.createTextNode(base));
    return rb;
  }

  // Rubies we don't re-split (nested markup, several readings) are converted
  // pair by pair, base + reading, and still get the .jfg-word hover/tap hook.
  function wrap(ruby) {
    var g = span("jfg-word"), cur = span("jfg-rb");
    Array.prototype.slice.call(ruby.childNodes).forEach(function (n) {
      if (n.nodeName === "RP") return;
      if (n.nodeName === "RT") {
        var rt = span("jfg-rt");
        while (n.firstChild) rt.appendChild(n.firstChild);
        cur.insertBefore(rt, cur.firstChild);
        g.appendChild(cur);
        cur = span("jfg-rb");
      } else if (n.nodeName === "RB") {
        while (n.firstChild) cur.appendChild(n.firstChild);
      } else {
        cur.appendChild(n);
      }
    });
    if (cur.firstChild) g.appendChild(cur);
    ruby.parentNode.replaceChild(g, ruby);
  }

  function fix(ruby) {
    var rts = ruby.getElementsByTagName("rt");
    if (rts.length !== 1 ||                                         // several readings: keep as is
        ruby.querySelector("*:not(rt):not(rb):not(rp)")) return wrap(ruby);  // nested markup
    var reading = rts[0].textContent.trim();
    var base = "";
    for (var n = ruby.firstChild; n; n = n.nextSibling) {
      if (n.nodeName !== "RT" && n.nodeName !== "RP") base += n.textContent;
    }
    base = base.trim();
    var segs = segments(base);
    if (!reading || !segs.some(function (s) { return s.k; })) return wrap(ruby);

    // Try the whole base, then drop leading text until the reading fits.
    // A suffix may start at a kanji run or at an honorific お/ご
    // (。お茶[おちゃ] -> 。 + お茶); never at other kana, so 私は花[はな]
    // stays 花(はな) rather than は + 花(な). Longest fit wins.
    var chars = chars_(base), parts = null, cut = 0;
    for (var i = 0; i < chars.length && !parts; i++) {
      var k = KANJI.test(chars[i]);
      if (i > 0 && !(k ? !KANJI.test(chars[i - 1]) : "おご".indexOf(chars[i]) >= 0)) continue;
      parts = align(segments(chars.slice(i).join("")), reading);
      if (parts) cut = i;
    }
    var prefix = chars.slice(0, cut).join("");
    if (parts) segs = segments(chars.slice(cut).join(""));

    var group = document.createElement("span");
    group.className = "jfg-word";
    var frag = document.createDocumentFragment();

    if (parts) {
      if (prefix) frag.appendChild(document.createTextNode(prefix));
      var p = 0;
      segs.forEach(function (s) {
        group.appendChild(s.k ? rubyEl(s.t, parts[p++]) : document.createTextNode(s.t));
      });
      frag.appendChild(group);
    } else {
      // Nothing aligned: put the reading over first..last kanji only.
      var first = -1, last = -1;
      segs.forEach(function (s, idx) { if (s.k) { if (first < 0) first = idx; last = idx; } });
      var join = function (a, b) { return segs.slice(a, b).map(function (s) { return s.t; }).join(""); };
      if (first > 0) frag.appendChild(document.createTextNode(join(0, first)));
      group.appendChild(rubyEl(join(first, last + 1), reading));
      frag.appendChild(group);
      if (last < segs.length - 1) frag.appendChild(document.createTextNode(join(last + 1, segs.length)));
    }
    ruby.parentNode.replaceChild(frag, ruby);
  }

  var shells = document.querySelectorAll(".card-shell:not([data-jfg])");
  Array.prototype.forEach.call(shells, function (shell) {
    shell.setAttribute("data-jfg", "5");
    var hero = shell.querySelector(".hero");
    var heroBefore = hero ? hero.innerHTML : "";
    var found = shell.querySelectorAll("ruby").length;
    Array.prototype.forEach.call(shell.querySelectorAll(".metadata"), function (m) {
      if (!m.textContent.trim() && !m.querySelector("img")) m.style.display = "none";
    });
    Array.prototype.slice.call(shell.querySelectorAll("ruby")).forEach(function (r) {
      try { fix(r); } catch (e) { if (r.parentNode) wrap(r); }       // one bad ruby never breaks the card
    });

    // Tap a word to toggle its reading (touch devices / click).
    shell.addEventListener("click", function (e) {
      var g = e.target.closest && e.target.closest(".jfg-word");
      if (g && shell.classList.contains("front")) g.classList.toggle("on");
    });

    // TEMPORARY diagnostics (front only): remove the jfg-debug div from
    // front.html once furigana renders correctly.
    var dbg = shell.querySelector(".jfg-debug");
    if (dbg) {
      var cs = function (el, props) {
        if (!el) return "none";
        var c = getComputedStyle(el);
        return props.map(function (p) { return p + "=" + c.getPropertyValue(p); }).join(" ");
      };
      var sheets = Array.prototype.map.call(document.styleSheets, function (sh) {
        var n = "?";
        try { n = sh.cssRules.length; } catch (e) {}
        return (sh.href ? sh.href.split("/").pop() : "inline") + "(" + n + ")";
      });
      dbg.textContent = [
        "jfg v5 · ruby found " + found + " · converted " + shell.querySelectorAll(".jfg-rb").length +
          " · left " + shell.querySelectorAll("ruby").length + " · " + ((navigator.userAgent.match(/Chrome\/[\d.]+/) || [""])[0]),
        "hero: " + cs(hero, ["font-family", "font-weight", "font-size", "line-height"]),
        "rb: " + cs(shell.querySelector(".jfg-rb"), ["display", "position", "line-height", "vertical-align"]),
        "rt: " + cs(shell.querySelector(".jfg-rt"), ["display", "position", "font-size", "margin-bottom", "transform"]),
        "css: " + sheets.join(" "),
        "html: " + heroBefore.replace(/\s+/g, " ").slice(0, 300)
      ].join("\n");
    }

    // ふりがな button: reveal / hide every reading.
    var btn = shell.querySelector(".jfg-toggle");
    if (btn) btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var on = shell.classList.toggle("jfg-all");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  });
})();
