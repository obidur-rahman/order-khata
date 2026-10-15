"""Text normalization and script detection (docs/02 §4 step 2).

The script heuristic is intentionally simple and Unicode-range based:
  bn  — mostly Bengali-script characters
  mx  — mixed Bengali + Latin
  bl  — Latin only, but contains common Banglish (romanized Bangla) tokens
  en  — Latin only, no Banglish signal
"""
from __future__ import annotations

import re

_BENGALI = re.compile(r"[ঀ-৿]")
_LATIN = re.compile(r"[A-Za-z]")
_WS = re.compile(r"\s+")

# Small marker lexicon: high-precision romanized-Bangla tokens.
_BANGLISH_MARKERS = {
    "ami", "tumi", "apni", "ache", "aase", "ase", "na", "ki", "koto",
    "kore", "koro", "dibo", "diben", "dao", "chailam", "chai", "chao",
    "bhalo", "kharap", "hobe", "hoye", "gorbo", "korbo", "dite", "diba",
    "paisi", "pailam", "niye", "diye", "jonno", "jonnyo", "vabei", "taka",
    "taka.", "khela", "bujhi", "bujhlam", "bolun", "bolben", "janen",
    "janina", "ekhane", "okhane", "khali", "shudhu", "ektu", "khub",
    "ajke", "kalke", "shathe", "sathe", "jonno,", "bhai", "apu", "dada",
}

_BANGLISH_RE = re.compile(
    r"\b(" + "|".join(sorted(_BANGLISH_MARKERS)) + r")\b", re.IGNORECASE
)


def normalize(text: str) -> str:
    """Strip + collapse whitespace; the original is kept separately (docs/02 §4)."""
    return _WS.sub(" ", text.strip())


def detect_script(text: str) -> str:
    """Heuristic script detection: bn | bl | en | mx (docs/02 §4)."""
    bn = len(_BENGALI.findall(text))
    la = len(_LATIN.findall(text))
    total = bn + la
    if total == 0:
        return "en"
    bn_ratio = bn / total
    if bn_ratio >= 0.30:
        return "bn" if bn_ratio >= 0.95 else "mx"
    # Latin-dominant: Banglish vs English via marker lexicon.
    if _BANGLISH_RE.search(text):
        return "bl"
    return "en"
