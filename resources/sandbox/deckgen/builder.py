# -*- coding: utf-8 -*-
"""Low-level slide-building toolkit for deckgen.

`Deck` wraps a python-pptx Presentation at 16:9 and exposes reusable primitives —
themed rectangles, text blocks, chips, headers, footers, card grids — so callers
(and the declarative layout layer in `layouts.py`) never touch raw EMU math or
XML. This is the ESCAPE HATCH: build_deck() covers the common slide types, but if
you need a bespoke layout you can drive `Deck` directly:

    from deckgen import Deck
    d = Deck(theme="midnight")
    s = d.new_slide()
    d.header(s, "Custom slide", kicker="Section 2")
    d.text(s, 0.7, 2.0, 11.9, 1.0, [[d.run("Hello", 24, bold=True)]])
    d.save("out.pptx")
"""
from __future__ import annotations

from typing import List, Optional, Sequence, Tuple

from .themes import Theme, get_theme

# python-pptx is imported lazily inside methods so `import deckgen` succeeds for
# introspection (e.g. list_themes) even before `pip install python-pptx`.


# A "run" tuple: (text, size_pt, color_key_or_RGB, bold, font_name_or_None)
Run = Tuple[str, float, object, bool, object]


class Deck:
    """A 16:9 presentation under construction, themed."""

    WIDTH_IN = 13.333
    HEIGHT_IN = 7.5

    def __init__(self, theme="corporate"):
        from pptx import Presentation
        from pptx.util import Inches

        self.theme: Theme = get_theme(theme)
        self.prs = Presentation()
        self.prs.slide_width = Inches(self.WIDTH_IN)
        self.prs.slide_height = Inches(self.HEIGHT_IN)
        self._blank = self.prs.slide_layouts[6]
        self._page = 0

    # ---- geometry helpers ------------------------------------------------

    @property
    def sw(self):
        return self.prs.slide_width

    @property
    def sh(self):
        return self.prs.slide_height

    def _in(self, v):
        from pptx.util import Inches

        return Inches(v)

    def _emu_add(self, base, inches):
        from pptx.util import Emu, Inches

        return Emu(int(base) + int(Inches(inches)))

    # ---- color -----------------------------------------------------------

    def _color(self, key_or_rgb):
        """Accept a theme color-key ('primary'), a hex string, or an RGBColor."""
        from pptx.dml.color import RGBColor

        if isinstance(key_or_rgb, RGBColor):
            return key_or_rgb
        if isinstance(key_or_rgb, str):
            if key_or_rgb.startswith("#") or (
                len(key_or_rgb) == 6 and all(c in "0123456789abcdefABCDEF" for c in key_or_rgb)
            ):
                h = key_or_rgb.lstrip("#")
                return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
            # a theme attribute name
            return self.theme.color(key_or_rgb)
        return self.theme.color("ink")

    # ---- slide + shapes --------------------------------------------------

    def new_slide(self, fill: Optional[str] = None):
        """Add a blank slide with a full-bleed background rectangle (theme bg by
        default; pass a color key/hex to override, e.g. 'dark' for a hero)."""
        from pptx.enum.shapes import MSO_SHAPE

        s = self.prs.slides.add_slide(self._blank)
        r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, self.sw, self.sh)
        r.fill.solid()
        r.fill.fore_color.rgb = self._color(fill or "bg")
        r.line.fill.background()
        r.shadow.inherit = False
        return s

    def rect(self, s, x, y, w, h, fill, line=None, line_w=1.0, radius=0.08):
        """A rounded (or square) filled rectangle. x/y/w/h in inches."""
        from pptx.enum.shapes import MSO_SHAPE
        from pptx.util import Pt

        shp = s.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,
            self._in(x),
            self._in(y),
            self._in(w),
            self._in(h),
        )
        if radius:
            try:
                shp.adjustments[0] = radius
            except Exception:
                pass
        shp.fill.solid()
        shp.fill.fore_color.rgb = self._color(fill)
        if line:
            shp.line.color.rgb = self._color(line)
            shp.line.width = Pt(line_w)
        else:
            shp.line.fill.background()
        shp.shadow.inherit = False
        return shp

    def run(self, text, size, color="ink", bold=False, font=None) -> Run:
        """Construct a text run tuple for `text()`."""
        return (str(text), size, color, bold, font)

    def text(
        self,
        s,
        x,
        y,
        w,
        h,
        paragraphs: Sequence[Sequence[Run]],
        align="left",
        anchor="top",
        space_after=4,
        line_spacing=1.0,
    ):
        """A text box. `paragraphs` is a list of paragraphs; each paragraph is a
        list of run tuples (from `run()`). Margins are zeroed for tight layout."""
        from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
        from pptx.util import Pt

        align_map = {
            "left": PP_ALIGN.LEFT,
            "center": PP_ALIGN.CENTER,
            "right": PP_ALIGN.RIGHT,
            "justify": PP_ALIGN.JUSTIFY,
        }
        anchor_map = {
            "top": MSO_ANCHOR.TOP,
            "middle": MSO_ANCHOR.MIDDLE,
            "bottom": MSO_ANCHOR.BOTTOM,
        }
        tb = s.shapes.add_textbox(self._in(x), self._in(y), self._in(w), self._in(h))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = anchor_map.get(anchor, MSO_ANCHOR.TOP)
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        for i, para in enumerate(paragraphs):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.alignment = align_map.get(align, PP_ALIGN.LEFT)
            p.space_after = Pt(space_after)
            p.space_before = Pt(0)
            p.line_spacing = line_spacing
            for (t, sz, col, bold, fnt) in para:
                r = p.add_run()
                r.text = t
                r.font.size = Pt(sz)
                r.font.color.rgb = self._color(col)
                r.font.bold = bold
                r.font.name = fnt or self.theme.font
        return tb

    def chip(self, s, x, y, text, color, w=1.6):
        """A rounded pill chip with centered white label."""
        from pptx.enum.text import PP_ALIGN
        from pptx.util import Pt

        c = self.rect(s, x, y, w, 0.34, color, radius=0.5)
        tf = c.text_frame
        tf.word_wrap = False
        tf.margin_top = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        run = p.add_run()
        run.text = str(text)
        run.font.size = Pt(10.5)
        run.font.bold = True
        run.font.color.rgb = self._color("white")
        run.font.name = self.theme.font
        return c

    # ---- composite helpers ----------------------------------------------

    def kicker(self, s, x, y, text, color="primary"):
        """A small uppercase eyebrow label."""
        self.text(
            s, x, y, 8, 0.3, [[self.run(str(text).upper(), 12, color, True)]], space_after=0
        )

    def header(self, s, title, kicker=None, kcolor="primary", on_dark=False):
        """Standard content-slide header: optional kicker, big title, accent rule."""
        ink = "on_dark" if on_dark else "ink"
        if kicker:
            self.kicker(s, 0.7, 0.55, kicker, kcolor)
        self.text(s, 0.7, 0.82, 11.9, 0.9, [[self.run(title, 32, ink, True)]], space_after=0)
        self.rect(s, 0.72, 1.55, 0.55, 0.06, kcolor, radius=0.5)

    def footer(self, s, note=None, on_dark=False):
        """Page footer: optional left note + right-aligned auto page number."""
        self._page += 1
        faint = "on_dark_soft" if on_dark else "faint"
        if note:
            self.text(
                s, 0.7, 7.02, 8, 0.3, [[self.run(note, 9, faint)]], space_after=0
            )
        self.text(
            s,
            11.4,
            7.02,
            1.2,
            0.3,
            [[self.run(str(self._page), 9, faint, True)]],
            align="right",
            space_after=0,
        )

    def bullet(self, s, x, y, w, lead, body="", kcolor="primary", size=13.5):
        """A single bullet row: an accent square + bold lead + soft body."""
        self.rect(s, x, y + 0.06, 0.14, 0.14, kcolor, radius=0.5)
        runs = [self.run(lead + ("  " if body else ""), size, "ink", True)]
        if body:
            runs.append(self.run(body, size, "ink_soft"))
        self.text(s, x + 0.33, y, w, 0.8, [runs], space_after=0, line_spacing=1.1)

    def picture(self, s, path, x, y, w=None, h=None):
        """Place an image. Provide at least one of w/h (inches); the other scales."""
        kwargs = {}
        if w:
            kwargs["width"] = self._in(w)
        if h:
            kwargs["height"] = self._in(h)
        try:
            return s.shapes.add_picture(path, self._in(x), self._in(y), **kwargs)
        except Exception:
            return None

    # ---- output ----------------------------------------------------------

    def save(self, path):
        """Write the .pptx and return (abs_path, slide_count)."""
        import os

        self.prs.save(path)
        return os.path.abspath(path), len(self.prs.slides._sldIdLst)
