# -*- coding: utf-8 -*-
"""deckgen — a general-purpose, themeable PowerPoint (.pptx) generator.

Build professional 16:9 decks on ANY topic from a simple declarative outline,
with several built-in themes. Designed to be driven by an AI assistant inside
the MyDesk sandbox, but usable standalone anywhere python-pptx is installed.

Quick start (declarative — the primary path):

    import deckgen
    outline = [
        {"type": "title", "title": "Q3 Review", "subtitle": "Growth & priorities",
         "kicker": "Company all-hands", "chips": ["Revenue", "Product", "Team"]},
        {"type": "stats", "title": "The quarter in numbers",
         "stats": [{"value": "+24%", "label": "Revenue YoY"},
                   {"value": "1.2M", "label": "Active users"},
                   {"value": "98%", "label": "Uptime"}]},
        {"type": "bullets", "title": "What went well", "tagline": "Three themes",
         "bullets": ["Shipped fast — 40 features", "Retention up — churn down 3pts",
                     "Team grew — 12 hires"]},
        {"type": "closing", "title": "Thank you", "kicker": "Questions?",
         "cta": "Reach out in #q3-review"},
    ]
    path, n = deckgen.build_deck(outline, theme="corporate", out="q3.pptx")
    print("wrote", path, n, "slides")

Requires ``python-pptx`` (``pip install python-pptx``). The Deck low-level API is
exported for bespoke layouts the outline schema doesn't cover.
"""
from .themes import Theme, get_theme, theme_names, custom_theme, DEFAULT_THEME
from .builder import Deck
from .layouts import build_deck, SCHEMA_DOC

__all__ = [
    "build_deck",
    "Deck",
    "Theme",
    "get_theme",
    "theme_names",
    "custom_theme",
    "DEFAULT_THEME",
    "SCHEMA_DOC",
]

__version__ = "1.0.0"
