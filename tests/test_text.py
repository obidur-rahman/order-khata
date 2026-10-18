"""Text normalization + script detection (docs/02 §4 step 2)."""
from __future__ import annotations

from app.text import detect_script, normalize


def test_normalize_strips_and_collapses():
    assert normalize("  hello   world \n\t") == "hello world"
    assert normalize("আমি   চাই") == "আমি চাই"
    assert normalize("   ") == ""


def test_bangla_script():
    assert detect_script("সারির দাম কত?") == "bn"
    assert detect_script("আমি নিতে চাই") == "bn"


def test_banglish_script():
    assert detect_script("ei saree ta ki stock e ache?") == "bl"
    assert detect_script("ami nite chai, koto taka?") == "bl"


def test_english_script():
    assert detect_script("Where is my order?") == "en"
    assert detect_script("Please deliver to this address") == "en"


def test_mixed_script():
    assert detect_script("আমি এটা order করতে চাই") == "mx"


def test_empty_defaults_to_en():
    assert detect_script("") == "en"
    assert detect_script("!!!...") == "en"


def test_normalize_replaces_a_lone_surrogate_instead_of_letting_it_through():
    """A lone surrogate is a legal JSON body (`"\\udc8d"`) but cannot be encoded to
    UTF-8 at all, so it raises on the way to SQLite and in the LLM cache key — a 500
    on a customer message. Replaced, not dropped: the length stays honest."""
    from app.text import sanitize

    broken = "ei saree \udc8d ta ki ache?"
    assert sanitize(broken) == "ei saree \ufffd ta ki ache?"
    assert normalize(broken) == "ei saree \ufffd ta ki ache?"
    assert sanitize(broken).encode("utf-8")  # the property everything else needs
    assert sanitize("সারির দাম কত?") == "সারির দাম কত?"  # real Bangla is untouched
