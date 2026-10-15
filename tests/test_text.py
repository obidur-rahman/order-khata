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
