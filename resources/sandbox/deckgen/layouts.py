# -*- coding: utf-8 -*-
"""Declarative slide layouts for deckgen — the PRIMARY path.

Callers describe a deck as a list of slide dicts (an "outline") and hand it to
``build_deck``. Each dict has a ``type`` plus type-specific fields; the renderer
here maps it to themed shapes via `Deck`. This lets the model emit CONTENT, not
layout code, which is far more reliable and cheap.

Supported slide types (see SCHEMA_DOC for the field reference the model reads):
  title      — hero cover: title, subtitle, chips[], footnote
  section    — section divider: title, subtitle, number
  bullets    — heading + tagline + bullets[] (each {lead, body})
  two_column — heading + left{title,bullets[]} + right{title,bullets[]}
  cards      — heading + tagline + cards[] (each {title, body}) in a grid
  stats      — heading + stats[] (each {value, label}) big-number row
  quote      — large centered pull-quote + attribution
  comparison — heading + two labeled columns of rows (before/after etc.)
  image      — heading + a full-width image (path) + caption
  closing    — hero close: title, subtitle, cta, columns[] (each {title, items[]})
  bullets/…  — unknown types degrade to a titled bullets slide.
"""
from __future__ import annotations

from typing import Any, Dict, List

from .builder import Deck
from .themes import get_theme, theme_names  # noqa: F401 (re-exported)


# --------------------------------------------------------------------------
# Per-type renderers. Each takes (deck, slide, spec) and draws onto `slide`.
# --------------------------------------------------------------------------


def _hero_band(d: Deck, s, dark: bool):
    """Full-bleed hero background + left accent bar (for title/section/closing)."""
    d.rect(s, 0, 0, d.WIDTH_IN, d.HEIGHT_IN, "dark" if dark else "bg", radius=0)
    d.rect(s, 0, 0, 0.18, d.HEIGHT_IN, "primary", radius=0)


def _render_title(d: Deck, s, spec: Dict[str, Any]):
    dark = d.theme.hero_dark
    _hero_band(d, s, dark)
    ink = "on_dark" if dark else "ink"
    soft = "on_dark_soft" if dark else "ink_soft"
    img = spec.get("image")
    tx = 2.75 if img else 1.1
    if img:
        d.picture(s, img, 0.95, 2.15, height=1.5)
    if spec.get("kicker"):
        d.text(s, tx, 1.5, 10, 0.4, [[d.run(str(spec["kicker"]).upper(), 13, "primary", True)]],
               space_after=0)
    d.text(s, tx, 2.15, 10.2, 1.4, [[d.run(spec.get("title", "Untitled"), 60, ink, True)]],
           space_after=0)
    if spec.get("subtitle"):
        d.text(s, tx + 0.05, 3.5, 9.6, 1.2,
               [[d.run(spec["subtitle"], 20, soft)]], space_after=0, line_spacing=1.15)
    chips = spec.get("chips") or []
    cx = tx + 0.05
    for i, label in enumerate(chips):
        d.chip(s, cx, 4.75, str(label), d.theme.accent(i), w=1.6)
        cx += 1.75
    if spec.get("footnote"):
        d.text(s, tx + 0.05, 6.3, 10, 0.5, [[d.run(spec["footnote"], 13, "faint" if not dark else "on_dark_soft")]],
               space_after=0)


def _render_section(d: Deck, s, spec: Dict[str, Any]):
    dark = d.theme.hero_dark
    _hero_band(d, s, dark)
    ink = "on_dark" if dark else "ink"
    soft = "on_dark_soft" if dark else "ink_soft"
    num = spec.get("number")
    if num is not None:
        d.text(s, 1.1, 2.1, 3, 1.6, [[d.run(str(num), 120, "primary", True)]], space_after=0)
    left = 3.4 if num is not None else 1.1
    d.text(s, left, 2.7, 12.5 - left, 1.2, [[d.run(spec.get("title", "Section"), 44, ink, True)]],
           space_after=0)
    if spec.get("subtitle"):
        d.text(s, left, 3.9, 12.5 - left, 1.0, [[d.run(spec["subtitle"], 18, soft)]],
               space_after=0, line_spacing=1.15)


def _render_bullets(d: Deck, s, spec: Dict[str, Any]):
    d.header(s, spec.get("title", ""), kicker=spec.get("kicker"))
    y = 2.0
    if spec.get("tagline"):
        d.text(s, 0.7, 1.75, 11.9, 0.6, [[d.run(spec["tagline"], 15, "ink_soft")]],
               space_after=0, line_spacing=1.15)
        y = 2.7
    bullets = _norm_bullets(spec.get("bullets"))
    step = min(0.92, (6.6 - y) / max(len(bullets), 1))
    for b in bullets:
        d.bullet(s, 0.72, y, 11.6, b["lead"], b.get("body", ""))
        y += step
    d.footer(s, spec.get("footer"))


def _render_two_column(d: Deck, s, spec: Dict[str, Any]):
    d.header(s, spec.get("title", ""), kicker=spec.get("kicker"))
    cols = [spec.get("left") or {}, spec.get("right") or {}]
    xs = [0.7, 6.95]
    for ci, col in enumerate(cols):
        x = xs[ci]
        kcolor = d.theme.accent(ci)
        if col.get("title"):
            d.text(s, x, 1.85, 5.6, 0.5, [[d.run(col["title"], 17, kcolor, True)]], space_after=0)
        y = 2.5
        bl = _norm_bullets(col.get("bullets"))
        for b in bl:
            d.bullet(s, x + 0.02, y, 5.3, b["lead"], b.get("body", ""), kcolor=kcolor, size=13)
            y += 0.82
    d.footer(s, spec.get("footer"))


def _render_cards(d: Deck, s, spec: Dict[str, Any]):
    d.header(s, spec.get("title", ""), kicker=spec.get("kicker"))
    cards = spec.get("cards") or []
    gy = 2.45
    if spec.get("tagline"):
        d.text(s, 0.7, 1.75, 12, 0.5, [[d.run(spec["tagline"], 14, "ink_soft")]], space_after=0)
    cw, ch, gap = 3.85, 1.95, 0.22
    per_row = 3 if len(cards) > 4 else max(1, min(len(cards), 3))
    if len(cards) == 4:
        per_row = 2
        cw = 5.95
    for i, cd in enumerate(cards[:9]):
        col = i % per_row
        row = i // per_row
        x = 0.7 + col * (cw + gap)
        y = gy + row * (ch + gap)
        color = d.theme.accent(i)
        d.rect(s, x, y, cw, ch, "card", "card_line", 1.0)
        d.rect(s, x, y, cw, 0.12, color, radius=0)
        d.rect(s, x + 0.28, y + 0.38, 0.5, 0.5, color, radius=0.3)
        d.text(s, x + 0.28, y + 1.0, cw - 0.5, 0.4, [[d.run(cd.get("title", ""), 16, "ink", True)]],
               space_after=0)
        if cd.get("body"):
            d.text(s, x + 0.28, y + 1.38, cw - 0.5, 0.5, [[d.run(cd["body"], 11.5, "ink_soft")]],
                   space_after=0, line_spacing=1.05)
    d.footer(s, spec.get("footer"))


def _render_stats(d: Deck, s, spec: Dict[str, Any]):
    d.header(s, spec.get("title", ""), kicker=spec.get("kicker"))
    if spec.get("tagline"):
        d.text(s, 0.7, 1.75, 12, 0.5, [[d.run(spec["tagline"], 14, "ink_soft")]], space_after=0)
    stats = spec.get("stats") or []
    n = max(1, min(len(stats), 4))
    total_w = 11.95
    gap = 0.3
    cw = (total_w - gap * (n - 1)) / n
    y = 2.9
    for i, st in enumerate(stats[:4]):
        x = 0.7 + i * (cw + gap)
        color = d.theme.accent(i)
        d.rect(s, x, y, cw, 2.3, "card", "card_line", 1.0)
        d.text(s, x, y + 0.4, cw, 1.0, [[d.run(str(st.get("value", "")), 52, color, True)]],
               align="center", space_after=0)
        d.text(s, x, y + 1.55, cw, 0.6, [[d.run(str(st.get("label", "")), 13, "ink_soft")]],
               align="center", space_after=0, line_spacing=1.05)
    d.footer(s, spec.get("footer"))


def _render_quote(d: Deck, s, spec: Dict[str, Any]):
    dark = d.theme.hero_dark
    _hero_band(d, s, dark)
    ink = "on_dark" if dark else "ink"
    soft = "on_dark_soft" if dark else "muted"
    d.text(s, 1.4, 0.9, 2, 1.5, [[d.run("“", 120, "primary", True)]], space_after=0)
    d.text(s, 1.5, 2.4, 10.3, 2.6, [[d.run(spec.get("quote", ""), 30, ink, True)]],
           space_after=0, line_spacing=1.2)
    if spec.get("attribution"):
        d.text(s, 1.5, 5.6, 10.3, 0.6, [[d.run("— " + str(spec["attribution"]), 16, soft)]],
               space_after=0)


def _render_comparison(d: Deck, s, spec: Dict[str, Any]):
    d.header(s, spec.get("title", ""), kicker=spec.get("kicker"))
    cols = spec.get("columns") or []
    xs = [0.7, 6.95]
    for ci, col in enumerate(cols[:2]):
        x = xs[ci]
        color = d.theme.accent(ci)
        d.rect(s, x, 1.9, 5.65, 4.7, "card", "card_line", 1.0)
        d.rect(s, x, 1.9, 5.65, 0.6, color, radius=0.05)
        d.text(s, x + 0.3, 1.98, 5.05, 0.45, [[d.run(col.get("title", ""), 15, "white", True)]],
               space_after=0)
        y = 2.75
        for row in (col.get("rows") or [])[:7]:
            d.rect(s, x + 0.3, y + 0.05, 0.12, 0.12, color, radius=0.5)
            d.text(s, x + 0.6, y, 4.8, 0.5, [[d.run(str(row), 12.5, "ink_soft")]],
                   space_after=0, line_spacing=1.05)
            y += 0.54
    d.footer(s, spec.get("footer"))


def _render_image(d: Deck, s, spec: Dict[str, Any]):
    d.header(s, spec.get("title", ""), kicker=spec.get("kicker"))
    path = spec.get("image") or spec.get("path")
    if path:
        # Center a max 11.9 x 4.4 image area under the header.
        pic = d.picture(s, path, 0.7, 1.9, w=11.9)
        # If it overflowed vertically, python-pptx keeps aspect on width; fine.
    if spec.get("caption"):
        d.text(s, 0.7, 6.5, 11.9, 0.4, [[d.run(spec["caption"], 12, "muted")]],
               align="center", space_after=0)
    d.footer(s, spec.get("footer"))


def _render_closing(d: Deck, s, spec: Dict[str, Any]):
    dark = d.theme.hero_dark
    _hero_band(d, s, dark)
    ink = "on_dark" if dark else "ink"
    soft = "on_dark_soft" if dark else "ink_soft"
    if spec.get("kicker"):
        d.text(s, 0.95, 0.85, 11, 0.5, [[d.run(str(spec["kicker"]).upper(), 13, "primary", True)]],
               space_after=0)
    d.text(s, 0.95, 1.35, 11.5, 1.2, [[d.run(spec.get("title", "Thank you"), 40, ink, True)]],
           space_after=0)
    cols = spec.get("columns") or []
    xs = [0.95, 6.9]
    for ci, col in enumerate(cols[:2]):
        x = xs[ci]
        color = d.theme.accent(ci)
        d.text(s, x, 2.85, 5.6, 0.4, [[d.run(col.get("title", ""), 16, color, True)]], space_after=0)
        y = 3.35
        for it in (col.get("items") or [])[:5]:
            d.rect(s, x + 0.03, y + 0.07, 0.13, 0.13, color, radius=0.5)
            d.text(s, x + 0.35, y, 5.2, 0.4, [[d.run(str(it), 14, soft)]], space_after=0)
            y += 0.62
    if spec.get("cta"):
        d.rect(s, 0.95, 6.05, 11.4, 0.9, "dark_card" if dark else "card", radius=0.12)
        d.text(s, 0.95, 6.2, 11.4, 0.6, [[d.run(spec["cta"], 15, ink, True)]],
               align="center", anchor="middle", space_after=0)


_RENDERERS = {
    "title": _render_title,
    "cover": _render_title,
    "section": _render_section,
    "divider": _render_section,
    "bullets": _render_bullets,
    "bullet": _render_bullets,
    "content": _render_bullets,
    "two_column": _render_two_column,
    "two-column": _render_two_column,
    "columns": _render_two_column,
    "cards": _render_cards,
    "grid": _render_cards,
    "stats": _render_stats,
    "stat_row": _render_stats,
    "metrics": _render_stats,
    "quote": _render_quote,
    "comparison": _render_comparison,
    "vs": _render_comparison,
    "image": _render_image,
    "closing": _render_closing,
    "close": _render_closing,
    "thanks": _render_closing,
}


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------


def _norm_bullets(raw) -> List[Dict[str, str]]:
    """Accept bullets as a list of strings OR {lead, body} dicts; normalize to
    {lead, body}. A plain string with ' — ' or ': ' is split into lead/body."""
    out: List[Dict[str, str]] = []
    for item in raw or []:
        if isinstance(item, dict):
            out.append({"lead": str(item.get("lead", "")), "body": str(item.get("body", ""))})
        else:
            text = str(item)
            for sep in (" — ", " - ", ": "):
                if sep in text:
                    lead, body = text.split(sep, 1)
                    out.append({"lead": lead.strip(), "body": body.strip()})
                    break
            else:
                out.append({"lead": text, "body": ""})
    return out


# --------------------------------------------------------------------------
# public builder
# --------------------------------------------------------------------------


def build_deck(outline: List[Dict[str, Any]], theme="corporate", out: str = "deck.pptx"):
    """Build a .pptx from a declarative outline.

    Args:
        outline: list of slide-spec dicts, each with a ``type`` key (see module
            docstring / SCHEMA_DOC). Unknown types degrade to a bullets slide.
        theme: a builtin theme name (see deckgen.theme_names()) or a Theme.
        out: output file path (relative to the sandbox working dir).

    Returns:
        (abs_path, slide_count).
    """
    if not isinstance(outline, list) or not outline:
        raise ValueError("outline must be a non-empty list of slide dicts")
    d = Deck(theme=theme)
    for spec in outline:
        if not isinstance(spec, dict):
            continue
        stype = str(spec.get("type", "bullets")).strip().lower()
        renderer = _RENDERERS.get(stype, _render_bullets)
        # Hero types own their own background; content types use the theme bg.
        hero = renderer in (_render_title, _render_section, _render_quote, _render_closing)
        s = d.new_slide()
        if not hero:
            # content slides already got the bg from new_slide(); nothing extra.
            pass
        renderer(d, s, spec)
    return d.save(out)


SCHEMA_DOC = """deckgen outline schema — a list of slide dicts. Common fields:
  {"type":"title","title":..,"subtitle":..,"kicker":..,"chips":[..],"footnote":..,"image":path?}
  {"type":"section","number":1,"title":..,"subtitle":..}
  {"type":"bullets","title":..,"kicker":..,"tagline":..,
     "bullets":[{"lead":"Bold part","body":"rest"} | "Lead — body", ..]}
  {"type":"two_column","title":..,"left":{"title":..,"bullets":[..]},"right":{...}}
  {"type":"cards","title":..,"tagline":..,"cards":[{"title":..,"body":..}, ..up to 9]}
  {"type":"stats","title":..,"stats":[{"value":"98%","label":".."}, ..up to 4]}
  {"type":"quote","quote":..,"attribution":..}
  {"type":"comparison","title":..,"columns":[{"title":"Before","rows":[..]},{"title":"After","rows":[..]}]}
  {"type":"image","title":..,"image":path,"caption":..}
  {"type":"closing","title":..,"kicker":..,"columns":[{"title":..,"items":[..]}],"cta":".."}
Every slide type accepts an optional "footer" note. Bullets accept strings or
{lead,body} dicts. Pick a theme from deckgen.theme_names()."""
