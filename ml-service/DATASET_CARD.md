# MemoryCare: A Bilingual (English + Urdu) Intent Dataset for Dementia Care

A custom, curated **intent-classification dataset** for a conversational assistant that
supports Alzheimer's, dementia, and Mild Cognitive Impairment (MCI) patients. Each row is
a short user utterance labelled with one of **26 intents**, in **English, Roman-Urdu, and
Urdu script** — grounded in a **Pakistani** care context (including *namaz*/prayer intents).

## Why this dataset exists
A review of public datasets (Kaggle intent datasets, medical intent corpora, and Urdu
intent sets such as the Urdu-translated ATIS) found **none covering dementia daily-care
intents in both English and Urdu**. This dataset was therefore **curated from scratch** to
fill that gap, so it can train an assistant that answers the everyday questions a dementia
patient actually asks — about medicines, routines, family, prayer times, and more — in the
language they are most comfortable with.

## Files
- `dataset.csv` — the dataset.

## Columns
| Column | Description |
|--------|-------------|
| `text` | the user utterance |
| `language` | `english` (Latin script, incl. Roman-Urdu) or `urdu` (Urdu script) |
| `intent` | one of the 26 intent labels |

## Intents (26)
`greeting`, `goodbye`, `thanks`, `medication`, `medication_time`, `routine_query`,
`family_query`, `name_query`, `date_time`, `location`, `feeling`, `emergency`, `appointment`,
`help`, `meal_time`, `weather`, `memories`, `doctor_query`, `hydration`, `exercise`,
`sleep_rest`, `entertainment`, `prayer` (namaz), `news`, `bathroom`, `positive_mood`.

## Languages
- **English** — standard English phrasings.
- **Roman-Urdu** — Urdu written in Latin script (e.g. "dawa kab leni hai").
- **Urdu** — native Urdu script (e.g. "دوا کب لینی ہے").

## Suggested task
Multi-class **intent classification** (text → intent). Bag-of-words or TF-IDF features with
a simple neural network / classical ML model make a strong baseline.

## Baseline
A feed-forward neural network (bag-of-words → Dense(128) → Dense(64) → softmax, Adam)
achieved roughly **75% accuracy under 5-fold cross-validation** on an earlier 17-intent
version. This expanded version has **26 intents and ~980 labelled utterances** (about 38
per intent); run `python train.py` to retrain and print updated cross-validation numbers.

## Licence
Creative Commons Attribution 4.0 (CC BY 4.0) — free to use with attribution.

## Citation
> [Your Name]. *MemoryCare: A Bilingual (English + Urdu) Intent Dataset for Dementia Care.*
> Final Year Project, 2026.

## Author
Created as part of the **MemoryCare** final year project — a memory assistant for cognitive
disorders. Contributions and larger versions welcome.
