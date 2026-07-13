"""
MemoryCare — Intent Classifier API (Flask)
==========================================
Loads the trained Keras model and exposes it over HTTP so the Node/Express
backend can classify a patient's message into an intent.

Endpoints:
  GET  /health           -> {status, model_loaded}
  POST /predict          -> body {"message": "..."}  returns {intent, confidence, response}

Run:  python app.py   (starts on port 5001)
"""

import json
import os
import pickle
import random

import numpy as np
import nltk
from nltk.stem import WordNetLemmatizer
from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "intents.json")
MODEL_DIR = os.path.join(BASE_DIR, "model")

# Confidence below this is treated as "not understood".
ERROR_THRESHOLD = 0.60

for pkg in ["punkt", "punkt_tab", "wordnet", "omw-1.4"]:
    try:
        nltk.download(pkg, quiet=True)
    except Exception:
        pass

lemmatizer = WordNetLemmatizer()

# Load artifacts produced by train.py
with open(DATA_PATH, "r", encoding="utf-8") as f:
    intents = json.load(f)
with open(os.path.join(MODEL_DIR, "words.pkl"), "rb") as f:
    words = pickle.load(f)
with open(os.path.join(MODEL_DIR, "classes.pkl"), "rb") as f:
    classes = pickle.load(f)

model = load_model(os.path.join(MODEL_DIR, "chatbot_model.h5"))

app = Flask(__name__)
CORS(app)


# ---------------------------------------------------------------------------
# Inference helpers
# ---------------------------------------------------------------------------
def clean_up_sentence(sentence):
    tokens = nltk.word_tokenize(sentence.lower())
    return [lemmatizer.lemmatize(t) for t in tokens]


def bag_of_words(sentence):
    lemmas = clean_up_sentence(sentence)
    bag = [1 if w in lemmas else 0 for w in words]
    return np.array([bag])


def predict_intent(sentence):
    bow = bag_of_words(sentence)
    probs = model.predict(bow, verbose=0)[0]
    top_idx = int(np.argmax(probs))
    confidence = float(probs[top_idx])
    if confidence < ERROR_THRESHOLD:
        return None, confidence
    return classes[top_idx], confidence


def response_for(tag):
    for intent in intents["intents"]:
        if intent["tag"] == tag:
            return random.choice(intent["responses"])
    return "I'm not sure I understood. Could you say that a different way?"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None,
                    "classes": classes})


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"success": False, "message": "No message provided"}), 400

    intent, confidence = predict_intent(message)

    if intent is None:
        return jsonify({
            "success": True,
            "intent": "fallback",
            "confidence": round(confidence, 3),
            "response": "I'm sorry, I didn't quite understand. You can ask me about "
                        "your medicines, your routine, your family, or the date and time.",
        })

    return jsonify({
        "success": True,
        "intent": intent,
        "confidence": round(confidence, 3),
        "response": response_for(intent),
    })


if __name__ == "__main__":
    port = int(os.environ.get("ML_PORT", 5001))
    print(f"MemoryCare ML service running on port {port}")
    app.run(host="0.0.0.0", port=port)
