"""
MemoryCare — Intent Classifier Training
========================================
Trains a feed-forward neural network (Keras) to classify a user's message into
an intent (greeting, medication, routine_query, ...).

Features: TF-IDF over unigrams + bigrams (word pairs). Bigrams matter here
because intents overlap on single words — "feel sad" (feeling), "feel sick"
(emergency) and "feel tired" (sleep_rest) all share "feel"; the bigram tells
them apart. This replaces the older binary bag-of-words.

Pipeline:
  1. Load intents.json (or intents.augmented.json if present).
  2. Normalize each utterance (shared nlp_utils.normalize): lowercase +
     lemmatize.
  3. TF-IDF vectorize (unigrams + bigrams).
  4. Train a Dense NN with softmax over the intent classes.
  5. Report 5-fold cross-validation accuracy + classification report + confusion matrix.
  6. Save model + the fitted vectorizer + classes so app.py can serve predictions.

Run:  python train.py
"""

import json
import os
import pickle
import random

import numpy as np

# Keras / TensorFlow
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Input, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping

# Fixed seeds so the reported accuracy is reproducible run to run.
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

from nlp_utils import normalize

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Prefer the augmented dataset (data/intents.augmented.json, produced by
# augment.py) if it exists; otherwise fall back to the curated seed.
_AUG_PATH = os.path.join(BASE_DIR, "data", "intents.augmented.json")
_SEED_PATH = os.path.join(BASE_DIR, "data", "intents.json")
DATA_PATH = _AUG_PATH if os.path.exists(_AUG_PATH) else _SEED_PATH
MODEL_DIR = os.path.join(BASE_DIR, "model")
# Opt-in high-accuracy mode: multilingual sentence embeddings instead of TF-IDF.
# Enable with:  set USE_EMBEDDINGS=1  (PowerShell: $env:USE_EMBEDDINGS="1")
USE_EMBEDDINGS = os.environ.get("USE_EMBEDDINGS") == "1"
print(f"Training data: {os.path.basename(DATA_PATH)}")
print(f"Feature mode: {'sentence-embeddings' if USE_EMBEDDINGS else 'tfidf'}")
os.makedirs(MODEL_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# 1. Load data
# ---------------------------------------------------------------------------
with open(DATA_PATH, "r", encoding="utf-8") as f:
    intents = json.load(f)

patterns = []   # raw utterances
tags = []       # matching intent tag per utterance

for intent in intents["intents"]:
    for pattern in intent["patterns"]:
        patterns.append(pattern)
        tags.append(intent["tag"])

classes = sorted(set(tags))

# ---------------------------------------------------------------------------
# 2. Features — sentence embeddings (opt-in) OR TF-IDF (default)
# ---------------------------------------------------------------------------
vectorizer = None
if USE_EMBEDDINGS:
    # Meaning-aware vectors: "I feel sick" and "I feel sad" separate cleanly.
    from embed_utils import embed
    print("Encoding utterances with the multilingual sentence model (first run downloads it)...")
    X = embed(patterns)  # raw text — the transformer does its own tokenization
else:
    # TF-IDF: WORD unigrams+bigrams ("feel sick" vs "feel sad") + CHARACTER
    # n-grams (Roman-Urdu / Urdu spelling variation + typos). max_features caps
    # keep memory bounded for the augmented 10k set.
    corpus = [normalize(p) for p in patterns]
    vectorizer = FeatureUnion([
        ("word", TfidfVectorizer(analyzer="word", ngram_range=(1, 2), sublinear_tf=True, min_df=1, max_features=4000)),
        ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True, min_df=2, max_features=6000)),
    ])
    X = vectorizer.fit_transform(corpus).toarray().astype("float32")

y = np.array([classes.index(t) for t in tags])

input_dim = X.shape[1]
print(f"Documents (training examples): {len(patterns)}")
print(f"Intent classes ({len(classes)}): {classes}")
print(f"Feature vector size: {input_dim}")

# One-hot encode labels
Y = np.zeros((len(y), len(classes)), dtype=np.float32)
for i, idx in enumerate(y):
    Y[i, idx] = 1

# Shuffle (keep X, Y, y aligned) with a fixed seed for reproducibility
rng = np.random.RandomState(SEED)
perm = rng.permutation(len(y))
X, Y, y = X[perm], Y[perm], y[perm]


# ---------------------------------------------------------------------------
# Model factory — same architecture for cross-validation and the final model.
# ---------------------------------------------------------------------------
def build_model(n_features, n_classes):
    m = Sequential()
    m.add(Input(shape=(n_features,)))
    m.add(Dense(128, activation="relu"))
    m.add(Dropout(0.5))
    m.add(Dense(64, activation="relu"))
    m.add(Dropout(0.5))
    m.add(Dense(n_classes, activation="softmax"))
    m.compile(
        loss="categorical_crossentropy",
        optimizer=Adam(learning_rate=0.001),
        metrics=["accuracy"],
    )
    return m


# Bigger batches train much faster (especially with a lot of augmented data)
# with no real accuracy loss on this task.
BATCH_SIZE = 32

# ---------------------------------------------------------------------------
# 2b. K-fold cross-validation (robust, defensible accuracy for the thesis)
# Cross-validation on an AUGMENTED set is both slow AND optimistic (near-duplicate
# variants of one seed leak across folds), so we run CV only on the seed-sized
# dataset. For the augmented set we skip CV and point back to the seed run.
# ---------------------------------------------------------------------------
CV_MAX = 3000
n_splits = min(5, int(np.min(np.bincount(y))))
if n_splits >= 2 and len(X) <= CV_MAX:
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=SEED)
    fold_accs = []
    print(f"\nRunning {n_splits}-fold cross-validation...")
    for fold, (tr_idx, te_idx) in enumerate(skf.split(X, y), start=1):
        print(f"  Fold {fold}/{n_splits} training...", flush=True)
        m = build_model(input_dim, len(classes))
        m.fit(
            X[tr_idx], Y[tr_idx], epochs=80, batch_size=BATCH_SIZE, verbose=0,
            validation_data=(X[te_idx], Y[te_idx]),
            callbacks=[EarlyStopping(monitor="val_loss", patience=15, restore_best_weights=True)],
        )
        preds_fold = np.argmax(m.predict(X[te_idx], verbose=0), axis=1)
        a = accuracy_score(y[te_idx], preds_fold)
        fold_accs.append(a)
        print(f"  Fold {fold}: accuracy = {a * 100:.2f}%", flush=True)
    print(f"\nCross-validated accuracy: {np.mean(fold_accs) * 100:.2f}% "
          f"(+/- {np.std(fold_accs) * 100:.2f}%)\n")
elif len(X) > CV_MAX:
    print(f"\nLarge dataset ({len(X)} examples) — skipping 5-fold cross-validation.")
    print("Augmented CV is slow and optimistic (near-duplicates leak across folds).")
    print("For the honest, comparable CV number, run seed-only:")
    print("  delete data/intents.augmented.json, then  python train.py\n")

# Train/test split for honest evaluation
can_stratify = min(np.bincount(y)) >= 2
X_train, X_test, Y_train, Y_test, y_train, y_test = train_test_split(
    X, Y, y, test_size=0.2, random_state=42,
    stratify=y if can_stratify else None,
)

# ---------------------------------------------------------------------------
# 3. Build + 4. Train
# ---------------------------------------------------------------------------
model = build_model(input_dim, len(classes))
model.summary()

callbacks = []
if len(X_test):
    callbacks.append(EarlyStopping(monitor="val_loss", patience=25, restore_best_weights=True))

history = model.fit(
    X_train, Y_train,
    epochs=200,
    batch_size=BATCH_SIZE,
    verbose=1,
    validation_data=(X_test, Y_test) if len(X_test) else None,
    callbacks=callbacks,
)

# ---------------------------------------------------------------------------
# 5. Evaluate (numbers for your thesis)
# ---------------------------------------------------------------------------
print("\n" + "=" * 60)
print("EVALUATION")
print("=" * 60)

if len(X_test):
    preds = np.argmax(model.predict(X_test, verbose=0), axis=1)
    acc = accuracy_score(y_test, preds)
    print(f"\nTest accuracy: {acc * 100:.2f}%\n")
    labels_present = sorted(set(list(y_test) + list(preds)))
    target_names = [classes[i] for i in labels_present]
    print("Classification report:")
    print(classification_report(y_test, preds, labels=labels_present,
                                target_names=target_names, zero_division=0))
    print("Confusion matrix (rows = true, cols = predicted):")
    print(confusion_matrix(y_test, preds, labels=labels_present))
else:
    print("Dataset too small for a test split; trained on all data.")

# ---------------------------------------------------------------------------
# 5b. Retrain the FINAL model on 100% of the data for deployment
# ---------------------------------------------------------------------------
final_epochs = len(history.history["loss"])
print(f"\nTraining final deployment model on all {len(X)} examples for {final_epochs} epochs...")
model = build_model(input_dim, len(classes))
model.fit(X, Y, epochs=final_epochs, batch_size=BATCH_SIZE, verbose=0)

# ---------------------------------------------------------------------------
# 6. Save artifacts (model + classes + feature mode; vectorizer only for TF-IDF)
# ---------------------------------------------------------------------------
model.save(os.path.join(MODEL_DIR, "chatbot_model.h5"))
with open(os.path.join(MODEL_DIR, "classes.pkl"), "wb") as f:
    pickle.dump(classes, f)
# A mode marker tells app.py how to turn a message into features.
with open(os.path.join(MODEL_DIR, "mode.txt"), "w", encoding="utf-8") as f:
    f.write("embeddings" if USE_EMBEDDINGS else "tfidf")
if not USE_EMBEDDINGS:
    with open(os.path.join(MODEL_DIR, "vectorizer.pkl"), "wb") as f:
        pickle.dump(vectorizer, f)

print(f"\nSaved model + classes ({'embeddings' if USE_EMBEDDINGS else 'tfidf'} mode) to: {MODEL_DIR}")
print("Done. Now run:  python app.py")
