"""
Export the MemoryCare intent dataset (data/intents.json) to a flat CSV so it can
be published on Kaggle. Output columns: text, language, intent.

Run:  python export_dataset.py
Produces: dataset.csv  (in the ml-service folder)
"""
import json
import csv
import os
from collections import Counter

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "data", "intents.json")
OUT = os.path.join(BASE, "dataset.csv")


def is_urdu(text: str) -> bool:
    """True if the string contains Urdu-script (Arabic Unicode range) characters."""
    return any("؀" <= ch <= "ۿ" for ch in text)


with open(DATA, encoding="utf-8") as f:
    intents = json.load(f)["intents"]

rows = []
for intent in intents:
    tag = intent["tag"]
    for pattern in intent["patterns"]:
        rows.append((pattern, "urdu" if is_urdu(pattern) else "english", tag))

with open(OUT, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["text", "language", "intent"])
    writer.writerows(rows)

# ---- Stats (handy for your thesis / dataset card) ----
per_intent = Counter(r[2] for r in rows)
per_lang = Counter(r[1] for r in rows)

print(f"Wrote {len(rows)} rows to {OUT}")
print(f"\nIntents ({len(per_intent)}):")
for tag, count in sorted(per_intent.items()):
    print(f"  {tag:<16} {count}")
print(f"\nLanguage split: {dict(per_lang)}")
