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
# (question, expected_intent). Mix of English + Roman-Urdu, including harder /
# indirect wordings, to test generalisation more thoroughly.
TESTS = [
    # medication
    ("what pills am i supposed to take", "medication"),
    ("mujhe konsi dawai leni hai", "medication"),
    ("show me my medicines", "medication"),
    ("remind me which tablets are mine", "medication"),
    ("meri medicine list dikhao", "medication"),
    # medication_time
    ("at what time do i take my tablets", "medication_time"),
    ("dawai ka time kya hai", "medication_time"),
    ("when is my next dose", "medication_time"),
    ("kis waqt dawai leni hai", "medication_time"),
    # routine_query
    ("what is on my schedule today", "routine_query"),
    ("aaj mera kya kaam hai", "routine_query"),
    ("tell me about my daily activities", "routine_query"),
    ("mera aaj ka routine batao", "routine_query"),
    # family_query
    ("who are my family members", "family_query"),
    ("mera beta kaun hai", "family_query"),
    ("tell me about my daughter", "family_query"),
    ("meri family ke log kaun hain", "family_query"),
    # name_query
    ("what is my name", "name_query"),
    ("mera naam kya hai", "name_query"),
    ("who am i", "name_query"),
    # date_time
    ("what day is it today", "date_time"),
    ("abhi kya time hua hai", "date_time"),
    ("what is the date", "date_time"),
    ("aaj konsa din hai", "date_time"),
    # location
    ("where am i right now", "location"),
    ("main kahan hoon", "location"),
    ("which place is this", "location"),
    # feeling
    ("i am not feeling well", "feeling"),
    ("mujhe acha nahi lag raha", "feeling"),
    ("i feel sad and confused", "feeling"),
    # emergency
    ("i need help right now", "emergency"),
    ("emergency hai", "emergency"),
    ("something is wrong please help", "emergency"),
    # appointment
    ("do i have any appointments", "appointment"),
    ("meri koi appointment hai", "appointment"),
    # help
    ("can you help me", "help"),
    ("what can you do", "help"),
    # meal_time
    ("when do i eat", "meal_time"),
    ("khana kab hai", "meal_time"),
    ("is it lunch time", "meal_time"),
    # memories
    ("i want to see my photos", "memories"),
    ("apni tasveerein dikhao", "memories"),
    ("show me old pictures", "memories"),
    # doctor_query
    ("who is my doctor", "doctor_query"),
    ("mera doctor kaun hai", "doctor_query"),
    # prayer
    ("when is the next prayer", "prayer"),
    ("namaz ka waqt", "prayer"),
    ("maghrib ka time kya hai", "prayer"),
    # greeting
    ("hi there", "greeting"),
    ("assalam o alaikum", "greeting"),
    ("good morning", "greeting"),
    # thanks
    ("thank you so much", "thanks"),
    ("shukriya", "thanks"),
    # goodbye
    ("goodbye for now", "goodbye"),
    ("allah hafiz", "goodbye"),
    # hydration
    ("should i drink water", "hydration"),
    ("paani peena chahiye", "hydration"),
    # exercise
    ("i want to go for a walk", "exercise"),
    ("thodi walk karni hai", "exercise"),
    # sleep_rest
    ("i feel sleepy", "sleep_rest"),
    ("mujhe neend aa rahi hai", "sleep_rest"),
    # entertainment
    ("play some music for me", "entertainment"),
    ("kuch gaana lagao", "entertainment"),
    # bathroom
    ("i need the toilet", "bathroom"),
    ("mujhe washroom jana hai", "bathroom"),
    # positive_mood
    ("i am feeling great today", "positive_mood"),
    ("aaj bohot acha lag raha hai", "positive_mood"),
    # weather / news
    ("what is the weather like", "weather"),
    ("koi khabar sunao", "news"),
    # caregiver_query (new)
    ("who is my caregiver", "caregiver_query"),
    ("mera caregiver kaun hai", "caregiver_query"),
    ("call my caregiver", "caregiver_query"),
    # medication_status (new)
    ("did i take my medicine today", "medication_status"),
    ("kya maine aaj dawai li", "medication_status"),
    ("have i taken all my pills", "medication_status"),
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
