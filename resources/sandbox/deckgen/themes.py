# -*- coding: utf-8 -*-
"""Presentation themes for deckgen — general-purpose, not app-specific.

A theme is just a palette + type scale. Every builtin theme is designed to read
professionally on a 16:9 canvas with automatic light/dark contrast. Pick one by
name via ``deckgen.build_deck(outline, theme="editorial")`` or pass a custom
``Theme`` you construct yourself.
"""
from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Dict, List


def _rgb(hexstr: str):
    """'#3B5BDB' or '3B5BDB' -> pptx RGBColor. Imported lazily so this module can
    be introspected without python-pptx installed."""
    from pptx.dml.color import RGBColor

    h = hexstr.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


@dataclass
class Theme:
    """A deck's visual identity. Colors are hex strings ('#RRGGBB'); the builder
    converts them to pptx colors on demand. `accents` cycles across cards/bullets
    so multi-item slides stay lively but coherent."""

    name: str = "custom"
    # Core surfaces + ink
    bg: str = "#FFFFFF"          # slide background
    ink: str = "#18181B"         # primary text
    ink_soft: str = "#3F3F46"    # body text
    muted: str = "#71717A"       # secondary text
    faint: str = "#A1A1AA"       # footers / de-emphasized
    card: str = "#FFFFFF"        # raised card fill
    card_line: str = "#E4E4E7"   # card hairline border
    # Brand
    primary: str = "#3B5BDB"     # primary accent (kickers, rules, numbers)
    primary_dark: str = "#253A9E"
    # Dark surfaces (title/section/closing hero slides)
    dark: str = "#0F1117"
    dark_card: str = "#1B1D24"
    on_dark: str = "#FFFFFF"     # text on dark surfaces
    on_dark_soft: str = "#C7CAD1"
    white: str = "#FFFFFF"
    # A rotating accent palette for cards / bullets / stat rows
    accents: List[str] = field(
        default_factory=lambda: ["#3B5BDB", "#0E946A", "#B45409", "#7C3AED", "#BE123C"]
    )
    # Type
    font: str = "Segoe UI"
    font_light: str = "Segoe UI Light"
    font_mono: str = "Consolas"
    # Whether hero slides (title/section/closing) use the dark band
    hero_dark: bool = True

    def color(self, key: str):
        """RGBColor for a named palette entry."""
        return _rgb(getattr(self, key))

    def accent(self, i: int):
        """RGBColor for the i-th accent (wraps)."""
        return _rgb(self.accents[i % len(self.accents)])


# --------------------------------------------------------------------------
# Builtin themes
# --------------------------------------------------------------------------

_THEMES: Dict[str, Theme] = {}


def _register(t: Theme) -> Theme:
    _THEMES[t.name] = t
    return t


# Clean indigo-on-white — the safe, corporate default.
_register(
    Theme(
        name="corporate",
        bg="#FFFFFF",
        ink="#0F172A",
        ink_soft="#334155",
        muted="#64748B",
        faint="#94A3B8",
        card="#FFFFFF",
        card_line="#E2E8F0",
        primary="#2563EB",
        primary_dark="#1D4ED8",
        dark="#0B1220",
        dark_card="#141C2B",
        accents=["#2563EB", "#0D9488", "#D97706", "#7C3AED", "#DB2777"],
        font="Segoe UI",
        font_light="Segoe UI Light",
    )
)

# Warm off-white, editorial serif-ish feel, amber/rose accents.
_register(
    Theme(
        name="editorial",
        bg="#FBF8F4",
        ink="#1C1917",
        ink_soft="#44403C",
        muted="#78716C",
        faint="#A8A29E",
        card="#FFFFFF",
        card_line="#E7E1D9",
        primary="#B45309",
        primary_dark="#92400E",
        dark="#1C1917",
        dark_card="#292524",
        accents=["#B45309", "#9F1239", "#0F766E", "#4338CA", "#6D28D9"],
        font="Georgia",
        font_light="Georgia",
        font_mono="Consolas",
    )
)

# Dark-first, high-contrast — decks that live on screen. Hero + content are dark.
_register(
    Theme(
        name="midnight",
        bg="#0B0E14",
        ink="#F8FAFC",
        ink_soft="#CBD5E1",
        muted="#94A3B8",
        faint="#64748B",
        card="#141A24",
        card_line="#26303F",
        primary="#60A5FA",
        primary_dark="#3B82F6",
        dark="#0B0E14",
        dark_card="#141A24",
        on_dark="#F8FAFC",
        on_dark_soft="#CBD5E1",
        accents=["#60A5FA", "#34D399", "#FBBF24", "#A78BFA", "#F472B6"],
        font="Segoe UI",
        font_light="Segoe UI Light",
        hero_dark=True,
    )
)

# Fresh emerald/teal on white — product / growth decks.
_register(
    Theme(
        name="verdant",
        bg="#FFFFFF",
        ink="#052E2B",
        ink_soft="#134E4A",
        muted="#5F7470",
        faint="#9CA3AF",
        card="#FFFFFF",
        card_line="#D1E0DC",
        primary="#0D9488",
        primary_dark="#0F766E",
        dark="#052E2B",
        dark_card="#0B3D39",
        accents=["#0D9488", "#2563EB", "#CA8A04", "#7C3AED", "#E11D48"],
        font="Segoe UI",
        font_light="Segoe UI Light",
    )
)

# The MyDesk house style (zinc surfaces, indigo/blue primary) — kept as one theme
# so app-branded decks are still one call away.
_register(
    Theme(
        name="mydesk",
        bg="#FCFBFE",
        ink="#18181B",
        ink_soft="#3F3F46",
        muted="#71717A",
        faint="#A1A1AA",
        card="#FFFFFF",
        card_line="#E4E4E7",
        primary="#3B5BDB",
        primary_dark="#253A9E",
        dark="#0F1117",
        dark_card="#1B1D24",
        accents=["#3B5BDB", "#0E946A", "#B45409", "#7C3AED", "#6474A8"],
        font="Segoe UI",
        font_light="Segoe UI Light",
    )
)

DEFAULT_THEME = "corporate"


def get_theme(theme) -> Theme:
    """Resolve a theme argument: a Theme instance passes through; a name string
    is looked up (case-insensitive); anything unknown falls back to the default
    (so a typo produces a valid deck, not a crash)."""
    if isinstance(theme, Theme):
        return theme
    if isinstance(theme, str):
        return _THEMES.get(theme.strip().lower(), _THEMES[DEFAULT_THEME])
    return _THEMES[DEFAULT_THEME]


def theme_names() -> List[str]:
    """Names of all builtin themes."""
    return sorted(_THEMES.keys())


def custom_theme(base: str = DEFAULT_THEME, **overrides) -> Theme:
    """Clone a builtin theme with field overrides, e.g.
    ``custom_theme('corporate', primary='#FF6600', accents=[...])``."""
    return replace(get_theme(base), name="custom", **overrides)
