"""
upload_to_wit.py  —  bulk-upload MemoraCare's intents + training data to Wit.ai.

Reads data/intents.json (the SAME data the Python model trains on) and pushes every
intent + every training pattern to your Wit.ai app via its HTTP API. Wit.ai then
trains automatically. This saves you from typing ~1200 utterances by hand.

HOW TO RUN (from the ml-service folder):
  1) Create a Wit.ai app and copy its "Server Access Token" (Settings page).
  2) Set the token in this terminal:
       Windows PowerShell:  $env:WIT_TOKEN="YOUR_TOKEN"
       Windows cmd:         set WIT_TOKEN=YOUR_TOKEN
  3) Run:  python upload_to_wit.py

It creates the 26 intents, then uploads all patterns in batches. Re-running is safe
(existing intents are skipped; duplicate utterances are ignored by Wit.ai).
"""
import os
import sys
import json
import time

try:
    import requests
except ImportError:
    sys.exit("Missing dependency. Run:  pip install requests")

TOKEN = os.environ.get("WIT_TOKEN")
if not TOKEN:
    sys.exit("Set WIT_TOKEN first (your Wit.ai Server Access Token).")

API = "https://api.wit.ai"
V = "20240101"                      # Wit.ai API version date
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, "data", "intents.json"), encoding="utf-8") as f:
    intents = json.load(f)["intents"]

# 1) Create each intent (a 200/OK means created; anything else usually = already exists)
print(f"Creating {len(intents)} intents on Wit.ai ...")
for it in intents:
    r = requests.post(f"{API}/intents?v={V}", headers=H, json={"name": it["tag"]})
    print(f"  {it['tag']:<16} -> {r.status_code}")
    time.sleep(0.3)

# 2) Flatten every pattern into a Wit.ai utterance and upload in batches of 200
utterances = []
for it in intents:
    for pattern in it["patterns"]:
        utterances.append({"text": pattern, "intent": it["tag"], "entities": [], "traits": []})

print(f"\nUploading {len(utterances)} training utterances ...")
for i in range(0, len(utterances), 200):
    batch = utterances[i:i + 200]
    r = requests.post(f"{API}/utterances?v={V}", headers=H, json=batch)
    print(f"  batch {i // 200 + 1:>3} ({len(batch)} utterances) -> {r.status_code}")
    time.sleep(1)

print("\nDone. Wit.ai is now training automatically.")
print("Open your Wit.ai app -> 'Understanding' tab to watch it learn.")
