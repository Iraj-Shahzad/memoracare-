"""
MemoraCare — Intent Dataset Augmentation
=========================================
Expands the human-curated seed dataset (data/intents.json, ~980 patterns) into a
much larger training set (~10,000 patterns) using *template-based data
augmentation* — a standard NLP technique:

  1. Language-aware paraphrase wrappers (polite / filler prefixes & suffixes),
     applied separately to Latin-script and Urdu-script utterances.
  2. Light synonym substitution for a few common domain words
     (medicine <-> pills <-> tablets, doctor <-> physician, ...).

It deduplicates, balances the count across intents, and writes
data/intents.augmented.json (same structure). train.py automatically prefers
that file if it exists, so the workflow is simply:

    python augment.py        # generate the big set
    python train.py          # trains on it and prints cross-validated accuracy

To revert to the curated seed, just delete data/intents.augmented.json.

NOTE: augmentation grows surface variety, not underlying meaning. On a
bag-of-words model the accuracy usually plateaus; the main value is a larger,
defensible corpus (e.g. for the Kaggle dataset card / thesis).
"""

import json
import os
import re
import random

random.seed(42)  # deterministic output

BASE = os.path.dirname(os.path.abspath(__file__))
SEED_PATH = os.path.join(BASE, "data", "intents.json")
OUT_PATH = os.path.join(BASE, "data", "intents.augmented.json")

TARGET_TOTAL = 10000  # approximate total patterns across all intents

# --- Urdu-script detection (Arabic/Urdu Unicode block) ---
URDU_RE = re.compile(r"[؀-ۿ]")


def is_urdu(text: str) -> bool:
    return bool(URDU_RE.search(text))


# --- Paraphrase wrappers ---------------------------------------------------
# English / Roman-Urdu (Latin script) — harmless conversational padding that
# keeps the intent identical.
LATIN_PREFIX = [
    "", "", "", "please ", "can you ", "could you ", "i want to ",
    "i need to ", "tell me ", "hey ", "so ", "ok ", "kindly ",
    "i would like to ", "zara ", "mujhe ", "kya aap ", "acha ",
]
LATIN_SUFFIX = ["", "", "", " please", " now", " today", " thanks", " zara", " batao"]

# Urdu-script wrappers
URDU_PREFIX = ["", "", "", "براہ کرم ", "ذرا ", "مجھے ", "کیا آپ ", "اچھا "]
URDU_SUFFIX = ["", "", "", " براہ کرم", " ذرا", " ابھی"]

# --- Light synonym swaps (Latin only, whole-word, lower-cased match) --------
SYNONYMS = {
    "medicine": ["medication", "pills", "tablets", "meds", "medicines"],
    "medication": ["medicine", "pills", "tablets", "meds"],
    "medicines": ["medications", "pills", "tablets", "meds"],
    "pills": ["tablets", "medicine", "meds"],
    "tablets": ["pills", "medicine", "meds"],
    "doctor": ["physician", "gp", "doctor"],
    "routine": ["schedule", "routine", "activities"],
    "routines": ["schedules", "activities", "tasks"],
    "family": ["relatives", "loved ones", "family"],
    "photo": ["picture", "photograph", "photo"],
    "photos": ["pictures", "images", "photos"],
    "picture": ["photo", "photograph", "picture"],
    "walk": ["stroll", "walk"],
    "tired": ["sleepy", "exhausted", "tired"],
    "water": ["a drink", "water"],
    "dawa": ["dawai", "medicine", "goli"],
    "dawai": ["dawa", "medicine"],
}

WORD_RE = re.compile(r"[A-Za-z]+")


def synonym_variants(pattern: str, max_variants: int = 3):
    """Return a few variants where one known word is swapped for a synonym."""
    if is_urdu(pattern):
        return []
    variants = set()
    words = pattern.split()
    for i, w in enumerate(words):
        key = w.lower()
        if key in SYNONYMS:
            for alt in SYNONYMS[key]:
                if alt.lower() == key:
                    continue
                new_words = words[:i] + [alt] + words[i + 1:]
                variants.add(" ".join(new_words))
                if len(variants) >= max_variants:
                    return list(variants)
    return list(variants)


def wrap_variants(pattern: str):
    """Apply prefix/suffix paraphrase wrappers, language-aware."""
    urdu = is_urdu(pattern)
    prefixes = URDU_PREFIX if urdu else LATIN_PREFIX
    suffixes = URDU_SUFFIX if urdu else LATIN_SUFFIX
    out = set()
    for p in prefixes:
        for s in suffixes:
            variant = f"{p}{pattern}{s}".strip()
            variant = re.sub(r"\s+", " ", variant)  # collapse double spaces
            out.add(variant)
    return out


def expand_intent(patterns, target):
    """Grow one intent's patterns up to `target`, seeds always included."""
    pool = set()
    seeds = [p.strip() for p in patterns if p and p.strip()]
    for seed in seeds:
        pool.add(seed)
        for v in wrap_variants(seed):
            pool.add(v)
        for v in synonym_variants(seed):
            pool.add(v)
            for wv in wrap_variants(v):
                pool.add(wv)

    # Dedupe case-insensitively while keeping first-seen surface form.
    seen = {}
    for item in pool:
        k = item.lower()
        if k not in seen:
            seen[k] = item
    unique = list(seen.values())

    # Always keep the real seeds; sample the rest to hit the target.
    seed_set = set(seeds)
    extras = [u for u in unique if u not in seed_set]
    random.shuffle(extras)
    keep = list(seed_set) + extras
    if len(keep) > target:
        # keep all seeds + enough extras to reach target
        need = max(0, target - len(seed_set))
        keep = list(seed_set) + extras[:need]
    random.shuffle(keep)
    return keep


def main():
    with open(SEED_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    intents = data["intents"]
    per_intent = max(1, TARGET_TOTAL // len(intents))

    total = 0
    for intent in intents:
        expanded = expand_intent(intent["patterns"], per_intent)
        intent["patterns"] = expanded
        total += len(expanded)
        print(f"  {intent['tag']:<18} {len(expanded)} patterns")

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\nWrote {total} patterns across {len(intents)} intents -> {OUT_PATH}")
    print("Now run:  python train.py   (it auto-prefers the augmented file)")
    print("To revert: delete data/intents.augmented.json")


if __name__ == "__main__":
    main()
