"""
evaluate.py  —  evaluate the trained chatbot intent model on a HELD-OUT set of
test questions (paraphrases the model was NOT trained on). This measures how well
the model *generalises* to new wording — the real "is it behaving correctly?" test.

It loads the saved model exactly like app.py does (TF-IDF or embeddings mode),
runs each test question, and prints:
  - a per-question PASS/FAIL table (expected vs predicted intent + confidence)
  - overall accuracy on the held-out questions
  - a per-intent precision/recall/F1 report

RUN (from the ml-service folder, after `python train.py` has produced a model):
    python evaluate.py
"""
import os
import json
import pickle
import numpy as np

from tensorflow.keras.models import load_model
from sklearn.metrics import classification_report, accuracy_score
from nlp_utils import normalize

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")

# ---- load the trained artifacts (same as app.py) ----
with open(os.path.join(MODEL_DIR, "classes.pkl"), "rb") as f:
    classes = pickle.load(f)

mode = "tfidf"
mode_path = os.path.join(MODEL_DIR, "mode.txt")
if os.path.exists(mode_path):
    mode = open(mode_path).read().strip()

vectorizer = None
if mode != "embeddings":
    with open(os.path.join(MODEL_DIR, "vectorizer.pkl"), "rb") as f:
        vectorizer = pickle.load(f)

model = load_model(os.path.join(MODEL_DIR, "chatbot_model.h5"))
print(f"Loaded model ({mode} mode), {len(classes)} intents.\n")


def predict(text):
    """Return (intent, confidence) for one message."""
    if mode == "embeddings":
        from embed_utils import embed
        feats = np.asarray(embed([text]))
    else:
        feats = vectorizer.transform([normalize(text)]).toarray().astype("float32")
    probs = model.predict(feats, verbose=0)[0]
    idx = int(np.argmax(probs))
    return classes[idx], float(probs[idx])


# ---- HELD-OUT test questions: new phrasings NOT in the training patterns ----
# (question, expected_intent). Mix of English + Roman-Urdu to test generalisation.
TESTS = [
    ("what pills am i supposed to take", "medication"),
    ("mujhe konsi dawai leni hai", "medication"),
    ("show me my medicines", "medication"),
    ("at what time do i take my tablets", "medication_time"),
    ("dawai ka time kya hai", "medication_time"),
    ("what is on my schedule today", "routine_query"),
    ("aaj mera kya kaam hai", "routine_query"),
    ("tell me about my daily activities", "routine_query"),
    ("who are my family members", "family_query"),
    ("mera beta kaun hai", "family_query"),
    ("what is my name", "name_query"),
    ("mera naam kya hai", "name_query"),
    ("what day is it today", "date_time"),
    ("abhi kya time hua hai", "date_time"),
    ("where am i right now", "location"),
    ("main kahan hoon", "location"),
    ("i am not feeling well", "feeling"),
    ("mujhe acha nahi lag raha", "feeling"),
    ("i need help right now", "emergency"),
    ("emergency hai", "emergency"),
    ("do i have any appointments", "appointment"),
    ("can you help me", "help"),
    ("when do i eat", "meal_time"),
    ("khana kab hai", "meal_time"),
    ("i want to see my photos", "memories"),
    ("apni tasveerein dikhao", "memories"),
    ("who is my doctor", "doctor_query"),
    ("mera doctor kaun hai", "doctor_query"),
    ("when is the next prayer", "prayer"),
    ("namaz ka waqt", "prayer"),
    ("hi there", "greeting"),
    ("assalam o alaikum", "greeting"),
    ("thank you so much", "thanks"),
    ("shukriya", "thanks"),
    ("goodbye for now", "goodbye"),
    ("should i drink water", "hydration"),
    ("i want to go for a walk", "exercise"),
    ("i feel sleepy", "sleep_rest"),
    ("play some music for me", "entertainment"),
    ("i need the toilet", "bathroom"),
    ("i am feeling great today", "positive_mood"),
]

# ---- run ----
print(f"{'#':<4}{'Question':<44}{'Expected':<16}{'Predicted':<16}{'Conf':<7}{'Result'}")
print("-" * 95)
y_true, y_pred = [], []
correct = 0
for i, (q, expected) in enumerate(TESTS, 1):
    pred, conf = predict(q)
    ok = (pred == expected)
    correct += 1 if ok else 0
    y_true.append(expected)
    y_pred.append(pred)
    print(f"{i:<4}{q[:43]:<44}{expected:<16}{pred:<16}{conf:<7.2f}{'PASS' if ok else 'FAIL'}")

acc = correct / len(TESTS)
print("-" * 95)
print(f"\nHELD-OUT ACCURACY: {acc * 100:.1f}%   ({correct}/{len(TESTS)} correct)\n")

print("Per-intent report (precision / recall / F1):")
print(classification_report(y_true, y_pred, zero_division=0))
