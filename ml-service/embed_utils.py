"""
Multilingual sentence-embedding encoder (OPT-IN, for high-accuracy mode).

Used only when training/serving with USE_EMBEDDINGS=1. Unlike TF-IDF (which
counts words), sentence embeddings capture MEANING — so "I feel sick"
(emergency) and "I feel sad" (feeling) map to different vectors even though they
share words. This is what lifts the classifier from ~76% to ~85%+.

Model: paraphrase-multilingual-MiniLM-L12-v2 — a compact multilingual model that
handles English + Urdu, so both languages share one semantic space.

Requires:  pip install sentence-transformers   (pulls PyTorch; ~470 MB model
downloaded on first use, then cached locally).
"""

import numpy as np

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
_model = None


def get_encoder():
    """Lazily load the model once (kept in memory for reuse)."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def embed(texts):
    """Encode a list of texts into L2-normalized float32 embedding vectors."""
    enc = get_encoder()
    vecs = enc.encode(list(texts), convert_to_numpy=True, normalize_embeddings=True,
                      show_progress_bar=False)
    return np.asarray(vecs, dtype="float32")
