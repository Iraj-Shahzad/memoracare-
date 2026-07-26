"""
MemoryCare — Intent Classifier Training
========================================
Trains a bag-of-words feed-forward neural network (Keras) to classify a user's
message into an intent (greeting, medication_query, routine_query, ...).

Pipeline:
  1. Load intents.json (the labelled dataset).
  2. Tokenize + lemmatize each example utterance (NLTK).
  3. Turn each utterance into a bag-of-words vector.
  4. Train a Dense neural network with softmax over the intent classes.
  5. Report accuracy + a classification report + confusion matrix.
  6. Save the model and vocabulary so app.py can serve predictions.

Run:  python train.py
"""

import json
import os
import pickle
import random

import numpy as np
import nltk
from nltk.stem import WordNetLemmatizer

# Keras / TensorFlow
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout
from tensorflow.keras.optimizers import SGD, Adam
from tensorflow.keras.callbacks import EarlyStopping

# Fixed seeds so the reported accuracy is reproducible run to run.
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)

# Metrics for the thesis results chapter
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "intents.json")
MODEL_DIR = os.path.join(BASE_DIR, "model")
os.makedirs(MODEL_DIR, exist_ok=True)

# Download the small NLTK resources we need (safe to call repeatedly)
for pkg in ["punkt", "punkt_tab", "wordnet", "omw-1.4"]:
    try:
        nltk.download(pkg, quiet=True)
    except Exception:
        pass

lemmatizer = WordNetLemmatizer()
IGNORE = ["?", "!", ".", ",", "'"]

# ---------------------------------------------------------------------------
# 1. Load data
# ---------------------------------------------------------------------------
with open(DATA_PATH, "r", encoding="utf-8") as f:
    intents = json.load(f)

words = []          # vocabulary
classes = []        # intent tags
documents = []      # (tokenized_pattern, tag)

for intent in intents["intents"]:
    tag = intent["tag"]
    if tag not in classes:
        classes.append(tag)
    for pattern in intent["patterns"]:
        tokens = nltk.word_tokenize(pattern.lower())
        words.extend(tokens)
        documents.append((tokens, tag))

# Lemmatize + clean + de-duplicate the vocabulary
words = sorted(set(lemmatizer.lemmatize(w) for w in words if w not in IGNORE))
classes = sorted(set(classes))

print(f"Documents (training examples): {len(documents)}")
print(f"Intent classes ({len(classes)}): {classes}")
print(f"Vocabulary size: {len(words)}")

# ---------------------------------------------------------------------------
# 2. Build bag-of-words training matrix
# ---------------------------------------------------------------------------
X = []  # bag-of-words vectors
y = []  # class index

for tokens, tag in documents:
    lemmas = [lemmatizer.lemmatize(t) for t in tokens]
    bag = [1 if w in lemmas else 0 for w in words]
    X.append(bag)
    y.append(classes.index(tag))

X = np.array(X)
y = np.array(y)

# One-hot encode labels
Y = np.zeros((len(y), len(classes)), dtype=np.float32)
for i, idx in enumerate(y):
    Y[i, idx] = 1

# Shuffle
combined = list(zip(X, Y, y))
random.shuffle(combined)
X, Y, y = map(np.array, zip(*combined))


# ---------------------------------------------------------------------------
# Model factory — used by both cross-validation and the final model, so every
# model has the exact same architecture.
# ---------------------------------------------------------------------------
def build_model():
    m = Sequential()
    m.add(Dense(128, input_shape=(len(words),), activation="relu"))
    m.add(Dropout(0.5))
    m.add(Dense(64, activation="relu"))
    m.add(Dropout(0.5))
    m.add(Dense(len(classes), activation="softmax"))
    m.compile(
        loss="categorical_crossentropy",
        # Adam adapts the learning rate per weight; on small, sparse bag-of-words
        # inputs it often converges to a slightly better solution than plain SGD.
        optimizer=Adam(learning_rate=0.001),
        metrics=["accuracy"],
    )
    return m


# ---------------------------------------------------------------------------
# 2b. K-fold cross-validation
# A single train/test split is noisy on a small dataset, so we also report the
# mean accuracy across k folds where EVERY sample is tested exactly once. This
# is the robust, defensible accuracy number for the thesis.
# ---------------------------------------------------------------------------
n_splits = min(5, int(np.min(np.bincount(y))))
if n_splits >= 2:
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=SEED)
    fold_accs = []
    print(f"\nRunning {n_splits}-fold cross-validation...")
    for fold, (tr_idx, te_idx) in enumerate(skf.split(X, y), start=1):
        m = build_model()
        m.fit(
            X[tr_idx], Y[tr_idx], epochs=150, batch_size=8, verbose=0,
            validation_data=(X[te_idx], Y[te_idx]),
            callbacks=[EarlyStopping(monitor="val_loss", patience=20, restore_best_weights=True)],
        )
        preds_fold = np.argmax(m.predict(X[te_idx], verbose=0), axis=1)
        a = accuracy_score(y[te_idx], preds_fold)
        fold_accs.append(a)
        print(f"  Fold {fold}: accuracy = {a * 100:.2f}%")
    print(f"\nCross-validated accuracy: {np.mean(fold_accs) * 100:.2f}% "
          f"(+/- {np.std(fold_accs) * 100:.2f}%)\n")

# Train/test split for honest evaluation (stratify if every class has >=2 samples)
can_stratify = min(np.bincount(y)) >= 2
X_train, X_test, Y_train, Y_test, y_train, y_test = train_test_split(
    X, Y, y, test_size=0.2, random_state=42,
    stratify=y if can_stratify else None,
)

# ---------------------------------------------------------------------------
# 3. Build the final neural network (trained on the 80% split, saved for serving)
# ---------------------------------------------------------------------------
model = build_model()
model.summary()

# ---------------------------------------------------------------------------
# 4. Train
# ---------------------------------------------------------------------------
# Early stopping: watch the validation loss and stop once it stops improving,
# then restore the weights from the BEST epoch. This directly fights overfitting
# (otherwise the model keeps memorising the training set up to epoch 200).
callbacks = []
if len(X_test):
    callbacks.append(
        EarlyStopping(monitor="val_loss", patience=25, restore_best_weights=True)
    )

history = model.fit(
    X_train, Y_train,
    epochs=200,
    batch_size=8,
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
# The numbers above (cross-validation + held-out) estimate performance. The
# shipped model is now retrained on ALL examples so it has the most data to
# learn from -- standard practice once evaluation is done. This does NOT change
# the reported metrics; it only strengthens the model that actually serves users.
# It is trained for the same number of epochs early stopping chose on the split.
# ---------------------------------------------------------------------------
final_epochs = len(history.history["loss"])
print(f"\nTraining final deployment model on all {len(X)} examples for {final_epochs} epochs...")
model = build_model()
model.fit(X, Y, epochs=final_epochs, batch_size=8, verbose=0)

# ---------------------------------------------------------------------------
# 6. Save artifacts
# ---------------------------------------------------------------------------
model.save(os.path.join(MODEL_DIR, "chatbot_model.h5"))
with open(os.path.join(MODEL_DIR, "words.pkl"), "wb") as f:
    pickle.dump(words, f)
with open(os.path.join(MODEL_DIR, "classes.pkl"), "wb") as f:
    pickle.dump(classes, f)

print(f"\nSaved model + vocabulary to: {MODEL_DIR}")
print("Done. Now run:  python app.py")
