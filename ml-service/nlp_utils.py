"""
Shared text normalization for the MemoraCare intent classifier.

BOTH train.py and app.py import `normalize()` from here, so the exact same
preprocessing is used at training time and at serving time. If these ever
differ, the model sees different features than it was trained on and predicts
wrongly — so keep this the single source of truth.

Pipeline: lowercase -> tokenize (NLTK) -> lemmatize (English) -> keep
alphanumeric tokens -> join back into a string. The TF-IDF vectorizer then
turns that string into unigram + bigram features, so word pairs like
"feel sad" vs "feel sick" become distinct signals.
"""

import nltk
from nltk.stem import WordNetLemmatizer

# Download the small NLTK resources we need (safe to call repeatedly / offline after first run)
for _pkg in ["punkt", "punkt_tab", "wordnet", "omw-1.4"]:
    try:
        nltk.download(_pkg, quiet=True)
    except Exception:
        pass

_lemmatizer = WordNetLemmatizer()


def normalize(text: str) -> str:
    """Lowercase, tokenize, lemmatize, and rejoin. Urdu-script tokens pass
    through the English lemmatizer unchanged, so both languages are handled."""
    tokens = nltk.word_tokenize((text or "").lower())
    lemmas = [_lemmatizer.lemmatize(t) for t in tokens if t.isalnum()]
    return " ".join(lemmas)
